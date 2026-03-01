"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X } from "lucide-react";

interface CreateMarketModalProps {
  onClose: () => void;
  onCreate: (question: string, deadline: number) => Promise<void>;
}

export function CreateMarketModal({ onClose, onCreate }: CreateMarketModalProps) {
  const [question, setQuestion] = useState("");
  const [hours, setHours] = useState("24");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async () => {
    if (!question.trim()) {
      setError("Please enter a question");
      return;
    }

    const hoursNum = parseInt(hours);
    if (isNaN(hoursNum) || hoursNum < 1) {
      setError("Please enter valid hours (minimum 1)");
      return;
    }

    const deadline = Math.floor(Date.now() / 1000) + (hoursNum * 3600);

    setIsCreating(true);
    setError("");

    try {
      await onCreate(question, deadline);
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
          <CardTitle>Create New Market</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="question">Question (include deadline)</Label>
            <Input
              id="question"
              placeholder="Will ETH reach $5000 by tomorrow at midnight?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              maxLength={200}
            />
            <p className="text-xs text-muted-foreground">
              Include the deadline in your question. Example: "Will BTC hit $100k by next week?"
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="hours">Trading window (hours)</Label>
            <Input
              id="hours"
              type="number"
              min="1"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              How long users can place bets before oracle resolution begins
            </p>
          </div>

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 rounded-md p-3">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1 bg-white hover:bg-gray-50"
              onClick={onClose}
              disabled={isCreating}
            >
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

          <div className="text-xs text-muted-foreground border-t pt-4">
            <p className="font-medium mb-1">How AEEIA resolves markets:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Oracle fetches real sources (news, APIs, data feeds)</li>
              <li>CRE cryptographically verifies all accessed sources</li>
              <li>AI processes evidence to reach YES/NO conclusion</li>
              <li>Resolution based on verified facts, not AI opinions</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
