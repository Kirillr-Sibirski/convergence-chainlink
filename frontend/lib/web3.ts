"use client";

import { createPublicClient, createWalletClient, custom, http, parseEther } from "viem";
import { sepolia } from "viem/chains";
import { CONTRACTS, ORACLE_ABI, PREDICTION_MARKET_ABI } from "./contracts";

// Create public client for reading
export function getPublicClient() {
  return createPublicClient({
    chain: sepolia,
    transport: http(),
  });
}

// Create wallet client for writing (requires MetaMask)
export function getWalletClient() {
  if (typeof window === "undefined" || !window.ethereum) {
    return null;
  }

  return createWalletClient({
    chain: sepolia,
    transport: custom(window.ethereum),
  });
}

// Fetch all markets from the Oracle contract
export async function fetchMarkets() {
  const client = getPublicClient();

  try {
    const marketCount = (await client.readContract({
      address: CONTRACTS.ORACLE_ADDRESS,
      abi: ORACLE_ABI,
      functionName: "marketCount",
    })) as bigint;

    const count = Number(marketCount);
    if (count === 0) return [];

    const markets = await Promise.all(
      Array.from({ length: count }, async (_, i) => {
        const marketId = i + 1;
        const market = (await client.readContract({
          address: CONTRACTS.ORACLE_ADDRESS,
          abi: ORACLE_ABI,
          functionName: "markets",
          args: [BigInt(marketId)],
        })) as any;

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

// Create a new market
export async function createMarket(question: string, deadline: number) {
  const walletClient = getWalletClient();
  if (!walletClient) {
    throw new Error("No wallet connected");
  }

  const [address] = await walletClient.getAddresses();

  const hash = await walletClient.writeContract({
    address: CONTRACTS.ORACLE_ADDRESS,
    abi: ORACLE_ABI,
    functionName: "createMarket",
    args: [question, BigInt(deadline)],
    account: address,
    chain: sepolia,
  });

  return hash;
}

// Place a bet on YES or NO
export async function placeBet(marketId: number, predictYes: boolean, amountEth: string) {
  const walletClient = getWalletClient();
  if (!walletClient) {
    throw new Error("No wallet connected");
  }

  if (CONTRACTS.PREDICTION_MARKET_ADDRESS === "0x0000000000000000000000000000000000000000") {
    throw new Error("PredictionMarket contract not deployed yet. Please deploy it first.");
  }

  const [address] = await walletClient.getAddresses();

  const hash = await walletClient.writeContract({
    address: CONTRACTS.PREDICTION_MARKET_ADDRESS,
    abi: PREDICTION_MARKET_ABI,
    functionName: "stake",
    args: [BigInt(marketId), predictYes],
    value: parseEther(amountEth),
    account: address,
    chain: sepolia,
  });

  return hash;
}

// Get market data from PredictionMarket contract
export async function fetchPredictionMarket(marketId: number) {
  const client = getPublicClient();

  if (CONTRACTS.PREDICTION_MARKET_ADDRESS === "0x0000000000000000000000000000000000000000") {
    return null;
  }

  try {
    const market = (await client.readContract({
      address: CONTRACTS.PREDICTION_MARKET_ADDRESS,
      abi: PREDICTION_MARKET_ABI,
      functionName: "predictionMarkets",
      args: [BigInt(marketId)],
    })) as any;

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

// Get user's stakes for a market
export async function getUserStakes(marketId: number, userAddress: string) {
  const client = getPublicClient();

  if (CONTRACTS.PREDICTION_MARKET_ADDRESS === "0x0000000000000000000000000000000000000000") {
    return { yesStake: BigInt(0), noStake: BigInt(0) };
  }

  try {
    const stakes = (await client.readContract({
      address: CONTRACTS.PREDICTION_MARKET_ADDRESS,
      abi: PREDICTION_MARKET_ABI,
      functionName: "getUserStakes",
      args: [BigInt(marketId), userAddress as `0x${string}`],
    })) as [bigint, bigint];

    return {
      yesStake: stakes[0],
      noStake: stakes[1],
    };
  } catch (error) {
    console.error("Failed to fetch user stakes:", error);
    return { yesStake: BigInt(0), noStake: BigInt(0) };
  }
}

declare global {
  interface Window {
    ethereum?: any;
  }
}
