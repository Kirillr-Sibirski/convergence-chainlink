"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { SimpleHeader } from "@/components/layout/SimpleHeader";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { Button } from "@/components/ui/button";
import { BackgroundBeams } from "@/components/ui/background-beams";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, Copy, Loader2, TrendingUp } from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
import { useMarkets } from "@/hooks/useMarkets";
import { CONTRACTS } from "@/lib/contracts";
import {
  claimWinnings,
  formatCollateral,
  getUserBet,
  getUserClaimablePayout,
  type UIMarket,
} from "@/lib/web3-viem";
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
  const [copiedCreCommand, setCopiedCreCommand] = useState(false);

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

  const contentLoading = isLoading || positionsLoading;
  const pendingCreResolution = useMemo(() => getPendingCreResolutionCount(markets), [markets]);
  const creBlocked = pendingCreResolution > 0;
  const openPositions = useMemo(
    () => [...positions].filter((p) => !p.market.settled),
    [positions]
  );
  const resolvedPositions = useMemo(
    () => [...positions].filter((p) => p.market.settled && p.canClaim && p.claimable > BigInt(0)),
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

  const handleCopyCreCommand = async () => {
    try {
      await navigator.clipboard.writeText(CRE_SIM_CMD);
      setCopiedCreCommand(true);
      setTimeout(() => setCopiedCreCommand(false), 1800);
    } catch (err) {
      console.error("Failed to copy CRE command:", err);
      setActionError("Failed to copy command. Copy it manually from the warning text.");
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
            <div className="space-y-4">
              <div className="space-y-2">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-64" />
              </div>
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={`dashboard-skeleton-${i}`}
                    className="relative overflow-hidden rounded-xl p-5 pl-10 bg-white/45 backdrop-blur-md border border-black/10"
                  >
                    <div className="absolute -left-4 top-1/2 -translate-y-1/2 h-28 w-12 rounded-full blur-2xl bg-gray-300/35" />
                    <div className="absolute left-0 top-0 h-full w-3 bg-gray-400/60" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-[78%]" />
                      <Skeleton className="h-3 w-24 rounded-full" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
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
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-1 bg-white/90 hover:bg-amber-100 border-amber-300 text-amber-900"
                      onClick={handleCopyCreCommand}
                    >
                      {copiedCreCommand ? (
                        <>
                          <Check className="w-3.5 h-3.5 mr-1" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 mr-1" />
                          Copy command
                        </>
                      )}
                    </Button>
                  </div>
                </SpotlightCard>
              )}

              {resolvedPositions.length > 0 && (
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold text-gray-900">Resolved Markets</h2>
                  {actionError && <div className="text-sm text-destructive bg-destructive/10 rounded-md p-3">{actionError}</div>}
                  <div className="space-y-3">
                    {resolvedPositions.map((position) => (
                      (() => {
                        const hasWinningShares = position.market.outcome
                          ? position.yesAmount > BigInt(0)
                          : position.noAmount > BigInt(0);
                        const resultLabel = hasWinningShares ? "Won" : "Lost";
                        const resultStripe = hasWinningShares ? "bg-green-500/75" : "bg-red-500/75";
                        const resultGlow = hasWinningShares ? "bg-green-400/45" : "bg-red-400/45";

                        return (
                          <div
                            key={`resolved-${position.market.id}`}
                            className="relative overflow-hidden rounded-xl p-5 pl-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 bg-white/45 backdrop-blur-md border border-black/10"
                          >
                            <div className={`absolute -left-4 top-1/2 -translate-y-1/2 h-28 w-12 rounded-full blur-2xl ${resultGlow}`} />
                            <div className={`absolute left-0 top-0 h-full w-3 ${resultStripe}`} />
                            <div className="absolute left-0 top-0 h-full w-3 flex items-center justify-center">
                              <span className="[writing-mode:vertical-rl] rotate-180 text-[8px] tracking-[0.12em] font-semibold text-white">
                                {resultLabel.toUpperCase()}
                              </span>
                            </div>

                            <div className="min-w-0 w-full sm:w-auto space-y-1">
                              <p className="font-medium text-sm leading-snug line-clamp-2">{position.market.question}</p>
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-[11px] inline-flex items-center rounded-full border border-gray-300 bg-white/70 px-2 py-0.5 text-gray-600 w-fit">
                                  Resolved
                                </p>
                                <p
                                  className={`text-[11px] inline-flex items-center rounded-full px-2 py-0.5 w-fit font-medium ${
                                    hasWinningShares
                                      ? "border border-green-300 bg-green-50 text-green-700"
                                      : "border border-red-300 bg-red-50 text-red-700"
                                  }`}
                                >
                                  {resultLabel}
                                </p>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Payout: {formatCollateral(position.claimable)} {CONTRACTS.COLLATERAL_SYMBOL}
                              </p>
                            </div>
                            {position.canClaim ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full sm:w-auto"
                                disabled={claimingId === position.market.id || creBlocked}
                                onClick={() => void handleClaim(position.market.id)}
                              >
                                  {claimingId === position.market.id ? (
                                    <span className="inline-flex items-center gap-1">
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                      Claiming...
                                    </span>
                                  ) : (
                                    "Claim Winnings"
                                  )}
                              </Button>
                            ) : null}
                          </div>
                        );
                      })()
                    ))}
                  </div>
                </div>
              )}

              {openPositions.length === 0 ? (
                <SpotlightCard className="p-8">
                  <div className="text-center space-y-4">
                    <h3 className="text-lg font-semibold">No Active Markets</h3>
                    <Link href="/markets">
                      <Button>Browse Markets</Button>
                    </Link>
                  </div>
                </SpotlightCard>
              ) : (
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold text-gray-900">Active Markets</h2>
                  {openPositions.map((position) => (
                    <Link key={position.market.id} href={`/markets/${position.market.id}`} className="block">
                      <div className="relative overflow-hidden rounded-xl p-5 pl-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 bg-white/45 backdrop-blur-md border border-black/10">
                        {(() => {
                          const primarySide = position.yesAmount >= position.noAmount ? "YES" : "NO";
                          const primaryAmount = primarySide === "YES" ? position.yesAmount : position.noAmount;
                          const stripe = primarySide === "YES" ? "bg-green-500/75" : "bg-red-500/75";
                          const glow = primarySide === "YES" ? "bg-green-400/45" : "bg-red-400/45";

                          return (
                            <>
                              <div className={`absolute -left-4 top-1/2 -translate-y-1/2 h-28 w-12 rounded-full blur-2xl ${glow}`} />
                              <div className={`absolute left-0 top-0 h-full w-3 ${stripe}`} />
                              <div className="flex-1 min-w-0 w-full sm:w-auto space-y-1">
                                <p className="font-medium text-sm leading-snug">{position.market.question}</p>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="text-[11px] inline-flex items-center rounded-full border border-gray-300 bg-white/70 px-2 py-0.5 text-gray-600 w-fit">
                                    Active
                                  </p>
                                </div>
                                <p className="text-sm font-semibold text-gray-800">
                                  Position: {formatCollateral(primaryAmount)} {CONTRACTS.COLLATERAL_SYMBOL}
                                </p>
                              </div>
                              <div className="absolute left-0 top-0 h-full w-3 flex items-center justify-center">
                                <span className="[writing-mode:vertical-rl] rotate-180 text-[8px] tracking-[0.12em] font-semibold text-white">
                                  {primarySide}
                                </span>
                              </div>
                            </>
                          );
                        })()}
                        <div className="shrink-0 w-full sm:w-auto">
                          <Button size="sm" variant="outline" className="w-full sm:w-auto">Open</Button>
                        </div>
                      </div>
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
