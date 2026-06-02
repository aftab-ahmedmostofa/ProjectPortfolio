// Aggregations for the Tableau-style PM Summary page.
// All helpers operate on a list of in-scope projects and produce
// chart-ready data; they intentionally do not depend on AppProvider.

import { Project, ProjectStatus } from "./types";
import { TODAY } from "./data";
import { assessRisk, forecastSchedule, forecastCost } from "./analytics";

const DAY_MS = 86_400_000;
const MONTH_MS = 30 * DAY_MS;

// ----- KPI sparklines (monthly time series for the last 12 months) -----

function monthsBack(n: number, end: Date = TODAY): { label: string; start: number; end: number }[] {
  const out: { label: string; start: number; end: number }[] = [];
  const y = end.getUTCFullYear();
  const m = end.getUTCMonth();
  for (let i = n - 1; i >= 0; i--) {
    const s = Date.UTC(y, m - i, 1);
    const e = Date.UTC(y, m - i + 1, 1);
    out.push({
      label: new Date(s).toLocaleString("en-GB", { month: "short" }),
      start: s,
      end: e,
    });
  }
  return out;
}

// Linearly distribute a project's actualCost across its elapsed (start → today) period.
function projectExpenseInWindow(p: Project, windowStart: number, windowEnd: number): number {
  const projectStart = new Date(p.startDate).getTime();
  const elapsedEnd = Math.min(TODAY.getTime(), new Date(p.plannedEndDate).getTime());
  if (elapsedEnd <= projectStart) return 0;
  const overlapStart = Math.max(projectStart, windowStart);
  const overlapEnd = Math.min(elapsedEnd, windowEnd);
  if (overlapEnd <= overlapStart) return 0;
  const totalElapsed = elapsedEnd - projectStart;
  const overlap = overlapEnd - overlapStart;
  return p.actualCost * (overlap / totalElapsed);
}

function projectBudgetInWindow(p: Project, windowStart: number, windowEnd: number): number {
  const projectStart = new Date(p.startDate).getTime();
  const projectEnd = new Date(p.plannedEndDate).getTime();
  if (projectEnd <= projectStart) return 0;
  const overlapStart = Math.max(projectStart, windowStart);
  const overlapEnd = Math.min(projectEnd, windowEnd);
  if (overlapEnd <= overlapStart) return 0;
  const total = projectEnd - projectStart;
  const overlap = overlapEnd - overlapStart;
  return p.budget * (overlap / total);
}

export interface KpiSeries {
  totalProjects: number[];
  totalBudget: number[];
  totalExpense: number[];
  utilisation: number[];
  openRisks: number[];
  delayedProjects: number[];
  labels: string[];
}

export function kpiSparklines(projects: Project[]): KpiSeries {
  const months = monthsBack(12);
  const totalProjects: number[] = [];
  const totalBudget: number[] = [];
  const totalExpense: number[] = [];
  const utilisation: number[] = [];
  const openRisks: number[] = [];
  const delayedProjects: number[] = [];

  for (const win of months) {
    const active = projects.filter((p) => {
      const s = new Date(p.startDate).getTime();
      return s <= win.end;
    });
    totalProjects.push(active.length);

    let mBudget = 0;
    let mExpense = 0;
    for (const p of active) {
      mBudget += projectBudgetInWindow(p, 0, win.end);
      mExpense += projectExpenseInWindow(p, 0, win.end);
    }
    totalBudget.push(Math.round(mBudget));
    totalExpense.push(Math.round(mExpense));
    utilisation.push(mBudget > 0 ? Math.round((mExpense / mBudget) * 100) : 0);

    // Open risks at this point: risks created before window end and not closed.
    let risks = 0;
    let delays = 0;
    for (const p of active) {
      for (const r of p.risks) {
        if (r.deletedAt) continue;
        const created = new Date(r.createdAt).getTime();
        if (created <= win.end && r.status !== "Closed") risks++;
      }
      // approx: a project is "delayed" in the window if planned end before window end and still active
      const pe = new Date(p.plannedEndDate).getTime();
      if (pe < win.end && p.status !== "Completed" && p.status !== "Cancelled") delays++;
    }
    openRisks.push(risks);
    delayedProjects.push(delays);
  }

  return {
    totalProjects,
    totalBudget,
    totalExpense,
    utilisation,
    openRisks,
    delayedProjects,
    labels: months.map((m) => m.label),
  };
}

// ----- Distribution & ranking helpers -----

