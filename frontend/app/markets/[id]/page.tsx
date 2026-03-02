"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { formatEther, parseEther } from "viem";
import { ArrowLeftRight } from "lucide-react";
import { SimpleHeader } from "@/components/layout/SimpleHeader";
import { BackgroundBeams } from "@/components/ui/background-beams";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EthIcon } from "@/components/ui/eth-icon";
import { useWallet } from "@/hooks/useWallet";
import {
  addMarketLiquidity,
  approveTokenSpending,
  fetchMarkets,
  getPoolLiquidityState,
  getAllowance,
  getUserMarketBalances,
  type PoolLiquidityState,
  mintMarketTokens,
  quoteSwapOutput,
  swapOutcomeTokens,
  type UIMarket,
} from "@/lib/web3-viem";
import { CRE_SIM_CMD, getPendingCreResolutionCount } from "@/lib/cre-gate";

type Side = "YES" | "NO";
type TradeMode = "buy" | "sell";

export default function MarketTradePage() {
  const params = useParams<{ id: string }>();
  const marketId = Number(params.id);
  const { account, connect, isConnecting } = useWallet();
  const [market, setMarket] = useState<UIMarket | null>(null);
  const [yesBalance, setYesBalance] = useState(BigInt(0));
  const [noBalance, setNoBalance] = useState(BigInt(0));
  const [mode, setMode] = useState<TradeMode>("buy");
  const [side, setSide] = useState<Side>("YES");
  const [amount, setAmount] = useState("0.01");
  const [quoteOut, setQuoteOut] = useState<bigint>(BigInt(0));
  const [liquidityAmount, setLiquidityAmount] = useState("0.1");
  const [poolState, setPoolState] = useState<PoolLiquidityState | null>(null);
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
        const [yes, no] = await getUserMarketBalances(current.id, account as `0x${string}`);
        const ps = await getPoolLiquidityState(current.id, account as `0x${string}`);
        setYesBalance(yes);
        setNoBalance(no);
        setPoolState(ps);
      } else if (current) {
        const ps = await getPoolLiquidityState(current.id);
        setPoolState(ps);
      } else {
        setYesBalance(BigInt(0));
        setNoBalance(BigInt(0));
        setPoolState(null);
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

  useEffect(() => {
    if (!market || Number(amount) <= 0) {
      setQuoteOut(BigInt(0));
      return;
    }

    const buyYes = mode === "buy" ? side === "YES" : side === "NO";
    void quoteSwapOutput(market.id, buyYes, amount)
      .then(setQuoteOut)
      .catch(() => setQuoteOut(BigInt(0)));
  }, [market, amount, mode, side]);

  const expired = useMemo(
    () => !!market && market.deadline <= Math.floor(Date.now() / 1000),
    [market]
  );
  const creBlocked = pendingCreResolution > 0;
  const canTrade = !!market && !market.settled && !expired && !creBlocked;
  const hasPoolLiquidity =
    !!poolState &&
    poolState.reserveYes > BigInt(0) &&
    poolState.reserveNo > BigInt(0);
  const buyYes = mode === "buy" ? side === "YES" : side === "NO";
  const sellTokenLabel: Side = buyYes ? "NO" : "YES";
  const receiveTokenLabel: Side = buyYes ? "YES" : "NO";

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
              <h1 className="text-2xl font-bold text-gray-900">Trade Outcome Tokens</h1>
              <p className="text-sm text-gray-500">Buy, sell, or provide liquidity for this market.</p>
            </div>
            <Link href="/dashboard">
              <Button variant="outline">Back to Open Bets</Button>
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

              {expired && !market.resolved && (
                <Card>
                  <CardContent className="pt-6 text-sm rounded-md border border-amber-300 bg-amber-50 text-amber-800 space-y-1">
                    <p>This market has passed its deadline and is waiting for the final result.</p>
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
                    <p className="text-muted-foreground">Your YES</p>
                    <p className="font-semibold">{Number(formatEther(yesBalance)).toFixed(4)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Your NO</p>
                    <p className="font-semibold">{Number(formatEther(noBalance)).toFixed(4)}</p>
                  </div>
                </CardContent>
              </Card>

              {!account ? (
                <Card>
                  <CardContent className="pt-6 flex items-center justify-between gap-3">
                    <p className="text-sm text-muted-foreground">Connect wallet to trade.</p>
                    <Button onClick={() => void connect()} disabled={isConnecting}>
                      {isConnecting ? "Connecting..." : "Connect Wallet"}
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <ArrowLeftRight className="w-4 h-4" />
                      Trade Outcome Tokens
                    </CardTitle>
                    <CardDescription>
                      Choose Buy or Sell, pick YES/NO, and trade in one click.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant={mode === "buy" ? "default" : "outline"}
                        className={mode === "buy" ? "bg-green-600 hover:bg-green-700 border-green-700 text-white" : ""}
                        disabled={creBlocked}
                        onClick={() => setMode("buy")}
                      >
                        Buy
                      </Button>
                      <Button
                        variant={mode === "sell" ? "default" : "outline"}
                        className={mode === "sell" ? "bg-red-600 hover:bg-red-700 border-red-700 text-white" : ""}
                        disabled={creBlocked}
                        onClick={() => setMode("sell")}
                      >
                        Sell
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant={side === "YES" ? "default" : "outline"}
                        className={side === "YES" ? "bg-green-600 hover:bg-green-700 border-green-700 text-white" : "border-green-300 text-green-700"}
                        disabled={creBlocked}
                        onClick={() => setSide("YES")}
                      >
                        YES
                      </Button>
                      <Button
                        variant={side === "NO" ? "default" : "outline"}
                        className={side === "NO" ? "bg-red-600 hover:bg-red-700 border-red-700 text-white" : "border-red-300 text-red-700"}
                        disabled={creBlocked}
                        onClick={() => setSide("NO")}
                      >
                        NO
                      </Button>
                    </div>

                    <div className={`rounded-md border p-3 ${sellTokenLabel === "YES" ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
                      <p className="text-xs mb-1 font-medium">
                        You pay ({sellTokenLabel})
                      </p>
                      <Input
                        type="number"
                        min="0"
                        step="0.0001"
                        value={amount}
                        disabled={creBlocked}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder={`Amount of ${sellTokenLabel} tokens`}
                        className="bg-white"
                      />
                    </div>

                    <p className="text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <EthIcon className="w-3 h-3" />
                        Estimated receive: {Number(formatEther(quoteOut)).toFixed(6)} {receiveTokenLabel}
                      </span>
                    </p>

                    <Button
                      variant="default"
                      className={side === "YES" ? "w-full bg-green-600 hover:bg-green-700 border-green-700 text-white" : "w-full bg-red-600 hover:bg-red-700 border-red-700 text-white"}
                      disabled={!canTrade || !hasPoolLiquidity || busy || Number(amount) <= 0}
                      onClick={() =>
                        void runAction(async () => {
                          const sellToken = buyYes ? market.noToken : market.yesToken;
                          const required = parseEther(amount);
                          const allowance = await getAllowance(
                            sellToken,
                            account as `0x${string}`,
                            market.pool
                          );
                          if (allowance < required) {
                            await approveTokenSpending(sellToken, market.pool, required);
                          }
                          await swapOutcomeTokens(market.id, buyYes, amount);
                        })
                      }
                    >
                      {busy ? "Executing..." : `Approve & ${mode === "buy" ? "Buy" : "Sell"} ${side}`}
                    </Button>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Provide Liquidity</CardTitle>
                  <CardDescription>Provide liquidity with ETH in one step.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Pool YES Reserve</p>
                      <p className="font-semibold">
                        {poolState ? Number(formatEther(poolState.reserveYes)).toFixed(4) : "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Pool NO Reserve</p>
                      <p className="font-semibold">
                        {poolState ? Number(formatEther(poolState.reserveNo)).toFixed(4) : "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">LP Total Supply</p>
                      <p className="font-semibold">
                        {poolState ? Number(formatEther(poolState.lpTotalSupply)).toFixed(4) : "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Your LP Balance</p>
                      <p className="font-semibold">
                        {poolState ? Number(formatEther(poolState.userLpBalance)).toFixed(4) : "-"}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-md border border-gray-200 bg-gray-50 p-3 space-y-2">
                    <p className="text-xs font-medium text-gray-700">Liquidity Amount</p>
                    <div className="flex items-center gap-2">
                      <EthIcon className="w-4 h-4 text-gray-600 shrink-0" />
                      <Input
                        type="number"
                        min="0"
                        step="0.0001"
                        value={liquidityAmount}
                        disabled={creBlocked}
                        onChange={(e) => setLiquidityAmount(e.target.value)}
                        placeholder="ETH amount"
                        className="bg-white"
                      />
                    </div>
                    <Button
                      variant="outline"
                      className="w-full"
                      disabled={!account || busy || !canTrade || Number(liquidityAmount) <= 0 || creBlocked}
                      onClick={() =>
                        void runAction(async () => {
                          await mintMarketTokens(market.id, liquidityAmount);
                          await addMarketLiquidity(market.id, liquidityAmount, liquidityAmount);
                        })
                      }
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <EthIcon className="w-3.5 h-3.5" />
                        Provide Liquidity
                      </span>
                    </Button>
                    <p className="text-[11px] text-muted-foreground">
                      This uses your ETH to mint matching YES/NO tokens and adds them to the pool.
                    </p>
                  </div>
                  {!hasPoolLiquidity && (
                    <p className="text-xs text-muted-foreground">
                      No active liquidity in this pool yet. Add liquidity before trading swaps.
                    </p>
                  )}
                </CardContent>
              </Card>
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
