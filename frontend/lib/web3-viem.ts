"use client";

import { encodeAbiParameters, formatEther, keccak256, parseAbiParameters, parseEther } from "viem";
import {
  ALETHEIA_MARKET_ABI,
  CONTRACTS,
  ERC20_ABI,
  ORACLE_ABI,
  POOL_ABI,
  STAKING_ABI,
  ZERO_ADDRESS,
} from "./contracts";
import { ensureSepoliaNetwork, getWalletClient, publicClient } from "./viem-client";

export interface UIMarket {
  id: number;
  oracleMarketId: number;
  question: string;
  deadline: number;
  settled: boolean;
  resolved: boolean;
  outcome: boolean;
  confidence: number;
  proofHash: string;
  createdAt: number;
  yesToken: `0x${string}`;
  noToken: `0x${string}`;
  pool: `0x${string}`;
  totalStaked: bigint;
  category: string;
  volumeUsdc: number;
  yesPercent: number;
}

export interface StakePoolUI {
  id: number;
  stakingToken: `0x${string}`;
  label: string;
  marketId: number;
  isYes: boolean;
  totalStaked: bigint;
  rewardRate: bigint;
  periodFinish: number;
  userStaked: bigint;
  pendingRewards: bigint;
  aprPercent: number;
}

interface WalletWriteResult {
  hash: `0x${string}`;
  blockNumber: bigint;
}

export interface PoolLiquidityState {
  reserveYes: bigint;
  reserveNo: bigint;
  lpTotalSupply: bigint;
  userLpBalance: bigint;
}

export interface WorldIdProof {
  root: bigint;
  nullifierHash: bigint;
  proof: readonly [
    bigint,
    bigint,
    bigint,
    bigint,
    bigint,
    bigint,
    bigint,
    bigint
  ];
}

export interface QuestionValidationStatus {
  processed: boolean;
  approved: boolean;
  score: number;
  checks: {
    legitimate: boolean;
    clearTimeline: boolean;
    resolvable: boolean;
    binary: boolean;
  };
}

export interface MarketCreationRequestUI {
  id: number;
  requester: `0x${string}`;
  question: string;
  deadline: number;
  oracleValidationRequestId: number;
  finalized: boolean;
  createdAt: number;
  processed: boolean;
  approved: boolean;
  score: number;
  checks: {
    legitimate: boolean;
    clearTimeline: boolean;
    resolvable: boolean;
    binary: boolean;
  };
}

function toPercent(yesPrice: bigint, noPrice: bigint): number {
  const total = yesPrice + noPrice;
  if (total === BigInt(0)) return 50;
  return Math.round(Number((yesPrice * BigInt(10000)) / total) / 100);
}

function calcApr(totalStaked: bigint, rewardRate: bigint): number {
  if (totalStaked === BigInt(0) || rewardRate === BigInt(0)) return 0;
  const secondsPerYear = BigInt(365 * 24 * 60 * 60);
  const annualRewards = rewardRate * secondsPerYear;
  return Number((annualRewards * BigInt(10000)) / totalStaked) / 100;
}

async function writeContractAndWait(request: any): Promise<WalletWriteResult> {
  const walletClient = getWalletClient();
  const hash = await walletClient.writeContract(request);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  return { hash, blockNumber: receipt.blockNumber };
}

export function inferDeadlineFromQuestion(question: string): number {
  const now = Math.floor(Date.now() / 1000);
  const direct = Date.parse(question);
  if (Number.isFinite(direct)) {
    const ts = Math.floor(direct / 1000);
    if (ts > now + 3600) return ts;
  }

  const lower = question.toLowerCase();
  const markers = [" by ", " before ", " on ", " at ", " until "];
  for (const marker of markers) {
    const idx = lower.indexOf(marker);
    if (idx < 0) continue;
    const candidate = question.slice(idx + marker.length).trim();
    const parsed = Date.parse(candidate);
    if (Number.isFinite(parsed)) {
      const ts = Math.floor(parsed / 1000);
      if (ts > now + 3600) return ts;
    }
  }

  // Fallback while contract still requires a concrete onchain deadline.
  return now + 7 * 24 * 3600;
}

