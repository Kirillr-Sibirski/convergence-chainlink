"use client";

import { prepareContractCall, readContract, getContract, sendTransaction } from "thirdweb";
import { client, chain, CONTRACTS_CONFIG } from "./thirdweb";
import { ORACLE_ABI, PREDICTION_MARKET_ABI } from "./contracts";
import type { Account } from "thirdweb/wallets";

// Get Oracle contract
export function getOracleContract() {
  return getContract({
    client,
    chain,
    address: CONTRACTS_CONFIG.ORACLE_ADDRESS,
    abi: ORACLE_ABI,
  });
}

// Get PredictionMarket contract
export function getPredictionMarketContract() {
  return getContract({
    client,
    chain,
    address: CONTRACTS_CONFIG.PREDICTION_MARKET_ADDRESS,
    abi: PREDICTION_MARKET_ABI,
  });
}

// Fetch all markets from the Oracle contract
// export async function fetchMarkets() {
//   try {
//     const oracleContract = getOracleContract();

//     const marketCount = await readContract({
//       contract: oracleContract,
//       method: "marketCount",
//       params: [],
//     });

//     const count = Number(marketCount);
//     if (count === 0) return [];

//     const markets = await Promise.all(
//       Array.from({ length: count }, async (_, i) => {
//         const marketId = i + 1;
//         const market = await readContract({
//           contract: oracleContract,
//           method: "markets",
//           params: [BigInt(marketId)],
//         });

//         return {
//           id: Number(market[0]),
//           question: market[1] as string,
//           deadline: Number(market[2]),
//           resolved: market[3] as boolean,
//           outcome: market[4] as boolean,
//           confidence: Number(market[5]),
//           proofHash: market[6] as string,
//           createdAt: Number(market[7]),
//         };
//       })
//     );

//     return markets;
//   } catch (error) {
//     console.error("Failed to fetch markets:", error);
//     return [];
//   }
// }

export async function fetchMarkets() {
  return [
    {
      id: 1,
      question: "Will Bitcoin reach $200,000 by end of 2025?",
      deadline: 1767225600, // Dec 31, 2025
      resolved: false,
      outcome: false,
      confidence: 62,
      proofHash: "0xabc123def456ghi789jkl012mno345pqr678stu901vwx234yza567bcd890efg",
      createdAt: 1704067200,
      category: "Crypto",
      volumeUsdc: 48200,
      yesPercent: 62,
    },
    {
      id: 2,
      question: "Will ETH reach $10,000 by end of Q3 2026?",
      deadline: 1759276800, // Sep 30, 2026
      resolved: false,
      outcome: false,
      confidence: 44,
      proofHash: "0xdef456ghi789jkl012mno345pqr678stu901vwx234yza567bcd890efgabc123",
      createdAt: 1704067200,
      category: "Crypto",
      volumeUsdc: 31500,
      yesPercent: 44,
    },
    {
      id: 3,
      question: "Will AI surpass human-level reasoning on all benchmarks by 2027?",
      deadline: 1830384000, // Dec 31, 2027
      resolved: false,
      outcome: false,
      confidence: 55,
      proofHash: "0xghi789jkl012mno345pqr678stu901vwx234yza567bcd890efgabc123def456",
      createdAt: 1704067200,
      category: "AI & Tech",
      volumeUsdc: 21800,
      yesPercent: 55,
    },
    {
      id: 4,
      question: "Will Bitcoin ETF inflows exceed $5B in March 2026?",
      deadline: 1743379200, // Mar 31, 2026
      resolved: false,
      outcome: false,
      confidence: 71,
      proofHash: "0xjkl012mno345pqr678stu901vwx234yza567bcd890efgabc123def456ghi789",
      createdAt: 1704067200,
      category: "Crypto",
      volumeUsdc: 18400,
      yesPercent: 71,
    },
    {
      id: 5,
      question: "Will GPT-5 be publicly released before June 2026?",
      deadline: 1748736000, // Jun 1, 2026
      resolved: false,
      outcome: false,
      confidence: 58,
      proofHash: "0xmno345pqr678stu901vwx234yza567bcd890efgabc123def456ghi789jkl012",
      createdAt: 1704067200,
      category: "AI & Tech",
      volumeUsdc: 15200,
      yesPercent: 58,
    },
    {
      id: 6,
      question: "Will US CPI inflation drop below 2% before end of 2026?",
      deadline: 1767225600, // Dec 31, 2026
      resolved: false,
      outcome: false,
      confidence: 48,
      proofHash: "0xpqr678stu901vwx234yza567bcd890efgabc123def456ghi789jkl012mno345",
      createdAt: 1704067200,
      category: "Politics",
      volumeUsdc: 12600,
      yesPercent: 48,
    },
    {
      id: 7,
      question: "Will SOL reach $500 before end of Q2 2026?",
      deadline: 1751241600, // Jun 30, 2026
      resolved: false,
      outcome: false,
      confidence: 57,
      proofHash: "0xstu901vwx234yza567bcd890efgabc123def456ghi789jkl012mno345pqr678",
      createdAt: 1704067200,
      category: "Crypto",
      volumeUsdc: 9400,
      yesPercent: 57,
    },
    {
      id: 8,
      question: "Will SpaceX successfully land humans on Mars before 2031?",
      deadline: 1924905600, // Dec 31, 2030
      resolved: false,
      outcome: false,
      confidence: 31,
      proofHash: "0xvwx234yza567bcd890efgabc123def456ghi789jkl012mno345pqr678stu901",
      createdAt: 1704067200,
      category: "Science",
      volumeUsdc: 22100,
      yesPercent: 31,
    },
    {
      id: 9,
      question: "Will the EU pass a comprehensive AI regulation act in 2026?",
      deadline: 1767225600, // Dec 31, 2026
      resolved: false,
      outcome: false,
      confidence: 66,
      proofHash: "0xyza567bcd890efgabc123def456ghi789jkl012mno345pqr678stu901vwx234",
      createdAt: 1704067200,
      category: "Politics",
      volumeUsdc: 8700,
      yesPercent: 66,
    },
  ];
}


