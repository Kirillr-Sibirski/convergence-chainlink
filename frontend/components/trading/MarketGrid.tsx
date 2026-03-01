"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus, TrendingUp, Loader2, AlertCircle } from "lucide-react";
import type { Market } from "@/hooks/useMarkets";
import { CreateMarketModal } from "@/components/trading/CreateMarketModal";
import { WalletRequiredDialog } from "@/components/wallet/WalletRequiredDialog";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { useActiveAccount } from "thirdweb/react";
import { createMarket } from "@/lib/web3-thirdweb";

const CATEGORIES = ["All", "Crypto", "AI & Tech", "Politics", "Science", "Other"];

const SORT_OPTIONS = [
  { label: "Volume", value: "volume" },
  { label: "Ending soon", value: "deadline" },
  { label: "Newest", value: "newest" },
] as const;

type SortOption = (typeof SORT_OPTIONS)[number]["value"];

function formatVolume(usdc: number) {
  if (usdc >= 1_000_000) return `$${(usdc / 1_000_000).toFixed(1)}M`;
  if (usdc >= 1_000) return `$${(usdc / 1_000).toFixed(1)}K`;
  return `$${usdc}`;
}

function MarketTile({ market }: { market: Market }) {
  const now = Math.floor(Date.now() / 1000);
  const daysLeft = Math.ceil((market.deadline - now) / 86400);
  const noPercent = 100 - market.yesPercent;

  return (
    <SpotlightCard className="p-5 flex flex-col gap-4 cursor-pointer">
      {/* Top row: category + volume */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
          {market.category}
        </span>
        <span className="text-xs text-muted-foreground tabular-nums shrink-0">
          {formatVolume(market.volumeUsdc)} vol.
        </span>
      </div>

      {/* Question + deadline */}
      <div className="flex-1 space-y-1">
        <p className="font-semibold text-sm leading-snug text-gray-900 line-clamp-2">
          {market.question}
        </p>
        <p className="text-xs text-muted-foreground">
          Ends{" "}
          {new Date(market.deadline * 1000).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}{" "}
          · {daysLeft}d left
        </p>
      </div>

      {/* YES / NO buttons */}
      <div className="flex gap-2">
        <button className="flex-1 py-1.5 text-sm font-semibold rounded-lg border-2 border-green-500 bg-green-50 text-green-700 hover:bg-green-100 active:bg-green-200 transition-colors">
          YES {market.yesPercent}%
        </button>
        <button className="flex-1 py-1.5 text-sm font-semibold rounded-lg border-2 border-red-500 bg-red-50 text-red-700 hover:bg-red-100 active:bg-red-200 transition-colors">
          NO {noPercent}%
        </button>
      </div>
    </SpotlightCard>
  );
}

interface MarketGridProps {
  markets: Market[];
  isLoading: boolean;
  error: string | null;
}

export function MarketGrid({ markets, isLoading, error }: MarketGridProps) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [sort, setSort] = useState<SortOption>("volume");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showWalletDialog, setShowWalletDialog] = useState(false);
  const account = useActiveAccount();

  const filtered = useMemo(() => {
    const now = Math.floor(Date.now() / 1000);
    return markets
      .filter((m) => !m.resolved && m.deadline > now)
      .filter((m) => category === "All" || m.category === category)
      .filter(
        (m) =>
          !search || m.question.toLowerCase().includes(search.toLowerCase())
      )
      .sort((a, b) => {
        if (sort === "volume") return b.volumeUsdc - a.volumeUsdc;
        if (sort === "deadline") return a.deadline - b.deadline;
        return b.createdAt - a.createdAt;
      });
  }, [markets, search, category, sort]);

  const handleCreateMarket = async (question: string) => {
    if (!account) {
      setShowWalletDialog(true);
      throw new Error("Please connect your wallet first");
    }
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 24 * 3600);
    await createMarket(account, question, deadline);
  };

  return (
    <div className="space-y-4">
      {/* Search bar + Create Market */}
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
            if (!account) {
              setShowWalletDialog(true);
            } else {
              setShowCreateModal(true);
            }
          }}
        >
          <Plus className="w-4 h-4" />
          Create Market
        </Button>
      </div>

      {/* Category filter pills + sort */}
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

      {/* Market count */}
      {!isLoading && !error && (
        <p className="text-xs text-muted-foreground">
          {filtered.length} market{filtered.length !== 1 ? "s" : ""}
          {category !== "All" ? ` in ${category}` : ""}
          {search ? ` matching "${search}"` : ""}
        </p>
      )}

      {/* Grid */}
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
            <MarketTile key={market.id} market={market} />
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateMarketModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateMarket}
        />
      )}
      {showWalletDialog && (
        <WalletRequiredDialog onClose={() => setShowWalletDialog(false)} />
      )}
    </div>
  );
}
