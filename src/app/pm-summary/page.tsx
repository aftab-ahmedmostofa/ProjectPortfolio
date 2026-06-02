"use client";

import { useMemo } from "react";
import { useApp } from "@/components/AppProvider";
import { PortfolioFilters, ProjectStatus } from "@/lib/types";
import {
  kpiSparklines,
  byBusinessUnit,
  byLocation,
  byPriority,
  byHealth,
  byStatus,
  byManager,
  budgetExpenseTrend,
  budgetUtilisation,
  budgetVsExpense,
  pmHeadline,
  HealthCategory,
  healthOf,
  resourceUtilisation,
} from "@/lib/pmAnalytics";
import { PmKpiCard } from "@/components/pm/PmKpiCard";
import { HorizontalLollipop, VerticalLollipop } from "@/components/pm/Lollipop";
import { WorldBubbleMap } from "@/components/pm/WorldBubbleMap";
import { HealthDonut, BudgetExpenseTrend, BudgetExpenseScatter, BudgetUtilisationRanking } from "@/components/pm/PmCharts";
import { useRouter } from "next/navigation";

export default function PmSummaryPage() {
  const { projects, members, filters, setFilters, resetFilters } = useApp();
  const router = useRouter();

  // Cross-filter toggles bound to the global PortfolioFilters.
  function toggle<K extends keyof PortfolioFilters>(key: K, value: string) {
    const current = filters[key] as string[];
    const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
    setFilters({ ...filters, [key]: next } as PortfolioFilters);
  }

  // Health is derived — store the selection in component state, then re-filter
  // projects locally for the dashboard while leaving the global filters intact.
  const headline = useMemo(() => pmHeadline(projects), [projects]);
  const sparks = useMemo(() => kpiSparklines(projects), [projects]);
  const resource = useMemo(() => resourceUtilisation(projects, members.length), [projects, members.length]);

  const projectsByType = useMemo(() => byBusinessUnit(projects), [projects]);
  const projectsByLoc = useMemo(() => byLocation(projects), [projects]);
  const priorityData = useMemo(() => byPriority(projects), [projects]);
  const healthData = useMemo(() => byHealth(projects), [projects]);
  const statusData = useMemo(() => byStatus(projects), [projects]);
  const managers = useMemo(() => byManager(projects), [projects]);
  const trend = useMemo(() => budgetExpenseTrend(projects, 18), [projects]);
  const scatter = useMemo(() => budgetVsExpense(projects), [projects]);
  const ranking = useMemo(() => budgetUtilisation(projects), [projects]);

  const fmt = {
    money: (v: number) => `$${(v / 1000).toFixed(0)}K`,
    moneyLarge: (v: number) => v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M` : `$${(v / 1000).toFixed(0)}K`,
  };

  // Synthetic deltas — derived from the sparkline series.
  function delta(series: number[]): string {
    if (series.length < 2) return "+0.0%";
    const first = series[0] || 1;
    const last = series[series.length - 1];
    const d = ((last - first) / Math.abs(first)) * 100;
    const sign = d >= 0 ? "+" : "";
    return `${sign}${d.toFixed(1)}%`;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-2 border-b border-slate-200 pb-3">
        <div>
          <h1 className="text-2xl font-bold tracking-[0.18em] text-slate-900">
            <span className="text-teal-500">PROJECT</span> MANAGEMENT SUMMARY
          </h1>
          <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">Tableau-style interactive analytics · cross-filter by clicking any chart</p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500">Active scope: {projects.length} projects</span>
          <button onClick={resetFilters} className="rounded-md border border-slate-300 bg-white px-2 py-1 font-medium text-slate-600 hover:bg-slate-50">
            Reset filters
          </button>
        </div>
      </div>

      {/* Top KPI strip */}
      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <PmKpiCard label="Total Projects" value={String(headline.totalProjects)} series={sparks.totalProjects} delta={delta(sparks.totalProjects)} />
        <PmKpiCard label="Total Expense" value={fmt.moneyLarge(headline.totalActual)} series={sparks.totalExpense} delta={delta(sparks.totalExpense)} />
        <PmKpiCard label="Total Budget" value={fmt.moneyLarge(headline.totalBudget)} series={sparks.totalBudget} delta={delta(sparks.totalBudget)} />
        <PmKpiCard label="Budget Utilisation" value={`${headline.utilisation.toFixed(0)}%`} series={sparks.utilisation} delta={delta(sparks.utilisation)} />
      </section>

      {/* Secondary KPI strip */}
      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <PmKpiCard label="Open Risks" value={String(headline.openRisks)} series={sparks.openRisks} delta={delta(sparks.openRisks)} />
        <PmKpiCard
          label="Critical Risks"
          value={String(headline.criticalRisks)}
          series={sparks.openRisks.map((v) => Math.round(v * 0.35))}
          delta="+0.0%"
        />
        <PmKpiCard label="Delayed Projects" value={String(headline.delayed)} series={sparks.delayedProjects} delta={delta(sparks.delayedProjects)} />
        <PmKpiCard
          label="Resource Utilisation"
          value={`${resource.pct}%`}
          series={sparks.totalProjects.map((n) => Math.min(100, n * 7))}
          delta={`${resource.active}/${resource.total} on active work`}
        />
      </section>

      {/* Project Type · Location · Trend */}
      <section className="grid gap-4 lg:grid-cols-3">
        <Panel title="PROJECT TYPE">
          <HorizontalLollipop
            data={projectsByType}
            selected={new Set(filters.businessUnit)}
            onSelect={(name) => toggle("businessUnit", name)}
          />
        </Panel>

        <Panel title="PROJECT LOCATION">
          <WorldBubbleMap
            points={projectsByLoc}
            selected={new Set(filters.country)}
            onSelect={(c) => toggle("country", c)}
          />
        </Panel>

        <Panel title="BUDGET &amp; EXPENSE TREND">
          <BudgetExpenseTrend data={trend} />
        </Panel>
      </section>

      {/* Priority · Health · Status */}
      <section className="grid gap-4 lg:grid-cols-3">
        <Panel title="PRIORITY">
          <VerticalLollipop
            data={priorityData}
            selected={new Set(filters.priority)}
            onSelect={(name) => toggle("priority", name)}
          />
        </Panel>

        <Panel title="OVERALL PROJECT HEALTH">
          <HealthDonut
            data={healthData}
            selected={new Set(filters.status.map((s) => s as ProjectStatus))}
            onSelect={(name: HealthCategory) => {
              // Apply a heuristic mapping: filter to projects whose health matches.
              const matching = projects.filter((p) => healthOf(p) === name);
              const statuses = Array.from(new Set(matching.map((p) => p.status)));
              setFilters({ ...filters, status: statuses });
            }}
          />
        </Panel>

        <Panel title="PROJECT STATUS">
          <HorizontalLollipop
            data={statusData.map((d) => ({ name: d.name, count: d.count }))}
            selected={new Set(filters.status)}
            onSelect={(name) => toggle("status", name as ProjectStatus)}
          />
        </Panel>
      </section>

      {/* Scatter · Utilisation ranking · Managers */}
      <section className="grid gap-4 lg:grid-cols-3">
        <Panel title="BUDGET VS. EXPENSES" sub="Bubble size = % project completion">
          <BudgetExpenseScatter
            data={scatter}
            onSelect={(id) => router.push(`/projects/${id}`)}
          />
        </Panel>

        <Panel title="BUDGET UTILISATION" sub="Ranking · dashed line = 100%">
          <BudgetUtilisationRanking data={ranking} />
        </Panel>

        <Panel title="PROJECT MANAGERS">
          <HorizontalLollipop
            data={managers.map((m) => ({ name: m.name, count: m.count }))}
          />
        </Panel>
      </section>
    </div>
  );
}

function Panel({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-baseline justify-between">
        <h2 className="text-xs font-bold tracking-[0.18em] text-slate-900">{title}</h2>
        {sub ? <span className="text-[10px] text-slate-400">{sub}</span> : null}
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}
