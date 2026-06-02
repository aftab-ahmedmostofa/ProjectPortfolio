"use client";

import Link from "next/link";
import {
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ScatterChart,
  Scatter,
  ZAxis,
  Cell,
} from "recharts";
import { HealthCategory } from "@/lib/pmAnalytics";

// ---- Donut chart (Project Health) ----

const HEALTH_COLOR: Record<HealthCategory, string> = {
  "On Track": "#14B8A6",
  "Needs Attention": "#5EEAD4",
  "At Risk": "#F97316",
  Blocked: "#94A3B8",
  "Not Set": "#CBD5E1",
};

export function HealthDonut({
  data,
  onSelect,
  selected = new Set<string>(),
}: {
  data: { name: HealthCategory; count: number }[];
  onSelect?: (name: HealthCategory) => void;
  selected?: Set<string>;
}) {
  const total = data.reduce((s, d) => s + d.count, 0);
  if (total === 0) return <p className="text-xs text-slate-400">No data.</p>;

  // Compute donut slices manually so click areas are predictable.
  const cx = 110;
  const cy = 110;
  const rOuter = 90;
  const rInner = 60;
  let acc = 0;
  const slices = data.map((d) => {
    const start = (acc / total) * Math.PI * 2 - Math.PI / 2;
    const end = ((acc + d.count) / total) * Math.PI * 2 - Math.PI / 2;
    acc += d.count;
    return { d, start, end };
  });

  function arc(start: number, end: number, ro: number, ri: number) {
    const large = end - start > Math.PI ? 1 : 0;
    const x0 = cx + ro * Math.cos(start);
    const y0 = cy + ro * Math.sin(start);
    const x1 = cx + ro * Math.cos(end);
    const y1 = cy + ro * Math.sin(end);
    const xi1 = cx + ri * Math.cos(end);
    const yi1 = cy + ri * Math.sin(end);
    const xi0 = cx + ri * Math.cos(start);
    const yi0 = cy + ri * Math.sin(start);
    return `M ${x0} ${y0} A ${ro} ${ro} 0 ${large} 1 ${x1} ${y1} L ${xi1} ${yi1} A ${ri} ${ri} 0 ${large} 0 ${xi0} ${yi0} Z`;
  }

  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 220 220" className="h-44 w-44">
        {slices.map(({ d, start, end }) => {
          if (d.count === 0) return null;
          const isSelected = selected.has(d.name);
          const inactive = selected.size > 0 && !isSelected;
          return (
            <g
              key={d.name}
              onClick={onSelect ? () => onSelect(d.name) : undefined}
              className={onSelect ? "cursor-pointer" : ""}
            >
              <path
                d={arc(start, end, rOuter, rInner)}
                fill={inactive ? "#E2E8F0" : HEALTH_COLOR[d.name]}
                stroke="#fff"
                strokeWidth={2}
              />
            </g>
          );
        })}
        <text x={cx} y={cy - 4} textAnchor="middle" fontSize={20} fontWeight={700} fill="#0f172a">{total}</text>
        <text x={cx} y={cy + 14} textAnchor="middle" fontSize={10} fill="#64748b">projects</text>
      </svg>
      <ul className="space-y-1.5 text-xs">
        {data.map((d) => {
          const pct = total > 0 ? (d.count / total) * 100 : 0;
          const isSelected = selected.has(d.name);
          return (
            <li
              key={d.name}
              onClick={onSelect ? () => onSelect(d.name) : undefined}
              className={`flex cursor-pointer items-center gap-2 ${isSelected ? "font-semibold text-slate-900" : "text-slate-600"}`}
            >
              <span className="h-2 w-3 rounded-sm" style={{ background: HEALTH_COLOR[d.name] }} />
              <span className="flex-1">{d.name}</span>
              <span className="font-medium">{d.count}</span>
              <span className="text-[10px] text-slate-400">({pct.toFixed(1)}%)</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ---- Budget vs Expense Trend ----

export function BudgetExpenseTrend({ data }: { data: { label: string; budget: number; expense: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 10, right: 12, bottom: 0, left: -10 }}>
        <defs>
          <linearGradient id="budgetGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#94A3B8" stopOpacity={0.25} />
            <stop offset="100%" stopColor="#94A3B8" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2DD4BF" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#2DD4BF" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
        <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} />
        <Tooltip formatter={(v: number) => `$${(v / 1000).toFixed(1)}K`} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
        <Area type="monotone" dataKey="budget" name="Budget" stroke="#94A3B8" fill="url(#budgetGrad)" strokeWidth={1.5} />
        <Area type="monotone" dataKey="expense" name="Expense" stroke="#14B8A6" fill="url(#expenseGrad)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ---- Budget vs Expense Scatter (bubbles sized by progress) ----

export function BudgetExpenseScatter({
  data,
  onSelect,
}: {
  data: { id: string; name: string; budget: number; expense: number; progress: number }[];
  onSelect?: (id: string) => void;
}) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <ScatterChart margin={{ top: 10, right: 12, bottom: 4, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
        <XAxis
          type="number"
          dataKey="budget"
          name="Budget"
          tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`}
          tick={{ fontSize: 10, fill: "#64748b" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="number"
          dataKey="expense"
          name="Expense"
          tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`}
          tick={{ fontSize: 10, fill: "#64748b" }}
          axisLine={false}
          tickLine={false}
        />
        <ZAxis type="number" dataKey="progress" range={[40, 400]} name="Progress %" />
        <Tooltip
          formatter={(value: number, name: string) =>
            name === "Progress %" ? `${value}%` : `$${(value / 1000).toFixed(1)}K`
          }
          labelFormatter={() => ""}
          content={({ active, payload }) => {
            if (!active || !payload || !payload.length) return null;
            const p = payload[0].payload as { name: string; budget: number; expense: number; progress: number };
            return (
              <div className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-[11px] shadow">
                <div className="font-semibold text-slate-800">{p.name}</div>
                <div>Budget ${(p.budget / 1000).toFixed(1)}K</div>
                <div>Expense ${(p.expense / 1000).toFixed(1)}K</div>
                <div>Progress {p.progress}%</div>
              </div>
            );
          }}
        />
        <Scatter
          data={data}
          fill="#2DD4BF"
          fillOpacity={0.65}
          stroke="#14B8A6"
          strokeWidth={1}
          onClick={(d) => {
            if (onSelect && d && typeof d === "object" && "id" in d) onSelect((d as { id: string }).id);
          }}
        />
      </ScatterChart>
    </ResponsiveContainer>
  );
}

// ---- Budget Utilisation ranking ----

export function BudgetUtilisationRanking({ data }: { data: { id: string; name: string; pct: number; over: boolean }[] }) {
  const top = data.slice(0, 8);
  if (top.length === 0) return <p className="text-xs text-slate-400">No data.</p>;
  const maxPct = Math.max(120, ...top.map((d) => d.pct));
  return (
    <ul className="space-y-2.5">
      {top.map((d) => {
        const widthPct = Math.min(100, (d.pct / maxPct) * 100);
        return (
          <li key={d.id} className="grid items-center gap-2" style={{ gridTemplateColumns: "120px 1fr 40px" }}>
            <Link href={`/projects/${d.id}`} className="truncate text-[11px] text-slate-600 hover:text-brand-700" title={d.name}>
              {d.name}
            </Link>
            <div className="relative h-3">
              <div className="absolute inset-y-0 left-0 w-full rounded bg-slate-100" />
              <div
                className={`absolute inset-y-0 left-0 rounded ${d.over ? "bg-orange-400" : "bg-teal-400"}`}
                style={{ width: `${widthPct}%` }}
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
