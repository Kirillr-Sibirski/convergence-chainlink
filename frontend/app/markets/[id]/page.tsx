"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { formatUnits, parseUnits } from "viem";
import { ArrowRight } from "lucide-react";
import { SimpleHeader } from "@/components/layout/SimpleHeader";
import { BackgroundBeams } from "@/components/ui/background-beams";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UsdcIcon } from "@/components/ui/usdc-icon";
import { Skeleton } from "@/components/ui/skeleton";
import { MarketPriceChart } from "@/components/trading/MarketPriceChart";
import { useWallet } from "@/hooks/useWallet";
import { CONTRACTS } from "@/lib/contracts";
import {
  claimWinnings,
  formatCollateral,
  fetchMarkets,
  fetchMarketPriceHistory,
  fetchMarketTradeHistory,
  getCollateralBalance,
  getUserBet,
  getUserClaimablePayout,
  type MarketTradeEntry,
  type MarketPricePoint,
  placeBet,
  sellShares,
  type UIMarket,
} from "@/lib/web3-viem";
import { CRE_SIM_CMD, getPendingCreResolutionCount } from "@/lib/cre-gate";

type Side = "YES" | "NO";
type Mode = "buy" | "sell";
const CARD_SHELL = "border-gray-200/80 bg-white/72 backdrop-blur-xl shadow-[0_16px_34px_rgba(15,23,42,0.08)]";
const EXPLORER_TX_BASE_URL =
  process.env.NEXT_PUBLIC_EXPLORER_TX_BASE_URL?.trim() ||
  (() => {
    const base = process.env.NEXT_PUBLIC_BLOCK_EXPLORER_URL?.trim();
    if (!base) return "";
    return `${base.replace(/\/$/, "")}/tx/`;
  })();

function formatCollateralInput(value: bigint): string {
  const raw = formatUnits(value, CONTRACTS.COLLATERAL_DECIMALS);
  return raw.replace(/\.?0+$/, "");
}

function parseAmountUnits(amount: string): bigint | null {
  try {
    if (!amount || Number(amount) <= 0) return null;
    return parseUnits(amount, CONTRACTS.COLLATERAL_DECIMALS);
  } catch {
    return null;
  }
}

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function fmtTradeTs(ts: number) {
  return new Date(ts * 1000).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isUserRejectedErrorMessage(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("user reject") ||
    normalized.includes("user denied") ||
    normalized.includes("user cancel") ||
    normalized.includes("rejected the request")
  );
}

