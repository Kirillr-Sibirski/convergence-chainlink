"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { X, Info } from "lucide-react";
import { decodeAbiParameters } from "viem";
import { IDKitWidget, type ISuccessResult, VerificationLevel } from "@worldcoin/idkit";
import { EthIcon } from "@/components/ui/eth-icon";
import type { WorldIdProof } from "@/lib/web3-viem";

interface CreateMarketModalProps {
  onClose: () => void;
  onValidate: (question: string) => Promise<void>;
  onCreate: (question: string, worldProof: WorldIdProof) => Promise<void>;
  signal?: string;
}

type SubmitStage = "idle" | "validating" | "validated" | "submitting";

export function CreateMarketModal({ onClose, onValidate, onCreate, signal }: CreateMarketModalProps) {
  const [question, setQuestion] = useState("");
  const [submitStage, setSubmitStage] = useState<SubmitStage>("idle");
  const [error, setError] = useState("");
  const [validationInfo, setValidationInfo] = useState<string | null>(
    "Step 1: Validate question via CRE HTTP trigger. Step 2: Verify World ID. Step 3: Send one create transaction."
  );
  const [worldProof, setWorldProof] = useState<WorldIdProof | null>(null);
  const worldIdAppId = process.env.NEXT_PUBLIC_WORLD_ID_APP_ID;
  const worldIdAction = process.env.NEXT_PUBLIC_WORLD_ID_ACTION ?? "create-market";

  const isBusy = submitStage === "validating" || submitStage === "submitting";

  const onQuestionChange = (value: string) => {
    setQuestion(value);
    setError("");
    setSubmitStage("idle");
    setWorldProof(null);
    setValidationInfo(
      "Step 1: Validate question via CRE HTTP trigger. Step 2: Verify World ID. Step 3: Send one create transaction."
    );
  };

  const handleWorldIdSuccess = (result: ISuccessResult) => {
    try {
      const decoded = decodeAbiParameters([{ type: "uint256[8]" }], result.proof as `0x${string}`)[0] as readonly bigint[];
      if (decoded.length !== 8) throw new Error("Invalid proof length");
      setWorldProof({
        root: BigInt(result.merkle_root),
        nullifierHash: BigInt(result.nullifier_hash),
        proof: [
          decoded[0],
          decoded[1],
          decoded[2],
          decoded[3],
          decoded[4],
          decoded[5],
          decoded[6],
          decoded[7],
        ],
      });
      setError("");
    } catch (err) {
      console.error(err);
      setError("Could not parse World ID proof. Please verify again.");
    }
  };

  const handleValidate = async () => {
    if (!question.trim()) return setError("Please enter a question");

    try {
      setSubmitStage("validating");
      setError("");
      setValidationInfo("Waiting for verification from CRE...");
      await onValidate(question);
      setSubmitStage("validated");
      setValidationInfo("Question verified. Continue with World ID, then create market.");
    } catch (err) {
      console.error("Failed to validate market question:", err);
      setSubmitStage("idle");
      setError(err instanceof Error ? err.message : "Failed to validate question");
      setValidationInfo("Question is not verified yet.");
    }
  };

  const handlePrimaryAction = async () => {
    if (!question.trim()) return setError("Please enter a question");
    if (submitStage !== "validated") return setError("Validate question first.");
    if (!worldProof) return setError("Please verify with World ID first.");

    try {
      setSubmitStage("submitting");
      await onCreate(question, worldProof);
      onClose();
    } catch (err) {
      console.error("Failed to create market:", err);
      setError(err instanceof Error ? err.message : "Failed to create market");
      setSubmitStage("idle");
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
                  <li>• Validate question via CRE HTTP trigger first</li>
                  <li>• World ID proof is required after validation</li>
                  <li>• Creation is one onchain transaction after checks pass</li>
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
              disabled={submitStage === "validating" || submitStage === "submitting"}
            />
          </div>
          <div className="text-xs text-muted-foreground bg-muted/50 rounded-md p-3 flex items-center gap-2">
            <EthIcon className="w-3 h-3 shrink-0" />
            You only need to write the question. Liquidity can be added after market creation.
          </div>
          <div className="text-xs text-amber-700 bg-amber-100 rounded-md p-3">
            {validationInfo}
          </div>

          <div className="rounded-md border border-gray-200 bg-gray-50 p-3 flex items-center justify-between gap-2">
            <p className="text-xs text-gray-700">
              World ID status: {worldProof ? "Verified" : submitStage === "validated" ? "Ready to verify" : "Locked until question is verified"}
            </p>
            {worldIdAppId ? (
              worldProof ? (
                <span className="text-[11px] rounded-md border border-green-200 bg-green-50 text-green-700 px-2 py-1">
                  Verified
                </span>
              ) : (
                <IDKitWidget
                  app_id={worldIdAppId as `app_${string}`}
                  action={worldIdAction}
                  signal={signal}
                  verification_level={VerificationLevel.Orb}
                  onSuccess={handleWorldIdSuccess}
                >
                  {({ open }: { open: () => void }) => (
                    <Button type="button" size="sm" variant="outline" onClick={open} disabled={submitStage !== "validated"}>
                      Verify World ID
                    </Button>
                  )}
                </IDKitWidget>
              )
            ) : (
              <span className="text-[11px] text-amber-700">Set NEXT_PUBLIC_WORLD_ID_APP_ID</span>
            )}
          </div>

          {error && <div className="text-sm text-destructive bg-destructive/10 rounded-md p-3">{error}</div>}

          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1 bg-white hover:bg-gray-50" onClick={onClose} disabled={isBusy}>
              Cancel
            </Button>
            <Button
              variant="outline"
              className="flex-1 bg-gray-100 hover:bg-gray-200 border-gray-300 text-gray-900 font-semibold"
              onClick={submitStage === "validated" ? handlePrimaryAction : handleValidate}
              disabled={isBusy || !question.trim() || (submitStage === "validated" && !worldProof)}
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
