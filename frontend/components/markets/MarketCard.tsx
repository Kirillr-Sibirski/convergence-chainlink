"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { Separator } from "@/components/ui/separator";
import { useMarkets } from "@/hooks/use-markets";
import { placeBet } from "@/lib/web3";
import { Loader2 } from "lucide-react";

export function MarketCard() {
  const { markets, isLoading: marketsLoading } = useMarkets();
  const [side, setSide] = useState<"yes" | "no">("yes");
  const [amount, setAmount] = useState("");
  const [isPlacingBet, setIsPlacingBet] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get the first unresolved market for demo
  const market = markets.find((m) => !m.resolved);

  const handlePlaceBet = async () => {
    if (!market || !amount || parseFloat(amount) <= 0) return;

    try {
      setIsPlacingBet(true);
      setError(null);

      const hash = await placeBet(market.id, side === "yes", amount);
      console.log("Bet placed:", hash);

      // Reset form
      setAmount("");
      alert(`Bet placed successfully! Transaction: ${hash}`);
    } catch (err: any) {
      console.error("Failed to place bet:", err);
      setError(err.message || "Failed to place bet");
    } finally {
      setIsPlacingBet(false);
    }
  };

  if (marketsLoading) {
    return (
      <div className="w-full max-w-md">
        <SpotlightCard>
          <div className="p-6 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        </SpotlightCard>
      </div>
    );
  }

  if (!market) {
    return (
      <div className="w-full max-w-md">
        <SpotlightCard>
          <div className="p-6 space-y-3 text-center">
            <h3 className="text-lg font-semibold">No Active Markets</h3>
            <p className="text-sm text-muted-foreground">
              Check back soon for new prediction markets.
            </p>
          </div>
        </SpotlightCard>
      </div>
    );
  }

  // Calculate mock percentages (would come from stakes in real implementation)
  const yesPercent = 64;
  const noPercent = 36;
  const poolSize = "15.2";

  return (
    <div className="w-full max-w-md">
      <SpotlightCard>
        <div className="p-6 space-y-5">
          {/* Market Question */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">{market.question}</h3>
            <p className="text-sm text-muted-foreground">
              Deadline: {new Date(market.deadline * 1000).toLocaleDateString()} •
              Pool: {poolSize} ETH
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
                YES ({yesPercent}%)
              </TabsTrigger>
              <TabsTrigger
                value="no"
                className="data-[state=active]:bg-red-600 data-[state=active]:text-white"
              >
                NO ({noPercent}%)
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
                  {(
                    parseFloat(amount) *
                    (side === "yes" ? 1.56 : 2.78)
                  ).toFixed(3)}{" "}
                  ETH
                </span>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Place Bet Button */}
          <Button
            className="w-full"
            size="lg"
            disabled={!amount || parseFloat(amount) <= 0 || isPlacingBet}
            onClick={handlePlaceBet}
          >
            {isPlacingBet ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Placing Bet...
              </>
            ) : (
              "Place Bet"
            )}
          </Button>

          {/* Info Text */}
          <p className="text-xs text-muted-foreground text-center">
            Connect wallet to place bets. Market resolves automatically via{" "}
            <span className="text-primary font-medium">Chainlink CRE</span>.
          </p>
        </div>
      </SpotlightCard>
    </div>
  );
}
