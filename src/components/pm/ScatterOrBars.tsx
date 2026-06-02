"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  LineChart,
  Line,
} from "recharts";
import { BudgetExpenseScatter } from "./PmCharts";
import { ChartKind } from "./ChartTypeSelector";

interface ScatterDatum {
  id: string;
  name: string;
  budget: number;
  expense: number;
  progress: number;
}

export function ScatterOrBars({
  kind,
  data,
  onSelect,
}: {
  kind: ChartKind;
  data: ScatterDatum[];
  onSelect?: (id: string) => void;
}) {
  if (kind === "scatter") return <BudgetExpenseScatter data={data} onSelect={onSelect} />;

  if (kind === "line") {
    // Show budget and expense as parallel ranked lines (sorted by budget)
    const sorted = [...data].sort((a, b) => b.budget - a.budget).slice(0, 10);
    return (
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={sorted} margin={{ top: 10, right: 12, bottom: 30, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
          <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#475569" }} angle={-25} textAnchor="end" height={50} axisLine={false} tickLine={false} interval={0} />
          <YAxis tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} />
          <Tooltip formatter={(v: number) => `$${(v / 1000).toFixed(1)}K`} />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
          <Line dataKey="budget" name="Budget" stroke="#94A3B8" strokeWidth={1.5} dot={{ r: 2 }} />
          <Line dataKey="expense" name="Expense" stroke="#14B8A6" strokeWidth={2} dot={{ r: 2 }} />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  // grouped bars per project (top 10 by budget)
  const sorted = [...data].sort((a, b) => b.budget - a.budget).slice(0, 10);
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={sorted} margin={{ top: 10, right: 12, bottom: 30, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
        <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#475569" }} angle={-25} textAnchor="end" height={50} axisLine={false} tickLine={false} interval={0} />
        <YAxis tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} />
        <Tooltip formatter={(v: number) => `$${(v / 1000).toFixed(1)}K`} cursor={{ fill: "rgba(20, 184, 166, 0.08)" }} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="budget" name="Budget" fill="#94A3B8" radius={[3, 3, 0, 0]} onClick={(d) => onSelect && (d as ScatterDatum).id && onSelect((d as ScatterDatum).id)} />
        <Bar dataKey="expense" name="Expense" fill="#2DD4BF" radius={[3, 3, 0, 0]} onClick={(d) => onSelect && (d as ScatterDatum).id && onSelect((d as ScatterDatum).id)} />
      </BarChart>
    </ResponsiveContainer>
  );
}
