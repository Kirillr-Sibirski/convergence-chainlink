"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarDays, Check, Copy, FlaskConical, Loader2, PlusCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { buildCreValidateCmd } from "@/lib/cre-gate";

interface CreateMarketModalProps {
  onClose: () => void;
  onValidate: (question: string, deadline: number, requireFreshAfter: number) => Promise<void>;
  onValidated: (question: string, deadline: number) => Promise<void>;
}

type SubmitStage = "idle" | "validating" | "awaiting-cre" | "ready" | "creating";
const MANUAL_CRE_PENDING_ERROR = "CRE_MANUAL_SIMULATION_PENDING";

function defaultDeadlineUtc() {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  date.setHours(0, 0, 0, 0);
  return { date, hour: "00", minute: "00" };
}

function formatUtcDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

function formatUtcDateTime(date: Date, hour: string, minute: string): string {
  return `${formatUtcDate(date)} ${hour}:${minute} UTC`;
}

function startOfUtcDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function toDeadlineTimestamp(date: Date | undefined, hour: string, minute: string): number | null {
  if (!date) return null;
  const h = Number.parseInt(hour, 10);
  const m = Number.parseInt(minute, 10);
  if (!Number.isFinite(h) || !Number.isFinite(m) || h < 0 || h > 23 || m < 0 || m > 59) return null;
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), h, m, 0) / 1000);
}

function nowUtcTimestamp(): number {
  return Math.floor(Date.now() / 1000);
}

function isSelectedUtcToday(date: Date | undefined): boolean {
  if (!date) return false;
  const now = new Date();
  return (
    date.getFullYear() === now.getUTCFullYear() &&
    date.getMonth() === now.getUTCMonth() &&
    date.getDate() === now.getUTCDate()
  );
}

