"use client";

import Link from "next/link";
import { Project } from "@/lib/types";
import { assessRisk, forecastCost, forecastSchedule } from "@/lib/analytics";
import { RiskBadge } from "./ui";
import { formatCurrency } from "@/lib/format";

export function TopAtRiskPanel({ projects }: { projects: Project[] }) {
  const ranked = [...projects]
    .map((p) => ({ p, r: assessRisk(p), c: forecastCost(p), s: forecastSchedule(p) }))
    .sort((a, b) => b.r.score - a.r.score)
    .slice(0, 5);

  if (ranked.length === 0) {
    return <p className="text-sm text-slate-400">No projects in current scope.</p>;
  }

  return (
    <div className="divide-y divide-slate-100">
      {ranked.map(({ p, r, c, s }) => (
        <Link
          key={p.id}
          href={`/projects/${p.id}`}
          className="flex items-center gap-3 py-2.5 hover:bg-slate-50"
        >
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-slate-800">{p.name}</div>
            <div className="truncate text-xs text-slate-400">
              {p.subsidiary} · {p.country}
            </div>
          </div>
          <div className="hidden text-right text-xs sm:block">
            <div className={c.projectedOverrun > 0 ? "text-rose-600" : "text-emerald-600"}>
              {c.projectedOverrun >= 0 ? "+" : ""}
              {formatCurrency(c.projectedOverrun)}
            </div>
            <div className={s.predictedDelayDays > 7 ? "text-amber-600" : "text-slate-400"}>
              {Math.round(s.predictedDelayDays)}d delay
            </div>
          </div>
          <RiskBadge level={r.level} score={r.score} />
        </Link>
      ))}
    </div>
  );
}
