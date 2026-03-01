"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { Separator } from "@/components/ui/separator";
import { Loader2, AlertCircle } from "lucide-react";
import { useMarkets } from "@/hooks/useMarkets";
import { placeBet } from "@/lib/web3";

// MarketCard connected to smart contracts
export function MarketCard() {
  const { markets, isLoading, error } = useMarkets();
  const [side, setSide] = useState<"yes" | "no">("yes");
  const [amount, setAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePlaceBet = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    if (!market) return;

    setIsSubmitting(true);
    try {
      const hash = await placeBet(market.id, side === "yes", amount);
      alert(`✅ Bet placed successfully!\n\nTransaction: ${hash}\n\nYour ${amount} ETH bet on ${side.toUpperCase()} has been submitted to the blockchain.`);
      setAmount("");
    } catch (error: any) {
      console.error("Failed to place bet:", error);
      const message = error.message || "Failed to place bet";
      alert(`❌ Failed to place bet\n\n${message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="w-full max-w-md">
        <SpotlightCard>
          <div className="p-6 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading markets from blockchain...</p>
          </div>
        </SpotlightCard>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="w-full max-w-md">
        <SpotlightCard>
          <div className="p-6 flex flex-col items-center justify-center gap-3">
            <AlertCircle className="w-8 h-8 text-destructive" />
            <p className="text-sm text-destructive">{error}</p>
            <p className="text-xs text-muted-foreground">
              Make sure you're connected to Sepolia testnet
            </p>
          </div>
        </SpotlightCard>
      </div>
    );
  }

  // Get first unresolved market
  const market = markets.find((m) => !m.resolved);

  // No markets state
  if (!market) {
    return (
      <div className="w-full max-w-md">
        <SpotlightCard>
          <div className="p-6 space-y-3 text-center">
            <h3 className="text-lg font-semibold">No Active Markets</h3>
            <p className="text-sm text-muted-foreground">
              {markets.length === 0
                ? "No markets have been created yet. Be the first to create one!"
                : "All markets have been resolved. Check back soon for new markets."}
            </p>
            <p className="text-xs text-muted-foreground mt-4">
              Contract: {`0xb13623f...8315e`}
            </p>
          </div>
        </SpotlightCard>
      </div>
    );
  }

  const potentialPayout = amount && parseFloat(amount) > 0
    ? (parseFloat(amount) * (side === "yes" ? 1.56 : 2.78)).toFixed(3)
    : "0.000";

  const deadlineDate = new Date(market.deadline * 1000);

  return (
    <div className="w-full max-w-md">
      <SpotlightCard>
        <div className="p-6 space-y-5">
          {/* Market Question */}
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-lg font-semibold">{market.question}</h3>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                #{market.id}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Deadline: {deadlineDate.toLocaleDateString()} • Created: {new Date(market.createdAt * 1000).toLocaleDateString()}
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
                YES (50%)
              </TabsTrigger>
              <TabsTrigger
                value="no"
                className="data-[state=active]:bg-red-600 data-[state=active]:text-white"
              >
                NO (50%)
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