export async function fetchMarkets(): Promise<UIMarket[]> {
  const marketCount = (await publicClient.readContract({
    address: CONTRACTS.PREDICTION_MARKET_ADDRESS,
    abi: ALETHEIA_MARKET_ABI,
    functionName: "marketCount",
  })) as bigint;

  if (marketCount === BigInt(0)) return [];

  const markets = await Promise.all(
    Array.from({ length: Number(marketCount) }, async (_, i) => {
      const marketId = BigInt(i + 1);

      const market = (await publicClient.readContract({
        address: CONTRACTS.PREDICTION_MARKET_ADDRESS,
        abi: ALETHEIA_MARKET_ABI,
        functionName: "markets",
        args: [marketId],
      })) as any;

      const [yesPrice, noPrice] = (await publicClient.readContract({
        address: CONTRACTS.PREDICTION_MARKET_ADDRESS,
        abi: ALETHEIA_MARKET_ABI,
        functionName: "getMarketPrices",
        args: [marketId],
      })) as [bigint, bigint];

      const [resolved, outcome, confidence, proofHash] = (await publicClient.readContract({
        address: CONTRACTS.ORACLE_ADDRESS,
        abi: ORACLE_ABI,
        functionName: "getResolution",
        args: [market[0]],
      })) as [boolean, boolean, number, `0x${string}`];

      return {
        id: Number(marketId),
        oracleMarketId: Number(market[0]),
        question: market[1] as string,
        deadline: Number(market[2]),
        yesToken: market[3] as `0x${string}`,
        noToken: market[4] as `0x${string}`,
        pool: market[5] as `0x${string}`,
        totalStaked: market[6] as bigint,
        settled: market[7] as boolean,
        resolved,
        outcome,
        confidence: Number(confidence),
        proofHash,
        createdAt: Number(market[9]),
        category: "General",
        volumeUsdc: Number(formatEther(market[6])) * 3000,
        yesPercent: toPercent(yesPrice, noPrice),
      } satisfies UIMarket;
    })
  );

  return markets;
}

export async function requestMarketCreation(
  question: string,
  deadlineTimestamp: number
): Promise<WalletWriteResult> {
  if (!question.trim()) throw new Error("Question is required");

  await ensureSepoliaNetwork();
  const walletClient = getWalletClient();
  const [account] = await walletClient.requestAddresses();

  const { request } = await publicClient.simulateContract({
    account,
    address: CONTRACTS.PREDICTION_MARKET_ADDRESS,
    abi: ALETHEIA_MARKET_ABI,
    functionName: "requestMarketCreation",
    args: [question, BigInt(deadlineTimestamp)],
  });

  return writeContractAndWait(request);
}

export async function getQuestionValidationStatus(
  question: string,
  deadlineTimestamp: number
): Promise<QuestionValidationStatus> {
  const digest = keccak256(
    encodeAbiParameters(parseAbiParameters("string question, uint256 deadline"), [
      question,
      BigInt(deadlineTimestamp),
    ])
  );

  const result = (await publicClient.readContract({
    address: CONTRACTS.ORACLE_ADDRESS,
    abi: ORACLE_ABI,
    functionName: "getQuestionValidation",
    args: [digest],
  })) as [boolean, boolean, number, boolean, boolean, boolean, boolean, `0x${string}`];

  return {
    processed: result[0],
    approved: result[1],
    score: Number(result[2]),
    checks: {
      legitimate: result[3],
      clearTimeline: result[4],
      resolvable: result[5],
      binary: result[6],
    },
  };
}

export async function waitForQuestionValidation(
  question: string,
  deadlineTimestamp: number,
  timeoutMs = 60000,
  pollMs = 3000
): Promise<QuestionValidationStatus> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const status = await getQuestionValidationStatus(question, deadlineTimestamp);
    if (status.processed) return status;
    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }

  throw new Error("Validation report not found onchain yet. Run CRE simulation and try again.");
}