export default function MarketBetPage() {
  const params = useParams<{ id: string }>();
  const marketId = Number(params.id);
  const { account, connect, isConnecting } = useWallet();
  const [market, setMarket] = useState<UIMarket | null>(null);
  const [yesBet, setYesBet] = useState(BigInt(0));
  const [noBet, setNoBet] = useState(BigInt(0));
  const [claimable, setClaimable] = useState(BigInt(0));
  const [walletBalance, setWalletBalance] = useState(BigInt(0));
  const [pricePoints, setPricePoints] = useState<MarketPricePoint[]>([]);
  const [tradeHistory, setTradeHistory] = useState<MarketTradeEntry[]>([]);
  const [mode, setMode] = useState<Mode>("buy");
  const [side, setSide] = useState<Side>("YES");
  const [amount, setAmount] = useState("0.01");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorVariant, setErrorVariant] = useState<"error" | "info">("error");
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
      if (current) {
        const [historyPoints, trades] = await Promise.all([
          fetchMarketPriceHistory(current.id),
          fetchMarketTradeHistory(current.id, 40),
        ]);
        setPricePoints(historyPoints);
        setTradeHistory(trades);
      } else {
        setPricePoints([]);
        setTradeHistory([]);
      }

      if (current && account) {
        const balance = await getCollateralBalance(account as `0x${string}`);
        const bet = await getUserBet(current.id, account as `0x${string}`);
        const [canClaim, payout] = await getUserClaimablePayout(current.id, account as `0x${string}`);
        setWalletBalance(balance);
        setYesBet(bet.yesAmount);
        setNoBet(bet.noAmount);
        setClaimable(canClaim ? payout : BigInt(0));
      } else {
        setWalletBalance(BigInt(0));
        setYesBet(BigInt(0));
        setNoBet(BigInt(0));
        setClaimable(BigInt(0));
      }
    } catch (err) {
      console.error(err);
      setErrorVariant("error");
      setError(err instanceof Error ? err.message : "Failed to load market");
    } finally {
      setLoading(false);
    }
  }, [account, marketId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!error) return;
    const timeoutMs = errorVariant === "info" ? 2600 : 5200;
    const id = window.setTimeout(() => {
      setError(null);
    }, timeoutMs);
    return () => window.clearTimeout(id);
  }, [error, errorVariant]);

  const now = Math.floor(Date.now() / 1000);
  const expired = useMemo(() => !!market && market.deadline <= now, [market, now]);
  const creBlocked = pendingCreResolution > 0;
  const canBet = !!market && !market.settled && !expired && !creBlocked;
  const selectedBalance = side === "YES" ? yesBet : noBet;
  const maxBuyWei = walletBalance;
  const maxSellWei = selectedBalance;
  const activeMaxWei = mode === "buy" ? maxBuyWei : maxSellWei;
  const amountWei = parseAmountUnits(amount);
  const deadlineLabel = market
    ? new Date(market.deadline * 1000).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "UTC",
      }) + " UTC"
    : "-";

  const runAction = useCallback(
    async (fn: () => Promise<void>) => {
      try {
        setBusy(true);
        setError(null);
        await fn();
        await load();
      } catch (err) {
        console.error(err);
        const message = err instanceof Error ? err.message : "Transaction failed";
        if (isUserRejectedErrorMessage(message)) {
          setErrorVariant("info");
          setError("Transaction cancelled in wallet. No changes were made.");
        } else {
          setErrorVariant("error");
          setError(message);
        }
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
        <div className="container mx-auto max-w-6xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Place Bet</h1>
            </div>
            <Link href="/markets">
              <Button variant="outline" className="w-full sm:w-auto">Back to Markets</Button>
            </Link>
          </div>

          {loading ? (
            <div className="space-y-5">
              <Card className={CARD_SHELL}>
                <CardHeader className="space-y-2">
                  <Skeleton className="h-5 w-[72%]" />
                  <Skeleton className="h-4 w-[54%]" />
                </CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-3 w-14" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </CardContent>
              </Card>

              <div className="grid lg:grid-cols-[1.45fr_1fr] gap-5 items-stretch">
                <Card className={`${CARD_SHELL} h-full`}>
                  <CardHeader className="space-y-2">
                    <Skeleton className="h-5 w-28" />
                    <Skeleton className="h-4 w-48" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-[300px] w-full rounded-lg" />
                  </CardContent>
                </Card>

                <Card className={`${CARD_SHELL} h-full`}>
                  <CardHeader>
                    <Skeleton className="h-5 w-28" />
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Skeleton className="h-10 w-full rounded-lg" />
                    <Skeleton className="h-10 w-full rounded-lg" />
                    <Skeleton className="h-10 w-full rounded-lg" />
                    <Skeleton className="h-10 w-full rounded-md" />
                  </CardContent>
                </Card>
              </div>

              <Card className={CARD_SHELL}>
                <CardHeader className="space-y-2">
                  <Skeleton className="h-5 w-28" />
                  <Skeleton className="h-4 w-44" />
                </CardHeader>
                <CardContent className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={`trade-history-skeleton-${i}`} className="h-14 w-full rounded-xl" />
                  ))}
                </CardContent>
              </Card>
            </div>
          ) : !market ? (
            <Card className={CARD_SHELL}>
              <CardContent className="pt-6 text-sm text-destructive">Market not found.</CardContent>
            </Card>
          ) : (
            <>
              {creBlocked && (
                <Card className={CARD_SHELL}>
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

              <Card className={CARD_SHELL}>
                <CardHeader>
                  <CardTitle className="text-base">{market.question}</CardTitle>
                  <CardDescription>
                    Resolution Time: {deadlineLabel}
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-2 text-[12px]">
                  <div>
                    <p className="text-muted-foreground">Total Volume</p>
                    <p className="font-medium text-gray-700">
                      {formatCollateral(market.totalVolume)} {CONTRACTS.COLLATERAL_SYMBOL}
                    </p>
                  </div>
                  <div className="rounded-xl bg-white/45 backdrop-blur-md border border-black/10 px-3 py-2">
                    <p className="text-muted-foreground">YES Pool</p>
                    <p className="font-medium text-gray-700">
                      {formatCollateral(market.totalYes)} {CONTRACTS.COLLATERAL_SYMBOL}
                    </p>
                  </div>
                  <div className="rounded-xl bg-white/45 backdrop-blur-md border border-black/10 px-3 py-2">
                    <p className="text-muted-foreground">NO Pool</p>
                    <p className="font-medium text-gray-700">
                      {formatCollateral(market.totalNo)} {CONTRACTS.COLLATERAL_SYMBOL}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <div className="grid lg:grid-cols-[1.45fr_1fr] gap-5 items-stretch">
                <Card className={`${CARD_SHELL} h-full flex flex-col`}>
                  <CardHeader>
                    <CardTitle className="text-base">Price Chart</CardTitle>
                    <CardDescription>Historical implied YES probability from onchain trades.</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <MarketPriceChart points={pricePoints} />
                  </CardContent>
                </Card>

                {!account ? (
                  <Card className={`${CARD_SHELL} h-full flex flex-col`}>
                    <CardContent className="pt-6 flex-1 flex flex-col items-start gap-3">
                      <p className="text-sm text-muted-foreground">Connect wallet to trade shares.</p>
                      <p className="text-xs text-gray-500">Wallet balance will appear here after connection.</p>
                      <Button onClick={() => void connect()} disabled={isConnecting}>
                        {isConnecting ? "Connecting..." : "Connect Wallet"}
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className={`${CARD_SHELL} h-full flex flex-col`}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Trade Shares</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 flex-1 flex flex-col">
                      <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-3 space-y-3">
                        <div className="space-y-1">
                          <p className="text-[11px] tracking-[0.08em] uppercase text-gray-500">Action</p>
                          <div className="grid grid-cols-2 rounded-lg bg-gray-100 p-1">
                            <button
                              type="button"
                              disabled={creBlocked}
                              onClick={() => setMode("buy")}
                              className={`h-9 rounded-md text-sm font-medium transition ${
                                mode === "buy"
                                  ? "bg-white text-gray-900 border border-gray-200 shadow-sm"
                                  : "text-gray-500 hover:text-gray-700"
                              }`}
                            >
                              Buy
                            </button>
                            <button
                              type="button"
                              disabled={creBlocked}
                              onClick={() => setMode("sell")}
                              className={`h-9 rounded-md text-sm font-medium transition ${
                                mode === "sell"
                                  ? "bg-gray-900 text-white shadow-sm"
                                  : "text-gray-500 hover:text-gray-700"
                              }`}
                            >
                              Sell
                            </button>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <p className="text-[11px] tracking-[0.08em] uppercase text-gray-500">Outcome</p>
                          <div className="grid grid-cols-2 gap-1 rounded-lg bg-gray-100 p-1">
                            <div className="relative">
                              <div
                                className={`pointer-events-none absolute inset-0 rounded-md blur-md transition-opacity ${
                                  side === "YES" ? "bg-green-400/40 opacity-100" : "bg-green-400/20 opacity-70"
                                }`}
                              />
                              <button
                                type="button"
                                disabled={creBlocked}
                                onClick={() => setSide("YES")}
                                className={`relative z-10 h-9 w-full rounded-md text-sm font-medium transition ${
                                  side === "YES"
                                    ? "bg-green-600 text-white shadow-sm"
                                    : "text-green-700 hover:bg-green-50"
                                }`}
                              >
                                YES
                              </button>
                            </div>
                            <div className="relative">
                              <div
                                className={`pointer-events-none absolute inset-0 rounded-md blur-md transition-opacity ${
                                  side === "NO" ? "bg-red-400/40 opacity-100" : "bg-red-400/20 opacity-70"
                                }`}
                              />
                              <button
                                type="button"
                                disabled={creBlocked}
                                onClick={() => setSide("NO")}
                                className={`relative z-10 h-9 w-full rounded-md text-sm font-medium transition ${
                                  side === "NO" ? "bg-red-600 text-white shadow-sm" : "text-red-700 hover:bg-red-50"
                                }`}
                              >
                                NO
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <p className="text-[11px] tracking-[0.08em] uppercase text-gray-500">Amount</p>
                          <div className="relative">
                            <Input
                              type="number"
                              min="0"
                              step="0.0001"
                              value={amount}
                              disabled={creBlocked}
                              onChange={(e) => setAmount(e.target.value)}
                              placeholder="0.0100"
                              className="pr-28 bg-white"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 text-xs text-gray-500">
                              <UsdcIcon className="h-3 w-3" />
                              {CONTRACTS.COLLATERAL_SYMBOL}
                            </span>
                            <button
                              type="button"
                              onClick={() => setAmount(formatCollateralInput(activeMaxWei))}
                              disabled={activeMaxWei === BigInt(0) || creBlocked}
                              className="absolute right-16 top-1/2 -translate-y-1/2 text-[10px] font-semibold px-1.5 py-0.5 rounded border border-gray-300 bg-gray-50 text-gray-600 hover:bg-gray-100 disabled:opacity-50"
                            >
                              MAX
                            </button>
                          </div>
                        </div>
                      </div>

                      <Button
                        className="w-full"
                        disabled={
                          !canBet ||
                          busy ||
                          !amountWei ||
                          amountWei <= BigInt(0) ||
                          amountWei > activeMaxWei
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
                        {busy ? (
                          "Submitting..."
                        ) : (
                          <span className="inline-flex items-center gap-2">
                            {mode === "buy" ? `Buy ${side}` : `Sell ${side}`}
                            <ArrowRight className="h-4 w-4" />
                          </span>
                        )}
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
                          {busy
                            ? "Claiming..."
                            : `Claim ${formatCollateral(claimable)} ${CONTRACTS.COLLATERAL_SYMBOL}`}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>

              <Card className={CARD_SHELL}>
                <CardHeader>
                  <CardTitle className="text-base">Trade History</CardTitle>
                  <CardDescription>Latest buys and sells for this market.</CardDescription>
                </CardHeader>
                <CardContent>
                  {tradeHistory.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No trades yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {tradeHistory.map((entry) => (
                        <div key={`${entry.txHash}-${entry.logIndex}`} className="relative overflow-hidden rounded-xl bg-white/45 backdrop-blur-md px-3 py-2.5 pl-9 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
                          <div
                            className={`absolute -left-4 top-1/2 -translate-y-1/2 h-24 w-10 rounded-full blur-2xl ${
                              entry.onYes ? "bg-green-400/45" : "bg-red-400/45"
                            }`}
                          />
                          <div className={`absolute left-0 top-0 h-full w-3 ${entry.onYes ? "bg-green-500/75" : "bg-red-500/75"}`} />
                          <div className="absolute left-0 top-0 h-full w-3 flex items-center justify-center">
                            <span className="[writing-mode:vertical-rl] rotate-180 text-[8px] tracking-[0.12em] font-semibold text-white">
                              {entry.onYes ? "YES" : "NO"}
                            </span>
                          </div>

                          <div className="min-w-0 w-full sm:w-auto">
                            <p className="text-sm font-medium text-gray-900">
                              {formatCollateral(entry.amount)} {CONTRACTS.COLLATERAL_SYMBOL}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              {account && entry.trader.toLowerCase() === account.toLowerCase()
                                ? "You"
                                : shortAddr(entry.trader)}{" "}
                              · {fmtTradeTs(entry.timestamp)}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
                            {entry.type === "buy" ? (
                              <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-green-700 text-xs font-medium">
                                Buy
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full bg-gray-900 px-2 py-0.5 text-white text-xs font-medium">
                                Sell
                              </span>
                            )}
                            {EXPLORER_TX_BASE_URL ? (
                              <a
                                href={`${EXPLORER_TX_BASE_URL}${entry.txHash}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs text-gray-500 hover:text-gray-800 underline underline-offset-2"
                              >
                                Tx
                              </a>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}

          {error && (
            <div
              className={`fixed top-4 right-4 z-[320] max-w-sm rounded-lg border px-4 py-2 text-sm shadow-lg ${
                errorVariant === "info"
                  ? "border-gray-300 bg-white text-gray-800"
                  : "border-red-200 bg-red-50 text-red-700"
              }`}
            >
              {error}
            </div>
          )}
        </div>
      </main>
      <BackgroundBeams />
    </div>
  );
}
