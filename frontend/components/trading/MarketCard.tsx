"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { Separator } from "@/components/ui/separator";
import { Loader2 } from "lucide-react";

// Simplified MarketCard adapted from TradeCard
// TODO: Connect to smart contracts for real data
export function MarketCard() {
  const [side, setSide] = useState<"yes" | "no">("yes");
  const [amount, setAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mock market data - will be replaced with real contract data
  const mockMarket = {
    question: "Will Bitcoin exceed $100,000 by March 31, 2026?",
    deadline: "March 31, 2026",
    yesPercent: 64,
    noPercent: 36,
    totalPool: "15.2 ETH",
  };

  const handlePlaceBet = async () => {
    if (!amount || parseFloat(amount) <= 0) return;

    setIsSubmitting(true);
    try {
      // TODO: Call smart contract placeBet function
      await new Promise(resolve => setTimeout(resolve, 2000)); // Mock delay
      alert(`Bet placed: ${amount} ETH on ${side.toUpperCase()}`);
      setAmount("");
    } catch (error) {
      console.error("Failed to place bet:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const potentialPayout = amount && parseFloat(amount) > 0
    ? (parseFloat(amount) * (side === "yes" ? 1.56 : 2.78)).toFixed(3)
    : "0.000";

  return (
    <div className="w-full max-w-md">
      <SpotlightCard>
        <div className="p-6 space-y-5">
          {/* Market Question */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">{mockMarket.question}</h3>
            <p className="text-sm text-muted-foreground">
              Deadline: {mockMarket.deadline} • Pool: {mockMarket.totalPool}
            </p>
          </div>

          <Separator />

          {/* YES/NO Tabs */}
          <Tabs value={side} onValueChange={(v: string) => setSide(v as "yes" | "no")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger
                value="yes"
                className="data-[state=active]:bg-green-600 data-[state=active]:text-white"
              >
                YES ({mockMarket.yesPercent}%)
              </TabsTrigger>
              <TabsTrigger
                value="no"
                className="data-[state=active]:bg-red-600 data-[state=active]:text-white"
              >
                NO ({mockMarket.noPercent}%)
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Amount Input */}
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (ETH)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          {/* Payout Preview */}
          {amount && parseFloat(amount) > 0 && (
            <div className="p-3 bg-muted rounded-lg space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">You bet</span>
                <span className="font-medium">
                  {amount} ETH on {side.toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Potential payout</span>
                <span className="font-semibold text-primary">
                  {potentialPayout} ETH
                </span>
              </div>
            </div>
          )}

          {/* Place Bet Button */}
          <Button
            className="w-full"
            size="lg"
            disabled={!amount || parseFloat(amount) <= 0 || isSubmitting}
            onClick={handlePlaceBet}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Placing Bet...
              </>
            ) : (
              "Place Bet"
            )}
          </Button>

          {/* Info */}
          <p className="text-xs text-muted-foreground text-center">
            Connect wallet to place bets. Market resolves automatically via{" "}
            <span className="text-primary font-medium">Chainlink CRE</span>.
          </p>
        </div>
      </SpotlightCard>
    </div>
  );
}