export async function createMarketVerified(
  question: string,
  deadlineTimestamp: number,
  worldIdProof: WorldIdProof
): Promise<WalletWriteResult> {
  await ensureSepoliaNetwork();
  const walletClient = getWalletClient();
  const [account] = await walletClient.requestAddresses();

  const { request } = await publicClient.simulateContract({
    account,
    address: CONTRACTS.PREDICTION_MARKET_ADDRESS,
    abi: ALETHEIA_MARKET_ABI,
    functionName: "createMarketVerified",
    args: [
      question,
      BigInt(deadlineTimestamp),
      BigInt(0),
      BigInt(0),
      worldIdProof.root,
      worldIdProof.nullifierHash,
      worldIdProof.proof,
    ],
    value: BigInt(0),
  });

  return writeContractAndWait(request);
}

export async function finalizeMarketCreation(
  requestId: number,
  worldIdProof: WorldIdProof
): Promise<WalletWriteResult> {
  await ensureSepoliaNetwork();
  const walletClient = getWalletClient();
  const [account] = await walletClient.requestAddresses();

  const { request } = await publicClient.simulateContract({
    account,
    address: CONTRACTS.PREDICTION_MARKET_ADDRESS,
    abi: ALETHEIA_MARKET_ABI,
    functionName: "finalizeMarketCreation",
    args: [
      BigInt(requestId),
      BigInt(0),
      BigInt(0),
      worldIdProof.root,
      worldIdProof.nullifierHash,
      worldIdProof.proof,
    ],
    value: BigInt(0),
  });

  return writeContractAndWait(request);
}

export async function fetchCreationRequests(account?: `0x${string}`): Promise<MarketCreationRequestUI[]> {
  const requestCount = (await publicClient.readContract({
    address: CONTRACTS.PREDICTION_MARKET_ADDRESS,
    abi: ALETHEIA_MARKET_ABI,
    functionName: "creationRequestCount",
  })) as bigint;

  if (requestCount === BigInt(0)) return [];

  const lowerAccount = account?.toLowerCase();

  const requests = await Promise.all(
    Array.from({ length: Number(requestCount) }, async (_, i) => {
      const requestId = BigInt(i + 1);
      const req = (await publicClient.readContract({
        address: CONTRACTS.PREDICTION_MARKET_ADDRESS,
        abi: ALETHEIA_MARKET_ABI,
        functionName: "creationRequests",
        args: [requestId],
      })) as any;

      const requester = req[1] as `0x${string}`;
      if (lowerAccount && requester.toLowerCase() !== lowerAccount) return null;

      const validation = (await publicClient.readContract({
        address: CONTRACTS.ORACLE_ADDRESS,
        abi: ORACLE_ABI,
        functionName: "getValidationResult",
        args: [req[4]],
      })) as [boolean, boolean, number, boolean, boolean, boolean, boolean, `0x${string}`];

      return {
        id: Number(req[0]),
        requester,
        question: req[2] as string,
        deadline: Number(req[3]),
        oracleValidationRequestId: Number(req[4]),
        finalized: req[5] as boolean,
        createdAt: Number(req[6]),
        processed: validation[0],
        approved: validation[1],
        score: Number(validation[2]),
        checks: {
          legitimate: validation[3],
          clearTimeline: validation[4],
          resolvable: validation[5],
          binary: validation[6],
        },
      } satisfies MarketCreationRequestUI;
    })
  );

  return requests.filter((r): r is MarketCreationRequestUI => r !== null);
}

export async function mintMarketTokens(marketId: number, amountEth: string): Promise<WalletWriteResult> {
  const amount = parseEther(amountEth);
  if (amount <= BigInt(0)) throw new Error("Mint amount must be greater than 0");

  await ensureSepoliaNetwork();
  const walletClient = getWalletClient();
  const [account] = await walletClient.requestAddresses();

  const { request } = await publicClient.simulateContract({
    account,
    address: CONTRACTS.PREDICTION_MARKET_ADDRESS,
    abi: ALETHEIA_MARKET_ABI,
    functionName: "mintTokens",
    args: [BigInt(marketId)],
    value: amount,
  });

  return writeContractAndWait(request);
}

