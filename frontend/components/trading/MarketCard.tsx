"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { Separator } from "@/components/ui/separator";
import { WalletRequiredDialog } from "@/components/wallet/WalletRequiredDialog";
import { Loader2, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { useMarkets } from "@/hooks/useMarkets";
import { placeBet } from "@/lib/web3-thirdweb";
import { useActiveAccount } from "thirdweb/react";

export function MarketCard() {
  const { markets, isLoading, error } = useMarkets();
  const account = useActiveAccount();
  const [side, setSide] = useState<"yes" | "no">("yes");
  const [amount, setAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [marketIndex, setMarketIndex] = useState(0);
  const [showWalletDialog, setShowWalletDialog] = useState(false);

  const handlePlaceBet = async () => {
    if (!amount || parseFloat(amount) <= 0) return;
    if (!market) return;

    if (!account) {
      setShowWalletDialog(true);
      return;
    }

    setIsSubmitting(true);
    try {
      await placeBet(account, market.id, side === "yes", amount);
      setAmount("");
    } catch (err: any) {
      console.error("Failed to place bet:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

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

  const activeMarkets = markets.filter((m) => !m.resolved);
  const total = activeMarkets.length;
  const market = activeMarkets[marketIndex] ?? null;

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
          </div>
        </SpotlightCard>
      </div>
    );
  }

  const potentialPayout =
    amount && parseFloat(amount) > 0
      ? (parseFloat(amount) * (side === "yes" ? 1.56 : 2.78)).toFixed(3)
      : "0.000";

  return (
    <>
      <div className="w-full max-w-md">
        <SpotlightCard>
          <div className="p-6 space-y-5">
            {/* Market question + navigation */}
            <div className="space-y-1">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-lg font-semibold leading-snug">{market.question}</h3>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded shrink-0">
                  #{market.id}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Deadline: {new Date(market.deadline * 1000).toLocaleDateString()}
              </p>

              {total > 1 && (
                <div className="flex items-center gap-1.5 pt-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setMarketIndex((i) => Math.max(0, i - 1))}
                    disabled={marketIndex === 0}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {marketIndex + 1} / {total}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setMarketIndex((i) => Math.min(total - 1, i + 1))}
                    disabled={marketIndex === total - 1}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>

            <Separator />

            <Tabs value={side} onValueChange={(v) => setSide(v as "yes" | "no")}>
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
                  <span className="font-semibold text-primary">{potentialPayout} ETH</span>
                </div>
              </div>
            )}

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

            <p className="text-xs text-muted-foreground text-center">
              Market resolves automatically via{" "}
              <span className="text-primary font-medium">Chainlink CRE</span>.
            </p>
          </div>
        </SpotlightCard>
      </div>

      {showWalletDialog && (
        <WalletRequiredDialog onClose={() => setShowWalletDialog(false)} />
      )}
    </>
  );
}
