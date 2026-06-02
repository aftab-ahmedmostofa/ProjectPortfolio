"use client";

import Link from "next/link";
import { Project } from "@/lib/types";
import { TODAY } from "@/lib/data";
import { forecastSchedule } from "@/lib/analytics";
import { formatDate } from "@/lib/format";

const DAY_MS = 86_400_000;

function pct(date: number, start: number, end: number) {
  if (end <= start) return 0;
  return Math.max(0, Math.min(100, ((date - start) / (end - start)) * 100));
}

// Single-project timeline showing planned, actual-progress, predicted finish, and milestones.
export function ProjectTimeline({ project }: { project: Project }) {
  const start = new Date(project.startDate).getTime();
  const plannedEnd = new Date(project.plannedEndDate).getTime();
  const sched = forecastSchedule(project);
  const predictedEnd = sched.predictedEndDate.getTime();
  const today = TODAY.getTime();

  const rangeStart = start;
  const rangeEnd = Math.max(plannedEnd, predictedEnd, today) + 14 * DAY_MS;

  const plannedLeft = pct(start, rangeStart, rangeEnd);
  const plannedWidth = pct(plannedEnd, rangeStart, rangeEnd) - plannedLeft;

  // Actual progress: how far the linear plan would have advanced based on physical %.
  const planSpan = plannedEnd - start;
  const actualEnd = start + (planSpan * project.progress) / 100;
  const actualWidth = pct(actualEnd, rangeStart, rangeEnd) - plannedLeft;

  const predictedLeft = pct(plannedEnd, rangeStart, rangeEnd);
  const predictedWidth = Math.max(0, pct(predictedEnd, rangeStart, rangeEnd) - predictedLeft);

  const todayPos = pct(today, rangeStart, rangeEnd);
  const late = predictedEnd > plannedEnd;

  return (
    <div className="text-xs">
      <div className="relative h-12">
        {/* Planned bar */}
        <div
          className="absolute top-2 h-3 rounded-full bg-slate-200"
          style={{ left: `${plannedLeft}%`, width: `${plannedWidth}%` }}
          title={`Planned: ${formatDate(project.startDate)} → ${formatDate(project.plannedEndDate)}`}
        />
        {/* Actual progress fill */}
        <div
          className="absolute top-2 h-3 rounded-full bg-brand-500"
          style={{ left: `${plannedLeft}%`, width: `${Math.max(0.5, actualWidth)}%` }}
          title={`Actual progress: ${project.progress}%`}
        />
        {/* Forecast overrun segment (if any) */}
        {late ? (
          <div
            className="absolute top-2 h-3 rounded-full bg-rose-400/80"
            style={{ left: `${predictedLeft}%`, width: `${Math.max(0.5, predictedWidth)}%` }}
            title={`Forecast end: ${formatDate(sched.predictedEndDate.toISOString())}`}
          />
        ) : null}

        {/* Milestones */}
        {project.milestones.map((m) => {
          const x = pct(new Date(m.dueDate).getTime(), rangeStart, rangeEnd);
          const color = m.status === "Missed" ? "bg-rose-500" : m.status === "Done" ? "bg-emerald-500" : m.status === "In Progress" ? "bg-brand-500" : "bg-slate-400";
          return (
            <span
              key={m.id}
              className={`absolute -top-0.5 h-4 w-4 -translate-x-1/2 rounded-full border-2 border-white shadow-sm ${color}`}
              style={{ left: `${x}%` }}
              title={`${m.name} · ${m.status} · ${formatDate(m.dueDate)}`}
            />
          );
        })}

        {/* Today line */}
        <div className="absolute inset-y-0 w-px bg-slate-900/40" style={{ left: `${todayPos}%` }} title="Today" />
        <div className="absolute -top-0.5 -translate-x-1/2 rounded bg-slate-900 px-1 py-0.5 text-[10px] font-medium text-white" style={{ left: `${todayPos}%` }}>
          today
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
        <span><span className="inline-block h-2 w-3 rounded-sm bg-slate-200 align-middle" /> Plan</span>
        <span><span className="inline-block h-2 w-3 rounded-sm bg-brand-500 align-middle" /> Actual progress</span>
        {late ? <span><span className="inline-block h-2 w-3 rounded-sm bg-rose-400 align-middle" /> Forecast slip</span> : null}
        <span>Start {formatDate(project.startDate)}</span>
        <span>Planned end {formatDate(project.plannedEndDate)}</span>
        <span className={late ? "text-rose-600" : "text-emerald-600"}>
          Predicted {formatDate(sched.predictedEndDate.toISOString())}
          {late ? ` (+${Math.round(sched.predictedDelayDays)}d)` : ""}
        </span>
      </div>
    </div>
  );
}

