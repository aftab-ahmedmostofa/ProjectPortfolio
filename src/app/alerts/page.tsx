"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useApp } from "@/components/AppProvider";
import { evaluateAlerts, ALERT_RULES, alertSeverityCounts } from "@/lib/alerts";
import { AlertSeverity } from "@/lib/types";

const SEV_STYLES: Record<AlertSeverity, string> = {
  critical: "bg-rose-100 text-rose-700 border-rose-200",
  warn: "bg-amber-100 text-amber-800 border-amber-200",
  info: "bg-slate-100 text-slate-600 border-slate-200",
};

export default function AlertsPage() {
  const { projects } = useApp();
  const [filter, setFilter] = useState<AlertSeverity | "all">("all");

  const alerts = useMemo(() => evaluateAlerts(projects), [projects]);
  const counts = alertSeverityCounts(alerts);
  const visible = filter === "all" ? alerts : alerts.filter((a) => a.severity === filter);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Alerts &amp; Reminders</h1>
          <p className="text-sm text-slate-500">
            Rule-based portfolio alerts. {alerts.length} active across the {projects.length}{" "}
            project(s) in scope.
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <Pill label={`All ${alerts.length}`} active={filter === "all"} onClick={() => setFilter("all")} />
          <Pill label={`Critical ${counts.critical}`} active={filter === "critical"} onClick={() => setFilter("critical")} tone="critical" />
          <Pill label={`Warn ${counts.warn}`} active={filter === "warn"} onClick={() => setFilter("warn")} tone="warn" />
          <Pill label={`Info ${counts.info}`} active={filter === "info"} onClick={() => setFilter("info")} tone="info" />
        </div>
      </div>

      <div className="card divide-y divide-slate-100">
        {visible.length === 0 ? (
          <div className="p-6 text-center text-sm text-slate-400">No alerts at this severity.</div>
        ) : (
          visible.map((a) => (
            <Link
              key={a.id}
              href={`/projects/${a.projectId}`}
              className="flex items-start gap-3 p-3 hover:bg-slate-50"
            >
              <span className={`mt-0.5 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${SEV_STYLES[a.severity]}`}>
                {a.severity}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className="font-medium text-slate-800">{a.title}</span>
                  <span className="text-xs text-slate-400">· {a.projectName}</span>
                </div>
                <p className="mt-0.5 text-sm text-slate-600">{a.message}</p>
              </div>
              <span className="hidden text-[10px] text-slate-400 sm:inline">rule: {a.rule}</span>
            </Link>
          ))
        )}
      </div>

      <details className="card p-3 text-sm">
        <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-slate-500">
          Active alert rules ({ALERT_RULES.length})
        </summary>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {ALERT_RULES.map((r) => (
            <li key={r.id} className="rounded-lg border border-slate-100 p-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">{r.title}</span>
                <span className={`badge ${SEV_STYLES[r.severity]}`}>{r.severity}</span>
              </div>
              <p className="mt-1 text-xs text-slate-500">{r.description}</p>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}

function Pill({ label, active, onClick, tone }: { label: string; active: boolean; onClick: () => void; tone?: "critical" | "warn" | "info" }) {
  const base = "rounded-full border px-2.5 py-1 font-medium transition-colors";
  const palette = tone === "critical" ? "border-rose-300 text-rose-700" : tone === "warn" ? "border-amber-300 text-amber-700" : tone === "info" ? "border-slate-300 text-slate-600" : "border-slate-300 text-slate-600";
  const cls = active ? "bg-slate-900 text-white border-slate-900" : `bg-white ${palette} hover:bg-slate-50`;
  return (
    <button type="button" onClick={onClick} className={`${base} ${cls}`}>
      {label}
    </button>
  );
}
