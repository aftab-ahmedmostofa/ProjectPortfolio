"use client";

import Link from "next/link";
import { BudgetUtilisationRanking } from "./PmCharts";
import { ChartKind } from "./ChartTypeSelector";

interface Datum {
  id: string;
  name: string;
  pct: number;
  over: boolean;
}

export function RankingChart({ kind, data }: { kind: ChartKind; data: Datum[] }) {
  if (kind === "bar") return <BudgetUtilisationRanking data={data} />;

  // Lollipop variant
  const top = data.slice(0, 8);
  if (top.length === 0) return <p className="text-xs text-slate-400">No data.</p>;
  const maxPct = Math.max(120, ...top.map((d) => d.pct));
  return (
    <ul className="space-y-3">
      {top.map((d) => {
        const widthPct = Math.min(100, (d.pct / maxPct) * 100);
        const color = d.over ? "bg-orange-400" : "bg-teal-400";
        return (
          <li key={d.id} className="grid items-center gap-2" style={{ gridTemplateColumns: "120px 1fr 40px" }}>
            <Link href={`/projects/${d.id}`} className="truncate text-[11px] text-slate-600 hover:text-brand-700" title={d.name}>
              {d.name}
            </Link>
            <div className="relative h-2">
              <div className="absolute inset-y-1/2 left-0 h-px w-full -translate-y-1/2 bg-slate-100" />
              <div className={`absolute inset-y-1/2 left-0 h-0.5 -translate-y-1/2 ${color}`} style={{ width: `${widthPct}%` }} />
              <div
                className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border-2 border-white shadow-sm ${color}`}
                style={{ left: `calc(${widthPct}% - 8px)` }}
              />
              <div className="absolute inset-y-0" style={{ left: `${(100 / maxPct) * 100}%`, borderLeft: "1px dashed #94a3b8" }} />
            </div>
            <span className={`text-right text-[11px] font-medium ${d.over ? "text-orange-600" : "text-teal-700"}`}>{d.pct}%</span>
          </li>
        );
      })}
    </ul>
  );
}