export async function redeemMarketTokens(marketId: number): Promise<WalletWriteResult> {
  await ensureSepoliaNetwork();
  const walletClient = getWalletClient();
  const [account] = await walletClient.requestAddresses();

  const { request } = await publicClient.simulateContract({
    account,
    address: CONTRACTS.PREDICTION_MARKET_ADDRESS,
    abi: ALETHEIA_MARKET_ABI,
    functionName: "redeemTokens",
    args: [BigInt(marketId)],
  });

  return writeContractAndWait(request);
}

export async function getUserMarketBalances(marketId: number, user: `0x${string}`) {
  return (await publicClient.readContract({
    address: CONTRACTS.PREDICTION_MARKET_ADDRESS,
    abi: ALETHEIA_MARKET_ABI,
    functionName: "getUserBalances",
    args: [BigInt(marketId), user],
  })) as [bigint, bigint];
}

export async function fetchStakePools(account?: `0x${string}`): Promise<StakePoolUI[]> {
  if ((CONTRACTS.STAKING_ADDRESS as string) === ZERO_ADDRESS) {
    return [];
  }

  const poolCount = (await publicClient.readContract({
    address: CONTRACTS.STAKING_ADDRESS,
    abi: STAKING_ABI,
    functionName: "poolCount",
  })) as bigint;

  const pools = await Promise.all(
    Array.from({ length: Number(poolCount) }, async (_, i) => {
      const poolId = BigInt(i + 1);
      const p = (await publicClient.readContract({
        address: CONTRACTS.STAKING_ADDRESS,
        abi: STAKING_ABI,
        functionName: "pools",
        args: [poolId],
      })) as any;

      const userStaked = account
        ? ((await publicClient.readContract({
            address: CONTRACTS.STAKING_ADDRESS,
            abi: STAKING_ABI,
            functionName: "userStaked",
            args: [poolId, account],
          })) as bigint)
        : BigInt(0);

      const pendingRewards = account
        ? ((await publicClient.readContract({
            address: CONTRACTS.STAKING_ADDRESS,
            abi: STAKING_ABI,
            functionName: "pendingRewards",
            args: [poolId, account],
          })) as bigint)
        : BigInt(0);

      return {
        id: Number(poolId),
        stakingToken: p[0] as `0x${string}`,
        label: p[1] as string,
        marketId: Number(p[2]),
        isYes: p[3] as boolean,
        totalStaked: p[4] as bigint,
        rewardRate: p[7] as bigint,
        periodFinish: Number(p[8]),
        userStaked,
        pendingRewards,
        aprPercent: calcApr(p[4] as bigint, p[7] as bigint),
      } satisfies StakePoolUI;
    })
  );

  return pools;
}

export async function quoteSwapOutput(
  marketId: number,
  buyYes: boolean,
  amountInEth: string
): Promise<bigint> {
  const market = (await publicClient.readContract({
    address: CONTRACTS.PREDICTION_MARKET_ADDRESS,
    abi: ALETHEIA_MARKET_ABI,
    functionName: "markets",
    args: [BigInt(marketId)],
  })) as any;

  const poolAddress = market[5] as `0x${string}`;
  const amountIn = parseEther(amountInEth);

  return (await publicClient.readContract({
    address: poolAddress,
    abi: POOL_ABI,
    functionName: "getAmountOut",
    args: [buyYes, amountIn],
  })) as bigint;
}

export async function quoteBuyOutcomeWithEth(
  marketId: number,
  buyYes: boolean,
  amountEth: string
): Promise<bigint> {
  const amountIn = parseEther(amountEth);
  if (amountIn <= BigInt(0)) return BigInt(0);

  const swapOut = await quoteSwapOutput(marketId, buyYes, amountEth);
  return amountIn + swapOut;
}

