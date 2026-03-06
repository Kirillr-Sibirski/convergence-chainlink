"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, Clock3, Loader2, Plus, Search, TrendingUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { CreateMarketModal } from "@/components/trading/CreateMarketModal";
import { NotificationCenter, type NotificationItem } from "@/components/ui/notification-center";
import { WalletRequiredDialog } from "@/components/wallet/WalletRequiredDialog";
import { useWallet } from "@/hooks/useWallet";
import type { Market } from "@/hooks/useMarkets";
import {
  createMarketVerified,
  getLatestQuestionValidationTimestamp,
  getQuestionValidationStatus,
  waitForQuestionValidation,
} from "@/lib/web3-viem";
import { CRE_SIM_CMD, getPendingCreResolutionCount, triggerCreQuestionValidation } from "@/lib/cre-gate";

const SORT_OPTIONS = [
  { label: "Most Volume", value: "volume" },
  { label: "Ending Soon", value: "deadline" },
  { label: "Newest", value: "newest" },
] as const;

type SortOption = (typeof SORT_OPTIONS)[number]["value"];
const MANUAL_CRE_PENDING_ERROR = "CRE_MANUAL_SIMULATION_PENDING";

function formatVolumeEth(value: bigint) {
  const n = Number(value) / 1e18;
  if (n >= 1000) return `${n.toFixed(1)} ETH`;
  return `${n.toFixed(3)} ETH`;
}

function formatValidationFailureMessage(validation: {
  score: number;
  checks: { legitimate: boolean; clearTimeline: boolean; resolvable: boolean; binary: boolean };
}) {
  const failedChecks = Object.entries(validation.checks)
    .filter(([, ok]) => !ok)
    .map(([name]) => name);

  const checksPart = failedChecks.length > 0 ? `failed checks: ${failedChecks.join(", ")}` : "failed model consensus";
  return `Question rejected by CRE (${checksPart}, score ${validation.score}).`;
}

function MarketTile({ market, creBlocked }: { market: Market; creBlocked: boolean }) {
  const now = Math.floor(Date.now() / 1000);
  const secondsLeft = market.deadline - now;
  const totalHoursLeft = Math.max(0, Math.ceil(secondsLeft / 3600));
  const daysLeft = Math.floor(totalHoursLeft / 24);
  const hoursLeft = totalHoursLeft % 24;
  const timeLeftLabel = daysLeft > 0 ? `${daysLeft}d ${hoursLeft}h left` : `${hoursLeft}h left`;
  const noPercent = Math.max(0, 100 - market.yesPercent);
  const expired = market.deadline <= now;
  const marketStateLabel = expired ? "EXPIRED" : "OPEN";
  const dateLabel = new Date(market.deadline * 1000).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <SpotlightCard className="relative overflow-hidden p-5 pl-10 flex flex-col gap-3 bg-white/75 border-gray-200/80 backdrop-blur-xl shadow-[0_16px_38px_rgba(15,23,42,0.08)]">
      <div className="absolute -left-4 top-1/2 -translate-y-1/2 h-28 w-12 rounded-full blur-2xl bg-gray-400/35" />
      <div className="absolute left-0 top-0 h-full w-3 bg-gray-500/70" />
      <div className="absolute left-0 top-0 h-full w-3 flex items-center justify-center">
        <span className="[writing-mode:vertical-rl] rotate-180 text-[8px] tracking-[0.12em] font-semibold text-white">
          {marketStateLabel}
        </span>
      </div>
      <div className="flex items-center justify-between gap-2">
        {expired && (
          <span className="text-xs font-medium px-2 py-0.5 rounded-full border bg-amber-50 text-amber-700 border-amber-200">
            Expired
          </span>
        )}
        <span className="ml-auto text-xs text-muted-foreground tabular-nums shrink-0">
          Volume: {formatVolumeEth(market.totalVolume)}
        </span>
      </div>

      <div className="flex-1 space-y-1 -mt-0.5">
        <p className="font-semibold text-[15px] leading-snug text-gray-900 line-clamp-3">{market.question}</p>
        <p className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
          <Clock3 className="w-3 h-3" />
          {dateLabel} · {expired ? "expired" : timeLeftLabel}
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-xs font-medium">
          <span className="text-green-700">YES {market.yesPercent.toFixed(1)}%</span>
          <span className="text-red-700">NO {noPercent.toFixed(1)}%</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden border border-gray-200 bg-gray-100 flex">
          <div className="bg-green-500/80" style={{ width: `${market.yesPercent}%` }} />
          <div className="bg-red-500/80" style={{ width: `${noPercent}%` }} />
        </div>
      </div>

      <Link href={`/markets/${market.id}`}>
        <Button size="sm" variant="outline" className="w-full bg-white/90" disabled={creBlocked}>
          Place Bet
        </Button>
      </Link>

      {market.settled && (
        <p className="text-[11px] text-green-700 bg-green-50 border border-green-200 rounded-md px-2 py-1">
          Resolved. Check Dashboard to claim winnings.
        </p>
      )}
    </SpotlightCard>
  );
}

interface MarketGridProps {
  markets: Market[];
  isLoading: boolean;
  error: string | null;
  onRefresh?: () => Promise<void>;
}

