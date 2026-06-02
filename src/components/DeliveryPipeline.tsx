"use client";

import {
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Project } from "@/lib/types";
import { TODAY } from "@/lib/data";

interface Bucket {
  label: string;
  sortKey: number;
  count: number;
  budgetM: number;
  past: boolean;
}

function quarterKey(d: Date): { label: string; sortKey: number } {
  const year = d.getUTCFullYear();
  const q = Math.floor(d.getUTCMonth() / 3) + 1;
  return { label: `${year} Q${q}`, sortKey: year * 10 + q };
}

export function DeliveryPipeline({ projects }: { projects: Project[] }) {
  const todayKey = quarterKey(TODAY).sortKey;
  const map = new Map<number, Bucket>();

  projects.forEach((p) => {
    const k = quarterKey(new Date(p.plannedEndDate));
    const b = map.get(k.sortKey) ?? {
      label: k.label,
      sortKey: k.sortKey,
      count: 0,
      budgetM: 0,
      past: k.sortKey < todayKey,
    };
    b.count += 1;
    b.budgetM += p.budget / 1e6;
    map.set(k.sortKey, b);
  });

  const data = Array.from(map.values())
    .sort((a, b) => a.sortKey - b.sortKey)
    .map((b) => ({ ...b, budgetM: Math.round(b.budgetM * 100) / 100 }));

  if (data.length === 0) {
    return <p className="text-sm text-slate-400">No projects in scope.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: -16 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
        <Tooltip
          formatter={(value: number, name: string) =>
            name === "count" ? [`${value} project(s)`, "Ending"] : [`$${value}M`, "Budget"]
          }
        />
        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
          {data.map((d) => (
            <Cell key={d.sortKey} fill={d.past ? "#94a3b8" : d.sortKey === quarterKey(TODAY).sortKey ? "#3563f0" : "#8eb4ff"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
