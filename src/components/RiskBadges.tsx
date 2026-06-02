"use client";

import { Severity, RiskStatus, RiskCategory } from "@/lib/types";
import { severityTone, statusTone } from "@/lib/risks";

export function SeverityBadge({ severity }: { severity: Severity }) {
  return <span className={`badge border ${severityTone(severity)}`}>{severity}</span>;
}

export function RiskStatusBadge({ status }: { status: RiskStatus }) {
  return <span className={`badge border ${statusTone(status)}`}>{status}</span>;
}

export function CategoryBadge({ category }: { category: RiskCategory }) {
  return <span className="badge border border-slate-200 bg-slate-50 text-slate-600">{category}</span>;
}

export function ScoreChip({ probability, impact }: { probability: number; impact: number }) {
  const score = probability * impact;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-slate-600"
      title={`Probability ${probability} × Impact ${impact}`}
    >
      <span className="text-slate-400">P×I</span>
      <span className="text-slate-700">{probability} × {impact} = {score}</span>
    </span>
  );
}
