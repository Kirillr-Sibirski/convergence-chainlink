"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { formatEther } from "viem";
import { SimpleHeader } from "@/components/layout/SimpleHeader";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { Button } from "@/components/ui/button";
import { BackgroundBeams } from "@/components/ui/background-beams";
import { TrendingUp } from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
import { useMarkets } from "@/hooks/useMarkets";
import { getUserMarketBalances, type UIMarket } from "@/lib/web3-viem";

type Position = {
  market: UIMarket;
  yesBalance: bigint;
  noBalance: bigint;
};

export default function DashboardPage() {
  const { account, connect, isConnecting } = useWallet();
  const { markets, isLoading, error } = useMarkets();
  const [positions, setPositions] = useState<Position[]>([]);
  const [positionsLoading, setPositionsLoading] = useState(false);

  useEffect(() => {
    if (!account || markets.length === 0) {
      setPositions([]);
      return;
    }

    let cancelled = false;
    const now = Math.floor(Date.now() / 1000);

    const load = async () => {
      setPositionsLoading(true);
      try {
        const rows = await Promise.all(
          markets
            .filter((m) => !m.settled && m.deadline > now)
            .map(async (market) => {
              const [yesBalance, noBalance] = await getUserMarketBalances(
                market.id,
                account as `0x${string}`
              );
              return { market, yesBalance, noBalance } satisfies Position;
            })
        );

        if (cancelled) return;
        setPositions(
          rows.filter((r) => r.yesBalance > BigInt(0) || r.noBalance > BigInt(0))
        );
      } catch (err) {
        console.error("Failed to load user positions:", err);
        if (!cancelled) setPositions([]);
      } finally {
        if (!cancelled) setPositionsLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [account, markets]);

  const now = Math.floor(Date.now() / 1000);
  const contentLoading = isLoading || positionsLoading;
  const sortedPositions = useMemo(
    () => [...positions].sort((a, b) => a.market.deadline - b.market.deadline),
    [positions]
  );

  return (
    <div className="min-h-screen relative">
      <SimpleHeader />

      <main className="relative z-10 px-4 py-12">
        <div className="container mx-auto max-w-4xl space-y-6">
          <div>
            <h1 className="text-3xl font-bold mb-1 text-gray-900">Open Bets</h1>
            <p className="text-gray-500 text-sm">
              Your live YES/NO positions. Click an entry to trade outcome tokens.
            </p>
          </div>

          {!account ? (
            <SpotlightCard className="p-8">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="w-8 h-8 text-primary" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">Wallet Not Connected</h3>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    Connect your wallet to load open bets and trade outcome tokens.
                  </p>
                </div>
                <Button onClick={() => void connect()} disabled={isConnecting}>
                  {isConnecting ? "Connecting..." : "Connect Wallet"}
                </Button>
              </div>
            </SpotlightCard>
          ) : contentLoading ? (
            <SpotlightCard className="p-8 text-sm text-muted-foreground">Loading open bets...</SpotlightCard>
          ) : error ? (
            <SpotlightCard className="p-8 text-sm text-destructive">{error}</SpotlightCard>
          ) : sortedPositions.length === 0 ? (
            <SpotlightCard className="p-8">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="w-8 h-8 text-primary" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">No Open Bets</h3>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    Mint or trade outcome tokens in Markets to create your first position.
                  </p>
                </div>
                <Link href="/markets">
                  <Button className="mt-1">Browse Markets</Button>
                </Link>
              </div>
            </SpotlightCard>
          ) : (
            <div className="space-y-3">
              {sortedPositions.map((position) => {
                const daysLeft = Math.max(0, Math.ceil((position.market.deadline - now) / 86400));
                return (
                  <Link key={position.market.id} href={`/markets/${position.market.id}`}>
                    <SpotlightCard>
                      <div className="p-5 flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0 space-y-1">
                          <p className="font-medium text-sm leading-snug">{position.market.question}</p>
                          <p className="text-xs text-muted-foreground">
                            Expires {new Date(position.market.deadline * 1000).toLocaleDateString()} · {daysLeft}d left
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-3 shrink-0 text-right">
                          <div>
                            <p className="text-xs text-muted-foreground">YES</p>
                            <p className="text-sm font-semibold tabular-nums">
                              {Number(formatEther(position.yesBalance)).toFixed(4)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">NO</p>
                            <p className="text-sm font-semibold tabular-nums">
                              {Number(formatEther(position.noBalance)).toFixed(4)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </SpotlightCard>
                  </Link>
                );
              })}
              <p className="text-xs text-muted-foreground px-1">
                {sortedPositions.length} open market position{sortedPositions.length !== 1 ? "s" : ""}.
              </p>
            </div>
          )}
        </div>
      </main>
      <BackgroundBeams />
    </div>
  );
}
