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
  // Mock data with 3 data points
  return [
    {
      id: 1,
      question: "Will Bitcoin reach $100,000 by end of 2024?",
      deadline: 1735689600, // Example Unix timestamp for Dec 31, 2024
      resolved: false,
      outcome: false,
      confidence: 60,
      proofHash: "0xabc123def456ghi789jkl012mno345pqr678stu901vwx234yza567bcd890efg",
      createdAt: 1704067200, // Example Unix timestamp for Jan 1, 2024
    },
    {
      id: 2,
      question: "Will AI surpass human intelligence by 2030?",
      deadline: 1893456000, // Example Unix timestamp for Dec 31, 2030
      resolved: false,
      outcome: false,
      confidence: 45,
      proofHash: "0xdef456ghi789jkl012mno345pqr678stu901vwx234yza567bcd890efgabc123",
      createdAt: 1672531200, // Example Unix timestamp for Jan 1, 2023
    },
    {
      id: 3,
      question: "Was the 2024 US election fair?",
      deadline: 1730419200, // Example Unix timestamp for Nov 1, 2024
      resolved: true,
      outcome: true,
      confidence: 85,
      proofHash: "0xghi789jkl012mno345pqr678stu901vwx234yza567bcd890efgabc123def456",
      createdAt: 1701388800, // Example Unix timestamp for Dec 1, 2023
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
