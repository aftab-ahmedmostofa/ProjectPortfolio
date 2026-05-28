"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useApp } from "@/components/AppProvider";
import { RiskBadge } from "@/components/ui";
import {
  assessRisk,
  forecastCost,
  forecastSchedule,
  detectAnomalies,
  executiveInsights,
} from "@/lib/analytics";
import { formatCurrency, formatDate } from "@/lib/format";

export default function AiInsightsPage() {
  const { projects } = useApp();
  const [brief, setBrief] = useState<string[]>(() => executiveInsights(projects));
  const [source, setSource] = useState<"azure-openai" | "heuristic">("heuristic");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch("/api/insights", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projects }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (Array.isArray(data.insights) && data.insights.length) setBrief(data.insights);
        setSource(data.source ?? "heuristic");
      })
      .catch(() => {
        if (!cancelled) setBrief(executiveInsights(projects));
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [projects]);

  const active = projects.filter((p) => p.status !== "Completed" && p.status !== "Cancelled");

  const costRows = active
    .map((p) => ({ p, f: forecastCost(p) }))
    .sort((a, b) => b.f.projectedOverrun - a.f.projectedOverrun);

  const delayRows = active
    .map((p) => ({ p, f: forecastSchedule(p) }))
    .sort((a, b) => b.f.predictedDelayDays - a.f.predictedDelayDays);

  const riskRows = [...projects]
    .map((p) => ({ p, r: assessRisk(p) }))
    .sort((a, b) => b.r.score - a.r.score);

  const anomalies = detectAnomalies(projects);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">AI Analytics</h1>
        <p className="text-sm text-slate-500">
          Predictive cost &amp; delay analysis, risk scoring, anomaly detection and executive insight generation.
        </p>
      </div>

      <div className="card p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">✦ Executive Brief</h2>
          <span className="badge bg-slate-100 text-slate-500">
            {loading ? "generating…" : source === "azure-openai" ? "Azure OpenAI" : "heuristic engine"}
          </span>
        </div>
        <ul className="mt-3 space-y-2">
          {brief.map((line, i) => (
            <li key={i} className="flex gap-2 text-sm text-slate-700">
              <span className="text-brand-500">•</span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-4">
          <h2 className="text-sm font-semibold text-slate-700">Predictive Cost Overrun</h2>
          <table className="mt-3 w-full text-sm">
            <thead className="text-left text-xs uppercase text-slate-400">
              <tr><th className="py-1">Project</th><th className="py-1 text-right">CPI</th><th className="py-1 text-right">Forecast</th><th className="py-1 text-right">Overrun</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {costRows.map(({ p, f }) => (
                <tr key={p.id}>
                  <td className="py-1.5"><ProjectLink id={p.id} name={p.name} /></td>
                  <td className={`py-1.5 text-right ${f.cpi < 1 ? "text-rose-600" : "text-emerald-600"}`}>{f.cpi.toFixed(2)}</td>
                  <td className="py-1.5 text-right text-slate-600">{formatCurrency(f.estimateAtCompletion)}</td>
                  <td className={`py-1.5 text-right font-medium ${f.projectedOverrun > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                    {f.projectedOverrun >= 0 ? "+" : ""}{formatCurrency(f.projectedOverrun)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card p-4">
          <h2 className="text-sm font-semibold text-slate-700">Delay Prediction</h2>
          <table className="mt-3 w-full text-sm">
            <thead className="text-left text-xs uppercase text-slate-400">
              <tr><th className="py-1">Project</th><th className="py-1 text-right">Progress gap</th><th className="py-1 text-right">Predicted finish</th><th className="py-1 text-right">Delay</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {delayRows.map(({ p, f }) => (
                <tr key={p.id}>
                  <td className="py-1.5"><ProjectLink id={p.id} name={p.name} /></td>
                  <td className="py-1.5 text-right text-slate-600">{f.progressGap > 0 ? `-${f.progressGap.toFixed(0)}` : `+${(-f.progressGap).toFixed(0)}`} pts</td>
                  <td className="py-1.5 text-right text-slate-600">{formatDate(f.predictedEndDate.toISOString())}</td>
                  <td className={`py-1.5 text-right font-medium ${f.predictedDelayDays > 7 ? "text-rose-600" : "text-emerald-600"}`}>
                    {Math.round(f.predictedDelayDays)}d
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-4">
          <h2 className="text-sm font-semibold text-slate-700">Risk Scoring</h2>
          <div className="mt-3 space-y-2">
            {riskRows.map(({ p, r }) => (
              <div key={p.id} className="flex items-center justify-between text-sm">
                <ProjectLink id={p.id} name={p.name} />
                <div className="flex items-center gap-3">
                  <span className="hidden text-xs text-slate-400 sm:inline">{r.drivers[0]}</span>
                  <RiskBadge level={r.level} score={r.score} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-4">
          <h2 className="text-sm font-semibold text-slate-700">Anomaly Detection</h2>
          <p className="mt-1 text-xs text-slate-500">Statistical outliers (≥1.5σ) on cost &amp; schedule variance.</p>
          <div className="mt-3 space-y-2">
            {anomalies.length === 0 ? (
              <p className="text-sm text-slate-400">No anomalies detected in the current scope.</p>
            ) : (
              anomalies.map((a, i) => (
                <div key={i} className="rounded-lg border border-rose-100 bg-rose-50 p-2 text-sm">
                  <div className="flex items-center justify-between">
                    <ProjectLink id={a.projectId} name={a.projectName} />
                    <span className="badge bg-rose-100 text-rose-700">{a.metric} · {a.zScore}σ</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-600">{a.reason}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ProjectLink({ id, name }: { id: string; name: string }) {
  return (
    <Link href={`/projects/${id}`} className="font-medium text-brand-700 hover:underline">
      {name}
    </Link>
  );
}
