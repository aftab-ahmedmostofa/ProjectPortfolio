import { Project, PortfolioAlert, AlertSeverity } from "./types";
import {
  forecastCost,
  forecastSchedule,
  assessRisk,
  HIGH_RISK_THRESHOLD,
} from "./analytics";

export interface AlertRule {
  id: string;
  title: string;
  description: string;
  severity: AlertSeverity;
}

// Catalogue of all rules the engine can raise. Renderable in the UI.
export const ALERT_RULES: AlertRule[] = [
  { id: "actual-overrun", severity: "critical", title: "Budget exceeded", description: "Actual cost has already exceeded the approved budget." },
  { id: "forecast-overrun", severity: "warn", title: "Forecast overrun", description: "AI Estimate-at-Completion exceeds the approved budget." },
  { id: "schedule-slip-critical", severity: "critical", title: "Schedule slip > 30 days", description: "Velocity-based forecast is more than 30 days late." },
  { id: "schedule-slip-warn", severity: "warn", title: "Schedule slip 7–30 days", description: "Forecast finish is between 7 and 30 days late." },
  { id: "missed-milestone", severity: "warn", title: "Missed milestone", description: "At least one milestone was missed." },
  { id: "critical-open-risk", severity: "critical", title: "Critical open risk", description: "A risk with severity Critical is still open." },
  { id: "stalled-progress", severity: "critical", title: "Stalled progress", description: "Physical progress is more than 30 points below plan." },
  { id: "high-risk-score", severity: "warn", title: "High AI risk score", description: `Composite risk score is at or above ${HIGH_RISK_THRESHOLD}/100.` },
  { id: "approval-blocked", severity: "warn", title: "Approval blocked", description: "An approval step was rejected." },
  { id: "status-delayed", severity: "info", title: "Status flagged as Delayed", description: "Project is currently in 'Delayed' status." },
];

export function evaluateAlerts(projects: Project[]): PortfolioAlert[] {
  const out: PortfolioAlert[] = [];
  const seen = new Set<string>();
  const push = (p: Project, ruleId: string, title: string, message: string) => {
    const rule = ALERT_RULES.find((r) => r.id === ruleId);
    if (!rule) return;
    const id = `${p.id}:${ruleId}`;
    if (seen.has(id)) return;
    seen.add(id);
    out.push({
      id,
      projectId: p.id,
      projectName: p.name,
      rule: ruleId,
      severity: rule.severity,
      title,
      message,
    });
  };

  for (const p of projects) {
    const active = p.status !== "Completed" && p.status !== "Cancelled";
    const cost = forecastCost(p);
    const sched = forecastSchedule(p);
    const risk = assessRisk(p);

    if (active && p.actualCost > p.budget) {
      push(p, "actual-overrun", "Budget already exceeded",
        `Spent $${(p.actualCost / 1e6).toFixed(2)}M against a $${(p.budget / 1e6).toFixed(2)}M budget (+${cost.overrunPercent.toFixed(0)}%).`);
    } else if (active && cost.projectedOverrun > 0) {
      push(p, "forecast-overrun", "Forecast over budget",
        `Estimate-at-Completion $${(cost.estimateAtCompletion / 1e6).toFixed(2)}M is $${(cost.projectedOverrun / 1e3).toFixed(0)}K over budget (CPI ${cost.cpi.toFixed(2)}).`);
    }

    if (active && sched.predictedDelayDays > 30) {
      push(p, "schedule-slip-critical", `Forecast ~${Math.round(sched.predictedDelayDays)}d late`,
        `Velocity-based forecast lands ${Math.round(sched.predictedDelayDays)} days past plan.`);
    } else if (active && sched.predictedDelayDays > 7) {
      push(p, "schedule-slip-warn", `Forecast ~${Math.round(sched.predictedDelayDays)}d late`,
        `Velocity-based forecast lands ${Math.round(sched.predictedDelayDays)} days past plan.`);
    }

    if (p.milestones.some((m) => m.status === "Missed")) {
      const missed = p.milestones.filter((m) => m.status === "Missed").map((m) => m.name).join(", ");
      push(p, "missed-milestone", "Missed milestone(s)", `Missed: ${missed}.`);
    }

    const critical = p.risks.find((r) => r.open && r.severity === "Critical");
    if (critical) {
      push(p, "critical-open-risk", "Critical risk open", `${critical.description} (mitigation: ${critical.mitigation}).`);
    }

    if (active && sched.progressGap > 30) {
      push(p, "stalled-progress", "Stalled vs plan",
        `Progress ${p.progress}% vs expected ${sched.expectedProgress.toFixed(0)}% (gap ${sched.progressGap.toFixed(0)} pts).`);
    }

    if (risk.score >= HIGH_RISK_THRESHOLD) {
      push(p, "high-risk-score", `Risk ${risk.score}/100`, risk.drivers.join(" · "));
    }

    if (p.approvals.some((a) => a.decision === "Rejected")) {
      const r = p.approvals.find((a) => a.decision === "Rejected")!;
      push(p, "approval-blocked", `Level ${r.level} rejected`, r.comment || "Approval rejected; project blocked.");
    }

    if (p.status === "Delayed") {
      push(p, "status-delayed", "Status: Delayed", "Project is currently flagged Delayed by PMO.");
    }
  }

  // Sort by severity (critical first), then by project name for stability.
  const sevRank = { critical: 0, warn: 1, info: 2 };
  out.sort((a, b) => sevRank[a.severity] - sevRank[b.severity] || a.projectName.localeCompare(b.projectName));
  return out;
}

export function alertsForProject(projects: Project[], projectId: string): PortfolioAlert[] {
  return evaluateAlerts(projects).filter((a) => a.projectId === projectId);
}

export function alertSeverityCounts(alerts: PortfolioAlert[]): Record<AlertSeverity, number> {
  return alerts.reduce(
    (acc, a) => ({ ...acc, [a.severity]: acc[a.severity] + 1 }),
    { critical: 0, warn: 0, info: 0 } as Record<AlertSeverity, number>
  );
}