export async function buyOutcomeWithEth(
  marketId: number,
  buyYes: boolean,
  amountEth: string,
  slippageBps = 100
): Promise<WalletWriteResult> {
  const amountIn = parseEther(amountEth);
  if (amountIn <= BigInt(0)) throw new Error("Trade amount must be greater than 0");

  await ensureSepoliaNetwork();
  const walletClient = getWalletClient();
  const [account] = await walletClient.requestAddresses();

  const swapOut = await quoteSwapOutput(marketId, buyYes, amountEth);
  if (swapOut <= BigInt(0)) {
    throw new Error("Pool has no executable liquidity for this trade yet.");
  }
  const minSwapOut = (swapOut * BigInt(10000 - slippageBps)) / BigInt(10000);

  const { request } = await publicClient.simulateContract({
    account,
    address: CONTRACTS.PREDICTION_MARKET_ADDRESS,
    abi: ALETHEIA_MARKET_ABI,
    functionName: "buyOutcomeWithEth",
    args: [BigInt(marketId), buyYes, minSwapOut],
    value: amountIn,
  });

  return writeContractAndWait(request);
}

export async function swapOutcomeTokens(
  marketId: number,
  buyYes: boolean,
  amountInEth: string,
  slippageBps = 100
): Promise<WalletWriteResult> {
  const amountIn = parseEther(amountInEth);
  if (amountIn <= BigInt(0)) throw new Error("Trade amount must be greater than 0");

  await ensureSepoliaNetwork();
  const walletClient = getWalletClient();
  const [account] = await walletClient.requestAddresses();

  const market = (await publicClient.readContract({
    address: CONTRACTS.PREDICTION_MARKET_ADDRESS,
    abi: ALETHEIA_MARKET_ABI,
    functionName: "markets",
    args: [BigInt(marketId)],
  })) as any;

  const poolAddress = market[5] as `0x${string}`;
  const quotedOut = (await publicClient.readContract({
    address: poolAddress,
    abi: POOL_ABI,
    functionName: "getAmountOut",
    args: [buyYes, amountIn],
  })) as bigint;
  if (quotedOut <= BigInt(0)) {
    throw new Error("Pool has no executable liquidity for this swap yet.");
  }

  const minOut = (quotedOut * BigInt(10000 - slippageBps)) / BigInt(10000);
  const { request } = await publicClient.simulateContract({
    account,
    address: poolAddress,
    abi: POOL_ABI,
    functionName: "swap",
    args: [buyYes, amountIn, minOut],
  });

  return writeContractAndWait(request);
}

export async function getPoolLiquidityState(
  marketId: number,
  account?: `0x${string}`
): Promise<PoolLiquidityState> {
  const market = (await publicClient.readContract({
    address: CONTRACTS.PREDICTION_MARKET_ADDRESS,
    abi: ALETHEIA_MARKET_ABI,
    functionName: "markets",
    args: [BigInt(marketId)],
  })) as any;
  const poolAddress = market[5] as `0x${string}`;

  const [reserveYes, reserveNo, lpTotalSupply] = (await Promise.all([
    publicClient.readContract({
      address: poolAddress,
      abi: POOL_ABI,
      functionName: "reserveYes",
    }),
    publicClient.readContract({
      address: poolAddress,
      abi: POOL_ABI,
      functionName: "reserveNo",
    }),
    publicClient.readContract({
      address: poolAddress,
      abi: ERC20_ABI,
      functionName: "totalSupply",
    }),
  ])) as [bigint, bigint, bigint];

  const userLpBalance = account
    ? ((await publicClient.readContract({
        address: poolAddress,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [account],
      })) as bigint)
    : BigInt(0);

  return { reserveYes, reserveNo, lpTotalSupply, userLpBalance };
}

export async function provideMarketLiquidity(
  marketId: number,
  amountEth: string
): Promise<WalletWriteResult> {
  const amount = parseEther(amountEth);
  if (amount <= BigInt(0)) {
    throw new Error("Liquidity amount must be greater than 0");
  }

  await ensureSepoliaNetwork();
  const walletClient = getWalletClient();
  const [account] = await walletClient.requestAddresses();

  const { request } = await publicClient.simulateContract({
    account,
    address: CONTRACTS.PREDICTION_MARKET_ADDRESS,
    abi: ALETHEIA_MARKET_ABI,
    functionName: "provideLiquidity",
    args: [BigInt(marketId)],
    value: amount,
  });

  return writeContractAndWait(request);
}

