"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { formatEther } from "viem";
import { SimpleHeader } from "@/components/layout/SimpleHeader";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { Button } from "@/components/ui/button";
import { BackgroundBeams } from "@/components/ui/background-beams";
import { Loader2, TrendingUp } from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
import { useMarkets } from "@/hooks/useMarkets";
import { claimWinnings, getUserBet, getUserClaimablePayout, type UIMarket } from "@/lib/web3-viem";
import { CRE_SIM_CMD, getPendingCreResolutionCount } from "@/lib/cre-gate";

type Position = {
  market: UIMarket;
  yesAmount: bigint;
  noAmount: bigint;
  canClaim: boolean;
  claimable: bigint;
};

export default function DashboardPage() {
  const { account, connect, isConnecting } = useWallet();
  const { markets, isLoading, error, refresh } = useMarkets();
  const [positions, setPositions] = useState<Position[]>([]);
  const [positionsLoading, setPositionsLoading] = useState(false);
  const [claimingId, setClaimingId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!account || markets.length === 0) {
      setPositions([]);
      return;
    }

    let cancelled = false;
    const load = async () => {
      setPositionsLoading(true);
      try {
        const rows = await Promise.all(
          markets.map(async (market) => {
            const bet = await getUserBet(market.id, account as `0x${string}`);
            const [canClaim, payout] = await getUserClaimablePayout(market.id, account as `0x${string}`);
            return {
              market,
              yesAmount: bet.yesAmount,
              noAmount: bet.noAmount,
              canClaim,
              claimable: payout,
            } satisfies Position;
          })
        );

        if (cancelled) return;
        setPositions(rows.filter((r) => r.yesAmount > BigInt(0) || r.noAmount > BigInt(0)));
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
  const pendingCreResolution = useMemo(() => getPendingCreResolutionCount(markets), [markets]);
  const creBlocked = pendingCreResolution > 0;
  const openPositions = useMemo(
    () => [...positions].filter((p) => !p.market.settled && p.market.deadline > now),
    [positions, now]
  );
  const resolvedPositions = useMemo(
    () => [...positions].filter((p) => p.market.settled),
    [positions]
  );

  const handleClaim = async (marketId: number) => {
    if (!account || creBlocked) return;
    try {
      setActionError(null);
      setClaimingId(marketId);
      await claimWinnings(marketId);
      await refresh();
    } catch (err) {
      console.error("Failed to claim:", err);
      setActionError(err instanceof Error ? err.message : "Failed to claim winnings");
    } finally {
      setClaimingId(null);
    }
  };

  return (
    <div className="min-h-screen relative">
      <SimpleHeader />

      <main className="relative z-10 px-4 py-12">
        <div className="container mx-auto max-w-4xl space-y-6">
          <div>
            <h1 className="text-3xl font-bold mb-1 text-gray-900">My Bets</h1>
            <p className="text-gray-500 text-sm">Track your open bets and claim winnings after resolution.</p>
          </div>

          {!account ? (
            <SpotlightCard className="p-8">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="w-8 h-8 text-primary" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">Wallet Not Connected</h3>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">Connect your wallet to load your bets.</p>
                </div>
                <Button onClick={() => void connect()} disabled={isConnecting}>
                  {isConnecting ? "Connecting..." : "Connect Wallet"}
                </Button>
              </div>
            </SpotlightCard>
          ) : contentLoading ? (
            <SpotlightCard className="p-8 text-sm text-muted-foreground">Loading your bets...</SpotlightCard>
          ) : error ? (
            <SpotlightCard className="p-8 text-sm text-destructive">{error}</SpotlightCard>
          ) : (
            <>
              {creBlocked && (
                <SpotlightCard className="p-5 border-amber-300 bg-amber-50/85">
                  <div className="space-y-1 text-amber-800">
                    <p className="text-sm font-medium">Action required before continuing.</p>
                    <p className="text-xs">
                      {pendingCreResolution} expired unresolved market{pendingCreResolution !== 1 ? "s are" : " is"} blocking claims.
                    </p>
                    <p className="text-xs">Run <code>{CRE_SIM_CMD}</code>, then refresh.</p>
                  </div>
                </SpotlightCard>
              )}

              {resolvedPositions.length > 0 && (
                <SpotlightCard className="p-5 space-y-4">
                  <h2 className="text-lg font-semibold text-gray-900">Resolved Bets</h2>
                  {actionError && <div className="text-sm text-destructive bg-destructive/10 rounded-md p-3">{actionError}</div>}
                  <div className="space-y-2">
                    {resolvedPositions.map((position) => (
                      <div key={`resolved-${position.market.id}`} className="rounded-lg border border-gray-200 bg-white/80 p-3 flex items-center justify-between gap-3">
                        <div className="min-w-0 space-y-1">
                          <p className="text-sm font-medium leading-snug line-clamp-2">{position.market.question}</p>
                          <p className="text-xs text-muted-foreground">
                            YES {Number(formatEther(position.yesAmount)).toFixed(4)} ETH · NO {Number(formatEther(position.noAmount)).toFixed(4)} ETH
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={!position.canClaim || claimingId === position.market.id || creBlocked}
                          onClick={() => void handleClaim(position.market.id)}
                        >
                          {claimingId === position.market.id ? (
                            <span className="inline-flex items-center gap-1">
                              <Loader2 className="w-3 h-3 animate-spin" />
                              Claiming...
                            </span>
                          ) : (
                            `Claim ${Number(formatEther(position.claimable)).toFixed(4)} ETH`
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                </SpotlightCard>
              )}

              {openPositions.length === 0 ? (
                <SpotlightCard className="p-8">
                  <div className="text-center space-y-4">
                    <h3 className="text-lg font-semibold">No Open Bets</h3>
                    <Link href="/markets">
                      <Button>Browse Markets</Button>
                    </Link>
                  </div>
                </SpotlightCard>
              ) : (
                <div className="space-y-3">
                  {openPositions.map((position) => (
                    <Link key={position.market.id} href={`/markets/${position.market.id}`}>
                      <SpotlightCard>
                        <div className="p-5 flex items-center justify-between gap-4">
                          <div className="flex-1 min-w-0 space-y-1">
                            <p className="font-medium text-sm leading-snug">{position.market.question}</p>
                            <p className="text-xs text-muted-foreground">
                              YES {Number(formatEther(position.yesAmount)).toFixed(4)} ETH · NO {Number(formatEther(position.noAmount)).toFixed(4)} ETH
                            </p>
                          </div>
                          <Button size="sm" variant="outline">Open</Button>
                        </div>
                      </SpotlightCard>
                    </Link>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <BackgroundBeams />
    </div>
  );
}