export function MarketGrid({ markets, isLoading, error, onRefresh }: MarketGridProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("volume");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showWalletDialog, setShowWalletDialog] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const { account } = useWallet();

  const pushNotification = (item: Omit<NotificationItem, "id">) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setNotifications((prev) => [...prev, { id, ...item }]);
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 5000);
  };

  const filtered = useMemo(() => {
    const now = Math.floor(Date.now() / 1000);
    return markets
      .filter((m) => !m.settled || m.deadline > now)
      .filter((m) => !search || m.question.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => {
        if (sort === "volume") return Number(b.totalVolume - a.totalVolume);
        if (sort === "deadline") return a.deadline - b.deadline;
        return b.createdAt - a.createdAt;
      });
  }, [markets, search, sort]);

  const pendingCreResolution = useMemo(() => getPendingCreResolutionCount(markets), [markets]);
  const creBlocked = pendingCreResolution > 0;

  const ensureWallet = () => {
    if (account) return true;
    setShowWalletDialog(true);
    return false;
  };

  const handleValidateMarket = async (question: string, deadline: number, requireFreshAfter: number) => {
    if (!ensureWallet()) throw new Error("Please connect your wallet first");

    const triggerUrlConfigured = Boolean(process.env.NEXT_PUBLIC_CRE_HTTP_TRIGGER_URL);
    const existing = await getQuestionValidationStatus(question, deadline);
    if (existing.processed) {
      if (!existing.approved) throw new Error(formatValidationFailureMessage(existing));
      if (!triggerUrlConfigured) {
        const latestValidationAt = await getLatestQuestionValidationTimestamp(question, deadline);
        if (!latestValidationAt || latestValidationAt < requireFreshAfter) {
          throw new Error(MANUAL_CRE_PENDING_ERROR);
        }
      }
      return;
    }

    const trigger = await triggerCreQuestionValidation(question, deadline);
    if (trigger.mode === "manual") {
      throw new Error(MANUAL_CRE_PENDING_ERROR);
    }

    const validation = await waitForQuestionValidation(question, deadline);
    if (!validation.approved) throw new Error(formatValidationFailureMessage(validation));

  };

  const handleCreateMarket = async (question: string, deadline: number) => {
    if (!ensureWallet()) throw new Error("Please connect your wallet first");

    const validation = await getQuestionValidationStatus(question, deadline);
    if (!validation.processed || !validation.approved) {
      throw new Error("Question is not verified yet. Click Validate Question and wait for CRE verification.");
    }

    await createMarketVerified(question, deadline);
    if (onRefresh) await onRefresh();
  };

  const handleValidatedHandoff = async (question: string, deadline: number) => {
    try {
      await handleCreateMarket(question, deadline);
      setShowCreateModal(false);
      router.push("/markets");
      pushNotification({
        variant: "success",
        title: "Market created successfully",
        description: question,
      });
    } catch (createError) {
      pushNotification({
        variant: "error",
        title: "Failed to create market",
        description: createError instanceof Error ? createError.message : "Unknown error",
      });
    }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-gray-200/80 bg-white/65 backdrop-blur-xl p-3 shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search markets by question..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-white/85"
            />
          </div>
          <Button
            variant="outline"
            className="gap-1.5 shrink-0 bg-gray-100 hover:bg-gray-200 border-gray-300"
            disabled={creBlocked}
            onClick={() => {
              if (!account) setShowWalletDialog(true);
              else setShowCreateModal(true);
            }}
          >
            <Plus className="w-4 h-4" />
            Create Market
          </Button>
        </div>
        <div className="mt-2 flex items-center gap-1">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSort(opt.value)}
              className={`px-2 py-1 text-[11px] rounded-md border transition-colors ${
                sort === opt.value
                  ? "bg-gray-100 text-gray-900 border-gray-300 font-medium"
                  : "text-gray-500 border-transparent hover:border-gray-200 hover:text-gray-700"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {pendingCreResolution > 0 && (
        <div className="text-sm rounded-md p-3 border border-amber-300 bg-amber-50 text-amber-800 space-y-1">
          <p>
            {pendingCreResolution} market{pendingCreResolution !== 1 ? "s are" : " is"} waiting for result processing.
            New market creation and betting are blocked until simulation is run.
          </p>
          <p className="text-xs">
            Run <code>{CRE_SIM_CMD}</code>, then refresh this page.
          </p>
        </div>
      )}

      {!isLoading && !error && (
        <p className="text-xs text-muted-foreground">
          Showing {filtered.length} market{filtered.length !== 1 ? "s" : ""}
          {search ? ` for "${search}"` : ""}.
        </p>
      )}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading markets...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <AlertCircle className="w-8 h-8 text-destructive" />
          <p className="text-sm text-destructive">{error}</p>
          <p className="text-xs text-muted-foreground">Make sure you're connected to Sepolia testnet</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
          <TrendingUp className="w-10 h-10" />
          <p className="text-sm">{search ? `No markets found for "${search}"` : "No active markets yet"}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((market) => (
            <MarketTile key={market.id} market={market} creBlocked={creBlocked} />
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateMarketModal
          onClose={() => setShowCreateModal(false)}
          onValidate={handleValidateMarket}
          onValidated={handleValidatedHandoff}
        />
      )}
      {showWalletDialog && <WalletRequiredDialog onClose={() => setShowWalletDialog(false)} />}
      <NotificationCenter
        items={notifications}
        onDismiss={(id) => setNotifications((prev) => prev.filter((n) => n.id !== id))}
      />
    </div>
  );
}
