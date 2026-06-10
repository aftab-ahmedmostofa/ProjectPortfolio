import { NextRequest, NextResponse } from "next/server";
import { Project } from "@/lib/types";
import { generateExecutiveBrief } from "@/lib/llm";

// POST { projects: Project[] } -> { source, insights }
//
// Demonstrates the AI insight service endpoint. Uses Azure OpenAI when
// configured (see src/lib/llm.ts), otherwise the offline heuristic engine.
//
// Hardening: the endpoint can drive paid LLM calls, so it is guarded against
// abuse — request-size cap, project-count cap, payload-shape validation, and a
// lightweight per-IP rate limit. None of this changes the happy-path response.

const MAX_BODY_BYTES = 256 * 1024; // 256 KB request cap
const MAX_PROJECTS = 500; // far above any real portfolio in this app
const RATE_WINDOW_MS = 60_000; // 1 minute
const RATE_MAX = 30; // requests per window per client

// In-memory fixed-window limiter. Per server instance — adequate as a basic
// abuse guard for this reference app; a multi-instance deployment would back
// this with a shared store (e.g. Redis).
const hits = new Map<string, { count: number; windowStart: number }>();

function clientKey(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

function rateLimited(key: string, now: number): boolean {
  const entry = hits.get(key);
  if (!entry || now - entry.windowStart >= RATE_WINDOW_MS) {
    hits.set(key, { count: 1, windowStart: now });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_MAX;
}

export async function POST(req: NextRequest) {
  // 1) Rate limit.
  const now = Date.now();
  if (rateLimited(clientKey(req), now)) {
    return NextResponse.json(
      { source: "heuristic", insights: [], error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(RATE_WINDOW_MS / 1000) } }
    );
  }

  // 2) Reject oversized payloads up front (cheap, before parsing).
  const declaredLen = Number(req.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLen) && declaredLen > MAX_BODY_BYTES) {
    return NextResponse.json(
      { source: "heuristic", insights: [], error: "payload_too_large" },
      { status: 413 }
    );
  }

  // 3) Parse + validate shape. Defend against a missing/lying Content-Length
  //    by re-checking the actual byte length of the raw body.
  let projects: Project[];
  try {
    const raw = await req.text();
    if (raw.length > MAX_BODY_BYTES) {
      return NextResponse.json(
        { source: "heuristic", insights: [], error: "payload_too_large" },
        { status: 413 }
      );
    }
    const body = JSON.parse(raw);
    if (!body || typeof body !== "object" || !Array.isArray(body.projects)) {
      return NextResponse.json(
        { source: "heuristic", insights: [], error: "invalid_body" },
        { status: 400 }
      );
    }
    if (body.projects.length > MAX_PROJECTS) {
      return NextResponse.json(
        { source: "heuristic", insights: [], error: "too_many_projects" },
        { status: 413 }
      );
    }
    // Keep only well-formed entries; never pass arbitrary primitives downstream.
    projects = body.projects.filter(
      (p: unknown): p is Project => !!p && typeof p === "object" && !Array.isArray(p)
    );
  } catch {
    return NextResponse.json(
      { source: "heuristic", insights: [], error: "invalid_json" },
      { status: 400 }
    );
  }

  // 4) Generate (Azure OpenAI when configured, else offline heuristic).
  try {
    const result = await generateExecutiveBrief(projects);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ source: "heuristic", insights: [] }, { status: 500 });
  }
}
