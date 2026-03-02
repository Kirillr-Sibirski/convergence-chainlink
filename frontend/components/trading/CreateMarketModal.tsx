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

type SubmitStage = "idle" | "validating" | "validated" | "creating";

export function CreateMarketModal({ onClose, onCreate }: CreateMarketModalProps) {
  const [question, setQuestion] = useState("");
  const [submitStage, setSubmitStage] = useState<SubmitStage>("idle");
  const [error, setError] = useState("");
  const [validationInfo, setValidationInfo] = useState<string | null>(null);
  const [validatedQuestion, setValidatedQuestion] = useState<string | null>(null);

  const isBusy = submitStage === "validating" || submitStage === "creating";
  const isValidated = submitStage === "validated" && validatedQuestion === question.trim();

  const onQuestionChange = (value: string) => {
    setQuestion(value);
    setError("");
    setValidationInfo(null);
    if (validatedQuestion !== value.trim()) {
      setValidatedQuestion(null);
      setSubmitStage("idle");
    }
  };

  const validateQuestion = async () => {
    setSubmitStage("validating");
    setError("");
    setValidationInfo(null);

    const validationResp = await fetch("/api/validate-question", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    });
    if (!validationResp.ok) {
      throw new Error("Question validation request failed");
    }

    const validation = (await validationResp.json()) as {
      valid: boolean;
      score: number;
      issues?: string[];
      warning?: string;
      source?: "ai" | "fallback";
      requiresSimulation?: boolean;
    };

    if (validation.warning) {
      setValidationInfo(validation.warning);
    }

    if (!validation.valid || validation.requiresSimulation) {
      const issues = validation.issues?.length ? ` ${validation.issues.join(" ")}` : "";
      throw new Error(`Question not validated.${issues} Run CRE simulation and validate again.`);
    }

    setValidatedQuestion(question.trim());
    setSubmitStage("validated");
  };

  const handlePrimaryAction = async () => {
    if (!question.trim()) return setError("Please enter a question");

    try {
      if (!isValidated) {
        await validateQuestion();
        return;
      }

      setSubmitStage("creating");
      await onCreate(question);
      onClose();
    } catch (err) {
      console.error("Failed to create market:", err);
      setError(err instanceof Error ? err.message : "Failed to create market");
      setSubmitStage(isValidated ? "validated" : "idle");
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
                <p className="font-medium mb-2">How this works</p>
                <ul className="space-y-1.5 text-muted-foreground text-xs">
                  <li>• Ask a clear yes/no question with a time target</li>
                  <li>• The date is read from your question text</li>
                  <li>• The market is created first, liquidity can be added later</li>
                  <li>• After expiry, run simulation to process the result</li>
                  <li>• If you picked the winning side, you can redeem</li>
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
              onChange={(e) => onQuestionChange(e.target.value)}
              maxLength={200}
            />
          </div>
          <div className="text-xs text-muted-foreground bg-muted/50 rounded-md p-3 flex items-center gap-2">
            <EthIcon className="w-3 h-3 shrink-0" />
            You only need to write the question. Liquidity can be added after market creation.
          </div>
          {validationInfo && (
            <div className="text-xs text-amber-700 bg-amber-100 rounded-md p-3">
              {validationInfo}
            </div>
          )}
          <div className="text-xs text-muted-foreground bg-gray-50 rounded-md p-3">
            Step 1: validate your question. Step 2: create the market.
          </div>

          {error && <div className="text-sm text-destructive bg-destructive/10 rounded-md p-3">{error}</div>}

          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1 bg-white hover:bg-gray-50" onClick={onClose} disabled={isBusy}>
              Cancel
            </Button>
            <Button
              variant="outline"
              className="flex-1 bg-gray-100 hover:bg-gray-200 border-gray-300 text-gray-900 font-semibold"
              onClick={handlePrimaryAction}
              disabled={isBusy || !question.trim()}
            >
              {submitStage === "validating"
                ? "Validating Query..."
                : submitStage === "creating"
                ? "Creating Market..."
                : isValidated
                ? "Create Market"
                : "Validate Query"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
