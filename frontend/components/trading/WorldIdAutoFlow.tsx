"use client";

import { useEffect, useMemo, useState } from "react";
import { IDKitRequestWidget, orbLegacy, type IDKitResult, type RpContext } from "@worldcoin/idkit";
import { decodeAbiParameters } from "viem";
import type { WorldIdProofInput } from "@/lib/web3-viem";

export interface WorldIdPendingFlow {
  question: string;
  deadline: number;
}

interface WorldIdAutoFlowProps {
  flow: WorldIdPendingFlow | null;
  walletAddress: string;
  onVerified: (flow: WorldIdPendingFlow, proof: WorldIdProofInput) => Promise<void>;
  onCancelled: () => void;
  onError: (message: string) => void;
}

type RPSignatureResponse = {
  sig: string;
  nonce: string;
  created_at: number;
  expires_at: number;
};

function toWorldProof(result: IDKitResult): WorldIdProofInput {
  if (result.protocol_version !== "3.0") {
    throw new Error("Expected legacy v3 proof for onchain verification. Enable legacy proofs in World ID app settings.");
  }

  const response = result.responses?.[0] as
    | {
        proof?: string;
        merkle_root?: string;
        nullifier?: string;
      }
    | undefined;

  if (!response?.proof || !response?.merkle_root || !response?.nullifier) {
    throw new Error("Invalid World ID legacy proof payload.");
  }

  const decoded = decodeAbiParameters([{ type: "uint256[8]" }], response.proof as `0x${string}`)[0];
  return {
    root: BigInt(response.merkle_root),
    nullifierHash: BigInt(response.nullifier),
    proof: decoded,
  };
}

async function fetchRpContext(action: string, rpId: string): Promise<RpContext> {
  const response = await fetch("/api/rp-signature", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action }),
  });

  const payload = (await response.json().catch(() => ({}))) as Partial<RPSignatureResponse> & {
    error?: string;
  };

  if (!response.ok || !payload.sig || !payload.nonce || !payload.created_at || !payload.expires_at) {
    throw new Error(payload.error || "Failed to create RP signature");
  }

  return {
    rp_id: rpId,
    nonce: payload.nonce,
    created_at: payload.created_at,
    expires_at: payload.expires_at,
    signature: payload.sig,
  };
}

export function WorldIdAutoFlow({ flow, walletAddress, onVerified, onCancelled, onError }: WorldIdAutoFlowProps) {
  const worldAppId = process.env.NEXT_PUBLIC_WORLD_ID_APP_ID as `app_${string}` | undefined;
  const worldAction = process.env.NEXT_PUBLIC_WORLD_ID_ACTION ?? "create-new-market";
  const worldRpId = process.env.NEXT_PUBLIC_WORLD_ID_RP_ID;

  const [rpContext, setRpContext] = useState<RpContext | null>(null);
  const [open, setOpen] = useState(false);
  const [opening, setOpening] = useState(false);

  const canStart = useMemo(() => Boolean(flow && worldAppId && worldRpId), [flow, worldAppId, worldRpId]);

  useEffect(() => {
    if (!flow) {
      setRpContext(null);
      setOpen(false);
      setOpening(false);
      return;
    }

    if (!worldAppId) {
      onError("Missing World ID config. Set NEXT_PUBLIC_WORLD_ID_APP_ID.");
      onCancelled();
      return;
    }

    if (!worldAppId.includes("staging")) {
      onError(
        "Sepolia requires a staging World ID app (app_staging_...). Update NEXT_PUBLIC_WORLD_ID_APP_ID and redeploy market with matching WORLD_ID_APP_ID/WORLD_ID_ACTION."
      );
      onCancelled();
      return;
    }

    if (!worldRpId) {
      onError("Missing RP ID. Set NEXT_PUBLIC_WORLD_ID_RP_ID.");
      onCancelled();
      return;
    }

    let active = true;
    setOpening(true);

    fetchRpContext(worldAction, worldRpId)
      .then((context) => {
        if (!active) return;
        setRpContext(context);
        setOpen(true);
        setOpening(false);
      })
      .catch((error) => {
        if (!active) return;
        setOpening(false);
        onError(error instanceof Error ? error.message : "Failed to initialize World ID context.");
        onCancelled();
      });

    return () => {
      active = false;
    };
  }, [flow, onCancelled, onError, worldAction, worldAppId, worldRpId]);

  if (!canStart || !rpContext) {
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
        if (!nextOpen && flow) {
          onCancelled();
        }
      }}
      app_id={worldAppId!}
      action={worldAction}
      rp_context={rpContext}
      allow_legacy_proofs={true}
      environment="staging"
      preset={orbLegacy({ signal: walletAddress })}
      handleVerify={async () => {}}
      onSuccess={async (result: IDKitResult) => {
        if (!flow) return;
        try {
          const proof = toWorldProof(result);
          await onVerified(flow, proof);
        } catch (error) {
          onError(error instanceof Error ? error.message : "World ID verification failed.");
          onCancelled();
        }
      }}
      onError={(errorCode) => {
        if (errorCode !== "user_rejected") {
          onError(`World ID verification failed: ${errorCode}`);
        }
        onCancelled();
      }}
    />
  );
}
