"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useApp } from "@/components/AppProvider";
import { KpiCard } from "@/components/KpiCard";

// recharts is heavy (~5 MB package). Load each chart lazily so its code stays
// out of the dashboard's First Load JS — the KPI strip paints immediately and
// charts stream in just below the fold.
const chartLoading = () => <div className="h-[220px] w-full animate-pulse rounded bg-slate-100" />;
const StatusDistributionChart = dynamic(
  () => import("@/components/dashboard/DashCharts").then((m) => m.StatusDistributionChart),
  { ssr: false, loading: chartLoading }
);
const BudgetSubsidiaryChart = dynamic(
  () => import("@/components/dashboard/DashCharts").then((m) => m.BudgetSubsidiaryChart),
  { ssr: false, loading: chartLoading }
);
const RiskByBuChart = dynamic(
  () => import("@/components/dashboard/DashCharts").then((m) => m.RiskByBuChart),
  { ssr: false, loading: chartLoading }
);
const CountryRiskChart = dynamic(
  () => import("@/components/dashboard/DashCharts").then((m) => m.CountryRiskChart),
  { ssr: false, loading: chartLoading }
);
const DeliveryPipelineChart = dynamic(
  () => import("@/components/dashboard/DashCharts").then((m) => m.DeliveryPipelineChart),
  { ssr: false, loading: chartLoading }
);
import { TopAtRiskPanel } from "@/components/TopAtRiskPanel";
import { ApprovalQueueWidget } from "@/components/ApprovalQueueWidget";
import { ChartTypeSelector, ChartKind } from "@/components/pm/ChartTypeSelector";
import { useChartKind } from "@/components/pm/useChartKind";
import {
  portfolioKpis,
  executiveInsights,
  forecastCost,
} from "@/lib/analytics";
import { evaluateAlerts, alertSeverityCounts } from "@/lib/alerts";
import { formatCurrency, formatPercent } from "@/lib/format";

const BUDGET_OPTIONS = ["bars", "line", "area", "treemap"] as const satisfies readonly ChartKind[];
const STATUS_OPTIONS = ["donut", "pie", "bar", "treemap"] as const satisfies readonly ChartKind[];
const COUNTRY_OPTIONS = ["heatmap", "bar", "treemap"] as const satisfies readonly ChartKind[];
const RISKBU_OPTIONS = ["bar", "lollipop", "donut", "treemap"] as const satisfies readonly ChartKind[];
const PIPELINE_OPTIONS = ["bar", "line", "area", "lollipop"] as const satisfies readonly ChartKind[];

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

  const alertCounts = alertSeverityCounts(evaluateAlerts(projects));
  const totalAlerts = alertCounts.critical + alertCounts.warn + alertCounts.info;

  const [budgetKind, setBudgetKind] = useChartKind("dash.budget", "bars", BUDGET_OPTIONS);
  const [statusKind, setStatusKind] = useChartKind("dash.status", "donut", STATUS_OPTIONS);
  const [countryKind, setCountryKind] = useChartKind("dash.country", "heatmap", COUNTRY_OPTIONS);
  const [riskBuKind, setRiskBuKind] = useChartKind("dash.riskbu", "bar", RISKBU_OPTIONS);
  const [pipelineKind, setPipelineKind] = useChartKind("dash.pipeline", "bar", PIPELINE_OPTIONS);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Portfolio Dashboard</h1>
          <p className="text-sm text-slate-500">
            Real-time view of cost, delivery, quality and risk across the portfolio.
          </p>
        </div>
        <Link href="/alerts" className="flex items-center gap-2 text-xs">
          {totalAlerts === 0 ? (
            <span className="badge bg-emerald-50 text-emerald-700">All systems nominal</span>
          ) : (
            <>
              {alertCounts.critical > 0 ? (
                <span className="badge bg-rose-100 text-rose-700">● {alertCounts.critical} critical</span>
              ) : null}
              {alertCounts.warn > 0 ? (
                <span className="badge bg-amber-100 text-amber-800">● {alertCounts.warn} warn</span>
              ) : null}
              {alertCounts.info > 0 ? (
                <span className="badge bg-slate-100 text-slate-600">● {alertCounts.info} info</span>
              ) : null}
              <span className="text-brand-600 hover:underline">View alerts →</span>
            </>
          )}
        </Link>
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
        <ChartPanel
          title="Budget vs Actual vs AI Forecast"
          sub="Totals by subsidiary, in $M."
          colSpan={2}
          kind={budgetKind}
          onKindChange={setBudgetKind}
          options={[...BUDGET_OPTIONS]}
        >
          <BudgetSubsidiaryChart projects={projects} kind={budgetKind} />
        </ChartPanel>

        <ChartPanel
          title="Status Distribution"
          sub="Count of projects by lifecycle stage."
          kind={statusKind}
          onKindChange={setStatusKind}
          options={[...STATUS_OPTIONS]}
        >
          <StatusDistributionChart projects={projects} kind={statusKind} />
        </ChartPanel>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <ChartPanel
          title="Country Risk"
          sub="Average AI risk score by country."
          colSpan={2}
          kind={countryKind}
          onKindChange={setCountryKind}
          options={[...COUNTRY_OPTIONS]}
        >
          <CountryRiskChart projects={projects} kind={countryKind} />
        </ChartPanel>

        <ChartPanel
          title="Avg Risk by Business Unit"
          sub="Composite 0–100 score."
          kind={riskBuKind}
          onKindChange={setRiskBuKind}
          options={[...RISKBU_OPTIONS]}
        >
          <RiskByBuChart projects={projects} kind={riskBuKind} />
        </ChartPanel>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="card p-4">
          <SectionTitle>Top At-Risk Projects</SectionTitle>
          <p className="text-xs text-slate-500">Ranked by composite AI risk score.</p>
          <div className="mt-2">
            <TopAtRiskPanel projects={projects} />
          </div>
        </div>
        <ChartPanel
          title="Delivery Pipeline"
          sub="Projects ending per quarter."
          kind={pipelineKind}
          onKindChange={setPipelineKind}
          options={[...PIPELINE_OPTIONS]}
        >
          <DeliveryPipelineChart projects={projects} kind={pipelineKind} />
        </ChartPanel>
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

function ChartPanel({
  title,
  sub,
  colSpan,
  kind,
  onKindChange,
  options,
  children,
}: {
  title: string;
  sub?: string;
  colSpan?: number;
  kind: ChartKind;
  onKindChange: (k: ChartKind) => void;
  options: ChartKind[];
  children: React.ReactNode;
}) {
  return (
    <div className={`card p-4 ${colSpan === 2 ? "lg:col-span-2" : ""}`}>
      <div className="flex items-center justify-between gap-2">
        <div>
          <SectionTitle>{title}</SectionTitle>
          {sub ? <p className="text-xs text-slate-500">{sub}</p> : null}
        </div>
        <ChartTypeSelector options={options} value={kind} onChange={onKindChange} />
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}
