"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { X, Info } from "lucide-react";
import { EthIcon } from "@/components/ui/eth-icon";

interface CreateMarketModalProps {
  onClose: () => void;
  onCreate: (question: string) => Promise<void>;
}

export function CreateMarketModal({ onClose, onCreate }: CreateMarketModalProps) {
  const [question, setQuestion] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async () => {
    if (!question.trim()) return setError("Please enter a question");

    setIsCreating(true);
    setError("");

    try {
      await onCreate(question);
      onClose();
    } catch (err) {
      console.error("Failed to create market:", err);
      setError(err instanceof Error ? err.message : "Failed to create market");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-lg bg-white border shadow-xl rounded-xl">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center gap-2">
            <CardTitle>Create New Market</CardTitle>
            <Popover>
              <PopoverTrigger asChild>
                <button className="text-gray-400 hover:text-gray-600 transition-colors">
                  <Info className="h-4 w-4" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-72 text-sm" align="start">
                <p className="font-medium mb-2">AletheiaMarket flow</p>
                <ul className="space-y-1.5 text-muted-foreground text-xs">
                  <li>• Creates market in `AletheiaMarket` and linked `AletheiaOracle`</li>
                  <li>• Deadline is inferred from the question text (fallback: +7 days)</li>
                  <li>• Deploys YES/NO tokens and market AMM with zero initial liquidity</li>
                  <li>• CRE resolves oracle outcome after deadline</li>
                  <li>• Anyone can call settle, winners redeem onchain</li>
                </ul>
              </PopoverContent>
            </Popover>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="question">Question</Label>
            <Input
              id="question"
              placeholder="Will ETH close above $5,000 by Dec 31, 2026?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              maxLength={200}
            />
          </div>
          <div className="text-xs text-muted-foreground bg-muted/50 rounded-md p-3 flex items-center gap-2">
            <EthIcon className="w-3 h-3 shrink-0" />
            Market creator only defines the question. Liquidity providers can seed the pool after creation.
          </div>

          {error && <div className="text-sm text-destructive bg-destructive/10 rounded-md p-3">{error}</div>}

          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1 bg-white hover:bg-gray-50" onClick={onClose} disabled={isCreating}>
              Cancel
            </Button>
            <Button
              variant="outline"
              className="flex-1 bg-gray-100 hover:bg-gray-200 border-gray-300 text-gray-900 font-semibold"
              onClick={handleCreate}
              disabled={isCreating}
            >
              {isCreating ? "Creating..." : "Create Market"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
