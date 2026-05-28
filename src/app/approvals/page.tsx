"use client";

import { useState } from "react";
import Link from "next/link";
import { useApp } from "@/components/AppProvider";
import { DecisionBadge, StatusBadge } from "@/components/ui";
import { ROLE_POLICIES } from "@/lib/rbac";
import { formatCurrency } from "@/lib/format";
import { Project } from "@/lib/types";

export default function ApprovalsPage() {
  const { projects, role, updateApproval } = useApp();
  const canApprove = ROLE_POLICIES[role].canApprove;

  const pending = projects.filter((p) => p.approvals.some((a) => a.decision === "Pending"));
  const decided = projects.filter((p) => !p.approvals.some((a) => a.decision === "Pending"));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Approval Workflow</h1>
        <p className="text-sm text-slate-500">
          Go / No-Go gates with multi-level authorization.{" "}
          {canApprove ? (
            <span className="text-emerald-600">You can act on approvals as {role}.</span>
          ) : (
            <span className="text-slate-400">{role} has read-only access to approvals.</span>
          )}
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-700">Awaiting decision ({pending.length})</h2>
        {pending.length === 0 ? (
          <div className="card p-6 text-center text-sm text-slate-400">No pending approvals.</div>
        ) : (
          pending.map((p) => (
            <ApprovalCard key={p.id} project={p} canApprove={canApprove} onDecision={updateApproval} />
          ))
        )}
      </section>

      {decided.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-700">Recently decided</h2>
          {decided.slice(0, 6).map((p) => (
            <ApprovalCard key={p.id} project={p} canApprove={false} onDecision={updateApproval} />
          ))}
        </section>
      ) : null}
    </div>
  );
}

function nextPendingLevel(project: Project): number | null {
  const sorted = [...project.approvals].sort((a, b) => a.level - b.level);
  for (const step of sorted) {
    if (step.decision === "Rejected") return null; // blocked
    if (step.decision === "Pending") return step.level;
  }
  return null;
}

function ApprovalCard({
  project,
  canApprove,
  onDecision,
}: {
  project: Project;
  canApprove: boolean;
  onDecision: (id: string, level: number, decision: "Approved" | "Rejected", comment: string) => void;
}) {
  const [comment, setComment] = useState("");
  const actionable = nextPendingLevel(project);

  return (
    <div className="card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <Link href={`/projects/${project.id}`} className="font-medium text-brand-700 hover:underline">
            {project.name}
          </Link>
          <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-slate-500">
            <span>{project.code}</span>
            <span>{project.subsidiary} · {project.country}</span>
            <span>Budget {formatCurrency(project.budget)}</span>
          </div>
        </div>
        <StatusBadge status={project.status} />
      </div>

      <ol className="mt-3 space-y-2">
        {[...project.approvals]
          .sort((a, b) => a.level - b.level)
          .map((a) => {
            const isActionable = canApprove && a.level === actionable;
            return (
              <li key={a.level} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 p-2">
                <div className="text-sm">
                  <span className="font-medium text-slate-700">Level {a.level} · {a.role}</span>
                  <span className="ml-2 text-xs text-slate-400">{a.approver}</span>
                </div>
                <div className="flex items-center gap-2">
                  {a.comment ? <span className="text-xs italic text-slate-400">&ldquo;{a.comment}&rdquo;</span> : null}
                  <DecisionBadge decision={a.decision} />
                </div>
                {isActionable ? (
                  <div className="flex w-full items-center gap-2 pt-1">
                    <input
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Comment (optional)"
                      className="flex-1 rounded-lg border border-slate-300 px-2 py-1 text-sm"
                    />
                    <button
                      className="btn bg-emerald-600 text-white hover:bg-emerald-700"
                      onClick={() => onDecision(project.id, a.level, "Approved", comment || "Approved")}
                    >
                      Go
                    </button>
                    <button
                      className="btn bg-rose-600 text-white hover:bg-rose-700"
                      onClick={() => onDecision(project.id, a.level, "Rejected", comment || "No-Go")}
                    >
                      No-Go
                    </button>
                  </div>
                ) : null}
              </li>
            );
          })}
      </ol>
    </div>
  );
}
