"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useApp } from "@/components/AppProvider";
import { StatusBadge, RiskBadge, DecisionBadge, ProgressBar } from "@/components/ui";
import { WatchToggle } from "@/components/WatchToggle";
import { ProjectTimeline } from "@/components/Timeline";
import {
  assessRisk,
  forecastCost,
  forecastSchedule,
  projectNarrative,
} from "@/lib/analytics";
import { alertsForProject } from "@/lib/alerts";
import { formatCurrency, formatDate, formatPercent } from "@/lib/format";

export default function ProjectDetailPage() {
  const params = useParams();
  const { allProjects } = useApp();
  const project = allProjects.find((p) => p.id === params.id);
  const alerts = project ? alertsForProject(allProjects, project.id) : [];

  if (!project) {
    return (
      <div className="card p-8 text-center">
        <p className="text-slate-600">Project not found or outside your access scope.</p>
        <Link href="/projects" className="mt-3 inline-block text-sm text-brand-600 hover:underline">
          ← Back to projects
        </Link>
      </div>
    );
  }

  const cost = forecastCost(project);
  const schedule = forecastSchedule(project);
  const risk = assessRisk(project);

  return (
    <div className="space-y-5">
      <Link href="/projects" className="text-sm text-brand-600 hover:underline">
        ← Projects
      </Link>

      <div className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <WatchToggle projectId={project.id} size="md" />
              <h1 className="text-xl font-semibold text-slate-900">{project.name}</h1>
              <StatusBadge status={project.status} />
              <RiskBadge level={risk.level} score={risk.score} />
            </div>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">{project.description}</p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
              <span>{project.code}</span>
              <span>{project.subsidiary} · {project.businessUnit}</span>
              <span>{project.country}</span>
              <span>PM: {project.manager}</span>
              <span>{formatDate(project.startDate)} → {formatDate(project.plannedEndDate)}</span>
            </div>
          </div>
        </div>
        <div className="mt-4 rounded-lg bg-brand-50 p-3 text-sm text-brand-900">
          <span className="font-semibold">✦ AI summary: </span>
          {projectNarrative(project)}
        </div>
      </div>

      <div className="card p-4">
        <h2 className="text-sm font-semibold text-slate-700">Timeline · Planned vs Actual</h2>
        <p className="mt-1 text-xs text-slate-500">
          Plan (grey) vs physical progress (blue) vs AI-forecast finish (red if past plan). Dots are milestones.
        </p>
        <div className="mt-4">
          <ProjectTimeline project={project} />
        </div>
      </div>

      {alerts.length > 0 ? (
        <div className="card p-4">
          <h2 className="text-sm font-semibold text-slate-700">Open alerts ({alerts.length})</h2>
          <ul className="mt-3 space-y-1.5">
            {alerts.map((a) => (
              <li key={a.id} className="flex items-start gap-2 rounded-lg border border-slate-100 p-2 text-sm">
                <span className={`mt-0.5 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${a.severity === "critical" ? "bg-rose-100 text-rose-700 border-rose-200" : a.severity === "warn" ? "bg-amber-100 text-amber-800 border-amber-200" : "bg-slate-100 text-slate-600 border-slate-200"}`}>
                  {a.severity}
                </span>
                <div>
                  <div className="font-medium text-slate-700">{a.title}</div>
                  <div className="text-xs text-slate-500">{a.message}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="card p-4">
          <h2 className="text-sm font-semibold text-slate-700">Cost Forecast</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <Row label="Approved budget" value={formatCurrency(project.budget)} />
            <Row label="Actual to date" value={formatCurrency(project.actualCost)} />
            <Row label="Cost performance (CPI)" value={cost.cpi.toFixed(2)} tone={cost.cpi < 1 ? "bad" : "good"} />
            <Row label="Forecast at completion" value={formatCurrency(cost.estimateAtCompletion)} />
            <Row
              label="Projected overrun"
              value={`${cost.projectedOverrun >= 0 ? "+" : ""}${formatCurrency(cost.projectedOverrun)}`}
              tone={cost.projectedOverrun > 0 ? "bad" : "good"}
            />
          </dl>
        </div>

        <div className="card p-4">
          <h2 className="text-sm font-semibold text-slate-700">Schedule Forecast</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <Row label="Actual progress" value={formatPercent(project.progress)} />
            <Row label="Expected (plan)" value={formatPercent(schedule.expectedProgress)} />
            <Row
              label="Progress gap"
              value={`${schedule.progressGap > 0 ? "-" : "+"}${Math.abs(schedule.progressGap).toFixed(0)} pts`}
              tone={schedule.progressGap > 5 ? "bad" : "good"}
            />
            <Row label="Predicted finish" value={formatDate(schedule.predictedEndDate.toISOString())} />
            <Row
              label="Predicted delay"
              value={`${Math.round(schedule.predictedDelayDays)} days`}
              tone={schedule.predictedDelayDays > 7 ? "bad" : "good"}
            />
          </dl>
        </div>

        <div className="card p-4">
          <h2 className="text-sm font-semibold text-slate-700">Risk Assessment</h2>
          <div className="mt-3 text-3xl font-bold text-slate-900">{risk.score}<span className="text-base text-slate-400">/100</span></div>
          <div className="mt-1"><RiskBadge level={risk.level} score={risk.score} /></div>
          <ul className="mt-3 space-y-1 text-xs text-slate-600">
            {risk.drivers.map((d, i) => (
              <li key={i} className="flex gap-1.5"><span className="text-brand-500">•</span>{d}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-4">
          <h2 className="text-sm font-semibold text-slate-700">Milestones</h2>
          <div className="mt-3 space-y-3">
            {project.milestones.length === 0 ? (
              <p className="text-sm text-slate-400">No milestones defined yet.</p>
            ) : (
              project.milestones.map((m) => (
                <div key={m.id}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-700">{m.name}</span>
                    <span className="text-xs text-slate-400">{formatDate(m.dueDate)} · {m.status}</span>
                  </div>
                  <div className="mt-1">
                    <ProgressBar
                      value={m.completion}
                      tone={m.status === "Missed" ? "rose" : m.status === "Done" ? "emerald" : "brand"}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card p-4">
          <h2 className="text-sm font-semibold text-slate-700">Risk Register</h2>
          <div className="mt-3 space-y-2">
            {project.risks.length === 0 ? (
              <p className="text-sm text-slate-400">No open risks recorded.</p>
            ) : (
              project.risks.map((r) => (
                <div key={r.id} className="rounded-lg border border-slate-100 p-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-700">{r.description}</span>
                    <span className={`badge ${severityTone(r.severity)}`}>{r.severity}</span>
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    Likelihood {formatPercent(r.likelihood * 100)} · {r.open ? "Open" : "Closed"} · Mitigation: {r.mitigation}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="card p-4">
        <h2 className="text-sm font-semibold text-slate-700">Approval Trail</h2>
        <div className="mt-3 space-y-2">
          {project.approvals.map((a) => (
            <div key={a.level} className="flex items-center justify-between rounded-lg border border-slate-100 p-2 text-sm">
              <div>
                <span className="font-medium text-slate-700">Level {a.level} · {a.role}</span>
                <div className="text-xs text-slate-400">
                  {a.approver}
                  {a.decidedAt ? ` · ${formatDate(a.decidedAt)}` : ""}
                  {a.comment ? ` · "${a.comment}"` : ""}
                </div>
              </div>
              <DecisionBadge decision={a.decision} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: "good" | "bad" }) {
  const color = tone === "bad" ? "text-rose-600" : tone === "good" ? "text-emerald-600" : "text-slate-800";
  return (
    <div className="flex items-center justify-between">
      <dt className="text-slate-500">{label}</dt>
      <dd className={`font-medium ${color}`}>{value}</dd>
    </div>
  );
}

function severityTone(s: string): string {
  return {
    Low: "bg-emerald-100 text-emerald-700",
    Medium: "bg-amber-100 text-amber-800",
    High: "bg-orange-100 text-orange-800",
    Critical: "bg-rose-100 text-rose-700",
  }[s] ?? "bg-slate-100 text-slate-700";
}
