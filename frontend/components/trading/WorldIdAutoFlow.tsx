"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { decodeAbiParameters } from "viem";
import { IDKitRequestWidget, orbLegacy, type IDKitResult, type RpContext } from "@worldcoin/idkit";

export interface WorldIdPendingFlow {
  question: string;
  deadline: number;
}

export interface WorldIdOnchainProof {
  root: bigint;
  signalHash: bigint;
  nullifierHash: bigint;
  proof: readonly [bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint];
}

interface WorldIdAutoFlowProps {
  flow: WorldIdPendingFlow | null;
  walletAddress: string;
  onVerified: (flow: WorldIdPendingFlow, proof: WorldIdOnchainProof) => Promise<void>;
  onCancelled: () => void;
  onError: (message: string) => void;
}

type RPSignatureResponse = {
  app_id: string;
  rp_id: string;
  action: string;
  sig: string;
  nonce: string;
  created_at: number;
  expires_at: number;
  error?: string;
};

function toBigInt(value: unknown, fieldName: string): bigint {
  if (typeof value !== "string" && typeof value !== "number" && typeof value !== "bigint") {
    throw new Error(`World ID response is missing ${fieldName}.`);
  }

  try {
    return BigInt(value);
  } catch {
    throw new Error(`Invalid ${fieldName} format in World ID response.`);
  }
}

function parseLegacyProof(result: IDKitResult): WorldIdOnchainProof {
  const responses = (result as { responses?: unknown }).responses;
  if (!Array.isArray(responses) || responses.length === 0) {
    throw new Error("World ID response does not include proofs.");
  }

  const response = responses[0] as {
    merkle_root?: unknown;
    signal_hash?: unknown;
    nullifier?: unknown;
    proof?: unknown;
  };

  const root = toBigInt(response.merkle_root, "merkle_root");
  const signalHash = toBigInt(response.signal_hash, "signal_hash");
  const nullifierHash = toBigInt(response.nullifier, "nullifier");
  const rawProof = response.proof;

  if (typeof rawProof !== "string") {
    throw new Error("World ID proof payload is not in legacy onchain format.");
  }

  let decodedProof: readonly bigint[];
  try {
    decodedProof = decodeAbiParameters([{ type: "uint256[8]" }], rawProof as `0x${string}`)[0];
  } catch {
    throw new Error("Failed to decode World ID proof payload.");
  }

  if (decodedProof.length !== 8) {
    throw new Error("World ID proof must contain 8 field elements.");
  }

  const proof = [
    decodedProof[0],
    decodedProof[1],
    decodedProof[2],
    decodedProof[3],
    decodedProof[4],
    decodedProof[5],
    decodedProof[6],
    decodedProof[7],
  ] as const;

  return { root, signalHash, nullifierHash, proof };
}

async function fetchRpContext(requestedAction?: string) {
  const response = await fetch("/api/rp-signature", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(requestedAction ? { action: requestedAction } : {}),
  });

  const payload = (await response.json().catch(() => ({}))) as Partial<RPSignatureResponse>;
  if (
    !response.ok ||
    !payload.sig ||
    !payload.nonce ||
    !payload.created_at ||
    !payload.expires_at ||
    !payload.rp_id ||
    !payload.app_id ||
    !payload.action
  ) {
    throw new Error(payload.error || "Failed to initialize World ID context.");
  }

  return {
    appId: payload.app_id as `app_${string}`,
    action: payload.action,
    rpContext: {
      rp_id: payload.rp_id,
      nonce: payload.nonce,
      created_at: payload.created_at,
      expires_at: payload.expires_at,
      signature: payload.sig,
    } satisfies RpContext,
  };
}

export function WorldIdAutoFlow({ flow, walletAddress, onVerified, onCancelled, onError }: WorldIdAutoFlowProps) {
  const requestedAction = process.env.NEXT_PUBLIC_WORLD_ID_ACTION ?? "create-new-market";
  const worldEnvironment = process.env.NEXT_PUBLIC_WORLD_ID_ENV === "production" ? "production" : "staging";
  const [rpContext, setRpContext] = useState<RpContext | null>(null);
  const [appId, setAppId] = useState<`app_${string}` | null>(null);
  const [action, setAction] = useState<string>(requestedAction);
  const [open, setOpen] = useState(false);
  const [opening, setOpening] = useState(false);
  const [failed, setFailed] = useState(false);
  const finishedRef = useRef(false);
  const parsedProofRef = useRef<WorldIdOnchainProof | null>(null);

  const canStart = useMemo(() => Boolean(flow && walletAddress), [flow, walletAddress]);

  useEffect(() => {
    if (!flow) {
      setRpContext(null);
      setAppId(null);
      setAction(requestedAction);
      setOpen(false);
      setOpening(false);
      setFailed(false);
      finishedRef.current = false;
      parsedProofRef.current = null;
      return;
    }

    if (!walletAddress) {
      onError("Connect wallet before World ID verification.");
      onCancelled();
      return;
    }

    let active = true;
    setOpening(true);
    setFailed(false);
    finishedRef.current = false;
    parsedProofRef.current = null;

    fetchRpContext(requestedAction)
      .then((ctx) => {
        if (!active) return;
        setRpContext(ctx.rpContext);
        setAppId(ctx.appId);
        setAction(ctx.action);
        setOpen(true);
        setOpening(false);
      })
      .catch((error) => {
        if (!active) return;
        setOpening(false);
        setFailed(true);
        onError(error instanceof Error ? error.message : "Failed to initialize World ID context.");
      });

    return () => {
      active = false;
    };
  }, [flow, onCancelled, onError, requestedAction, walletAddress]);

  const finalizeCancel = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setFailed(true);
    setOpen(false);
    onCancelled();
  };

  if (!canStart || !rpContext || !appId || failed) {
    return opening ? (
      <div className="fixed inset-0 z-[280] flex items-end justify-center p-6 pointer-events-none">
        <div className="rounded-md border border-gray-300 bg-white px-3 py-2 text-xs text-gray-700 shadow">
          Opening World ID verification...
        </div>
      </div>
    ) : null;
  }

  return (
    <IDKitRequestWidget
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
      }}
      app_id={appId}
      action={action}
      rp_context={rpContext}
      allow_legacy_proofs={true}
      environment={worldEnvironment}
      preset={orbLegacy({ signal: walletAddress })}
      handleVerify={async (result: IDKitResult) => {
        parsedProofRef.current = parseLegacyProof(result);
      }}
      onSuccess={async (result: IDKitResult) => {
        if (!flow || finishedRef.current) return;
        try {
          const parsedProof = parsedProofRef.current ?? parseLegacyProof(result);
          finishedRef.current = true;
          setOpen(false);
          await onVerified(flow, parsedProof);
        } catch (error) {
          setFailed(true);
          onError(error instanceof Error ? error.message : "World ID verification failed.");
          onCancelled();
        }
      }}
      onError={(errorCode) => {
        if (errorCode !== "user_rejected") {
          onError(`World ID verification failed: ${errorCode}`);
        }
        finalizeCancel();
      }}
    />
  );
}
