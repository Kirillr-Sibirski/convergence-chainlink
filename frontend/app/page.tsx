"use client";

import { useState } from "react";
import { SimpleHeader } from "@/components/layout/SimpleHeader";
import { MarketCard } from "@/components/trading/MarketCard";
import { ScrollIndicator } from "@/components/ui/scroll-indicator";
import { InfoSection } from "@/components/sections/InfoSection";
import { FloatingIcons } from "@/components/ui/floating-icons";
import { GradientText, SparkleText } from "@/components/ui/text-shimmer";
import { CreateMarketModal } from "@/components/trading/CreateMarketModal";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { createMarket } from "@/lib/web3";

export default function Home() {
  const [showCreateModal, setShowCreateModal] = useState(false);

  const handleCreateMarket = async (question: string, deadline: number) => {
    await createMarket(question, deadline);
    // The market card will automatically refresh and show the new market
  };

  return (
    <div className="min-h-screen bg-background relative">
      <FloatingIcons />
      <SimpleHeader />

      <main className="relative z-10 flex flex-col items-center justify-center px-4 pt-12 pb-32 gap-8 min-h-[calc(100vh-65px)]">
        <div className="text-center space-y-3">
          <h1 className="text-4xl font-bold tracking-tight">
            <SparkleText>AI-Powered</SparkleText>{" "}
            <GradientText>Prediction Markets</GradientText>
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Zero hardcoded sources. Universal verification.{" "}
            <span className="text-primary">Powered by Chainlink CRE.</span>
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
    </div>
  );
}
