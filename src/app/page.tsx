"use client";

import Link from "next/link";
import { useApp } from "@/components/AppProvider";
import { KpiCard } from "@/components/KpiCard";
import { StatusDonut, BudgetBySubsidiary, RiskByBusinessUnit } from "@/components/Charts";
import { CountryHeatmap } from "@/components/CountryHeatmap";
import { TopAtRiskPanel } from "@/components/TopAtRiskPanel";
import { ApprovalQueueWidget } from "@/components/ApprovalQueueWidget";
import { DeliveryPipeline } from "@/components/DeliveryPipeline";
import {
  portfolioKpis,
  executiveInsights,
  forecastCost,
} from "@/lib/analytics";
import { formatCurrency, formatPercent } from "@/lib/format";

export default function DashboardPage() {
  const { projects } = useApp();
  const kpis = portfolioKpis(projects);
  const insights = executiveInsights(projects).slice(0, 4);

  const active = projects.filter((p) => p.status !== "Completed" && p.status !== "Cancelled");
  const cpiValues = active.map((p) => forecastCost(p).cpi).filter((v) => Number.isFinite(v) && v > 0);
  const avgCpi = cpiValues.length > 0 ? cpiValues.reduce((s, v) => s + v, 0) / cpiValues.length : 1;

  const pendingApprovals = projects.filter((p) =>
    p.approvals.some((a) => a.decision === "Pending") &&
    !p.approvals.some((a) => a.decision === "Rejected")
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Portfolio Dashboard</h1>
          <p className="text-sm text-slate-500">
            Real-time view of cost, delivery, quality and risk across the portfolio.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="badge bg-emerald-50 text-emerald-700">All systems nominal</span>
        </div>
      </div>

      <section aria-label="Key performance indicators" className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard
          label="Total Projects"
          value={String(kpis.totalProjects)}
          sub={`${kpis.activeProjects} active`}
        />
        <KpiCard
          label="Total Budget"
          value={formatCurrency(kpis.totalBudget)}
          sub={`${formatCurrency(kpis.totalActual)} spent`}
        />
        <KpiCard
          label="Budget Utilization"
          value={formatPercent(kpis.budgetUtilization)}
          sub="actual / approved"
          tone={kpis.budgetUtilization > 100 ? "bad" : kpis.budgetUtilization > 85 ? "warn" : "good"}
        />
        <KpiCard
          label="AI Forecast Overrun"
          value={formatCurrency(kpis.forecastOverrun)}
          sub="active projects, EAC"
          tone={kpis.forecastOverrun > 0 ? "bad" : "good"}
        />
        <KpiCard
          label="Delayed"
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
          label="Avg Cost Performance"
          value={avgCpi.toFixed(2)}
          sub={avgCpi < 1 ? "below target (1.00)" : "on/under budget"}
          tone={avgCpi < 0.9 ? "bad" : avgCpi < 1 ? "warn" : "good"}
        />
        <KpiCard
          label="Pending Approvals"
          value={String(pendingApprovals)}
          sub="projects awaiting decision"
          tone={pendingApprovals > 0 ? "warn" : "good"}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="card p-4 lg:col-span-2">
          <SectionTitle>Budget vs Actual vs AI Forecast</SectionTitle>
          <p className="text-xs text-slate-500">Totals by subsidiary, in $M.</p>
          <BudgetBySubsidiary projects={projects} />
        </div>
        <div className="card p-4">
          <SectionTitle>Status Distribution</SectionTitle>
          <p className="text-xs text-slate-500">Count of projects by lifecycle stage.</p>
          <StatusDonut projects={projects} />
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="card p-4 lg:col-span-2">
          <SectionTitle>Country Risk Heatmap</SectionTitle>
          <p className="text-xs text-slate-500">Average AI risk score by country.</p>
          <div className="mt-3">
            <CountryHeatmap projects={projects} />
          </div>
        </div>
        <div className="card p-4">
          <SectionTitle>Avg Risk by Business Unit</SectionTitle>
          <p className="text-xs text-slate-500">Composite 0–100 score.</p>
          <RiskByBusinessUnit projects={projects} />
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="card p-4">
          <SectionTitle>Top At-Risk Projects</SectionTitle>
          <p className="text-xs text-slate-500">Ranked by composite AI risk score.</p>
          <div className="mt-2">
            <TopAtRiskPanel projects={projects} />
          </div>
        </div>
        <div className="card p-4">
          <SectionTitle>Delivery Pipeline</SectionTitle>
          <p className="text-xs text-slate-500">Projects ending per quarter.</p>
          <DeliveryPipeline projects={projects} />
        </div>
        <div className="card p-4">
          <SectionTitle>Approval Queue</SectionTitle>
          <p className="text-xs text-slate-500">Multi-level Go / No-Go gates.</p>
          <div className="mt-2">
            <ApprovalQueueWidget projects={projects} />
          </div>
        </div>
      </section>

      <section className="card p-4">
        <div className="flex items-center justify-between">
          <SectionTitle>✦ AI Executive Insights</SectionTitle>
          <Link href="/ai-insights" className="text-xs font-medium text-brand-600 hover:underline">
            Full brief →
          </Link>
        </div>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {insights.map((line, i) => (
            <li key={i} className="flex gap-2 rounded-lg border border-slate-100 bg-slate-50/60 p-2.5 text-sm text-slate-700">
              <span className="text-brand-500">•</span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-semibold text-slate-700">{children}</h2>;
}
