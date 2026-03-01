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
    let mounted = true;

    async function loadMarkets() {
      try {
        setIsLoading(true);
        const data = await fetchMarkets();
        if (mounted) {
          setMarkets(data);
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          console.error("Failed to load markets:", err);
          setError("Failed to load markets");
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    loadMarkets();

    // Refresh every 30 seconds
    const interval = setInterval(loadMarkets, 30000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return { markets, isLoading, error };
}
