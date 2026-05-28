import { Project, Severity } from "./types";
import { TODAY } from "./data";
import { clamp } from "./format";

const DAY_MS = 1000 * 60 * 60 * 24;

const SEVERITY_WEIGHT: Record<Severity, number> = {
  Low: 25,
  Medium: 50,
  High: 75,
  Critical: 100,
};

export const HIGH_RISK_THRESHOLD = 60;

function daysBetween(a: Date | string, b: Date | string): number {
  const da = typeof a === "string" ? new Date(a) : a;
  const db = typeof b === "string" ? new Date(b) : b;
  return (db.getTime() - da.getTime()) / DAY_MS;
}

function isActive(p: Project): boolean {
  return p.status !== "Completed" && p.status !== "Cancelled";
}

// Schedule a project "should" be at given elapsed time (linear plan baseline).
export function expectedProgress(p: Project, today: Date = TODAY): number {
  const total = daysBetween(p.startDate, p.plannedEndDate);
  if (total <= 0) return 100;
  const elapsed = daysBetween(p.startDate, today);
  return clamp((elapsed / total) * 100, 0, 100);
}

// Estimate-at-Completion using cost performance index (CPI = EV / AC).
export interface CostForecast {
  cpi: number; // < 1 means over budget
  estimateAtCompletion: number;
  projectedOverrun: number; // absolute, can be negative (under budget)
  overrunPercent: number;
}

export function forecastCost(p: Project): CostForecast {
  if (p.status === "Completed") {
    const overrun = p.actualCost - p.budget;
    return {
      cpi: p.actualCost > 0 ? p.budget / p.actualCost : 1,
      estimateAtCompletion: p.actualCost,
      projectedOverrun: overrun,
      overrunPercent: (overrun / p.budget) * 100,
    };
  }
  const completion = p.progress / 100;
  const earnedValue = completion * p.budget;
  const cpi = p.actualCost > 0 && completion > 0 ? earnedValue / p.actualCost : 1;
  // EAC assumes remaining work continues at the current cost efficiency.
  const eac = completion > 0 ? p.actualCost / completion : p.budget;
  const overrun = eac - p.budget;
  return {
    cpi,
    estimateAtCompletion: eac,
    projectedOverrun: overrun,
    overrunPercent: (overrun / p.budget) * 100,
  };
}

// Velocity-based completion-date forecast.
export interface ScheduleForecast {
  expectedProgress: number;
  progressGap: number; // expected - actual; positive => behind plan
  predictedEndDate: Date;
  predictedDelayDays: number; // positive => late vs plan
}

export function forecastSchedule(p: Project, today: Date = TODAY): ScheduleForecast {
  const expected = expectedProgress(p, today);
  const gap = expected - p.progress;

  if (p.status === "Completed") {
    return {
      expectedProgress: 100,
      progressGap: 0,
      predictedEndDate: new Date(p.plannedEndDate),
      predictedDelayDays: 0,
    };
  }

  const elapsed = Math.max(daysBetween(p.startDate, today), 1);
  const ratePerDay = p.progress / elapsed; // % per day achieved so far
  const remaining = 100 - p.progress;

  let predictedEnd: Date;
  if (ratePerDay <= 0.001) {
    // Stalled: project plan duration as a pessimistic placeholder.
    predictedEnd = new Date(today.getTime() + daysBetween(p.startDate, p.plannedEndDate) * DAY_MS);
  } else {
    const daysToFinish = remaining / ratePerDay;
    predictedEnd = new Date(today.getTime() + daysToFinish * DAY_MS);
  }

  const delay = daysBetween(p.plannedEndDate, predictedEnd);
  return {
    expectedProgress: expected,
    progressGap: gap,
    predictedEndDate: predictedEnd,
    predictedDelayDays: delay,
  };
}

export interface RiskAssessment {
  score: number; // 0..100
  level: "Low" | "Medium" | "High";
  drivers: string[];
}

