import { NextRequest, NextResponse } from "next/server";
import { Project } from "@/lib/types";
import { generateExecutiveBrief } from "@/lib/llm";

// POST { projects: Project[] } -> { source, insights }
// Demonstrates the AI insight service endpoint. Uses Azure OpenAI when
// configured (see src/lib/llm.ts), otherwise the offline heuristic engine.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const projects = Array.isArray(body?.projects) ? (body.projects as Project[]) : [];
    const result = await generateExecutiveBrief(projects);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ source: "heuristic", insights: [] }, { status: 400 });
  }
}
