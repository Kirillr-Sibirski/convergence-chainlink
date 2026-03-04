export const CRE_SIM_CMD =
  "cre workflow simulate . --non-interactive --trigger-index 0 --broadcast -T staging";

export function buildCreValidateCmd(question: string, deadline?: number): string {
  const payload = JSON.stringify(deadline ? { question, deadline } : { question }).replace(/'/g, "\\'");
  return `cre workflow simulate . --non-interactive --trigger-index 1 --http-payload '${payload}' --broadcast -T staging`;
}

export type CreValidationTriggerResult =
  | { mode: "manual" }
  | { mode: "triggered"; deadline: number };

export async function triggerCreQuestionValidation(
  question: string
): Promise<CreValidationTriggerResult> {
  const triggerUrl = process.env.NEXT_PUBLIC_CRE_HTTP_TRIGGER_URL;
  if (!triggerUrl) {
    return { mode: "manual" };
  }

  const payload = { question };
  const apiKey = process.env.NEXT_PUBLIC_CRE_HTTP_TRIGGER_KEY;
  const response = await fetch(triggerUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`CRE HTTP trigger failed (${response.status}): ${body || "no response body"}`);
  }

  const body = (await response.json().catch(() => null)) as { deadline?: number } | null;
  const deadline = Number(body?.deadline || 0);
  if (!Number.isFinite(deadline) || deadline <= 0) {
    throw new Error("CRE verification did not return a valid AI-derived deadline.");
  }

  return { mode: "triggered", deadline: Math.floor(deadline) };
}

type CreMarketLike = {
  deadline: number;
  resolved: boolean;
};

export function getPendingCreResolutionCount(markets: CreMarketLike[]): number {
  const now = Math.floor(Date.now() / 1000);
  return markets.filter((m) => m.deadline <= now && !m.resolved).length;
}
