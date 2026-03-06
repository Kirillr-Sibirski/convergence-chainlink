import { NextResponse } from "next/server";
import { signRequest } from "@worldcoin/idkit/signing";

export async function POST(request: Request): Promise<Response> {
  try {
    const { action } = (await request.json().catch(() => ({}))) as { action?: string };
    const configuredAction =
      process.env.WORLD_ID_ACTION ??
      process.env.NEXT_PUBLIC_WORLD_ID_ACTION ??
      "create-new-market";
    const effectiveAction = (action ?? configuredAction).trim();

    const signingKey = process.env.RP_SIGNING_KEY;
    if (!signingKey || signingKey === "CHANGE_ME") {
      return NextResponse.json(
        { error: "RP_SIGNING_KEY is not configured." },
        { status: 500 }
      );
    }

    const appId = process.env.WORLD_APP_ID ?? process.env.NEXT_PUBLIC_WORLD_ID_APP_ID;
    const rpId = process.env.WORLD_RP_ID ?? process.env.NEXT_PUBLIC_WORLD_ID_RP_ID;
    if (!appId || !rpId) {
      return NextResponse.json(
        { error: "WORLD_APP_ID and WORLD_RP_ID must be configured on the server." },
        { status: 500 }
      );
    }

    const { sig, nonce, createdAt, expiresAt } = signRequest(effectiveAction, signingKey);

    return NextResponse.json({
      app_id: appId,
      rp_id: rpId,
      action: effectiveAction,
      sig,
      nonce,
      created_at: createdAt,
      expires_at: expiresAt,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate RP signature" },
      { status: 500 }
    );
  }
}