export async function removeMarketLiquidity(
  marketId: number,
  lpAmountEth: string
): Promise<WalletWriteResult> {
  const lpAmount = parseEther(lpAmountEth);
  if (lpAmount <= BigInt(0)) throw new Error("LP amount must be greater than 0");

  await ensureSepoliaNetwork();
  const walletClient = getWalletClient();
  const [account] = await walletClient.requestAddresses();

  const market = (await publicClient.readContract({
    address: CONTRACTS.PREDICTION_MARKET_ADDRESS,
    abi: ALETHEIA_MARKET_ABI,
    functionName: "markets",
    args: [BigInt(marketId)],
  })) as any;
  const poolAddress = market[5] as `0x${string}`;

  const { request } = await publicClient.simulateContract({
    account,
    address: poolAddress,
    abi: POOL_ABI,
    functionName: "removeLiquidity",
    args: [lpAmount],
  });

  return writeContractAndWait(request);
}

export async function approveTokenSpending(
  token: `0x${string}`,
  spender: `0x${string}`,
  amount: bigint
): Promise<WalletWriteResult> {
  await ensureSepoliaNetwork();
  const walletClient = getWalletClient();
  const [account] = await walletClient.requestAddresses();

  const { request } = await publicClient.simulateContract({
    account,
    address: token,
    abi: ERC20_ABI,
    functionName: "approve",
    args: [spender, amount],
  });

  return writeContractAndWait(request);
}

export async function stakeOutcomeToken(poolId: number, amountEth: string): Promise<WalletWriteResult> {
  if ((CONTRACTS.STAKING_ADDRESS as string) === ZERO_ADDRESS) {
    throw new Error("Staking contract is not configured yet");
  }

  const amount = parseEther(amountEth);
  await ensureSepoliaNetwork();
  const walletClient = getWalletClient();
  const [account] = await walletClient.requestAddresses();

  const { request } = await publicClient.simulateContract({
    account,
    address: CONTRACTS.STAKING_ADDRESS,
    abi: STAKING_ABI,
    functionName: "stake",
    args: [BigInt(poolId), amount],
  });

  return writeContractAndWait(request);
}

export async function withdrawOutcomeToken(poolId: number, amountEth: string): Promise<WalletWriteResult> {
  const amount = parseEther(amountEth);
  await ensureSepoliaNetwork();
  const walletClient = getWalletClient();
  const [account] = await walletClient.requestAddresses();

  const { request } = await publicClient.simulateContract({
    account,
    address: CONTRACTS.STAKING_ADDRESS,
    abi: STAKING_ABI,
    functionName: "withdraw",
    args: [BigInt(poolId), amount],
  });

  return writeContractAndWait(request);
}

export async function claimStakingRewards(poolId: number): Promise<WalletWriteResult> {
  await ensureSepoliaNetwork();
  const walletClient = getWalletClient();
  const [account] = await walletClient.requestAddresses();

  const { request } = await publicClient.simulateContract({
    account,
    address: CONTRACTS.STAKING_ADDRESS,
    abi: STAKING_ABI,
    functionName: "claim",
    args: [BigInt(poolId)],
  });

  return writeContractAndWait(request);
}

export async function getAllowance(
  token: `0x${string}`,
  owner: `0x${string}`,
  spender: `0x${string}`
): Promise<bigint> {
  return (await publicClient.readContract({
    address: token,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [owner, spender],
  })) as bigint;
}

export async function getConnectedAddress(): Promise<string | null> {
  if (typeof window === "undefined" || !window.ethereum) return null;

  const accounts = (await window.ethereum.request({ method: "eth_accounts" })) as string[];
  return accounts[0] ?? null;
}

export async function connectWallet(): Promise<string> {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("No wallet detected");
  }

  await ensureSepoliaNetwork();

  const accounts = (await window.ethereum.request({ method: "eth_requestAccounts" })) as string[];
  if (!accounts[0]) throw new Error("Wallet connection failed");

  return accounts[0];
}
