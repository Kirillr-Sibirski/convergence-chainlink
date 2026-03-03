export const CRE_SIM_CMD =
  "cd /Users/kirillrybkov/Desktop/convergence-chainlink/cre-workflow && bun run simulate";

export function buildCreValidateCmd(question: string, deadline: number): string {
  const payload = JSON.stringify({ question, deadline }).replace(/'/g, "\\'");
  return `cd /Users/kirillrybkov/Desktop/convergence-chainlink/cre-workflow && bun run simulate:http '${payload}' -T staging`;
}

export async function triggerCreQuestionValidation(
  question: string,
  deadline: number
): Promise<"triggered" | "manual"> {
  const triggerUrl = process.env.NEXT_PUBLIC_CRE_HTTP_TRIGGER_URL;
  if (!triggerUrl) {
    return "manual";
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

  return "triggered";
}

type CreMarketLike = {
  deadline: number;
  resolved: boolean;
};

export function getPendingCreResolutionCount(markets: CreMarketLike[]): number {
  const now = Math.floor(Date.now() / 1000);
  return markets.filter((m) => m.deadline <= now && !m.resolved).length;
}
