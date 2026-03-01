"use client";

import { createPublicClient, createWalletClient, custom, http } from "viem";
import { sepolia } from "viem/chains";
import { CONTRACTS, ORACLE_ABI } from "./contracts";

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

declare global {
  interface Window {
    ethereum?: any;
  }
}
