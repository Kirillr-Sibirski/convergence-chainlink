"use client";

import { publicClient, getWalletClient, CONTRACTS } from './viem-client';
import { ORACLE_ABI, PREDICTION_MARKET_ABI } from './contracts';

// Fetch all markets from the Oracle contract
export async function fetchMarkets() {
  try {
    const marketCount = await publicClient.readContract({
      address: CONTRACTS.ORACLE,
      abi: ORACLE_ABI,
      functionName: 'marketCount',
    });

    const count = Number(marketCount);
    if (count === 0) return [];

    const markets = await Promise.all(
      Array.from({ length: count }, async (_, i) => {
        const marketId = i + 1;
        const market = await publicClient.readContract({
          address: CONTRACTS.ORACLE,
          abi: ORACLE_ABI,
          functionName: 'markets',
          args: [BigInt(marketId)],
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
          category: "Crypto", // Default category
          volumeUsdc: 0,
          yesPercent: 50,
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
export async function createMarket(question: string, deadlineTimestamp: number) {
  const walletClient = getWalletClient();
  const [address] = await walletClient.getAddresses();

  const { request } = await publicClient.simulateContract({
    account: address,
    address: CONTRACTS.ORACLE,
    abi: ORACLE_ABI,
    functionName: 'createMarket',
    args: [question, BigInt(deadlineTimestamp)],
  });

  const hash = await walletClient.writeContract(request);

  // Wait for transaction
  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  return {
    hash,
    blockNumber: receipt.blockNumber,
  };
}

// Place a bet on YES or NO
export async function placeBet(
  marketId: number,
  predictYes: boolean,
  amountEth: string
) {
  const walletClient = getWalletClient();
  const [address] = await walletClient.getAddresses();

  const { request } = await publicClient.simulateContract({
    account: address,
    address: CONTRACTS.PREDICTION_MARKET,
    abi: PREDICTION_MARKET_ABI,
    functionName: 'stake',
    args: [BigInt(marketId), predictYes],
    value: BigInt(Math.floor(parseFloat(amountEth) * 1e18)),
  });

  const hash = await walletClient.writeContract(request);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  return {
    hash,
    blockNumber: receipt.blockNumber,
  };
}

// Get user's connected address
export async function getConnectedAddress(): Promise<string | null> {
  try {
    const walletClient = getWalletClient();
    const [address] = await walletClient.getAddresses();
    return address;
  } catch {
    return null;
  }
}

// Request wallet connection
export async function connectWallet(): Promise<string> {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('No wallet detected');
  }

  const accounts = await window.ethereum.request({
    method: 'eth_requestAccounts',
  });

  return accounts[0];
}
