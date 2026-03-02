"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchMarkets, type UIMarket } from "@/lib/web3-viem";

export type Market = UIMarket;

export function useMarkets() {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      setMarkets(await fetchMarkets());
    } catch (err) {
      console.error("Error loading markets:", err);
      setError(err instanceof Error ? err.message : "Failed to load markets");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const interval = setInterval(() => void refresh(), 30000);
    return () => clearInterval(interval);
  }, [refresh]);

  return { markets, isLoading, error, refresh };
}