export function CreateMarketModal({ onClose, onValidate, onValidated }: CreateMarketModalProps) {
  const defaults = useMemo(() => defaultDeadlineUtc(), []);
  const modalOpenedAt = useMemo(() => Math.floor(Date.now() / 1000), []);
  const [mounted, setMounted] = useState(false);
  const [question, setQuestion] = useState("");
  const [deadlineDate, setDeadlineDate] = useState<Date | undefined>(defaults.date);
  const [deadlineHour, setDeadlineHour] = useState(defaults.hour);
  const [deadlineMinute, setDeadlineMinute] = useState(defaults.minute);
  const [submitStage, setSubmitStage] = useState<SubmitStage>("idle");
  const [pendingPayload, setPendingPayload] = useState<{ question: string; deadline: number } | null>(null);
  const [autoCreateAttempted, setAutoCreateAttempted] = useState(false);
  const [errorNotice, setErrorNotice] = useState("");
  const [copied, setCopied] = useState(false);

  const isBusy = submitStage === "validating" || submitStage === "awaiting-cre" || submitStage === "creating";
  const isFinalizingTx = submitStage === "creating";
  const hasCreHttpTrigger = Boolean(process.env.NEXT_PUBLIC_CRE_HTTP_TRIGGER_URL);
  const deadlineTimestamp = useMemo(
    () => toDeadlineTimestamp(deadlineDate, deadlineHour, deadlineMinute),
    [deadlineDate, deadlineHour, deadlineMinute]
  );
  const hourOptions = useMemo(() => {
    const now = new Date();
    const nowHour = now.getUTCHours();
    const nowMinute = now.getUTCMinutes();
    const isToday = isSelectedUtcToday(deadlineDate);
    const hours: string[] = [];

    for (let h = 0; h < 24; h++) {
      if (!isToday) {
        hours.push(`${h}`.padStart(2, "0"));
        continue;
      }
      if (h < nowHour) continue;
      if (h === nowHour && nowMinute >= 59) continue;
      hours.push(`${h}`.padStart(2, "0"));
    }

    return hours;
  }, [deadlineDate]);
  const minuteOptions = useMemo(() => {
    const now = new Date();
    const nowHour = now.getUTCHours();
    const nowMinute = now.getUTCMinutes();
    const selectedHour = Number.parseInt(deadlineHour, 10);
    const isToday = isSelectedUtcToday(deadlineDate);
    const minutes: string[] = [];

    let minMinute = 0;
    if (isToday && selectedHour === nowHour) minMinute = Math.min(59, nowMinute + 1);

    for (let m = minMinute; m < 60; m++) {
      minutes.push(`${m}`.padStart(2, "0"));
    }
    return minutes;
  }, [deadlineDate, deadlineHour]);
  const normalizedQuestion = question.trim() || "Will ETH close above $5,000 by April 1st?";
  const fallbackDeadline = deadlineTimestamp ?? Math.floor(Date.now() / 1000) + 7 * 24 * 3600;
  const creSimulateCommand = useMemo(
    () => buildCreValidateCmd(normalizedQuestion, fallbackDeadline),
    [normalizedQuestion, fallbackDeadline]
  );

  const resetFlow = () => {
    setErrorNotice("");
    setCopied(false);
    setAutoCreateAttempted(false);
    setSubmitStage("idle");
    setPendingPayload(null);
  };

  const showError = (message: string) => {
    setErrorNotice(message);
  };

  const onQuestionChange = (value: string) => {
    setQuestion(value);
    resetFlow();
  };

  const handleCopyCommand = async () => {
    try {
      await navigator.clipboard.writeText(creSimulateCommand);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setErrorNotice("Clipboard copy failed. Copy the command manually.");
    }
  };

  const runCreateTransaction = async (
    payload: { question: string; deadline: number },
    autoTriggered: boolean
  ) => {
    try {
      setSubmitStage("creating");
      await onValidated(payload.question, payload.deadline);
      onClose();
    } catch (err) {
      console.error("Failed to create market:", err);
      setSubmitStage("ready");
      if (autoTriggered) {
        showError("Could not open wallet automatically. Click Step 2/3: Verify World ID.");
      } else {
        showError(err instanceof Error ? err.message : "Failed to create market");
      }
    }
  };

  const handlePrimaryFlow = async () => {
    const normalized = question.trim();
    if (!normalized) return showError("Please enter a question");
    if (!deadlineTimestamp) return showError("Please select a valid deadline date and UTC time.");
    if (deadlineTimestamp <= nowUtcTimestamp()) return showError("Deadline must be in the future.");
    if (submitStage === "ready" && pendingPayload) {
      await runCreateTransaction(pendingPayload, false);
      return;
    }
    if (submitStage !== "idle") return;

    try {
      setSubmitStage("validating");
      await onValidate(normalized, deadlineTimestamp, modalOpenedAt);
      setPendingPayload({ question: normalized, deadline: deadlineTimestamp });
      setAutoCreateAttempted(false);
      setSubmitStage("ready");
      setErrorNotice("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to validate question";
      if (message.includes(MANUAL_CRE_PENDING_ERROR)) {
        setPendingPayload({ question: normalized, deadline: deadlineTimestamp });
        setAutoCreateAttempted(false);
        setSubmitStage("awaiting-cre");
        setErrorNotice("");
      } else {
        console.error("Failed to validate market question:", err);
        setSubmitStage("idle");
        showError(message);
      }
    }
  };

  useEffect(() => {
    if (submitStage !== "awaiting-cre" || !pendingPayload) return;

    let cancelled = false;

    const pollValidation = async () => {
      try {
        await onValidate(pendingPayload.question, pendingPayload.deadline, modalOpenedAt);
        if (cancelled) return;
        setAutoCreateAttempted(false);
        setSubmitStage("ready");
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : "Failed to verify question";
        if (
          message.includes(MANUAL_CRE_PENDING_ERROR) ||
          message.includes("Validation report not found onchain yet")
        ) {
          return;
        }

        setSubmitStage("idle");
        showError(message);
      }
    };

    void pollValidation();
    const intervalId = window.setInterval(() => {
      void pollValidation();
    }, 4000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [submitStage, pendingPayload, onValidate, modalOpenedAt]);

  useEffect(() => {
    if (submitStage !== "ready" || !pendingPayload || autoCreateAttempted) return;
    setAutoCreateAttempted(true);
    void runCreateTransaction(pendingPayload, true);
  }, [submitStage, pendingPayload, autoCreateAttempted]);

  useEffect(() => {
    if (!errorNotice) return;
    const t = setTimeout(() => setErrorNotice(""), 3500);
    return () => clearTimeout(t);
  }, [errorNotice]);

  useEffect(() => {
    if (hourOptions.length === 0) return;
    if (!hourOptions.includes(deadlineHour)) {
      setDeadlineHour(hourOptions[0]);
      setSubmitStage("idle");
      return;
    }
    if (!minuteOptions.includes(deadlineMinute) && minuteOptions.length > 0) {
      setDeadlineMinute(minuteOptions[0]);
      setSubmitStage("idle");
    }
  }, [hourOptions, minuteOptions, deadlineHour, deadlineMinute]);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
      <Card className="w-full max-w-lg bg-white border shadow-xl rounded-xl">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-gray-200">
          <div className="flex items-center gap-2.5">
            <PlusCircle className="h-5 w-5 text-gray-700" />
            <CardTitle className="text-2xl md:text-[1.75rem] leading-none">Create New Market</CardTitle>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} disabled={isFinalizingTx}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="question">Question</Label>
            <Input
              id="question"
              placeholder="Will ETH close above $5,000?"
              value={question}
              onChange={(e) => onQuestionChange(e.target.value)}
              maxLength={200}
              disabled={isBusy}
            />
            <p className="text-[11px] text-muted-foreground">
              Orb verification is required. Policy preview: one market per wallet every 24 hours (not enforced in
              beta).
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="deadline">Market Resolution Time</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="deadline"
                  type="button"
                  variant="outline"
                  className="w-full justify-start text-left bg-white hover:bg-gray-50"
                  disabled={isBusy}
                >
                  <CalendarDays className="h-4 w-4 mr-2 text-gray-500" />
                  {deadlineDate ? formatUtcDateTime(deadlineDate, deadlineHour, deadlineMinute) : "Pick date and time"}
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="z-[260] w-[min(320px,calc(100vw-2rem))] p-3 bg-white border border-gray-200 shadow-xl"
                align="start"
              >
                <Calendar
                  mode="single"
                  selected={deadlineDate}
                  onSelect={(value) => {
                    setDeadlineDate(value);
                    resetFlow();
                  }}
                  disabled={(date) => date < startOfUtcDay(new Date())}
                  initialFocus
                  className="rounded-md border border-gray-200 bg-white"
                />
                <div className="mt-3 border-t border-gray-200 pt-3">
                  <Label htmlFor="deadline-time" className="text-xs text-gray-600">
                    Time (UTC)
                  </Label>
                  <div id="deadline-time" className="mt-2 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                    <select
                      aria-label="Hour"
                      value={deadlineHour}
                      onChange={(e) => {
                        setDeadlineHour(e.target.value);
                        resetFlow();
                      }}
                      className="h-10 rounded-md border border-gray-300 bg-white px-2 text-sm"
                      disabled={isBusy}
                    >
                      {hourOptions.map((hour) => (
                        <option key={hour} value={hour}>
                          {hour}
                        </option>
                      ))}
                    </select>
                    <span className="text-sm text-gray-500">:</span>
                    <select
                      aria-label="Minute"
                      value={deadlineMinute}
                      onChange={(e) => {
                        setDeadlineMinute(e.target.value);
                        resetFlow();
                      }}
                      className="h-10 rounded-md border border-gray-300 bg-white px-2 text-sm"
                      disabled={isBusy || minuteOptions.length === 0}
                    >
                      {minuteOptions.map((minute) => (
                        <option key={minute} value={minute}>
                          {minute}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            <p className="text-[11px] text-muted-foreground">Time is UTC.</p>
            {hourOptions.length === 0 && (
              <p className="text-[11px] text-amber-700">No future UTC times left for this date. Pick a later date.</p>
            )}
          </div>

          {!hasCreHttpTrigger && (
            <div className="rounded-md border border-sky-200 bg-sky-50 p-3 space-y-2">
              <p className="text-xs font-semibold text-sky-900 inline-flex items-center gap-1.5">
                <FlaskConical className="h-3.5 w-3.5" />
                Beta testing mode: manual CRE simulation
              </p>
              <p className="text-xs text-sky-800">
                CRE workflow is not yet deployed in this environment. For beta testing, simulate the CRE workflow for
                this question. This modal will auto-detect completion and unlock market creation.
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

          {errorNotice && (
            <div className="fixed top-4 right-4 z-[260] rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm px-4 py-2 shadow-lg max-w-sm">
              {errorNotice}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1 w-full bg-white hover:bg-gray-50"
              onClick={onClose}
              disabled={isFinalizingTx}
            >
              Cancel
            </Button>
            <Button
              variant="outline"
              className="flex-1 w-full bg-gray-100 hover:bg-gray-200 border-gray-300 text-gray-900 font-semibold"
              onClick={handlePrimaryFlow}
              disabled={isBusy || !question.trim() || !deadlineTimestamp || hourOptions.length === 0}
            >
              {submitStage === "validating" ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Step 1/3: Verifying with CRE...
                </span>
              ) : submitStage === "awaiting-cre" ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Waiting for CRE...
                </span>
              ) : submitStage === "ready" ? (
                "Step 2/3: Verify World ID"
              ) : submitStage === "creating" ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Step 3/3: Finalizing market creation...
                </span>
              ) : (
                "Step 1/3: Verify with CRE"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>,
    document.body
  );
}
