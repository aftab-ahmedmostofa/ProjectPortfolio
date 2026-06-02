"use client";

import { Project, RISK_STATUSES, RiskStatus, Severity } from "@/lib/types";
import { useApp } from "./AppProvider";
import { statusTone, severityTone } from "@/lib/risks";

interface Aggregates {
  totalActive: number;
  highRisk: number;
  critical: number;
  byStatus: Record<RiskStatus, number>;
  byOwner: { name: string; count: number; ownerId?: string }[];
  bySeverity: Record<Severity, number>;
}

function aggregate(projects: Project[], getMemberName: (id?: string) => string): Aggregates {
  const byStatus: Record<RiskStatus, number> = { Open: 0, "In Progress": 0, Mitigated: 0, Accepted: 0, Closed: 0 };
  const bySeverity: Record<Severity, number> = { Low: 0, Medium: 0, High: 0, Critical: 0 };
  const ownerCounts = new Map<string, { name: string; count: number; ownerId?: string }>();
  let totalActive = 0;
  let critical = 0;
  let highRisk = 0;
  for (const p of projects) {
    for (const r of p.risks) {
      if (r.deletedAt) continue;
      byStatus[r.status]++;
      bySeverity[r.severity]++;
      if (r.status !== "Closed") totalActive++;
      if (r.severity === "Critical") critical++;
      if ((r.severity === "Critical" || r.severity === "High") && r.status !== "Closed") highRisk++;
      const key = r.ownerId ?? "__unassigned";
      const name = r.ownerId ? getMemberName(r.ownerId) : "Unassigned";
      const cur = ownerCounts.get(key) ?? { name, count: 0, ownerId: r.ownerId };
      cur.count++;
      ownerCounts.set(key, cur);
    }
  }
  const byOwner = Array.from(ownerCounts.values()).sort((a, b) => b.count - a.count);
  return { totalActive, highRisk, critical, byStatus, byOwner, bySeverity };
}

export function RiskDashboardStats({ projects, title = "Risk dashboard" }: { projects: Project[]; title?: string }) {
  const { getMember } = useApp();
  const stats = aggregate(projects, (id) => (id ? getMember(id)?.name ?? id : "Unassigned"));
  const maxStatus = Math.max(1, ...Object.values(stats.byStatus));
  const maxOwner = Math.max(1, ...stats.byOwner.map((o) => o.count));

  return (
    <section className="space-y-4">
      <h2 className="text-sm font-semibold text-slate-700">{title}</h2>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Total open risks" value={stats.totalActive} tone="neutral" sub="excludes Closed" />
        <Stat label="High + Critical" value={stats.highRisk} tone={stats.highRisk > 0 ? "bad" : "good"} sub="active risks" />
        <Stat label="Critical (any status)" value={stats.critical} tone={stats.critical > 0 ? "bad" : "good"} sub="across portfolio" />
        <Stat
          label="Risks by severity"
          value={`${stats.bySeverity.Critical}C · ${stats.bySeverity.High}H · ${stats.bySeverity.Medium}M · ${stats.bySeverity.Low}L`}
          tone="neutral"
          sub="all non-deleted"
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="card p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Risks by status</h3>
          <ul className="mt-3 space-y-2">
            {RISK_STATUSES.map((s) => {
              const count = stats.byStatus[s];
              const pct = (count / maxStatus) * 100;
              return (
                <li key={s} className="flex items-center gap-3 text-sm">
                  <span className={`badge border ${statusTone(s)}`}>{s}</span>
                  <div className="flex-1">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-brand-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <span className="w-8 text-right text-xs font-medium text-slate-700">{count}</span>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="card p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Risks by owner</h3>
          <ul className="mt-3 space-y-2">
            {stats.byOwner.length === 0 ? (
              <li className="text-sm text-slate-400">No risks recorded.</li>
            ) : (
              stats.byOwner.map((o) => {
                const pct = (o.count / maxOwner) * 100;
                return (
                  <li key={o.name} className="flex items-center gap-3 text-sm">
                    <span className="w-32 shrink-0 truncate text-slate-700" title={o.name}>{o.name}</span>
                    <div className="flex-1">
                      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                        <div className={`h-full rounded-full ${o.ownerId ? "bg-emerald-500" : "bg-slate-400"}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <span className="w-8 text-right text-xs font-medium text-slate-700">{o.count}</span>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value, sub, tone }: { label: string; value: number | string; sub: string; tone: "neutral" | "good" | "bad" }) {
  const accent = { neutral: "bg-slate-300", good: "bg-emerald-500", bad: "bg-rose-500" }[tone];
  const text = { neutral: "text-slate-900", good: "text-emerald-600", bad: "text-rose-600" }[tone];
  return (
    <div className="card relative overflow-hidden p-4">
      <span className={`absolute inset-y-0 left-0 w-1 ${accent}`} aria-hidden />
      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-1 text-2xl font-semibold ${text}`}>{value}</div>
      <div className="mt-1 text-[11px] text-slate-500">{sub}</div>
    </div>
  );
}