export function assessRisk(p: Project): RiskAssessment {
  const cost = forecastCost(p);
  const schedule = forecastSchedule(p);
  const totalDuration = Math.max(daysBetween(p.startDate, p.plannedEndDate), 1);

  // Each component normalised to 0..100.
  const costComponent = clamp(cost.overrunPercent * 2.5, 0, 100); // 40% overrun -> 100
  const delayRatio = schedule.predictedDelayDays / totalDuration;
  const scheduleComponent = clamp(delayRatio * 200, 0, 100); // 50% over schedule -> 100

  const openRisks = p.risks.filter((r) => r.open);
  let openComponent = 0;
  if (openRisks.length > 0) {
    const worst = Math.max(...openRisks.map((r) => SEVERITY_WEIGHT[r.severity] * r.likelihood));
    openComponent = clamp(worst + (openRisks.length - 1) * 5, 0, 100);
  }

  let score = 0.35 * costComponent + 0.35 * scheduleComponent + 0.3 * openComponent;
  if (p.status === "Delayed") score += 8;
  if (p.status === "On Hold") score += 5;
  score = clamp(score, 0, 100);

  const drivers: string[] = [];
  if (costComponent >= 40) drivers.push(`Cost overrun risk (${cost.overrunPercent.toFixed(0)}% projected)`);
  if (scheduleComponent >= 40) drivers.push(`Schedule slip (~${Math.round(schedule.predictedDelayDays)}d late)`);
  if (openComponent >= 50) drivers.push(`${openRisks.length} open risk(s), worst ${maxSeverity(openRisks)}`);
  if (drivers.length === 0) drivers.push("Within tolerance on cost, schedule and risk");

  return {
    score: Math.round(score),
    level: score >= HIGH_RISK_THRESHOLD ? "High" : score >= 33 ? "Medium" : "Low",
    drivers,
  };
}

function maxSeverity(risks: Project["risks"]): string {
  if (risks.length === 0) return "None";
  return risks.reduce((acc, r) =>
    SEVERITY_WEIGHT[r.severity] > SEVERITY_WEIGHT[acc.severity] ? r : acc
  ).severity;
}

// ---- Portfolio-level aggregates ----

export interface PortfolioKpis {
  totalProjects: number;
  activeProjects: number;
  totalBudget: number;
  totalActual: number;
  budgetUtilization: number; // %
  delayedProjects: number;
  highRiskProjects: number;
  deliverySuccessRate: number; // % of completed delivered on/under budget & on time
  forecastOverrun: number; // sum of projected overruns across active projects
}

export function portfolioKpis(list: Project[]): PortfolioKpis {
  const totalBudget = list.reduce((s, p) => s + p.budget, 0);
  const totalActual = list.reduce((s, p) => s + p.actualCost, 0);
  const completed = list.filter((p) => p.status === "Completed");
  const delivered = completed.filter((p) => p.actualCost <= p.budget * 1.05); // within 5% tolerance
  const highRisk = list.filter((p) => assessRisk(p).score >= HIGH_RISK_THRESHOLD);
  const forecastOverrun = list
    .filter(isActive)
    .reduce((s, p) => s + Math.max(0, forecastCost(p).projectedOverrun), 0);

  return {
    totalProjects: list.length,
    activeProjects: list.filter(isActive).length,
    totalBudget,
    totalActual,
    budgetUtilization: totalBudget > 0 ? (totalActual / totalBudget) * 100 : 0,
    delayedProjects: list.filter((p) => p.status === "Delayed").length,
    highRiskProjects: highRisk.length,
    deliverySuccessRate: completed.length > 0 ? (delivered.length / completed.length) * 100 : 0,
    forecastOverrun,
  };
}

// Statistical anomaly detection on cost & schedule variance (z-score outliers).
export interface Anomaly {
  projectId: string;
  projectName: string;
  metric: "Cost" | "Schedule";
  zScore: number;
  value: number;
  reason: string;
}

function stats(values: number[]): { mean: number; std: number } {
  if (values.length === 0) return { mean: 0, std: 0 };
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  return { mean, std: Math.sqrt(variance) };
}

export function detectAnomalies(list: Project[], threshold = 1.5): Anomaly[] {
  const active = list.filter(isActive);
  if (active.length < 3) return [];

  const overruns = active.map((p) => forecastCost(p).overrunPercent);
  const delays = active.map((p) => forecastSchedule(p).predictedDelayDays);
  const costStats = stats(overruns);
  const delayStats = stats(delays);

  const anomalies: Anomaly[] = [];
  active.forEach((p, i) => {
    if (costStats.std > 0) {
      const z = (overruns[i] - costStats.mean) / costStats.std;
      if (z >= threshold) {
        anomalies.push({
          projectId: p.id,
          projectName: p.name,
          metric: "Cost",
          zScore: Number(z.toFixed(2)),
          value: Number(overruns[i].toFixed(1)),
          reason: `Projected cost overrun (${overruns[i].toFixed(0)}%) is ${z.toFixed(1)}σ above portfolio norm`,
        });
      }
    }
    if (delayStats.std > 0) {
      const z = (delays[i] - delayStats.mean) / delayStats.std;
      if (z >= threshold) {
        anomalies.push({
          projectId: p.id,
          projectName: p.name,
          metric: "Schedule",
          zScore: Number(z.toFixed(2)),
          value: Math.round(delays[i]),
          reason: `Forecast delay (${Math.round(delays[i])}d) is ${z.toFixed(1)}σ above portfolio norm`,
        });
      }
    }
  });
  return anomalies.sort((a, b) => b.zScore - a.zScore);
}

