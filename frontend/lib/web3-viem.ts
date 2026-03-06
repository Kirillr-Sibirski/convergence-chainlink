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

export interface MarketTradeEntry {
  txHash: `0x${string}`;
  blockNumber: bigint;
  logIndex: number;
  timestamp: number;
  trader: `0x${string}`;
  type: "buy" | "sell";
  onYes: boolean;
  amount: bigint;
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

export async function getLatestQuestionValidationTimestamp(
  question: string,
  deadlineTimestamp: number
): Promise<number | null> {
  const digest = keccak256(
    encodeAbiParameters(parseAbiParameters("string question, uint256 deadline"), [
      question,
      BigInt(deadlineTimestamp),
    ])
  );

  // Alchemy free tier caps eth_getLogs range to small windows, so scan in tiny chunks.
  const latestBlock = await publicClient.getBlockNumber();
  const maxLookbackBlocks = BigInt(2000);
  const minBlock = latestBlock > maxLookbackBlocks ? latestBlock - maxLookbackBlocks : BigInt(0);
  const maxRangeDiff = BigInt(9); // inclusive range of 10 blocks

  const event = {
    type: "event" as const,
    name: "QuestionValidated" as const,
    inputs: [
      { indexed: true, name: "questionDigest", type: "bytes32" as const },
      { indexed: false, name: "approved", type: "bool" as const },
      { indexed: false, name: "score", type: "uint8" as const },
      { indexed: false, name: "legitimate", type: "bool" as const },
      { indexed: false, name: "clearTimeline", type: "bool" as const },
      { indexed: false, name: "resolvable", type: "bool" as const },
      { indexed: false, name: "binary", type: "bool" as const },
      { indexed: false, name: "proofHash", type: "bytes32" as const },
      { indexed: false, name: "processedAt", type: "uint256" as const },
    ],
  };

  let toBlock = latestBlock;
  while (toBlock >= minBlock) {
    const fromBlock = toBlock > maxRangeDiff ? toBlock - maxRangeDiff : BigInt(0);
    const boundedFrom = fromBlock < minBlock ? minBlock : fromBlock;

    const logs = await publicClient.getLogs({
      address: CONTRACTS.ORACLE_ADDRESS,
      event,
      args: { questionDigest: digest },
      fromBlock: boundedFrom,
      toBlock,
    });

    if (logs.length > 0) {
      const lastLog = logs[logs.length - 1];
      if (!lastLog.blockNumber) return null;
      const block = await publicClient.getBlock({ blockNumber: lastLog.blockNumber });
      return Number(block.timestamp);
    }

    if (boundedFrom === BigInt(0) || boundedFrom <= minBlock) break;
    toBlock = boundedFrom - BigInt(1);
  }

  return null;
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
  deadlineTimestamp: number
): Promise<WalletWriteResult> {
  await ensureSepoliaNetwork();
  const walletClient = getWalletClient();
  const [account] = await walletClient.requestAddresses();
  const emptyProof: readonly [bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint] = [
    BigInt(0),
    BigInt(0),
    BigInt(0),
    BigInt(0),
    BigInt(0),
    BigInt(0),
    BigInt(0),
    BigInt(0),
  ];

  try {
    const { request } = await publicClient.simulateContract({
      account,
      address: CONTRACTS.PREDICTION_MARKET_ADDRESS,
      abi: ALETHEIA_MARKET_ABI,
      functionName: "createMarketVerified",
      args: [question, BigInt(deadlineTimestamp), BigInt(0), BigInt(0), emptyProof],
    });

    return writeContractAndWait(request);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);

    if (msg.includes("0x5cbfd590")) {
      throw new Error("Question is not validated by CRE for this exact question and deadline yet.");
    }

    throw error;
  }
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

async function getLogsChunked<TEvent extends { type: "event"; name: string; inputs: readonly any[] }>(params: {
  address: `0x${string}`;
  event: TEvent;
  args?: Record<string, unknown>;
  fromBlock: bigint;
  toBlock: bigint;
  maxRange?: bigint;
}) {
  const { address, event, args, fromBlock, toBlock, maxRange = BigInt(49999) } = params;
  const logs: any[] = [];
  let start = fromBlock;

  while (start <= toBlock) {
    const end = start + maxRange > toBlock ? toBlock : start + maxRange;
    const chunk = await publicClient.getLogs({
      address,
      event,
      args: args as any,
      fromBlock: start,
      toBlock: end,
    });
    logs.push(...chunk);
    if (end === toBlock) break;
    start = end + BigInt(1);
  }

  return logs;
}

export async function fetchMarketPriceHistory(marketId: number): Promise<MarketPricePoint[]> {
  const latest = await publicClient.getBlockNumber();
  const fallbackFrom = latest > BigInt(250000) ? latest - BigInt(250000) : BigInt(0);

  const marketCreatedEvent = {
    type: "event" as const,
    name: "MarketCreated" as const,
    inputs: [
      { indexed: true, name: "marketId", type: "uint256" as const },
      { indexed: true, name: "oracleMarketId", type: "uint256" as const },
      { indexed: false, name: "question", type: "string" as const },
      { indexed: false, name: "deadline", type: "uint256" as const },
    ],
  };

  const betPlacedEvent = {
    type: "event" as const,
    name: "BetPlaced" as const,
    inputs: [
      { indexed: true, name: "marketId", type: "uint256" as const },
      { indexed: true, name: "user", type: "address" as const },
      { indexed: false, name: "onYes", type: "bool" as const },
      { indexed: false, name: "amount", type: "uint256" as const },
    ],
  };

  const sharesSoldEvent = {
    type: "event" as const,
    name: "SharesSold" as const,
    inputs: [
      { indexed: true, name: "marketId", type: "uint256" as const },
      { indexed: true, name: "user", type: "address" as const },
      { indexed: false, name: "onYes", type: "bool" as const },
      { indexed: false, name: "amount", type: "uint256" as const },
    ],
  };

  const createdLogs = await getLogsChunked({
    address: CONTRACTS.PREDICTION_MARKET_ADDRESS,
    event: marketCreatedEvent,
    args: { marketId: BigInt(marketId) },
    fromBlock: fallbackFrom,
    toBlock: latest,
  });

  const startBlock = createdLogs[0]?.blockNumber ?? fallbackFrom;

  const [betLogs, sellLogs] = await Promise.all([
    getLogsChunked({
      address: CONTRACTS.PREDICTION_MARKET_ADDRESS,
      event: betPlacedEvent,
      args: { marketId: BigInt(marketId) },
      fromBlock: startBlock,
      toBlock: latest,
    }),
    getLogsChunked({
      address: CONTRACTS.PREDICTION_MARKET_ADDRESS,
      event: sharesSoldEvent,
      args: { marketId: BigInt(marketId) },
      fromBlock: startBlock,
      toBlock: latest,
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

export async function fetchMarketTradeHistory(marketId: number, limit = 80): Promise<MarketTradeEntry[]> {
  const latest = await publicClient.getBlockNumber();
  const fallbackFrom = latest > BigInt(250000) ? latest - BigInt(250000) : BigInt(0);

  const marketCreatedEvent = {
    type: "event" as const,
    name: "MarketCreated" as const,
    inputs: [
      { indexed: true, name: "marketId", type: "uint256" as const },
      { indexed: true, name: "oracleMarketId", type: "uint256" as const },
      { indexed: false, name: "question", type: "string" as const },
      { indexed: false, name: "deadline", type: "uint256" as const },
    ],
  };

  const betPlacedEvent = {
    type: "event" as const,
    name: "BetPlaced" as const,
    inputs: [
      { indexed: true, name: "marketId", type: "uint256" as const },
      { indexed: true, name: "user", type: "address" as const },
      { indexed: false, name: "onYes", type: "bool" as const },
      { indexed: false, name: "amount", type: "uint256" as const },
    ],
  };

  const sharesSoldEvent = {
    type: "event" as const,
    name: "SharesSold" as const,
    inputs: [
      { indexed: true, name: "marketId", type: "uint256" as const },
      { indexed: true, name: "user", type: "address" as const },
      { indexed: false, name: "onYes", type: "bool" as const },
      { indexed: false, name: "amount", type: "uint256" as const },
    ],
  };

  const createdLogs = await getLogsChunked({
    address: CONTRACTS.PREDICTION_MARKET_ADDRESS,
    event: marketCreatedEvent,
    args: { marketId: BigInt(marketId) },
    fromBlock: fallbackFrom,
    toBlock: latest,
  });

  const startBlock = createdLogs[0]?.blockNumber ?? fallbackFrom;

  const [betLogs, sellLogs] = await Promise.all([
    getLogsChunked({
      address: CONTRACTS.PREDICTION_MARKET_ADDRESS,
      event: betPlacedEvent,
      args: { marketId: BigInt(marketId) },
      fromBlock: startBlock,
      toBlock: latest,
    }),
    getLogsChunked({
      address: CONTRACTS.PREDICTION_MARKET_ADDRESS,
      event: sharesSoldEvent,
      args: { marketId: BigInt(marketId) },
      fromBlock: startBlock,
      toBlock: latest,
    }),
  ]);

  const ordered = [
    ...betLogs.map((l) => ({ type: "buy" as const, log: l })),
    ...sellLogs.map((l) => ({ type: "sell" as const, log: l })),
  ].sort((a, b) => {
    if (a.log.blockNumber === b.log.blockNumber) {
      return Number((b.log.logIndex ?? 0) - (a.log.logIndex ?? 0));
    }
    return Number(b.log.blockNumber - a.log.blockNumber);
  });

  const sliced = ordered.slice(0, Math.max(1, limit));
  if (sliced.length === 0) return [];

  const blockSet = new Set<bigint>(sliced.map((e) => e.log.blockNumber));
  const blockEntries = await Promise.all(
    Array.from(blockSet).map(async (bn) => [bn, await publicClient.getBlock({ blockNumber: bn })] as const)
  );
  const blockTs = new Map<bigint, number>(blockEntries.map(([bn, b]) => [bn, Number(b.timestamp)]));

  return sliced.map((entry) => ({
    txHash: entry.log.transactionHash,
    blockNumber: entry.log.blockNumber,
    logIndex: entry.log.logIndex ?? 0,
    timestamp: blockTs.get(entry.log.blockNumber) ?? Math.floor(Date.now() / 1000),
    trader: entry.log.args.user as `0x${string}`,
    type: entry.type,
    onYes: Boolean(entry.log.args.onYes),
    amount: entry.log.args.amount as bigint,
  }));
}
