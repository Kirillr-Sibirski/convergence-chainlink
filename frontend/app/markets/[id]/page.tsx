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
  redeemMarketTokens,
  removeMarketLiquidity,
  swapOutcomeTokens,
  type UIMarket,
} from "@/lib/web3-viem";

type Side = "YES" | "NO";

export default function MarketTradePage() {
  const params = useParams<{ id: string }>();
  const marketId = Number(params.id);
  const { account, connect, isConnecting } = useWallet();
  const [market, setMarket] = useState<UIMarket | null>(null);
  const [yesBalance, setYesBalance] = useState(BigInt(0));
  const [noBalance, setNoBalance] = useState(BigInt(0));
  const [side, setSide] = useState<Side>("YES");
  const [amount, setAmount] = useState("0.01");
  const [quoteOut, setQuoteOut] = useState<bigint>(BigInt(0));
  const [liquidityYes, setLiquidityYes] = useState("0.01");
  const [liquidityNo, setLiquidityNo] = useState("0.01");
  const [lpRemove, setLpRemove] = useState("0.01");
  const [poolState, setPoolState] = useState<PoolLiquidityState | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

    const buyYes = side === "YES";
    void quoteSwapOutput(market.id, buyYes, amount)
      .then(setQuoteOut)
      .catch(() => setQuoteOut(BigInt(0)));
  }, [market, amount, side]);

  const expired = useMemo(
    () => !!market && market.deadline <= Math.floor(Date.now() / 1000),
    [market]
  );
  const canTrade = !!market && !market.settled && !expired;

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
              <p className="text-sm text-gray-500">Direct AMM trading on AEEIA pool for this market.</p>
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
                      Swap in AMM
                    </CardTitle>
                    <CardDescription>
                      Buy {side} by selling {side === "YES" ? "NO" : "YES"} tokens.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant={side === "YES" ? "default" : "outline"} onClick={() => setSide("YES")}>
                        Buy YES
                      </Button>
                      <Button variant={side === "NO" ? "default" : "outline"} onClick={() => setSide("NO")}>
                        Buy NO
                      </Button>
                    </div>

                    <Input
                      type="number"
                      min="0"
                      step="0.0001"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="Amount to sell (ETH-denominated token)"
                    />

                    <p className="text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <EthIcon className="w-3 h-3" />
                        Estimated receive: {Number(formatEther(quoteOut)).toFixed(6)} {side}
                      </span>
                    </p>

                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        disabled={!canTrade || busy || Number(amount) <= 0}
                        onClick={() =>
                          void runAction(async () => {
                            const sellToken = side === "YES" ? market.noToken : market.yesToken;
                            const required = parseEther(amount);
                            const allowance = await getAllowance(
                              sellToken,
                              account as `0x${string}`,
                              market.pool
                            );
                            if (allowance < required) {
                              await approveTokenSpending(sellToken, market.pool, required);
                            }
                          })
                        }
                      >
                        Approve
                      </Button>
                      <Button
                        variant="outline"
                        disabled={!canTrade || busy || Number(amount) <= 0}
                        onClick={() =>
                          void runAction(async () => {
                            await swapOutcomeTokens(market.id, side === "YES", amount);
                          })
                        }
                      >
                        Trade
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Market Actions</CardTitle>
                  <CardDescription>Mint paired YES/NO tokens, provide liquidity, or redeem after settlement.</CardDescription>
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

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      disabled={!account || busy || !canTrade}
                      onClick={() =>
                        void runAction(async () => {
                          await mintMarketTokens(market.id, "0.01");
                        })
                      }
                    >
                      <EthIcon className="w-3.5 h-3.5" />
                      Mint 0.01
                    </Button>
                    <Button
                      variant="outline"
                      disabled={!account || busy || !market.settled}
                      onClick={() =>
                        void runAction(async () => {
                          await redeemMarketTokens(market.id);
                        })
                      }
                    >
                      Redeem Winnings
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="number"
                      min="0"
                      step="0.0001"
                      value={liquidityYes}
                      onChange={(e) => setLiquidityYes(e.target.value)}
                      placeholder="YES amount (ETH)"
                    />
                    <Input
                      type="number"
                      min="0"
                      step="0.0001"
                      value={liquidityNo}
                      onChange={(e) => setLiquidityNo(e.target.value)}
                      placeholder="NO amount (ETH)"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      disabled={!account || busy || !canTrade || Number(liquidityYes) <= 0 || Number(liquidityNo) <= 0}
                      onClick={() =>
                        void runAction(async () => {
                          await addMarketLiquidity(market.id, liquidityYes, liquidityNo);
                        })
                      }
                    >
                      Add Liquidity
                    </Button>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        min="0"
                        step="0.0001"
                        value={lpRemove}
                        onChange={(e) => setLpRemove(e.target.value)}
                        placeholder="LP amount (ETH)"
                      />
                      <Button
                        variant="outline"
                        disabled={!account || busy || Number(lpRemove) <= 0}
                        onClick={() =>
                          void runAction(async () => {
                            await removeMarketLiquidity(market.id, lpRemove);
                          })
                        }
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
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
