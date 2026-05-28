import { Project } from "./types";
import { executiveInsights } from "./analytics";

// Optional Azure OpenAI augmentation for executive insight generation.
//
// When AZURE_OPENAI_ENDPOINT / AZURE_OPENAI_API_KEY / AZURE_OPENAI_DEPLOYMENT are
// configured, this calls the model to rewrite the deterministic heuristic
// insights into a polished executive brief. With no configuration it falls back
// to the offline heuristic engine, so the system is fully functional without any
// external dependency or API key.
export interface InsightResult {
  source: "azure-openai" | "heuristic";
  insights: string[];
}

export async function generateExecutiveBrief(list: Project[]): Promise<InsightResult> {
  const heuristics = executiveInsights(list);

  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT;

  if (!endpoint || !apiKey || !deployment) {
    return { source: "heuristic", insights: heuristics };
  }

  try {
    const url = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=2024-02-15-preview`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "api-key": apiKey },
      body: JSON.stringify({
        messages: [
          {
            role: "system",
            content:
              "You are an executive portfolio analyst. Rewrite the supplied data-derived findings into a concise executive brief. Do not invent numbers.",
          },
          { role: "user", content: heuristics.join("\n") },
        ],
        temperature: 0.3,
        max_tokens: 500,
      }),
    });
    if (!res.ok) return { source: "heuristic", insights: heuristics };
    const data = await res.json();
    const text: string = data?.choices?.[0]?.message?.content ?? "";
    const lines = text
      .split("\n")
      .map((l: string) => l.replace(/^[-*\d.\s]+/, "").trim())
      .filter(Boolean);
    return { source: "azure-openai", insights: lines.length ? lines : heuristics };
  } catch {
    return { source: "heuristic", insights: heuristics };
  }
}
