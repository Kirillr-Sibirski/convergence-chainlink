"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { Separator } from "@/components/ui/separator";

export function MarketCard() {
  const [side, setSide] = useState<"yes" | "no">("yes");
  const [amount, setAmount] = useState("");

  return (
    <div className="w-full max-w-md">
      <SpotlightCard>
        <div className="p-6 space-y-5">
          {/* Market Question */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">
              Will Bitcoin exceed $100,000 by March 31, 2026?
            </h3>
            <p className="text-sm text-muted-foreground">
              Deadline: March 31, 2026 • Pool: 15.2 ETH
            </p>
          </div>

          <Separator />

          {/* YES/NO Tabs */}
          <Tabs value={side} onValueChange={(v: string) => setSide(v as "yes" | "no")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="yes" className="data-[state=active]:bg-green-600">
                YES (64%)
              </TabsTrigger>
              <TabsTrigger value="no" className="data-[state=active]:bg-red-600">
                NO (36%)
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Amount Input */}
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (ETH)</Label>
            <Input
              id="amount"
              type="number"
              placeholder="0.1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          {/* Potential Payout */}
          {amount && (
            <div className="p-3 bg-muted rounded-lg space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">You bet</span>
                <span className="font-medium">{amount} ETH on {side.toUpperCase()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Potential payout</span>
                <span className="font-semibold text-primary">
                  {(parseFloat(amount) * (side === "yes" ? 1.56 : 2.78)).toFixed(3)} ETH
                </span>
              </div>
            </div>
          )}

          {/* Place Bet Button */}
          <Button
            className="w-full"
            size="lg"
            disabled={!amount || parseFloat(amount) <= 0}
          >
            Place Bet
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
