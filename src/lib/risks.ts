import { Risk, LegacyRisk, RiskCategory, RiskStatus, Severity } from "./types";

// Probability and Impact use a 1–5 scale; severity uses the standard
// 5×5 risk matrix (probability × impact, max 25).
export const PROBABILITY_LABELS: Record<number, string> = {
  1: "Rare",
  2: "Unlikely",
  3: "Possible",
  4: "Likely",
  5: "Almost Certain",
};
export const IMPACT_LABELS: Record<number, string> = {
  1: "Negligible",
  2: "Minor",
  3: "Moderate",
  4: "Major",
  5: "Severe",
};

export function severityScore(probability: number, impact: number): number {
  return probability * impact;
}

export function deriveSeverity(probability: number, impact: number): Severity {
  const score = severityScore(probability, impact);
  if (score >= 16) return "Critical";
  if (score >= 10) return "High";
  if (score >= 5) return "Medium";
  return "Low";
}

export function severityTone(s: Severity): string {
  return {
    Low: "bg-emerald-100 text-emerald-700 border-emerald-200",
    Medium: "bg-amber-100 text-amber-800 border-amber-200",
    High: "bg-orange-100 text-orange-800 border-orange-200",
    Critical: "bg-rose-100 text-rose-700 border-rose-200",
  }[s];
}

export function statusTone(s: RiskStatus): string {
  return {
    Open: "bg-slate-100 text-slate-700 border-slate-200",
    "In Progress": "bg-blue-100 text-blue-700 border-blue-200",
    Mitigated: "bg-emerald-100 text-emerald-700 border-emerald-200",
    Accepted: "bg-violet-100 text-violet-700 border-violet-200",
    Closed: "bg-slate-200 text-slate-500 border-slate-300",
  }[s];
}

export function isRiskActive(r: Risk): boolean {
  return !r.deletedAt && r.status !== "Closed";
}

const KEYWORDS: Array<[RegExp, RiskCategory]> = [
  [/\b(data|integrat|api|system|microsegment|sensor|edge|lake|protocol|migration|cloud|cutover|infra|legacy|model|hallucin|RAG|machine|rule\s*engine|cutover|adapter|automation|telemetry|observ)/i, "Technical"],
  [/\b(budget|cost|financial|spend|reorg|freeze|overrun|spending|finance)/i, "Financial"],
  [/\b(vendor|supplier|3rd[\s-]?party|third[\s-]?party|external|hardware\s+supply)/i, "External"],
  [/\b(gdpr|consent|complian|regulator|fca|audit|disclosure|pii|dpia)/i, "Compliance"],
  [/\b(securit|mfa|identity|zero[\s-]?trust|attack|threat|breach)/i, "Security"],
  [/\b(schedul|delay|deadline|cutover\s+window|month[\s-]?end\s+batch)/i, "Schedule"],
  [/\b(resource|staff|availability|backfill|skill|capacity|steward)/i, "Resource"],
  [/\b(stakeholder|sponsor|exec|board)/i, "Stakeholder"],
  [/\b(qualit|hallucin|false[\s-]?positive|false[\s-]?negative|defect|bug)/i, "Quality"],
  [/\b(scope|strateg|roadmap|alignment)/i, "Strategic"],
];

export function inferCategory(text: string): RiskCategory {
  for (const [re, cat] of KEYWORDS) if (re.test(text)) return cat;
  return "Operational";
}

const IMPACT_FROM_SEVERITY: Record<Severity, 1 | 2 | 3 | 4 | 5> = {
  Low: 2,
  Medium: 3,
  High: 4,
  Critical: 5,
};

export function migrateLegacyRisk(legacy: LegacyRisk, createdAt: string): Risk {
  const impact = IMPACT_FROM_SEVERITY[legacy.severity];
  const probability = Math.max(1, Math.min(5, Math.round((legacy.likelihood ?? 0.3) * 5))) as 1 | 2 | 3 | 4 | 5;
  const severity = deriveSeverity(probability, impact);
  const status: RiskStatus = legacy.open ? "Open" : "Closed";
  return {
    id: legacy.id,
    title: legacy.description.length > 80 ? legacy.description.slice(0, 77) + "…" : legacy.description,
    description: legacy.description,
    category: inferCategory(legacy.description + " " + legacy.mitigation),
    probability,
    impact,
    severity,
    mitigation: legacy.mitigation ?? "",
    mitigationProgress: legacy.open ? 25 : 100,
    ownerId: undefined,
    status,
    dueDate: undefined,
    createdAt,
    updatedAt: createdAt,
    open: status !== "Closed",
    likelihood: probability / 5,
    activity: [
      {
        id: `A-${legacy.id}-init`,
        at: createdAt,
        actor: "System",
        kind: "created",
        message: "Risk registered in project baseline.",
      },
    ],
  };
}

// Helper to keep cached derived fields (severity, likelihood, open) consistent
// with whatever was last set on the risk. Always run after mutations.
export function refreshDerived(r: Risk): Risk {
  return {
    ...r,
    severity: deriveSeverity(r.probability, r.impact),
    likelihood: r.probability / 5,
    open: !r.deletedAt && r.status !== "Closed",
  };
}
