"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { formatEther } from "viem";
import { SimpleHeader } from "@/components/layout/SimpleHeader";
import { BackgroundBeams } from "@/components/ui/background-beams";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/hooks/useWallet";
import {
  claimWinnings,
  fetchMarkets,
  getUserBet,
  getUserClaimablePayout,
  placeBet,
  sellShares,
  type UIMarket,
} from "@/lib/web3-viem";
import { CRE_SIM_CMD, getPendingCreResolutionCount } from "@/lib/cre-gate";

type Side = "YES" | "NO";
type Mode = "buy" | "sell";

export default function MarketBetPage() {
  const params = useParams<{ id: string }>();
  const marketId = Number(params.id);
  const { account, connect, isConnecting } = useWallet();
  const [market, setMarket] = useState<UIMarket | null>(null);
  const [yesBet, setYesBet] = useState(BigInt(0));
  const [noBet, setNoBet] = useState(BigInt(0));
  const [claimable, setClaimable] = useState(BigInt(0));
  const [mode, setMode] = useState<Mode>("buy");
  const [side, setSide] = useState<Side>("YES");
  const [amount, setAmount] = useState("0.01");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingCreResolution, setPendingCreResolution] = useState(0);

  const load = useCallback(async () => {
    if (!Number.isFinite(marketId) || marketId <= 0) {
      setError("Invalid market id");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const markets = await fetchMarkets();
      setPendingCreResolution(getPendingCreResolutionCount(markets));
      const current = markets.find((m) => m.id === marketId) ?? null;
      setMarket(current);

      if (current && account) {
        const bet = await getUserBet(current.id, account as `0x${string}`);
        const [canClaim, payout] = await getUserClaimablePayout(current.id, account as `0x${string}`);
        setYesBet(bet.yesAmount);
        setNoBet(bet.noAmount);
        setClaimable(canClaim ? payout : BigInt(0));
      } else {
        setYesBet(BigInt(0));
        setNoBet(BigInt(0));
        setClaimable(BigInt(0));
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to load market");
    } finally {
      setLoading(false);
    }
  }, [account, marketId]);

  useEffect(() => {
    void load();
  }, [load]);

  const now = Math.floor(Date.now() / 1000);
  const expired = useMemo(() => !!market && market.deadline <= now, [market, now]);
  const creBlocked = pendingCreResolution > 0;
  const canBet = !!market && !market.settled && !expired && !creBlocked;
  const selectedBalance = side === "YES" ? yesBet : noBet;

  const runAction = useCallback(
    async (fn: () => Promise<void>) => {
      try {
        setBusy(true);
        setError(null);
        await fn();
        await load();
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : "Transaction failed");
      } finally {
        setBusy(false);
      }
    },
    [load]
  );

  return (
    <div className="min-h-screen relative">
      <SimpleHeader />
      <main className="relative z-10 px-4 py-8">
        <div className="container mx-auto max-w-3xl space-y-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Place Bet</h1>
              <p className="text-sm text-gray-500">Simple ETH prediction market. Pick YES/NO and submit your bet.</p>
            </div>
            <Link href="/markets">
              <Button variant="outline">Back to Markets</Button>
            </Link>
          </div>

          {loading ? (
            <Card>
              <CardContent className="pt-6 text-sm text-muted-foreground">Loading market...</CardContent>
            </Card>
          ) : !market ? (
            <Card>
              <CardContent className="pt-6 text-sm text-destructive">Market not found.</CardContent>
            </Card>
          ) : (
            <>
              {creBlocked && (
                <Card>
                  <CardContent className="pt-6 text-sm rounded-md border border-amber-300 bg-amber-50 text-amber-800 space-y-1">
                    <p>
                      CRE simulation required. {pendingCreResolution} expired unresolved market
                      {pendingCreResolution !== 1 ? "s are" : " is"} blocking further actions.
                    </p>
                    <p className="text-xs">
                      Run <code>{CRE_SIM_CMD}</code>, then refresh.
                    </p>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{market.question}</CardTitle>
                  <CardDescription>
                    Market #{market.id} · {market.settled ? "Settled" : "Open"} · YES {market.yesPercent.toFixed(2)}%
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Total YES</p>
                    <p className="font-semibold">{Number(formatEther(market.totalYes)).toFixed(4)} ETH</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Total NO</p>
                    <p className="font-semibold">{Number(formatEther(market.totalNo)).toFixed(4)} ETH</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Your YES Bet</p>
                    <p className="font-semibold">{Number(formatEther(yesBet)).toFixed(4)} ETH</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Your NO Bet</p>
                    <p className="font-semibold">{Number(formatEther(noBet)).toFixed(4)} ETH</p>
                  </div>
                </CardContent>
              </Card>

              {!account ? (
                <Card>
                  <CardContent className="pt-6 flex items-center justify-between gap-3">
                    <p className="text-sm text-muted-foreground">Connect wallet to place bets.</p>
                    <Button onClick={() => void connect()} disabled={isConnecting}>
                      {isConnecting ? "Connecting..." : "Connect Wallet"}
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Trade Shares</CardTitle>
                    <CardDescription>Buy or sell YES/NO shares with ETH.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 rounded-xl border border-gray-200 bg-white p-4 shadow-[0_16px_35px_rgba(15,23,42,0.08)]">
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant={mode === "buy" ? "default" : "outline"}
                        className={mode === "buy" ? "bg-gray-900 text-white hover:bg-gray-800" : ""}
                        disabled={creBlocked}
                        onClick={() => setMode("buy")}
                      >
                        Buy
                      </Button>
                      <Button
                        variant={mode === "sell" ? "default" : "outline"}
                        className={mode === "sell" ? "bg-gray-900 text-white hover:bg-gray-800" : ""}
                        disabled={creBlocked}
                        onClick={() => setMode("sell")}
                      >
                        Sell
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant={side === "YES" ? "default" : "outline"}
                        className={
                          side === "YES"
                            ? "bg-green-600 hover:bg-green-700 border-green-700 text-white"
                            : "border-green-300 text-green-700 bg-green-50/50"
                        }
                        disabled={creBlocked}
                        onClick={() => setSide("YES")}
                      >
                        YES
                      </Button>
                      <Button
                        variant={side === "NO" ? "default" : "outline"}
                        className={
                          side === "NO"
                            ? "bg-red-600 hover:bg-red-700 border-red-700 text-white"
                            : "border-red-300 text-red-700 bg-red-50/50"
                        }
                        disabled={creBlocked}
                        onClick={() => setSide("NO")}
                      >
                        NO
                      </Button>
                    </div>

                    <Input
                      type="number"
                      min="0"
                      step="0.0001"
                      value={amount}
                      disabled={creBlocked}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="ETH amount"
                    />
                    {mode === "sell" && (
                      <p className="text-xs text-muted-foreground">
                        Available to sell ({side}): {Number(formatEther(selectedBalance)).toFixed(4)} ETH
                      </p>
                    )}

                    <Button
                      className="w-full"
                      disabled={
                        !canBet ||
                        busy ||
                        Number(amount) <= 0 ||
                        (mode === "sell" && parseFloat(amount || "0") > Number(formatEther(selectedBalance)))
                      }
                      onClick={() =>
                        void runAction(async () => {
                          if (mode === "buy") {
                            await placeBet(market.id, side === "YES", amount);
                          } else {
                            await sellShares(market.id, side === "YES", amount);
                          }
                        })
                      }
                    >
                      {busy ? "Submitting..." : mode === "buy" ? `Buy ${side}` : `Sell ${side}`}
                    </Button>

                    {market.settled && claimable > BigInt(0) && (
                      <Button
                        variant="outline"
                        className="w-full"
                        disabled={busy || creBlocked}
                        onClick={() =>
                          void runAction(async () => {
                            await claimWinnings(market.id);
                          })
                        }
                      >
                        {busy ? "Claiming..." : `Claim ${Number(formatEther(claimable)).toFixed(4)} ETH`}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {error && (
            <Card>
              <CardContent className="pt-6 text-sm text-destructive">{error}</CardContent>
            </Card>
          )}
        </div>
      </main>
      <BackgroundBeams />
    </div>
  );
}
