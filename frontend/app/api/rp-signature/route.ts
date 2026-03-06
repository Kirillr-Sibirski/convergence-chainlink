import { NextResponse } from "next/server";
import { signRequest } from "@worldcoin/idkit/signing";

export async function POST(request: Request): Promise<Response> {
  try {
    const { action } = (await request.json()) as { action?: string };
    const effectiveAction = (action ?? "").trim();

    if (!effectiveAction) {
      return NextResponse.json({ error: "Missing action" }, { status: 400 });
    }

    const signingKey = process.env.RP_SIGNING_KEY;
    if (!signingKey || signingKey === "CHANGE_ME") {
      return NextResponse.json(
        { error: "RP_SIGNING_KEY is not configured." },
        { status: 500 }
      );
    }

    const { sig, nonce, createdAt, expiresAt } = signRequest(effectiveAction, signingKey);

    return NextResponse.json({
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