export function byBusinessUnit(projects: Project[]): { name: string; count: number }[] {
  const map = new Map<string, number>();
  for (const p of projects) map.set(p.businessUnit, (map.get(p.businessUnit) ?? 0) + 1);
  return Array.from(map.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

export function byStatus(projects: Project[]): { name: ProjectStatus; count: number }[] {
  const map = new Map<ProjectStatus, number>();
  for (const p of projects) map.set(p.status, (map.get(p.status) ?? 0) + 1);
  return Array.from(map.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

export function byPriority(projects: Project[]): { name: "Low" | "Medium" | "High"; count: number }[] {
  const map = new Map<"Low" | "Medium" | "High", number>([
    ["Low", 0],
    ["Medium", 0],
    ["High", 0],
  ]);
  for (const p of projects) map.set(p.priority, (map.get(p.priority) ?? 0) + 1);
  return Array.from(map.entries()).map(([name, count]) => ({ name, count }));
}

export function byManager(projects: Project[]): { name: string; count: number; budget: number }[] {
  const map = new Map<string, { count: number; budget: number }>();
  for (const p of projects) {
    const cur = map.get(p.manager) ?? { count: 0, budget: 0 };
    cur.count += 1;
    cur.budget += p.budget;
    map.set(p.manager, cur);
  }
  return Array.from(map.entries())
    .map(([name, v]) => ({ name, count: v.count, budget: v.budget }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
}

// Health categories derived from progress, cost and risk.
export type HealthCategory = "On Track" | "Needs Attention" | "At Risk" | "Blocked" | "Not Set";

export function healthOf(p: Project): HealthCategory {
  if (p.status === "Planning") return "Not Set";
  if (p.status === "On Hold" || p.approvals.some((a) => a.decision === "Rejected")) return "Blocked";
  if (p.status === "Cancelled" || p.status === "Completed") {
    return p.actualCost > p.budget * 1.05 ? "Needs Attention" : "On Track";
  }
  const cost = forecastCost(p);
  const sched = forecastSchedule(p);
  const risk = assessRisk(p);
  if (cost.overrunPercent > 15 || sched.predictedDelayDays > 30 || risk.level === "High") return "At Risk";
  if (cost.overrunPercent > 5 || sched.predictedDelayDays > 7 || risk.level === "Medium") return "Needs Attention";
  return "On Track";
}

export function byHealth(projects: Project[]): { name: HealthCategory; count: number }[] {
  const categories: HealthCategory[] = ["On Track", "Needs Attention", "At Risk", "Blocked", "Not Set"];
  const map = new Map<HealthCategory, number>(categories.map((c) => [c, 0]));
  for (const p of projects) map.set(healthOf(p), (map.get(healthOf(p)) ?? 0) + 1);
  return categories.map((name) => ({ name, count: map.get(name) ?? 0 }));
}

// Country bubble positions on a stylised world map (equirectangular).
const COUNTRY_COORDS: Record<string, { x: number; y: number }> = {
  // x: 0..1000 left-to-right; y: 0..500 top-to-bottom
  UAE: { x: 640, y: 240 },
  "Saudi Arabia": { x: 615, y: 235 },
  Egypt: { x: 580, y: 235 },
  UK: { x: 510, y: 165 },
  India: { x: 720, y: 240 },
  Singapore: { x: 790, y: 290 },
  USA: { x: 240, y: 200 },
  Canada: { x: 240, y: 140 },
  Brazil: { x: 360, y: 320 },
  Germany: { x: 535, y: 170 },
  Japan: { x: 855, y: 210 },
  Australia: { x: 855, y: 360 },
};

export function byLocation(projects: Project[]): { country: string; count: number; budget: number; x: number; y: number }[] {
  const map = new Map<string, { count: number; budget: number }>();
  for (const p of projects) {
    const cur = map.get(p.country) ?? { count: 0, budget: 0 };
    cur.count++;
    cur.budget += p.budget;
    map.set(p.country, cur);
  }
  return Array.from(map.entries())
    .map(([country, v]) => {
      const c = COUNTRY_COORDS[country] ?? { x: 500, y: 250 };
      return { country, count: v.count, budget: v.budget, ...c };
    })
    .sort((a, b) => b.count - a.count);
}

// Budget vs expense trend by month — uses synthesised linear distribution.
export function budgetExpenseTrend(projects: Project[], monthsCount = 18): { label: string; budget: number; expense: number }[] {
  const months = monthsBack(monthsCount);
  return months.map((win) => {
    let budget = 0;
    let expense = 0;
    for (const p of projects) {
      budget += projectBudgetInWindow(p, win.start, win.end);
      expense += projectExpenseInWindow(p, win.start, win.end);
    }
    return { label: win.label, budget: Math.round(budget), expense: Math.round(expense) };
  });
}

// Per-project budget utilisation, sorted from worst overspend to best.
export function budgetUtilisation(projects: Project[]): { id: string; name: string; pct: number; over: boolean }[] {
  return projects
    .filter((p) => p.budget > 0)
    .map((p) => ({
      id: p.id,
      name: p.name,
      pct: Math.round((p.actualCost / p.budget) * 100),
      over: p.actualCost > p.budget,
    }))
    .sort((a, b) => b.pct - a.pct);
}

// Scatter: budget vs actual expense, sized by completion.
export function budgetVsExpense(projects: Project[]): { id: string; name: string; budget: number; expense: number; progress: number }[] {
  return projects.map((p) => ({
    id: p.id,
    name: p.name,
    budget: Math.round(p.budget),
    expense: Math.round(p.actualCost),
    progress: p.progress,
  }));
}

// Resource utilisation: % of directory members on at least one active project.
export function resourceUtilisation(projects: Project[], totalMembers: number): { active: number; total: number; pct: number } {
  const set = new Set<string>();
  for (const p of projects) {
    if (p.status === "Completed" || p.status === "Cancelled") continue;
    for (const mm of p.members) set.add(mm.memberId);
  }
  const active = set.size;
  return { active, total: totalMembers, pct: totalMembers > 0 ? Math.round((active / totalMembers) * 100) : 0 };
}

// Aggregate KPI counts derived from current projects.
export function pmHeadline(projects: Project[]) {
  let openRisks = 0;
  let criticalRisks = 0;
  let totalBudget = 0;
  let totalActual = 0;
  let delayed = 0;
  for (const p of projects) {
    totalBudget += p.budget;
    totalActual += p.actualCost;
    if (p.status === "Delayed") delayed++;
    for (const r of p.risks) {
      if (r.deletedAt) continue;
      if (r.status !== "Closed") openRisks++;
      if (r.severity === "Critical" && r.status !== "Closed") criticalRisks++;
    }
  }
  return {
    totalProjects: projects.length,
    totalBudget,
    totalActual,
    utilisation: totalBudget > 0 ? (totalActual / totalBudget) * 100 : 0,
    openRisks,
    criticalRisks,
    delayed,
  };
}
