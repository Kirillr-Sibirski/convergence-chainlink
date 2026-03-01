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
export async function fetchMarkets() {
  try {
    const oracleContract = getOracleContract();

    const marketCount = await readContract({
      contract: oracleContract,
      method: "marketCount",
      params: [],
    });

    const count = Number(marketCount);
    if (count === 0) return [];

    const markets = await Promise.all(
      Array.from({ length: count }, async (_, i) => {
        const marketId = i + 1;
        const market = await readContract({
          contract: oracleContract,
          method: "markets",
          params: [BigInt(marketId)],
        });

        return {
          id: Number(market[0]),
          question: market[1] as string,
          deadline: Number(market[2]),
          resolved: market[3] as boolean,
          outcome: market[4] as boolean,
          confidence: Number(market[5]),
          proofHash: market[6] as string,
          createdAt: Number(market[7]),
        };
      })
    );

    return markets;
  } catch (error) {
    console.error("Failed to fetch markets:", error);
    return [];
  }
}

// Create a new market via PredictionMarket contract
export async function createMarket(account: Account, question: string, deadline: number) {
  const pmContract = getPredictionMarketContract();

  const transaction = prepareContractCall({
    contract: pmContract,
    method: "createMarket",
    params: [question, BigInt(deadline)],
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
