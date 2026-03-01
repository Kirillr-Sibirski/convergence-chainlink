"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { X, Info } from "lucide-react";

interface CreateMarketModalProps {
  onClose: () => void;
  onCreate: (question: string) => Promise<void>;
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
                <p className="font-medium mb-2">How markets work</p>
                <ul className="space-y-1.5 text-muted-foreground text-xs">
                  <li>• Ask a yes/no question with a clear time reference</li>
                  <li>• Other users bet YES or NO with ETH</li>
                  <li>• At the deadline, the oracle fetches real sources and cryptographically verifies them via Chainlink CRE</li>
                  <li>• The winning side splits the pot</li>
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
        </CardContent>
      </Card>
    </div>
  );
}
