"use client";

import { useState, useEffect } from "react";
import { fetchMarkets } from "@/lib/web3";

export interface Market {
  id: number;
  question: string;
  deadline: number;
  resolved: boolean;
  outcome: boolean;
  confidence: number;
  proofHash: string;
  createdAt: number;
}

export function useMarkets() {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadMarkets() {
      try {
        setIsLoading(true);
        setError(null);
        const data = await fetchMarkets();
        setMarkets(data);
      } catch (err) {
        console.error("Error loading markets:", err);
        setError(err instanceof Error ? err.message : "Failed to load markets");
      } finally {
        setIsLoading(false);
      }
    }

    loadMarkets();

    // Refresh markets every 30 seconds
    const interval = setInterval(loadMarkets, 30000);

    return () => clearInterval(interval);
  }, []);

  return { markets, isLoading, error };
}
