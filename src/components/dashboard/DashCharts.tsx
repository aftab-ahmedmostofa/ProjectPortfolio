"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  Treemap as RTreemap,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Cell,
} from "recharts";
import { Project, ProjectStatus } from "@/lib/types";
import { assessRisk, forecastCost } from "@/lib/analytics";
import { TODAY } from "@/lib/data";
import { CategoricalChart } from "@/components/pm/CategoricalChart";
import { ChartKind } from "@/components/pm/ChartTypeSelector";

const TEAL = "#3563f0"; // brand colour from dashboard palette
const PALETTE = ["#3563f0", "#1f44d6", "#8eb4ff", "#bcd2ff", "#94a3b8", "#10b981", "#f59e0b", "#a855f7"];

const STATUS_COLORS: Record<ProjectStatus, string> = {
  Planning: "#94a3b8",
  "In Progress": "#3563f0",
  Delayed: "#f59e0b",
  "On Hold": "#a855f7",
  Completed: "#10b981",
  Cancelled: "#cbd5e1",
};

// ---- Status Distribution ----

export function StatusDistributionChart({ projects, kind }: { projects: Project[]; kind: ChartKind }) {
  const counts = new Map<ProjectStatus, number>();
  projects.forEach((p) => counts.set(p.status, (counts.get(p.status) ?? 0) + 1));
  const data = Array.from(counts.entries()).map(([name, count]) => ({ name, count }));
  return <CategoricalChart kind={kind} data={data} />;
}

// ---- Budget vs Actual vs Forecast by Subsidiary ----

interface SubsidiaryRow {
  subsidiary: string;
  Budget: number;
  Actual: number;
  Forecast: number;
}

function budgetBySubsidiaryData(projects: Project[]): SubsidiaryRow[] {
  const map = new Map<string, SubsidiaryRow>();
  projects.forEach((p) => {
    const row = map.get(p.subsidiary) ?? { subsidiary: p.subsidiary, Budget: 0, Actual: 0, Forecast: 0 };
    row.Budget += p.budget;
    row.Actual += p.actualCost;
    row.Forecast += forecastCost(p).estimateAtCompletion;
    map.set(p.subsidiary, row);
  });
  return Array.from(map.values()).map((r) => ({
    subsidiary: r.subsidiary,
    Budget: Math.round(r.Budget / 1e6 * 100) / 100,
    Actual: Math.round(r.Actual / 1e6 * 100) / 100,
    Forecast: Math.round(r.Forecast / 1e6 * 100) / 100,
  }));
}

export function BudgetSubsidiaryChart({ projects, kind }: { projects: Project[]; kind: ChartKind }) {
  const data = budgetBySubsidiaryData(projects);

  if (kind === "line") {
    return (
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: -10 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="subsidiary" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} unit="M" />
          <Tooltip formatter={(v: number) => `$${v}M`} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line type="monotone" dataKey="Budget" stroke="#94a3b8" strokeWidth={2} dot={{ r: 3 }} />
          <Line type="monotone" dataKey="Actual" stroke="#3563f0" strokeWidth={2} dot={{ r: 3 }} />
          <Line type="monotone" dataKey="Forecast" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  if (kind === "area") {
    return (
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: -10 }}>
          <defs>
            <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3563f0" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#3563f0" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="subsidiary" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} unit="M" />
          <Tooltip formatter={(v: number) => `$${v}M`} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Area type="monotone" dataKey="Budget" stroke="#94a3b8" fill="#94a3b8" fillOpacity={0.2} />
          <Area type="monotone" dataKey="Actual" stroke="#3563f0" fill="url(#actualGrad)" />
          <Area type="monotone" dataKey="Forecast" stroke="#f59e0b" fill="url(#forecastGrad)" />
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  // stacked bars
  if (kind === "treemap") {
    const tmData = data.flatMap((r) => [
      { name: `${r.subsidiary} · Budget`, size: r.Budget, fill: "#94a3b8" },
      { name: `${r.subsidiary} · Actual`, size: r.Actual, fill: "#3563f0" },
      { name: `${r.subsidiary} · Forecast`, size: r.Forecast, fill: "#f59e0b" },
    ]);
    return (
      <ResponsiveContainer width="100%" height={260}>
        <RTreemap data={tmData} dataKey="size" stroke="#fff" />
      </ResponsiveContainer>
    );
  }

  // default: grouped bars
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: -10 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="subsidiary" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} unit="M" />
        <Tooltip formatter={(v: number) => `$${v}M`} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="Budget" fill="#94a3b8" radius={[4, 4, 0, 0]} />
        <Bar dataKey="Actual" fill="#3563f0" radius={[4, 4, 0, 0]} />
        <Bar dataKey="Forecast" fill="#f59e0b" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ---- Avg Risk by Business Unit ----