// Create a new market via PredictionMarket contract
export async function createMarket(account: Account, question: string, deadline: bigint) {
  const pmContract = getPredictionMarketContract();

  const transaction = prepareContractCall({
    contract: pmContract,
    method: "createMarket",
    params: [question, deadline],
  });

  const { transactionHash } = await sendTransaction({
    account,
    transaction,
  });

  return transactionHash;
}

// Place a bet on YES or NO
export async function placeBet(
  account: Account,
  marketId: number,
  predictYes: boolean,
  amountEth: string
) {
  const pmContract = getPredictionMarketContract();

  const transaction = prepareContractCall({
    contract: pmContract,
    method: "stake",
    params: [BigInt(marketId), predictYes],
    value: BigInt(Math.floor(parseFloat(amountEth) * 1e18)),
  });

  const { transactionHash } = await sendTransaction({
    account,
    transaction,
  });

  return transactionHash;
}

// Fetch prediction market data
export async function fetchPredictionMarket(marketId: number) {
  try {
    const pmContract = getPredictionMarketContract();

    const market = await readContract({
      contract: pmContract,
      method: "predictionMarkets",
      params: [BigInt(marketId)],
    });

    return {
      oracleMarketId: Number(market[0]),
      question: market[1] as string,
      deadline: Number(market[2]),
      totalYesStake: market[3],
      totalNoStake: market[4],
      settled: market[5] as boolean,
      outcome: market[6] as boolean,
      createdAt: Number(market[7]),
    };
  } catch (error) {
    console.error("Failed to fetch prediction market:", error);
    return null;
  }
}

// Get user stakes for a market
export async function getUserStakes(marketId: number, userAddress: string) {
  try {
    const pmContract = getPredictionMarketContract();

    const stakes = await readContract({
      contract: pmContract,
      method: "getUserStakes",
      params: [BigInt(marketId), userAddress],
    });

    return {
      yesStake: stakes[0],
      noStake: stakes[1],
    };
  } catch (error) {
    console.error("Failed to fetch user stakes:", error);
    return { yesStake: BigInt(0), noStake: BigInt(0) };
  }
}
