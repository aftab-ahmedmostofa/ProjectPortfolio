"use client";

import Link from "next/link";
import { useApp } from "@/components/AppProvider";
import { KpiCard } from "@/components/KpiCard";
import { StatusDonut, BudgetBySubsidiary, RiskByBusinessUnit } from "@/components/Charts";
import { CountryHeatmap } from "@/components/CountryHeatmap";
import { portfolioKpis, executiveInsights } from "@/lib/analytics";
import { formatCurrency, formatPercent } from "@/lib/format";

export default function DashboardPage() {
  const { projects } = useApp();
  const kpis = portfolioKpis(projects);
  const insights = executiveInsights(projects).slice(0, 3);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Portfolio Dashboard</h1>
        <p className="text-sm text-slate-500">
          Real-time view of cost, delivery, quality and risk across the portfolio.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard label="Total Projects" value={String(kpis.totalProjects)} sub={`${kpis.activeProjects} active`} />
        <KpiCard
          label="Budget Utilization"
          value={formatPercent(kpis.budgetUtilization)}
          sub={`${formatCurrency(kpis.totalActual)} / ${formatCurrency(kpis.totalBudget)}`}
          tone={kpis.budgetUtilization > 100 ? "bad" : kpis.budgetUtilization > 85 ? "warn" : "good"}
        />
        <KpiCard
          label="Delayed Projects"
          value={String(kpis.delayedProjects)}
          sub="vs planned schedule"
          tone={kpis.delayedProjects > 0 ? "warn" : "good"}
        />
        <KpiCard
          label="High Risk"
          value={String(kpis.highRiskProjects)}
          sub="AI risk score ≥ 60"
          tone={kpis.highRiskProjects > 0 ? "bad" : "good"}
        />
        <KpiCard
          label="Delivery Success"
          value={formatPercent(kpis.deliverySuccessRate)}
          sub="completed on budget"
          tone={kpis.deliverySuccessRate >= 80 ? "good" : "warn"}
        />
        <KpiCard
          label="Forecast Overrun"
          value={formatCurrency(kpis.forecastOverrun)}
          sub="AI projected, active"
          tone={kpis.forecastOverrun > 0 ? "bad" : "good"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card p-4">
          <h2 className="text-sm font-semibold text-slate-700">Status Distribution</h2>
          <StatusDonut projects={projects} />
        </div>
        <div className="card p-4 lg:col-span-2">
          <h2 className="text-sm font-semibold text-slate-700">Budget vs Actual vs AI Forecast (by Subsidiary)</h2>
          <BudgetBySubsidiary projects={projects} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card p-4 lg:col-span-2">
          <h2 className="text-sm font-semibold text-slate-700">Country Risk Heatmap</h2>
          <p className="mb-3 text-xs text-slate-500">Average AI risk score by country.</p>
          <CountryHeatmap projects={projects} />
        </div>
        <div className="card p-4">
          <h2 className="text-sm font-semibold text-slate-700">Avg Risk by Business Unit</h2>
          <RiskByBusinessUnit projects={projects} />
        </div>
      </div>

      <div className="card p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">✦ AI Executive Insights</h2>
          <Link href="/ai-insights" className="text-xs font-medium text-brand-600 hover:underline">
            View all →
          </Link>
        </div>
        <ul className="mt-3 space-y-2">
          {insights.map((line, i) => (
            <li key={i} className="flex gap-2 text-sm text-slate-700">
              <span className="text-brand-500">•</span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