// Heuristic executive insight generation. This is the offline narrative engine;
// an optional Azure OpenAI augmentation can wrap this (see src/lib/llm.ts).
export function executiveInsights(list: Project[]): string[] {
  if (list.length === 0) return ["No projects match the current filters."];
  const kpis = portfolioKpis(list);
  const insights: string[] = [];

  insights.push(
    `Portfolio of ${kpis.totalProjects} projects (${kpis.activeProjects} active) with ${kpis.budgetUtilization.toFixed(0)}% budget utilization ($${(kpis.totalActual / 1e6).toFixed(1)}M of $${(kpis.totalBudget / 1e6).toFixed(1)}M).`
  );

  const overBudget = list.filter(isActive).filter((p) => forecastCost(p).projectedOverrun > 0);
  if (overBudget.length > 0) {
    insights.push(
      `${overBudget.length} active project(s) are forecast to exceed budget, with a combined projected overrun of $${(kpis.forecastOverrun / 1e6).toFixed(2)}M. Highest exposure: ${topBy(overBudget, (p) => forecastCost(p).projectedOverrun)}.`
    );
  } else {
    insights.push("All active projects are currently forecast to land within approved budgets.");
  }

  const late = list
    .filter(isActive)
    .map((p) => ({ p, f: forecastSchedule(p) }))
    .filter((x) => x.f.predictedDelayDays > 7);
  if (late.length > 0) {
    const avg = late.reduce((s, x) => s + x.f.predictedDelayDays, 0) / late.length;
    insights.push(
      `${late.length} project(s) are trending late, by an average of ${Math.round(avg)} days. Most at risk: ${topBy(late.map((x) => x.p), (p) => forecastSchedule(p).predictedDelayDays)}.`
    );
  }

  if (kpis.highRiskProjects > 0) {
    const riskiest = topBy(list, (p) => assessRisk(p).score);
    insights.push(
      `${kpis.highRiskProjects} project(s) are rated High risk. Top concern: ${riskiest} — ${assessRisk(list.find((p) => p.name === riskiest)!).drivers[0]}.`
    );
  }

  const anomalies = detectAnomalies(list);
  if (anomalies.length > 0) {
    insights.push(
      `Anomaly detection flagged ${anomalies.length} statistical outlier(s); review ${anomalies[0].projectName} (${anomalies[0].reason}).`
    );
  }

  if (kpis.deliverySuccessRate > 0) {
    insights.push(
      `Delivery success rate stands at ${kpis.deliverySuccessRate.toFixed(0)}% across completed projects.`
    );
  }

  return insights;
}

function topBy(list: Project[], score: (p: Project) => number): string {
  if (list.length === 0) return "n/a";
  return list.reduce((best, p) => (score(p) > score(best) ? p : best)).name;
}

// Per-project narrative for the drill-down view.
export function projectNarrative(p: Project): string {
  const cost = forecastCost(p);
  const sched = forecastSchedule(p);
  const risk = assessRisk(p);
  const parts: string[] = [];

  if (p.status === "Completed") {
    parts.push(
      `${p.name} is complete, delivered at $${(p.actualCost / 1e6).toFixed(2)}M against a $${(p.budget / 1e6).toFixed(2)}M budget (${cost.overrunPercent >= 0 ? "+" : ""}${cost.overrunPercent.toFixed(0)}%).`
    );
    return parts.join(" ");
  }

  parts.push(
    `At ${p.progress}% complete vs an expected ${sched.expectedProgress.toFixed(0)}%, ${p.name} is ${sched.progressGap > 5 ? `${sched.progressGap.toFixed(0)} points behind plan` : sched.progressGap < -5 ? "ahead of plan" : "on plan"}.`
  );
  parts.push(
    `Cost performance index is ${cost.cpi.toFixed(2)}; forecast at completion $${(cost.estimateAtCompletion / 1e6).toFixed(2)}M (${cost.projectedOverrun >= 0 ? "overrun" : "saving"} of $${(Math.abs(cost.projectedOverrun) / 1e3).toFixed(0)}K).`
  );
  if (Math.abs(sched.predictedDelayDays) > 7) {
    parts.push(
      sched.predictedDelayDays > 0
        ? `At the current pace, delivery is projected ~${Math.round(sched.predictedDelayDays)} days late.`
        : `At the current pace, delivery is projected ~${Math.round(-sched.predictedDelayDays)} days early.`
    );
  }
  parts.push(`Overall risk: ${risk.level} (${risk.score}/100) — ${risk.drivers[0]}.`);
  return parts.join(" ");
}
