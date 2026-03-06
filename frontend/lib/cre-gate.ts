export const CRE_SIM_CMD =
  "cre workflow simulate . --non-interactive --trigger-index 0 --broadcast -T staging";

export function buildCreValidateCmd(question: string, deadline: number): string {
  const payload = JSON.stringify({ question, deadline }).replace(/'/g, "\\'");
  return `cre workflow simulate . --non-interactive --trigger-index 1 --http-payload '${payload}' --broadcast -T staging`;
}

export type CreValidationTriggerResult =
  | { mode: "manual" }
  | { mode: "triggered" };

export async function triggerCreQuestionValidation(
  question: string,
  deadline: number
): Promise<CreValidationTriggerResult> {
  const triggerUrl = process.env.NEXT_PUBLIC_CRE_HTTP_TRIGGER_URL;
  if (!triggerUrl) {
    return { mode: "manual" };
  }

  const payload = { question, deadline };
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

  return { mode: "triggered" };
}

type CreMarketLike = {
  deadline: number;
  resolved: boolean;
};

export function getPendingCreResolutionCount(markets: CreMarketLike[]): number {
  const now = Math.floor(Date.now() / 1000);
  return markets.filter((m) => m.deadline <= now && !m.resolved).length;
}
