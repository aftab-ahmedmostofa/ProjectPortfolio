import { ProjectStatus, ApprovalDecision } from "@/lib/types";

const STATUS_STYLES: Record<ProjectStatus, string> = {
  Planning: "bg-slate-100 text-slate-700",
  "In Progress": "bg-blue-100 text-blue-700",
  Delayed: "bg-amber-100 text-amber-800",
  "On Hold": "bg-purple-100 text-purple-700",
  Completed: "bg-emerald-100 text-emerald-700",
  Cancelled: "bg-slate-200 text-slate-500",
};

export function StatusBadge({ status }: { status: ProjectStatus }) {
  return <span className={`badge ${STATUS_STYLES[status]}`}>{status}</span>;
}

const DECISION_STYLES: Record<ApprovalDecision, string> = {
  Pending: "bg-amber-100 text-amber-800",
  Approved: "bg-emerald-100 text-emerald-700",
  Rejected: "bg-rose-100 text-rose-700",
};

export function DecisionBadge({ decision }: { decision: ApprovalDecision }) {
  return <span className={`badge ${DECISION_STYLES[decision]}`}>{decision}</span>;
}

export function RiskBadge({ level, score }: { level: "Low" | "Medium" | "High"; score: number }) {
  const styles = {
    Low: "bg-emerald-100 text-emerald-700",
    Medium: "bg-amber-100 text-amber-800",
    High: "bg-rose-100 text-rose-700",
  }[level];
  return (
    <span className={`badge ${styles}`}>
      {level} · {score}
    </span>
  );
}

export function ProgressBar({ value, tone = "brand" }: { value: number; tone?: "brand" | "amber" | "emerald" | "rose" }) {
  const bar = {
    brand: "bg-brand-500",
    amber: "bg-amber-500",
    emerald: "bg-emerald-500",
    rose: "bg-rose-500",
  }[tone];
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
      <div className={`h-full rounded-full ${bar}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}
