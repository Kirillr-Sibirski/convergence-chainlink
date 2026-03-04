"use client";

import { encodeAbiParameters, formatEther, keccak256, parseAbiParameters, parseEther } from "viem";
import { ALETHEIA_MARKET_ABI, CONTRACTS, ORACLE_ABI } from "./contracts";
import { ensureSepoliaNetwork, getWalletClient, publicClient } from "./viem-client";

export interface UIMarket {
  id: number;
  oracleMarketId: number;
  question: string;
  deadline: number;
  totalYes: bigint;
  totalNo: bigint;
  totalVolume: bigint;
  settled: boolean;
  resolved: boolean;
  outcome: boolean;
  confidence: number;
  proofHash: `0x${string}`;
  createdAt: number;
  yesPercent: number;
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

interface WalletWriteResult {
  hash: `0x${string}`;
  blockNumber: bigint;
}

export interface UserBet {
  yesAmount: bigint;
  noAmount: bigint;
  claimed: boolean;
}

export async function connectWallet(): Promise<`0x${string}`> {
  await ensureSepoliaNetwork();
  const walletClient = getWalletClient();
  const [account] = await walletClient.requestAddresses();
  return account;
}

export async function getConnectedAddress(): Promise<`0x${string}` | null> {
  const walletClient = getWalletClient();
  const [account] = await walletClient.getAddresses();
  return account ?? null;
}

function toPercent(yes: bigint, no: bigint): number {
  const total = yes + no;
  if (total === BigInt(0)) return 50;
  return Math.round(Number((yes * BigInt(10000)) / total) / 100);
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

      const [resolved, outcome, confidence, proofHash] = (await publicClient.readContract({
        address: CONTRACTS.ORACLE_ADDRESS,
        abi: ORACLE_ABI,
        functionName: "getResolution",
        args: [market[0]],
      })) as [boolean, boolean, number, `0x${string}`];

      const totalYes = market[3] as bigint;
      const totalNo = market[4] as bigint;

      return {
        id: Number(marketId),
        oracleMarketId: Number(market[0]),
        question: market[1] as string,
        deadline: Number(market[2]),
        totalYes,
        totalNo,
        totalVolume: totalYes + totalNo,
        settled: market[5] as boolean,
        outcome: market[6] as boolean,
        createdAt: Number(market[7]),
        resolved,
        confidence: Number(confidence),
        proofHash,
        yesPercent: toPercent(totalYes, totalNo),
      } satisfies UIMarket;
    })
  );

  return markets;
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
  deadlineTimestamp: number
): Promise<WalletWriteResult> {
  await ensureSepoliaNetwork();
  const walletClient = getWalletClient();
  const [account] = await walletClient.requestAddresses();

  const { request } = await publicClient.simulateContract({
    account,
    address: CONTRACTS.PREDICTION_MARKET_ADDRESS,
    abi: ALETHEIA_MARKET_ABI,
    functionName: "createMarketVerified",
    args: [question, BigInt(deadlineTimestamp)],
  });

  return writeContractAndWait(request);
}

export async function placeBet(
  marketId: number,
  onYes: boolean,
  amountEth: string
): Promise<WalletWriteResult> {
  const amount = parseEther(amountEth);
  if (amount <= BigInt(0)) throw new Error("Bet amount must be greater than 0");

  await ensureSepoliaNetwork();
  const walletClient = getWalletClient();
  const [account] = await walletClient.requestAddresses();

  const { request } = await publicClient.simulateContract({
    account,
    address: CONTRACTS.PREDICTION_MARKET_ADDRESS,
    abi: ALETHEIA_MARKET_ABI,
    functionName: "placeBet",
    args: [BigInt(marketId), onYes],
    value: amount,
  });

  return writeContractAndWait(request);
}

export async function sellShares(
  marketId: number,
  onYes: boolean,
  amountEth: string
): Promise<WalletWriteResult> {
  const amount = parseEther(amountEth);
  if (amount <= BigInt(0)) throw new Error("Sell amount must be greater than 0");

  await ensureSepoliaNetwork();
  const walletClient = getWalletClient();
  const [account] = await walletClient.requestAddresses();

  const { request } = await publicClient.simulateContract({
    account,
    address: CONTRACTS.PREDICTION_MARKET_ADDRESS,
    abi: ALETHEIA_MARKET_ABI,
    functionName: "sellShares",
    args: [BigInt(marketId), onYes, amount],
  });

  return writeContractAndWait(request);
}

export async function claimWinnings(marketId: number): Promise<WalletWriteResult> {
  await ensureSepoliaNetwork();
  const walletClient = getWalletClient();
  const [account] = await walletClient.requestAddresses();

  const { request } = await publicClient.simulateContract({
    account,
    address: CONTRACTS.PREDICTION_MARKET_ADDRESS,
    abi: ALETHEIA_MARKET_ABI,
    functionName: "claimWinnings",
    args: [BigInt(marketId)],
  });

  return writeContractAndWait(request);
}

export async function getUserBet(marketId: number, user: `0x${string}`): Promise<UserBet> {
  const result = (await publicClient.readContract({
    address: CONTRACTS.PREDICTION_MARKET_ADDRESS,
    abi: ALETHEIA_MARKET_ABI,
    functionName: "getUserBet",
    args: [BigInt(marketId), user],
  })) as [bigint, bigint, boolean];

  return {
    yesAmount: result[0],
    noAmount: result[1],
    claimed: result[2],
  };
}

export async function getUserClaimablePayout(marketId: number, user: `0x${string}`) {
  return (await publicClient.readContract({
    address: CONTRACTS.PREDICTION_MARKET_ADDRESS,
    abi: ALETHEIA_MARKET_ABI,
    functionName: "getUserClaimablePayout",
    args: [BigInt(marketId), user],
  })) as [boolean, bigint];
}

export function formatEthShort(value: bigint): string {
  return Number(formatEther(value)).toFixed(4);
}
