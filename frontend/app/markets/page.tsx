"use client";

import { SimpleHeader } from "@/components/layout/SimpleHeader";
import { MarketGrid } from "@/components/trading/MarketGrid";
import { BackgroundBeams } from "@/components/ui/background-beams";
import { useMarkets } from "@/hooks/useMarkets";

export default function MarketsPage() {
  const { markets, isLoading, error } = useMarkets();

  return (
    <div className="min-h-screen relative">
      <SimpleHeader />

      <main className="relative z-10 px-4 py-8">
        <div className="container mx-auto max-w-6xl space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Markets</h1>
            <p className="text-sm text-gray-500">
              Resolved by AI-fetched sources, verified by Chainlink CRE
            </p>
          </div>

          <MarketGrid markets={markets} isLoading={isLoading} error={error} />
        </div>
      </main>

      <BackgroundBeams />
    </div>
  );
}