// Portfolio-level gantt: one row per project, shared time scale.
export function PortfolioTimeline({ projects }: { projects: Project[] }) {
  if (projects.length === 0) {
    return <p className="text-sm text-slate-400">No projects in scope.</p>;
  }
  const starts = projects.map((p) => new Date(p.startDate).getTime());
  const plannedEnds = projects.map((p) => new Date(p.plannedEndDate).getTime());
  const predictedEnds = projects.map((p) => forecastSchedule(p).predictedEndDate.getTime());

  const rangeStart = Math.min(...starts);
  const rangeEnd = Math.max(...plannedEnds, ...predictedEnds, TODAY.getTime()) + 14 * DAY_MS;

  // Year tick marks across the timeline.
  const startYear = new Date(rangeStart).getUTCFullYear();
  const endYear = new Date(rangeEnd).getUTCFullYear();
  const yearTicks: { year: number; x: number }[] = [];
  for (let y = startYear; y <= endYear; y++) {
    const ts = Date.UTC(y, 0, 1);
    if (ts < rangeStart || ts > rangeEnd) continue;
    yearTicks.push({ year: y, x: pct(ts, rangeStart, rangeEnd) });
  }
  const todayPos = pct(TODAY.getTime(), rangeStart, rangeEnd);

  const sorted = [...projects].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

  return (
    <div className="space-y-1">
      <div className="relative h-6 border-b border-slate-200">
        {yearTicks.map((t) => (
          <span key={t.year} className="absolute -bottom-0.5 -translate-x-1/2 text-[11px] text-slate-500" style={{ left: `${t.x}%` }}>
            {t.year}
          </span>
        ))}
        <div className="absolute inset-y-0 w-px bg-slate-900/30" style={{ left: `${todayPos}%` }} />
      </div>

      <div className="divide-y divide-slate-100">
        {sorted.map((p) => {
          const start = new Date(p.startDate).getTime();
          const plannedEnd = new Date(p.plannedEndDate).getTime();
          const sched = forecastSchedule(p);
          const predictedEnd = sched.predictedEndDate.getTime();
          const plannedLeft = pct(start, rangeStart, rangeEnd);
          const plannedWidth = pct(plannedEnd, rangeStart, rangeEnd) - plannedLeft;
          const planSpan = plannedEnd - start;
          const actualEnd = start + (planSpan * p.progress) / 100;
          const actualWidth = pct(actualEnd, rangeStart, rangeEnd) - plannedLeft;
          const predictedLeft = pct(plannedEnd, rangeStart, rangeEnd);
          const predictedWidth = Math.max(0, pct(predictedEnd, rangeStart, rangeEnd) - predictedLeft);
          const late = predictedEnd > plannedEnd;

          return (
            <Link key={p.id} href={`/projects/${p.id}`} className="group flex items-center gap-2 py-1.5 text-xs hover:bg-slate-50">
              <div className="w-44 shrink-0 truncate pr-2 text-slate-700 group-hover:text-brand-700">
                <div className="truncate font-medium">{p.name}</div>
                <div className="truncate text-[10px] text-slate-400">{p.subsidiary} · {p.country}</div>
              </div>
              <div className="relative h-5 flex-1">
                <div className="absolute top-1.5 h-2 rounded-full bg-slate-200" style={{ left: `${plannedLeft}%`, width: `${plannedWidth}%` }} />
                <div className="absolute top-1.5 h-2 rounded-full bg-brand-500" style={{ left: `${plannedLeft}%`, width: `${Math.max(0.4, actualWidth)}%` }} />
                {late ? (
                  <div className="absolute top-1.5 h-2 rounded-full bg-rose-400/80" style={{ left: `${predictedLeft}%`, width: `${Math.max(0.4, predictedWidth)}%` }} />
                ) : null}
                <div className="absolute inset-y-0 w-px bg-slate-900/25" style={{ left: `${todayPos}%` }} />
              </div>
              <div className={`w-16 shrink-0 text-right text-[11px] ${late ? "text-rose-600" : "text-emerald-600"}`}>
                {late ? `+${Math.round(sched.predictedDelayDays)}d` : "on plan"}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
