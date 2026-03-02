"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus, TrendingUp, Loader2, AlertCircle } from "lucide-react";
import Link from "next/link";
import type { Market } from "@/hooks/useMarkets";
import { CreateMarketModal } from "@/components/trading/CreateMarketModal";
import { WalletRequiredDialog } from "@/components/wallet/WalletRequiredDialog";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { EthIcon } from "@/components/ui/eth-icon";
import {
  createMarket,
  inferDeadlineFromQuestion,
  mintMarketTokens,
  redeemMarketTokens,
} from "@/lib/web3-viem";
import { useWallet } from "@/hooks/useWallet";

const CATEGORIES = ["All", "General", "Crypto", "AI & Tech", "Politics", "Science", "Other"];

const SORT_OPTIONS = [
  { label: "Volume", value: "volume" },
  { label: "Ending soon", value: "deadline" },
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
  actionBusy,
  onMint,
  onRedeem,
}: {
  market: Market;
  actionBusy: boolean;
  onMint: () => Promise<void>;
  onRedeem: () => Promise<void>;
}) {
  const now = Math.floor(Date.now() / 1000);
  const daysLeft = Math.ceil((market.deadline - now) / 86400);
  const noPercent = Math.max(0, 100 - market.yesPercent);
  const expired = market.deadline <= now;

  return (
    <SpotlightCard className="p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
          {market.category}
        </span>
        <span className="text-xs text-muted-foreground tabular-nums shrink-0">
          {formatVolume(market.volumeUsdc)} vol.
        </span>
      </div>

      <div className="flex-1 space-y-1">
        <p className="font-semibold text-sm leading-snug text-gray-900 line-clamp-2">{market.question}</p>
        <p className="text-xs text-muted-foreground">
          Ends{" "}
          {new Date(market.deadline * 1000).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}{" "}
          · {expired ? "expired" : `${daysLeft}d left`}
        </p>
      </div>

      <div className="flex gap-2">
        <div className="flex-1 py-1.5 text-sm font-semibold rounded-lg border-2 border-green-500 bg-green-50 text-green-700 text-center">
          YES {market.yesPercent.toFixed(1)}%
        </div>
        <div className="flex-1 py-1.5 text-sm font-semibold rounded-lg border-2 border-red-500 bg-red-50 text-red-700 text-center">
          NO {noPercent.toFixed(1)}%
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button size="sm" variant="outline" onClick={() => void onMint()} disabled={actionBusy || market.settled || expired}>
          <EthIcon className="w-3.5 h-3.5" />
          Mint 0.01 ETH
        </Button>
        <Button size="sm" variant="outline" onClick={() => void onRedeem()} disabled={actionBusy || !market.settled}>
          Redeem
        </Button>
      </div>

      <Link href={`/markets/${market.id}`}>
        <Button size="sm" variant="outline" className="w-full">
          Open Trade
        </Button>
      </Link>

      <p className="text-[11px] text-muted-foreground">
        CRE status: {market.resolved ? `resolved (${market.confidence}% confidence)` : "awaiting resolution"}.
        Settlement: {market.settled ? "finalized onchain" : "auto-finalized after CRE report"}.
      </p>
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
  const [category, setCategory] = useState("All");
  const [sort, setSort] = useState<SortOption>("volume");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showWalletDialog, setShowWalletDialog] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const { account } = useWallet();

  const filtered = useMemo(() => {
    const now = Math.floor(Date.now() / 1000);
    return markets
      .filter((m) => !m.settled || m.deadline > now)
      .filter((m) => category === "All" || m.category === category)
      .filter((m) => !search || m.question.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => {
        if (sort === "volume") return b.volumeUsdc - a.volumeUsdc;
        if (sort === "deadline") return a.deadline - b.deadline;
        return b.createdAt - a.createdAt;
      });
  }, [markets, search, category, sort]);

  const ensureWallet = () => {
    if (account) return true;
    setShowWalletDialog(true);
    return false;
  };

  const runAction = async (marketId: number, fn: () => Promise<unknown>) => {
    setActionError(null);
    setBusyId(marketId);
    try {
      await fn();
      if (onRefresh) await onRefresh();
    } catch (err) {
      console.error("Market action failed:", err);
      setActionError(err instanceof Error ? err.message : "Market action failed");
    } finally {
      setBusyId(null);
    }
  };

  const handleCreateMarket = async (question: string) => {
    if (!ensureWallet()) {
      throw new Error("Please connect your wallet first");
    }

    const deadline = inferDeadlineFromQuestion(question);
    await createMarket(
      question,
      deadline,
      "0",
      "0"
    );

    if (onRefresh) await onRefresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search markets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button
          variant="outline"
          className="gap-1.5 shrink-0"
          onClick={() => {
            if (!account) setShowWalletDialog(true);
            else setShowCreateModal(true);
          }}
        >
          <Plus className="w-4 h-4" />
          Create Market
        </Button>
      </div>

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex gap-1.5 flex-wrap">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-3 py-1 text-sm rounded-full border transition-colors font-medium ${
                category === cat
                  ? "bg-gray-900 text-white border-gray-900"
                  : "bg-white text-gray-600 border-gray-200 hover:border-gray-400 hover:text-gray-900"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSort(opt.value)}
              className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${
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

      {actionError && <div className="text-sm text-destructive bg-destructive/10 rounded-md p-3">{actionError}</div>}

      {!isLoading && !error && (
        <p className="text-xs text-muted-foreground">
          {filtered.length} market{filtered.length !== 1 ? "s" : ""}
          {category !== "All" ? ` in ${category}` : ""}
          {search ? ` matching "${search}"` : ""}
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
          <p className="text-sm">
            {search
              ? `No markets found for "${search}"`
              : category !== "All"
              ? `No ${category} markets yet`
              : "No active markets yet"}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 mt-1"
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
            <MarketTile
              key={market.id}
              market={market}
              actionBusy={busyId === market.id}
              onMint={async () => {
                if (!ensureWallet()) return;
                await runAction(market.id, async () => mintMarketTokens(market.id, "0.01"));
              }}
              onRedeem={async () => {
                if (!ensureWallet()) return;
                await runAction(market.id, async () => redeemMarketTokens(market.id));
              }}
            />
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateMarketModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateMarket}
        />
      )}
      {showWalletDialog && <WalletRequiredDialog onClose={() => setShowWalletDialog(false)} />}
    </div>
  );
}
