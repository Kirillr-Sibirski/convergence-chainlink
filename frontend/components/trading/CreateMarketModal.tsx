"use client";

import { useEffect, useMemo, useState } from "react";
import { IDKitWidget, type ISuccessResult, VerificationLevel } from "@worldcoin/idkit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { X, Check, Copy, FlaskConical, Info } from "lucide-react";
import { decodeAbiParameters } from "viem";
import { createPortal } from "react-dom";
import { inferDeadlineFromQuestion, type WorldIdProofInput } from "@/lib/web3-viem";
import { buildCreValidateCmd } from "@/lib/cre-gate";

interface CreateMarketModalProps {
  onClose: () => void;
  onValidate: (question: string) => Promise<void>;
  onCreate: (question: string, worldProof: WorldIdProofInput) => Promise<void>;
  walletAddress: string;
}

type SubmitStage = "idle" | "validating" | "validated" | "worldVerified" | "submitting";

function toWorldProof(result: ISuccessResult): WorldIdProofInput {
  const decoded = decodeAbiParameters([{ type: "uint256[8]" }], result.proof as `0x${string}`)[0];
  return {
    root: BigInt(result.merkle_root),
    nullifierHash: BigInt(result.nullifier_hash),
    proof: decoded,
  };
}

export function CreateMarketModal({ onClose, onValidate, onCreate, walletAddress }: CreateMarketModalProps) {
  const [mounted, setMounted] = useState(false);
  const [question, setQuestion] = useState("");
  const [submitStage, setSubmitStage] = useState<SubmitStage>("idle");
  const [worldProof, setWorldProof] = useState<WorldIdProofInput | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [validationInfo, setValidationInfo] = useState<string>(
    "Step 1: Validate with CRE. Step 2: Verify with World ID. Step 3: Create market onchain."
  );

  const isBusy = submitStage === "validating" || submitStage === "submitting";
  const hasCreHttpTrigger = Boolean(process.env.NEXT_PUBLIC_CRE_HTTP_TRIGGER_URL);
  const normalizedQuestion = question.trim() || "Will ETH close above $5,000 by April 1st?";
  const fallbackDeadline = useMemo(() => inferDeadlineFromQuestion(normalizedQuestion), [normalizedQuestion]);
  const creSimulateCommand = useMemo(
    () => buildCreValidateCmd(normalizedQuestion, fallbackDeadline),
    [normalizedQuestion, fallbackDeadline]
  );

  const onQuestionChange = (value: string) => {
    setQuestion(value);
    setError("");
    setCopied(false);
    setSubmitStage("idle");
    setWorldProof(null);
    setValidationInfo("Step 1: Validate with CRE. Step 2: Verify with World ID. Step 3: Create market onchain.");
  };

  const handleCopyCommand = async () => {
    try {
      await navigator.clipboard.writeText(creSimulateCommand);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Clipboard copy failed. Copy the command manually.");
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
      setValidationInfo("Question verified by CRE. Continue with World ID verification.");
    } catch (err) {
      console.error("Failed to validate market question:", err);
      setSubmitStage("idle");
      const message = err instanceof Error ? err.message : "Failed to validate question";
      if (message.includes("CRE workflow is not yet deployed")) {
        setError("Manual CRE simulation is required in beta mode. Run the command below, then click Validate Question.");
      } else {
        setError(message);
      }
      setValidationInfo("Question is not verified yet.");
    }
  };

  const handleCreate = async () => {
    if (!question.trim()) return setError("Please enter a question");
    if (submitStage !== "worldVerified" || !worldProof) return setError("Verify with World ID first.");

    try {
      setSubmitStage("submitting");
      await onCreate(question, worldProof);
      onClose();
    } catch (err) {
      console.error("Failed to create market:", err);
      setError(err instanceof Error ? err.message : "Failed to create market");
      setSubmitStage("worldVerified");
    }
  };

  const worldAppId = process.env.NEXT_PUBLIC_WORLD_ID_APP_ID as `app_${string}` | undefined;
  const worldAction = process.env.NEXT_PUBLIC_WORLD_ID_ACTION ?? "create-market";
  const canUseWorldId = Boolean(worldAppId && walletAddress);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
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
                  <li>• Verify your identity with World ID</li>
                  <li>• Each wallet can create one market per 24 hours</li>
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

          {!hasCreHttpTrigger && (
            <div className="rounded-md border border-sky-200 bg-sky-50 p-3 space-y-2">
              <p className="text-xs font-semibold text-sky-900 inline-flex items-center gap-1.5">
                <FlaskConical className="h-3.5 w-3.5" />
                Beta testing mode: manual CRE simulation
              </p>
              <p className="text-xs text-sky-800">
                CRE workflow is not yet deployed in this environment. For beta testing, simulate the CRE workflow for
                this question, then click Validate Question again.
              </p>
              <p className="text-[11px] text-sky-700">Run this command from the `cre-workflow` directory.</p>
              <div className="rounded border border-slate-800 bg-slate-950 p-2">
                <pre className="overflow-x-auto">
                  <code className="font-mono text-[11px] leading-relaxed text-slate-100 break-all whitespace-pre-wrap">
                  {creSimulateCommand}
                  </code>
                </pre>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="bg-white hover:bg-sky-100 border-sky-200 text-sky-900"
                onClick={handleCopyCommand}
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 mr-1" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 mr-1" />
                    Copy CRE simulate command
                  </>
                )}
              </Button>
            </div>
          )}

          {submitStage === "validated" && (
            <div className="rounded-md border border-gray-200 bg-gray-50 p-3 space-y-2">
              <p className="text-xs text-gray-700">World ID verification is required before creating a market.</p>
              {!canUseWorldId ? (
                <p className="text-xs text-destructive">
                  Missing World ID config. Set NEXT_PUBLIC_WORLD_ID_APP_ID and NEXT_PUBLIC_WORLD_ID_ACTION.
                </p>
              ) : (
                <IDKitWidget
                  app_id={worldAppId!}
                  action={worldAction}
                  signal={walletAddress}
                  verification_level={VerificationLevel.Orb}
                  onSuccess={(result: ISuccessResult) => {
                    try {
                      const proof = toWorldProof(result);
                      setWorldProof(proof);
                      setSubmitStage("worldVerified");
                      setValidationInfo("World ID verified. You can create the market now.");
                      setError("");
                    } catch (e) {
                      setError(e instanceof Error ? e.message : "Failed to parse World ID proof");
                    }
                  }}
                  handleVerify={async () => {}}
                  onError={(e: { code: string }) => {
                    setError(`World ID verification failed: ${e.code}`);
                  }}
                >
                  {({ open }: { open: () => void }) => (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full bg-white hover:bg-gray-100"
                      onClick={open}
                      disabled={isBusy}
                    >
                      Verify with World ID
                    </Button>
                  )}
                </IDKitWidget>
              )}
            </div>
          )}

          {error && <div className="text-sm text-destructive bg-destructive/10 rounded-md p-3">{error}</div>}

          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1 bg-white hover:bg-gray-50" onClick={onClose} disabled={isBusy}>
              Cancel
            </Button>
            <Button
              variant="outline"
              className="flex-1 bg-gray-100 hover:bg-gray-200 border-gray-300 text-gray-900 font-semibold"
              onClick={submitStage === "worldVerified" ? handleCreate : handleValidate}
              disabled={isBusy || !question.trim()}
            >
              {submitStage === "validating"
                ? "Waiting for verification..."
                : submitStage === "submitting"
                ? "Creating Market..."
                : submitStage === "worldVerified"
                ? "Create Market"
                : "Validate Question"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>,
    document.body
  );
}
