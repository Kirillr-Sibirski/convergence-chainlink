"use client";

import { useState } from "react";
import { SimpleHeader } from "@/components/layout/SimpleHeader";
import { MarketCard } from "@/components/trading/MarketCard";
import { ScrollIndicator } from "@/components/ui/scroll-indicator";
import { InfoSection } from "@/components/sections/InfoSection";
import { CreateMarketModal } from "@/components/trading/CreateMarketModal";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { createMarket } from "@/lib/web3-thirdweb";
import { useActiveAccount } from "thirdweb/react";
import { BackgroundBeams } from "@/components/ui/background-beams";

export default function Home() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const account = useActiveAccount();

  const handleCreateMarket = async (question: string) => {
    if (!account) {
      throw new Error("Please connect your wallet first");
    }
    const deadline = Math.floor(Date.now() / 1000) + 24 * 3600;
    await createMarket(account, question, deadline);
  };

  return (
    <div className="min-h-screen relative">
      {/* <FloatingIcons /> */}
      <SimpleHeader />

      <main className="relative z-10 flex flex-col items-center justify-center px-4 pt-12 pb-32 gap-8 min-h-[calc(100vh-65px)]">
        <div className="text-center space-y-3">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900">
            AI-Fetched Sources, CRE-Verified Truth
          </h1>
          <p className="text-gray-500 max-w-md mx-auto">
            Prediction markets resolved by processing real evidence, not AI hallucinations.
            Powered by Chainlink Runtime Environment.
          </p>
        </div>

        <div className="flex flex-col items-center gap-4">
          <MarketCard />

          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowCreateModal(true)}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Create New Market
          </Button>
        </div>
      </main>

      <ScrollIndicator targetId="learn-more" />

      <div id="learn-more" className="relative z-10">
        <InfoSection />
      </div>

      {showCreateModal && (
        <CreateMarketModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateMarket}
        />
      )}
      <BackgroundBeams />
    </div>
  );
}
