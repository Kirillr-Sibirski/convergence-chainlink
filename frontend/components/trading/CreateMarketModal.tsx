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
  onValidate: (question: string) => Promise<void>;
  onCreate: (question: string) => Promise<void>;
}

type SubmitStage = "idle" | "validating" | "validated" | "submitting";

export function CreateMarketModal({ onClose, onValidate, onCreate }: CreateMarketModalProps) {
  const [question, setQuestion] = useState("");
  const [submitStage, setSubmitStage] = useState<SubmitStage>("idle");
  const [error, setError] = useState("");
  const [validationInfo, setValidationInfo] = useState<string>(
    "Step 1: Validate question with CRE (AI extracts the deadline). If HTTP trigger is unavailable, run CRE simulation command shown below. Step 2: Create market onchain."
  );

  const isBusy = submitStage === "validating" || submitStage === "submitting";

  const onQuestionChange = (value: string) => {
    setQuestion(value);
    setError("");
    setSubmitStage("idle");
    setValidationInfo("Step 1: Validate question with CRE (AI extracts the deadline). If HTTP trigger is unavailable, run CRE simulation command shown below. Step 2: Create market onchain.");
  };

  const handleValidate = async () => {
    if (!question.trim()) return setError("Please enter a question");

    try {
      setSubmitStage("validating");
      setError("");
      setValidationInfo("Waiting for verification from CRE...");
      await onValidate(question);
      setSubmitStage("validated");
      setValidationInfo("Question verified. You can create the market now.");
    } catch (err) {
      console.error("Failed to validate market question:", err);
      setSubmitStage("idle");
      setError(err instanceof Error ? err.message : "Failed to validate question");
      setValidationInfo("Question is not verified yet.");
    }
  };

  const handleCreate = async () => {
    if (!question.trim()) return setError("Please enter a question");
    if (submitStage !== "validated") return setError("Validate question first.");

    try {
      setSubmitStage("submitting");
      await onCreate(question);
      onClose();
    } catch (err) {
      console.error("Failed to create market:", err);
      setError(err instanceof Error ? err.message : "Failed to create market");
      setSubmitStage("validated");
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
                  <li>• CRE AI extracts the deadline from your question</li>
                  <li>• CRE must approve your question first</li>
                  <li>• If no live HTTP trigger is set, simulate CRE workflow manually</li>
                  <li>• Then create the market with one transaction</li>
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
              disabled={isBusy}
            />
          </div>

          <div className="text-xs text-amber-700 bg-amber-100 rounded-md p-3">{validationInfo}</div>

          {error && <div className="text-sm text-destructive bg-destructive/10 rounded-md p-3">{error}</div>}

          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1 bg-white hover:bg-gray-50" onClick={onClose} disabled={isBusy}>
              Cancel
            </Button>
            <Button
              variant="outline"
              className="flex-1 bg-gray-100 hover:bg-gray-200 border-gray-300 text-gray-900 font-semibold"
              onClick={submitStage === "validated" ? handleCreate : handleValidate}
              disabled={isBusy || !question.trim()}
            >
              {submitStage === "validating"
                ? "Waiting for verification..."
                : submitStage === "submitting"
                ? "Creating Market..."
                : submitStage === "validated"
                ? "Create Market"
                : "Validate Question"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
