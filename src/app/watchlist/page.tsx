"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useApp } from "@/components/AppProvider";
import { StatusBadge, RiskBadge, ProgressBar } from "@/components/ui";
import { WatchToggle } from "@/components/WatchToggle";
import { assessRisk, forecastCost, forecastSchedule } from "@/lib/analytics";
import { alertsForProject } from "@/lib/alerts";
import { formatCurrency, formatDate } from "@/lib/format";

export default function WatchlistPage() {
  const { allProjects, watchlist } = useApp();
  // Watchlist is intentionally NOT scoped by the dashboard filters — users want
  // to see everything they pinned, regardless of current filter state.
  const watched = useMemo(
    () => allProjects.filter((p) => watchlist.includes(p.id)),
    [allProjects, watchlist]
  );

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Watchlist</h1>
          <p className="text-sm text-slate-500">
            {watched.length} project(s) you&apos;re tracking. Watchlist persists in this browser.
          </p>
        </div>
      </div>

      {watched.length === 0 ? (
        <div className="card p-8 text-center text-sm text-slate-500">
          <div className="text-3xl">★</div>
          <p className="mt-2">Your watchlist is empty.</p>
          <p className="mt-1 text-xs text-slate-400">
            Open any project and tap the star icon to start watching it. Watched projects appear
            here with their open alerts.
          </p>
          <Link href="/projects" className="mt-3 inline-block text-sm text-brand-600 hover:underline">
            Browse projects →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {watched.map((p) => {
            const risk = assessRisk(p);
            const cost = forecastCost(p);
            const sched = forecastSchedule(p);
            const alerts = alertsForProject(allProjects, p.id);

            return (
              <div key={p.id} className="card p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <WatchToggle projectId={p.id} size="md" />
                      <Link href={`/projects/${p.id}`} className="text-base font-semibold text-brand-700 hover:underline">
                        {p.name}
                      </Link>
                      <StatusBadge status={p.status} />
                      <RiskBadge level={risk.level} score={risk.score} />
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {p.code} · {p.subsidiary} · {p.country} · PM {p.manager}
                    </div>
                  </div>
                  <div className="text-right text-xs text-slate-500">
                    Plan end {formatDate(p.plannedEndDate)}
                    <div className={sched.predictedDelayDays > 7 ? "text-rose-600" : "text-emerald-600"}>
                      Forecast {formatDate(sched.predictedEndDate.toISOString())} ({sched.predictedDelayDays > 0 ? "+" : ""}{Math.round(sched.predictedDelayDays)}d)
                    </div>
                  </div>
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <KV label="Progress">
                    <ProgressBar value={p.progress} tone={p.status === "Delayed" ? "amber" : "brand"} />
                    <div className="mt-1 text-xs text-slate-500">{p.progress}% complete</div>
                  </KV>
                  <KV label="Budget">
                    <div className="text-sm font-medium text-slate-800">{formatCurrency(p.budget)}</div>
                    <div className={`text-xs ${cost.projectedOverrun > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                      EAC {formatCurrency(cost.estimateAtCompletion)} · {cost.projectedOverrun >= 0 ? "+" : ""}{formatCurrency(cost.projectedOverrun)}
                    </div>
                  </KV>
                  <KV label="Open alerts">
                    {alerts.length === 0 ? (
                      <span className="text-sm text-emerald-600">None</span>
                    ) : (
                      <ul className="space-y-0.5">
                        {alerts.slice(0, 3).map((a) => (
                          <li key={a.id} className="truncate text-xs text-slate-600">
                            <span className={`mr-1 rounded px-1 py-0.5 text-[9px] font-semibold uppercase ${a.severity === "critical" ? "bg-rose-100 text-rose-700" : a.severity === "warn" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>
                              {a.severity}
                            </span>
                            {a.title}
                          </li>
                        ))}
                        {alerts.length > 3 ? <li className="text-[11px] text-slate-400">+ {alerts.length - 3} more</li> : null}
                      </ul>
                    )}
                  </KV>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function KV({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-1">{children}</div>
    </div>
  );
}
