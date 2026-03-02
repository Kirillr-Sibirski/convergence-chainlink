import { NextRequest, NextResponse } from "next/server";

type ValidationResult = {
  valid: boolean;
  score: number;
  issues: string[];
  suggestions: string[];
  category: string;
};

const SYSTEM_PROMPT = `You are a prediction market question validator.
Return ONLY compact JSON:
{"valid":boolean,"score":number,"issues":string[],"suggestions":string[],"category":"price"|"social"|"onchain"|"news"|"weather"|"general"|"invalid"}

Rules:
- Score 0-100.
- valid=true only if score>=70.
- Reject vague, subjective, or unverifiable questions.
- Reward clear binary questions with explicit observable criteria and date/time references.`;

export async function POST(req: NextRequest) {
  try {
    const { question } = (await req.json()) as { question?: string };
    if (!question || !question.trim()) {
      return NextResponse.json({ error: "Question is required" }, { status: 400 });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        valid: false,
        score: 0,
        issues: ["OPENROUTER_API_KEY is not configured for AI pre-validation."],
        suggestions: [
          "Set OPENROUTER_API_KEY for local validation or run CRE simulation and validate there before creating markets.",
        ],
        category: "invalid",
        source: "fallback",
        warning: "OPENROUTER_API_KEY not set. Run CRE simulation for full oracle flow validation.",
        requiresSimulation: true,
      });
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        temperature: 0,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Validate this question:\n${question}` },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      return NextResponse.json({
        valid: false,
        score: 0,
        issues: ["AI validator request failed."],
        suggestions: ["Run CRE simulation for full validation and try again."],
        category: "invalid",
        source: "fallback",
        warning: "AI validator request failed. Run CRE simulation for full validation.",
        requiresSimulation: true,
      });
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content as string | undefined;
    if (!content) {
      return NextResponse.json({
        valid: false,
        score: 0,
        issues: ["Empty AI validator response."],
        suggestions: ["Run CRE simulation for full validation and try again."],
        category: "invalid",
        source: "fallback",
        warning: "Empty AI validator response. Run CRE simulation for full validation.",
        requiresSimulation: true,
      });
    }

    const parsed = JSON.parse(content) as Partial<ValidationResult>;
    const result: ValidationResult = {
      valid: Boolean(parsed.valid),
      score: Number.isFinite(parsed.score) ? Number(parsed.score) : 0,
      issues: Array.isArray(parsed.issues) ? parsed.issues.map(String) : [],
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions.map(String) : [],
      category: typeof parsed.category === "string" ? parsed.category : "general",
    };

    return NextResponse.json({ ...result, source: "ai", requiresSimulation: false });
  } catch {
    return NextResponse.json(
      {
        valid: false,
        score: 0,
        issues: ["Validation failed due to server error."],
        suggestions: ["Try again. If the error persists, run CRE simulation to validate the flow."],
        category: "invalid",
      },
      { status: 500 }
    );
  }
}
