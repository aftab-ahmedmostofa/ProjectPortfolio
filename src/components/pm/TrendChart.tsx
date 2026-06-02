"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import { BudgetExpenseTrend } from "./PmCharts";
import { ChartKind } from "./ChartTypeSelector";

interface TrendDatum {
  label: string;
  budget: number;
  expense: number;
}

export function TrendChart({ kind, data }: { kind: ChartKind; data: TrendDatum[] }) {
  if (kind === "area") return <BudgetExpenseTrend data={data} />;

  if (kind === "line") {
    return (
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 10, right: 12, bottom: 0, left: -10 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} />
          <Tooltip formatter={(v: number) => `$${(v / 1000).toFixed(1)}K`} />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
          <Line type="monotone" dataKey="budget" name="Budget" stroke="#94A3B8" strokeWidth={1.5} dot={{ r: 2 }} />
          <Line type="monotone" dataKey="expense" name="Expense" stroke="#14B8A6" strokeWidth={2} dot={{ r: 2 }} />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  // grouped bars
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 10, right: 12, bottom: 0, left: -10 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
        <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} />
        <Tooltip formatter={(v: number) => `$${(v / 1000).toFixed(1)}K`} cursor={{ fill: "rgba(20, 184, 166, 0.08)" }} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="budget" name="Budget" fill="#94A3B8" radius={[3, 3, 0, 0]} />
        <Bar dataKey="expense" name="Expense" fill="#2DD4BF" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
