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

export interface MarketPricePoint {
  timestamp: number;
  yesPercent: number;
  totalYes: bigint;
  totalNo: bigint;
}

export interface WorldIdProofInput {
  root: bigint;
  nullifierHash: bigint;
  proof: readonly [bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint];
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
  const markers = [" by ", " before ", " on ", " at ", " until ", " in "];
  for (const marker of markers) {
    const idx = lower.indexOf(marker);
    if (idx < 0) continue;
    const candidate = question
      .slice(idx + marker.length)
      .trim()
      .replace(/[?.!,;:]+$/g, "");
    const parsed = Date.parse(candidate);
    if (Number.isFinite(parsed)) {
      const ts = Math.floor(parsed / 1000);
      if (ts > now + 3600) return ts;
    }
  }

  // Accept semi-ambiguous month-only inputs (e.g. "in April")
  // and normalize to the first day of that month at 00:00 UTC.
  const monthMatch = lower.match(
    /\b(january|february|march|april|may|june|july|august|september|october|november|december)\b(?:\s+(\d{4}))?/i
  );
  if (monthMatch) {
    const monthName = monthMatch[1].toLowerCase();
    const explicitYear = monthMatch[2] ? Number.parseInt(monthMatch[2], 10) : null;
    const monthIndex: Record<string, number> = {
      january: 0,
      february: 1,
      march: 2,
      april: 3,
      may: 4,
      june: 5,
      july: 6,
      august: 7,
      september: 8,
      october: 9,
      november: 10,
      december: 11,
    };

    const currentYear = new Date().getUTCFullYear();
    const chosenMonth = monthIndex[monthName];
    let year = explicitYear ?? currentYear;
    let ts = Math.floor(Date.UTC(year, chosenMonth, 1, 0, 0, 0) / 1000);

    if (!explicitYear && ts <= now + 3600) {
      year += 1;
      ts = Math.floor(Date.UTC(year, chosenMonth, 1, 0, 0, 0) / 1000);
    }

    return ts;
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

  throw new Error("Validation report not found onchain yet. CRE verification is still pending.");
}

export async function createMarketVerified(
  question: string,
  deadlineTimestamp: number,
  worldIdProof: WorldIdProofInput
): Promise<WalletWriteResult> {
  await ensureSepoliaNetwork();
  const walletClient = getWalletClient();
  const [account] = await walletClient.requestAddresses();

  const { request } = await publicClient.simulateContract({
    account,
    address: CONTRACTS.PREDICTION_MARKET_ADDRESS,
    abi: ALETHEIA_MARKET_ABI,
    functionName: "createMarketVerified",
    args: [question, BigInt(deadlineTimestamp), worldIdProof.root, worldIdProof.nullifierHash, worldIdProof.proof],
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

export async function fetchMarketPriceHistory(marketId: number): Promise<MarketPricePoint[]> {
  const latest = await publicClient.getBlockNumber();
  const fallbackFrom = latest > BigInt(250000) ? latest - BigInt(250000) : BigInt(0);

  const createdLogs = await publicClient.getLogs({
    address: CONTRACTS.PREDICTION_MARKET_ADDRESS,
    event: {
      type: "event",
      name: "MarketCreated",
      inputs: [
        { indexed: true, name: "marketId", type: "uint256" },
        { indexed: true, name: "oracleMarketId", type: "uint256" },
        { indexed: false, name: "question", type: "string" },
        { indexed: false, name: "deadline", type: "uint256" },
      ],
    },
    args: { marketId: BigInt(marketId) },
    fromBlock: fallbackFrom,
    toBlock: "latest",
  });

  const startBlock = createdLogs[0]?.blockNumber ?? fallbackFrom;

  const [betLogs, sellLogs] = await Promise.all([
    publicClient.getLogs({
      address: CONTRACTS.PREDICTION_MARKET_ADDRESS,
      event: {
        type: "event",
        name: "BetPlaced",
        inputs: [
          { indexed: true, name: "marketId", type: "uint256" },
          { indexed: true, name: "user", type: "address" },
          { indexed: false, name: "onYes", type: "bool" },
          { indexed: false, name: "amount", type: "uint256" },
        ],
      },
      args: { marketId: BigInt(marketId) },
      fromBlock: startBlock,
      toBlock: "latest",
    }),
    publicClient.getLogs({
      address: CONTRACTS.PREDICTION_MARKET_ADDRESS,
      event: {
        type: "event",
        name: "SharesSold",
        inputs: [
          { indexed: true, name: "marketId", type: "uint256" },
          { indexed: true, name: "user", type: "address" },
          { indexed: false, name: "onYes", type: "bool" },
          { indexed: false, name: "amount", type: "uint256" },
        ],
      },
      args: { marketId: BigInt(marketId) },
      fromBlock: startBlock,
      toBlock: "latest",
    }),
  ]);

  const ordered = [
    ...betLogs.map((l) => ({ type: "bet" as const, log: l })),
    ...sellLogs.map((l) => ({ type: "sell" as const, log: l })),
  ].sort((a, b) => {
    if (a.log.blockNumber === b.log.blockNumber) {
      return Number((a.log.logIndex ?? 0) - (b.log.logIndex ?? 0));
    }
    return Number(a.log.blockNumber - b.log.blockNumber);
  });

  const blockSet = new Set<bigint>([startBlock, ...ordered.map((e) => e.log.blockNumber)]);
  const blockEntries = await Promise.all(Array.from(blockSet).map(async (bn) => [bn, await publicClient.getBlock({ blockNumber: bn })] as const));
  const blockTs = new Map<bigint, number>(blockEntries.map(([bn, b]) => [bn, Number(b.timestamp)]));

  let totalYes = BigInt(0);
  let totalNo = BigInt(0);
  const points: MarketPricePoint[] = [
    {
      timestamp: blockTs.get(startBlock) ?? Math.floor(Date.now() / 1000),
      yesPercent: 50,
      totalYes,
      totalNo,
    },
  ];

  for (const entry of ordered) {
    const onYes = Boolean(entry.log.args.onYes);
    const amount = entry.log.args.amount as bigint;

    if (entry.type === "bet") {
      if (onYes) totalYes += amount;
      else totalNo += amount;
    } else {
      if (onYes) totalYes = totalYes > amount ? totalYes - amount : BigInt(0);
      else totalNo = totalNo > amount ? totalNo - amount : BigInt(0);
    }

    points.push({
      timestamp: blockTs.get(entry.log.blockNumber) ?? Math.floor(Date.now() / 1000),
      yesPercent: toPercent(totalYes, totalNo),
      totalYes,
      totalNo,
    });
  }

  return points;
}
