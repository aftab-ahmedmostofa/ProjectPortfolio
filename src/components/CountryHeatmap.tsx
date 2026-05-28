"use client";

import { Project } from "@/lib/types";
import { assessRisk } from "@/lib/analytics";
import { formatCurrency } from "@/lib/format";

interface CountryAgg {
  country: string;
  count: number;
  avgRisk: number;
  budget: number;
  delayed: number;
}

function aggregate(projects: Project[]): CountryAgg[] {
  const map = new Map<string, { count: number; risk: number; budget: number; delayed: number }>();
  projects.forEach((p) => {
    const row = map.get(p.country) ?? { count: 0, risk: 0, budget: 0, delayed: 0 };
    row.count += 1;
    row.risk += assessRisk(p).score;
    row.budget += p.budget;
    if (p.status === "Delayed") row.delayed += 1;
    map.set(p.country, row);
  });
  return Array.from(map.entries())
    .map(([country, r]) => ({
      country,
      count: r.count,
      avgRisk: Math.round(r.risk / r.count),
      budget: r.budget,
      delayed: r.delayed,
    }))
    .sort((a, b) => b.avgRisk - a.avgRisk);
}

function riskTone(risk: number): string {
  if (risk >= 60) return "bg-rose-500 text-white";
  if (risk >= 45) return "bg-orange-400 text-white";
  if (risk >= 33) return "bg-amber-300 text-amber-900";
  if (risk >= 20) return "bg-emerald-300 text-emerald-900";
  return "bg-emerald-500 text-white";
}

export function CountryHeatmap({ projects }: { projects: Project[] }) {
  const data = aggregate(projects);
  if (data.length === 0) {
    return <p className="text-sm text-slate-500">No data for current filters.</p>;
  }
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {data.map((c) => (
        <div key={c.country} className={`rounded-xl p-3 ${riskTone(c.avgRisk)}`}>
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-semibold">{c.country}</span>
            <span className="text-xs opacity-90">{c.count} proj</span>
          </div>
          <div className="mt-2 text-2xl font-bold leading-none">{c.avgRisk}</div>
          <div className="mt-1 text-[11px] opacity-90">avg risk · {formatCurrency(c.budget)}</div>
          {c.delayed > 0 ? (
            <div className="mt-1 text-[11px] font-medium opacity-95">{c.delayed} delayed</div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
