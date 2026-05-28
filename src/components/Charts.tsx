"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import { Project, ProjectStatus } from "@/lib/types";
import { assessRisk, forecastCost } from "@/lib/analytics";

const STATUS_COLORS: Record<ProjectStatus, string> = {
  Planning: "#94a3b8",
  "In Progress": "#3563f0",
  Delayed: "#f59e0b",
  "On Hold": "#a855f7",
  Completed: "#10b981",
  Cancelled: "#cbd5e1",
};

export function StatusDonut({ projects }: { projects: Project[] }) {
  const counts = new Map<ProjectStatus, number>();
  projects.forEach((p) => counts.set(p.status, (counts.get(p.status) ?? 0) + 1));
  const data = Array.from(counts.entries()).map(([name, value]) => ({ name, value }));

  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
          {data.map((d) => (
            <Cell key={d.name} fill={STATUS_COLORS[d.name as ProjectStatus]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function BudgetBySubsidiary({ projects }: { projects: Project[] }) {
  const map = new Map<string, { subsidiary: string; budget: number; actual: number; forecast: number }>();
  projects.forEach((p) => {
    const row = map.get(p.subsidiary) ?? { subsidiary: p.subsidiary, budget: 0, actual: 0, forecast: 0 };
    row.budget += p.budget;
    row.actual += p.actualCost;
    row.forecast += forecastCost(p).estimateAtCompletion;
    map.set(p.subsidiary, row);
  });
  const data = Array.from(map.values()).map((r) => ({
    subsidiary: r.subsidiary,
    Budget: Math.round(r.budget / 1e6 * 100) / 100,
    Actual: Math.round(r.actual / 1e6 * 100) / 100,
    Forecast: Math.round(r.forecast / 1e6 * 100) / 100,
  }));

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

export function RiskByBusinessUnit({ projects }: { projects: Project[] }) {
  const map = new Map<string, { sum: number; count: number }>();
  projects.forEach((p) => {
    const r = map.get(p.businessUnit) ?? { sum: 0, count: 0 };
    r.sum += assessRisk(p).score;
    r.count += 1;
    map.set(p.businessUnit, r);
  });
  const data = Array.from(map.entries()).map(([bu, r]) => ({
    bu,
    risk: Math.round(r.sum / r.count),
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} layout="vertical" margin={{ top: 8, right: 16, bottom: 8, left: 24 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
        <YAxis type="category" dataKey="bu" tick={{ fontSize: 11 }} width={90} />
        <Tooltip formatter={(v: number) => `${v}/100`} />
        <Bar dataKey="risk" radius={[0, 4, 4, 0]}>
          {data.map((d) => (
            <Cell key={d.bu} fill={d.risk >= 60 ? "#ef4444" : d.risk >= 33 ? "#f59e0b" : "#10b981"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
