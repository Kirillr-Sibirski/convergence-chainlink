"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus, TrendingUp, Loader2, AlertCircle, Clock3 } from "lucide-react";
import Link from "next/link";
import type { Market } from "@/hooks/useMarkets";
import { CreateMarketModal } from "@/components/trading/CreateMarketModal";
import { WalletRequiredDialog } from "@/components/wallet/WalletRequiredDialog";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { createMarket, inferDeadlineFromQuestion } from "@/lib/web3-viem";
import { useWallet } from "@/hooks/useWallet";
import { CRE_SIM_CMD, getPendingCreResolutionCount } from "@/lib/cre-gate";

const SORT_OPTIONS = [
  { label: "Most Active", value: "volume" },
  { label: "Ending Soon", value: "deadline" },
  { label: "Newest", value: "newest" },
] as const;

type SortOption = (typeof SORT_OPTIONS)[number]["value"];

function formatVolume(usdc: number) {
  if (usdc >= 1_000_000) return `$${(usdc / 1_000_000).toFixed(1)}M`;
  if (usdc >= 1_000) return `$${(usdc / 1_000).toFixed(1)}K`;
  return `$${usdc.toFixed(0)}`;
}

function MarketTile({
  market,
  creBlocked,
}: {
  market: Market;
  creBlocked: boolean;
}) {
  const now = Math.floor(Date.now() / 1000);
  const daysLeft = Math.ceil((market.deadline - now) / 86400);
  const noPercent = Math.max(0, 100 - market.yesPercent);
  const expired = market.deadline <= now;
  const dateLabel = new Date(market.deadline * 1000).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <SpotlightCard className="p-5 flex flex-col gap-4 bg-white/75 border-gray-200/80 backdrop-blur-xl shadow-[0_16px_38px_rgba(15,23,42,0.08)]">
      <div className="flex items-center justify-between gap-2">
        <span
          className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
            expired ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-gray-100 text-gray-600 border-gray-200"
          }`}
        >
          {expired ? "Expired" : "Open"}
        </span>
        <span className="text-xs text-muted-foreground tabular-nums shrink-0">{formatVolume(market.volumeUsdc)}</span>
      </div>

      <div className="flex-1 space-y-2">
        <p className="font-semibold text-[15px] leading-snug text-gray-900 line-clamp-3">{market.question}</p>
        <p className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
          <Clock3 className="w-3 h-3" />
          {dateLabel} · {expired ? "expired" : `${daysLeft}d left`}
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-xs font-medium">
          <span className="text-green-700">YES {market.yesPercent.toFixed(1)}%</span>
          <span className="text-red-700">NO {noPercent.toFixed(1)}%</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden border border-gray-200 bg-gray-100 flex">
          <div className="bg-green-500" style={{ width: `${market.yesPercent}%` }} />
          <div className="bg-red-500" style={{ width: `${noPercent}%` }} />
        </div>
      </div>

      {creBlocked ? (
        <Button size="sm" variant="outline" className="w-full" disabled>
          Run CRE Simulation First
        </Button>
      ) : (
        <Link href={`/markets/${market.id}`}>
          <Button size="sm" variant="outline" className="w-full bg-white/90">
            Trade / Provide Liquidity
          </Button>
        </Link>
      )}

      {market.settled && (
        <p className="text-[11px] text-green-700 bg-green-50 border border-green-200 rounded-md px-2 py-1">
          Resolved. Check Dashboard for winnings.
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
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("volume");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showWalletDialog, setShowWalletDialog] = useState(false);
  const { account } = useWallet();

  const filtered = useMemo(() => {
    const now = Math.floor(Date.now() / 1000);
    return markets
      .filter((m) => !m.settled || m.deadline > now)
      .filter((m) => !search || m.question.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => {
        if (sort === "volume") return b.volumeUsdc - a.volumeUsdc;
        if (sort === "deadline") return a.deadline - b.deadline;
        return b.createdAt - a.createdAt;
      });
  }, [markets, search, sort]);

  const pendingCreResolution = useMemo(() => getPendingCreResolutionCount(markets), [markets]);
  const creBlocked = pendingCreResolution > 0;
  const endingSoon = useMemo(() => {
    const now = Math.floor(Date.now() / 1000);
    return filtered.filter((m) => m.deadline > now && m.deadline <= now + 2 * 24 * 3600).length;
  }, [filtered]);

  const ensureWallet = () => {
    if (account) return true;
    setShowWalletDialog(true);
    return false;
  };

  const handleCreateMarket = async (question: string) => {
    if (creBlocked) {
      throw new Error(`Run CRE simulation first: ${CRE_SIM_CMD}`);
    }

    if (!ensureWallet()) {
      throw new Error("Please connect your wallet first");
    }

    const deadline = inferDeadlineFromQuestion(question);
    await createMarket(question, deadline, "0", "0");

    if (onRefresh) await onRefresh();
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
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <div className="rounded-lg border border-gray-200 bg-white/75 px-3 py-2">
          <p className="text-[11px] text-muted-foreground">Visible Markets</p>
          <p className="text-lg font-semibold text-gray-900">{filtered.length}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white/75 px-3 py-2">
          <p className="text-[11px] text-muted-foreground">Ending Soon</p>
          <p className="text-lg font-semibold text-gray-900">{endingSoon}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white/75 px-3 py-2">
          <p className="text-[11px] text-muted-foreground">Sort</p>
          <div className="mt-1 flex items-center gap-1">
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
        <div className="rounded-lg border border-gray-200 bg-white/75 px-3 py-2">
          <p className="text-[11px] text-muted-foreground">Status</p>
          <p className="text-sm font-medium text-gray-800 mt-1">{creBlocked ? "Waiting For Simulation" : "Ready"}</p>
        </div>
      </div>

      {pendingCreResolution > 0 && (
        <div className="text-sm rounded-md p-3 border border-amber-300 bg-amber-50 text-amber-800 space-y-1">
          <p>
            {pendingCreResolution} market{pendingCreResolution !== 1 ? "s are" : " is"} waiting for result processing.
            Trading, liquidity, and new market creation are blocked until simulation is run.
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
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 mt-1"
            disabled={creBlocked}
            onClick={() => {
              if (!account) setShowWalletDialog(true);
              else setShowCreateModal(true);
            }}
          >
            <Plus className="w-3.5 h-3.5" />
            Create the first one
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((market) => (
            <MarketTile key={market.id} market={market} creBlocked={creBlocked} />
          ))}
        </div>
      )}

      {showCreateModal && <CreateMarketModal onClose={() => setShowCreateModal(false)} onCreate={handleCreateMarket} />}
      {showWalletDialog && <WalletRequiredDialog onClose={() => setShowWalletDialog(false)} />}
    </div>
  );
}
