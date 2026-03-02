"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatEther, parseEther } from "viem";
import { SimpleHeader } from "@/components/layout/SimpleHeader";
import { BackgroundBeams } from "@/components/ui/background-beams";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EthIcon } from "@/components/ui/eth-icon";
import { useWallet } from "@/hooks/useWallet";
import { CONTRACTS, ZERO_ADDRESS } from "@/lib/contracts";
import {
  approveTokenSpending,
  claimStakingRewards,
  fetchStakePools,
  getAllowance,
  type StakePoolUI,
  stakeOutcomeToken,
  withdrawOutcomeToken,
} from "@/lib/web3-viem";

function formatPct(v: number) {
  if (!Number.isFinite(v)) return "0.00%";
  return `${v.toFixed(2)}%`;
}

function formatTs(ts: number) {
  if (!ts) return "Not configured";
  return new Date(ts * 1000).toLocaleString();
}

export default function StakePage() {
  const { account, connect, isConnecting } = useWallet();
  const [pools, setPools] = useState<StakePoolUI[]>([]);
  const [amounts, setAmounts] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [busyPoolId, setBusyPoolId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadPools = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const addr = account ? (account as `0x${string}`) : undefined;
      setPools(await fetchStakePools(addr));
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to load staking pools");
    } finally {
      setLoading(false);
    }
  }, [account]);

  useEffect(() => {
    void loadPools();
  }, [loadPools]);

  const stakingConfigured = useMemo(
    () => (CONTRACTS.STAKING_ADDRESS as string) !== ZERO_ADDRESS,
    []
  );

  const runPoolAction = useCallback(
    async (poolId: number, fn: () => Promise<void>) => {
      try {
        setBusyPoolId(poolId);
        setError(null);
        await fn();
        await loadPools();
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : "Staking action failed");
      } finally {
        setBusyPoolId(null);
      }
    },
    [loadPools]
  );

  return (
    <div className="min-h-screen relative">
      <SimpleHeader />
      <main className="relative z-10 px-4 py-8">
        <div className="container mx-auto max-w-5xl space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Stake Your Outcome Tokens</h1>
            <p className="text-sm text-gray-500">
              Stake YES/NO tokens to earn AEEIA rewards from protocol fee distribution.
            </p>
          </div>

          {!account && (
            <Card>
              <CardContent className="pt-6 flex items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">Connect a wallet to stake and claim AEEIA rewards.</p>
                <Button variant="outline" onClick={() => void connect()} disabled={isConnecting}>
                  {isConnecting ? "Connecting..." : "Connect Wallet"}
                </Button>
              </CardContent>
            </Card>
          )}

          {!stakingConfigured && (
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-destructive">
                  Staking contract is not configured yet. Set `STAKING_ADDRESS` in frontend contracts config.
                </p>
              </CardContent>
            </Card>
          )}

          {error && (
            <Card>
              <CardContent className="pt-6 text-sm text-destructive">{error}</CardContent>
            </Card>
          )}

          {loading ? (
            <Card>
              <CardContent className="pt-6 text-sm text-muted-foreground">Loading staking pools...</CardContent>
            </Card>
          ) : pools.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-sm text-muted-foreground">
                No staking pools found yet. Create market pools in `OutcomeStaking` and fund rewards in AEEIA.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {pools.map((pool) => {
                const amount = amounts[pool.id] ?? "";
                const busy = busyPoolId === pool.id;
                return (
                  <Card key={pool.id}>
                    <CardHeader>
                      <CardTitle className="text-base">{pool.label}</CardTitle>
                      <CardDescription>
                        Market #{pool.marketId} · {pool.isYes ? "YES" : "NO"} pool
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-muted-foreground">APY</p>
                          <p className="font-semibold">{formatPct(pool.aprPercent)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Total Staked</p>
                          <p className="font-semibold">{Number(formatEther(pool.totalStaked)).toFixed(4)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Your Stake</p>
                          <p className="font-semibold">{Number(formatEther(pool.userStaked)).toFixed(4)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Pending AEEIA</p>
                          <p className="font-semibold">{Number(formatEther(pool.pendingRewards)).toFixed(6)}</p>
                        </div>
                      </div>

                      <p className="text-xs text-muted-foreground">
                        Reward period ends: {formatTs(pool.periodFinish)}
                      </p>

                      <Input
                        value={amount}
                        onChange={(e) => setAmounts((prev) => ({ ...prev, [pool.id]: e.target.value }))}
                        placeholder="Amount (ETH-denominated token)"
                        type="number"
                        min="0"
                        step="0.0001"
                      />

                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant="outline"
                          disabled={!account || !amount || busy}
                          onClick={() =>
                            void runPoolAction(pool.id, async () => {
                              const allowance = await getAllowance(
                                pool.stakingToken,
                                account as `0x${string}`,
                                CONTRACTS.STAKING_ADDRESS
                              );
                              const required = parseEther(amount);
                              if (allowance < required) {
                                await approveTokenSpending(pool.stakingToken, CONTRACTS.STAKING_ADDRESS, required);
                              }
                            })
                          }
                        >
                          Approve
                        </Button>
                        <Button
                          variant="outline"
                          disabled={!account || !amount || busy}
                          onClick={() =>
                            void runPoolAction(pool.id, async () => {
                              await stakeOutcomeToken(pool.id, amount);
                            })
                          }
                        >
                          <EthIcon className="w-3.5 h-3.5" />
                          Stake
                        </Button>
                        <Button
                          variant="outline"
                          disabled={!account || !amount || busy}
                          onClick={() =>
                            void runPoolAction(pool.id, async () => {
                              await withdrawOutcomeToken(pool.id, amount);
                            })
                          }
                        >
                          Withdraw
                        </Button>
                        <Button
                          variant="outline"
                          disabled={!account || busy}
                          onClick={() =>
                            void runPoolAction(pool.id, async () => {
                              await claimStakingRewards(pool.id);
                            })
                          }
                        >
                          Claim AEEIA
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <BackgroundBeams />
    </div>
  );
}