export function RiskByBuChart({ projects, kind }: { projects: Project[]; kind: ChartKind }) {
  const map = new Map<string, { sum: number; count: number }>();
  projects.forEach((p) => {
    const r = map.get(p.businessUnit) ?? { sum: 0, count: 0 };
    r.sum += assessRisk(p).score;
    r.count += 1;
    map.set(p.businessUnit, r);
  });
  const data = Array.from(map.entries()).map(([name, r]) => ({
    name,
    count: Math.round(r.sum / r.count),
  }));
  return <CategoricalChart kind={kind} data={data} />;
}

// ---- Country Risk ----

interface CountryAgg {
  country: string;
  count: number;
  avgRisk: number;
  budget: number;
  delayed: number;
}

function countryAggregate(projects: Project[]): CountryAgg[] {
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

function fmtCurrency(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (Math.abs(v) >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

export function CountryRiskChart({ projects, kind }: { projects: Project[]; kind: ChartKind }) {
  const data = countryAggregate(projects);
  if (data.length === 0) return <p className="text-sm text-slate-500">No data for current filters.</p>;

  // Heatmap: the existing tile grid
  if (kind === "treemap") {
    const tmData = data.map((c) => ({
      name: c.country,
      size: c.count,
      fill: c.avgRisk >= 60 ? "#ef4444" : c.avgRisk >= 45 ? "#f97316" : c.avgRisk >= 33 ? "#fcd34d" : "#10b981",
    }));
    return (
      <ResponsiveContainer width="100%" height={220}>
        <RTreemap data={tmData} dataKey="size" stroke="#fff" />
      </ResponsiveContainer>
    );
  }

  if (kind === "bar") {
    return (
      <ResponsiveContainer width="100%" height={Math.max(180, data.length * 32)}>
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 24, bottom: 8, left: 24 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
          <YAxis type="category" dataKey="country" tick={{ fontSize: 11 }} width={90} />
          <Tooltip formatter={(v: number) => `${v}/100`} />
          <Bar dataKey="avgRisk" radius={[0, 4, 4, 0]}>
            {data.map((d) => (
              <Cell
                key={d.country}
                fill={d.avgRisk >= 60 ? "#ef4444" : d.avgRisk >= 45 ? "#f97316" : d.avgRisk >= 33 ? "#fcd34d" : "#10b981"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  }

  // default / heatmap: tile grid
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {data.map((c) => (
        <div key={c.country} className={`rounded-xl p-3 ${riskTone(c.avgRisk)}`}>
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-semibold">{c.country}</span>
            <span className="text-xs opacity-90">{c.count} proj</span>
          </div>
          <div className="mt-2 text-2xl font-bold leading-none">{c.avgRisk}</div>
          <div className="mt-1 text-[11px] opacity-90">avg risk · {fmtCurrency(c.budget)}</div>
          {c.delayed > 0 ? (
            <div className="mt-1 text-[11px] font-medium opacity-95">{c.delayed} delayed</div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

// Silence unused warnings (palette retained for future tweaks).
void PALETTE;
void STATUS_COLORS;

// ---- Delivery Pipeline ----

interface PipelineBucket {
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

function deliveryPipelineData(projects: Project[]): PipelineBucket[] {
  const todayKey = quarterKey(TODAY).sortKey;
  const map = new Map<number, PipelineBucket>();
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
  return Array.from(map.values())
    .sort((a, b) => a.sortKey - b.sortKey)
    .map((b) => ({ ...b, budgetM: Math.round(b.budgetM * 100) / 100 }));
}

export function DeliveryPipelineChart({ projects, kind }: { projects: Project[]; kind: ChartKind }) {
  const data = deliveryPipelineData(projects);
  if (data.length === 0) return <p className="text-sm text-slate-400">No projects in scope.</p>;
  const todayKey = quarterKey(TODAY).sortKey;

  if (kind === "line") {
    return (
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: -16 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
          <Tooltip formatter={(v: number) => `${v} project(s)`} />
          <Line type="monotone" dataKey="count" stroke={TEAL} strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  if (kind === "area") {
    return (
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: -16 }}>
          <defs>
            <linearGradient id="pipelineGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={TEAL} stopOpacity={0.4} />
              <stop offset="100%" stopColor={TEAL} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
          <Tooltip formatter={(v: number) => `${v} project(s)`} />
          <Area type="monotone" dataKey="count" stroke={TEAL} strokeWidth={2} fill="url(#pipelineGrad)" />
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  if (kind === "lollipop") {
    return (
      <CategoricalChart
        kind="lollipop"
        data={data.map((d) => ({ name: d.label, count: d.count }))}
      />
    );
  }

  // default: bar
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: -16 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
        <Tooltip formatter={(v: number) => `${v} project(s)`} />
        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
          {data.map((d) => (
            <Cell key={d.sortKey} fill={d.past ? "#94a3b8" : d.sortKey === todayKey ? TEAL : "#8eb4ff"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
