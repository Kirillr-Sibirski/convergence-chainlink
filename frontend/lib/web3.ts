"use client";

import { createPublicClient, createWalletClient, custom, http, type PublicClient, type WalletClient } from "viem";
import { sepolia } from "viem/chains";
import { CONTRACTS, ORACLE_ABI, PREDICTION_MARKET_ABI } from "./contracts";

/**
 * Create a public client for reading from the blockchain
 */
export function getPublicClient(): PublicClient {
  return createPublicClient({
    chain: sepolia,
    transport: http(),
  });
}

/**
 * Create a wallet client for writing to the blockchain
 * Requires window.ethereum (MetaMask or similar)
 */
export function getWalletClient(): WalletClient | null {
  if (typeof window === "undefined" || !window.ethereum) {
    return null;
  }

  return createWalletClient({
    chain: sepolia,
    transport: custom(window.ethereum),
  });
}

/**
 * Read all markets from the oracle contract
 */
export async function fetchMarkets() {
  const client = getPublicClient();

  try {
    // Get market count
    const marketCount = await client.readContract({
      address: CONTRACTS.ORACLE_ADDRESS,
      abi: ORACLE_ABI,
      functionName: "marketCount",
    }) as bigint;

    const count = Number(marketCount);

    // Fetch all markets
    const markets = await Promise.all(
      Array.from({ length: count }, async (_, i) => {
        const marketId = i + 1;
        const market = await client.readContract({
          address: CONTRACTS.ORACLE_ADDRESS,
          abi: ORACLE_ABI,
          functionName: "markets",
          args: [BigInt(marketId)],
        }) as any;

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

/**
 * Create a new market
 */
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

/**
 * Place a bet on a prediction market
 * @param marketId The market ID
 * @param predictYes true for YES, false for NO
 * @param amount Amount in ETH
 */
export async function placeBet(marketId: number, predictYes: boolean, amount: string) {
  const walletClient = getWalletClient();
  if (!walletClient) {
    throw new Error("No wallet connected");
  }

  if (!CONTRACTS.PREDICTION_MARKET_ADDRESS) {
    throw new Error("Prediction market contract not deployed yet");
  }

  const [address] = await walletClient.getAddresses();

  // Convert ETH to wei
  const value = BigInt(Math.floor(parseFloat(amount) * 1e18));

  const hash = await walletClient.writeContract({
    address: CONTRACTS.PREDICTION_MARKET_ADDRESS,
    abi: PREDICTION_MARKET_ABI,
    functionName: "placeStake",
    args: [BigInt(marketId), predictYes],
    account: address,
    value,
    chain: sepolia,
  });

  return hash;
}

declare global {
  interface Window {
    ethereum?: any;
  }
}
