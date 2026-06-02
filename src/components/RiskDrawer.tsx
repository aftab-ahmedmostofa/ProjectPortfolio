"use client";

import { useEffect, useState } from "react";
import { useApp } from "./AppProvider";
import { Risk, RISK_STATUSES, RiskStatus } from "@/lib/types";
import { SeverityBadge, RiskStatusBadge, CategoryBadge, ScoreChip } from "./RiskBadges";
import { RiskForm } from "./RiskForm";
import { formatDate } from "@/lib/format";
import { ROLE_POLICIES } from "@/lib/rbac";

interface RiskDrawerProps {
  projectId: string;
  risk: Risk | null;
  onClose: () => void;
}

const KIND_LABEL: Record<string, string> = {
  created: "Created",
  updated: "Updated",
  comment: "Comment",
  "status-changed": "Status",
  assigned: "Assigned",
  deleted: "Deleted",
  restored: "Restored",
};

const KIND_TONE: Record<string, string> = {
  created: "bg-slate-100 text-slate-600",
  updated: "bg-blue-100 text-blue-700",
  comment: "bg-violet-100 text-violet-700",
  "status-changed": "bg-amber-100 text-amber-700",
  assigned: "bg-emerald-100 text-emerald-700",
  deleted: "bg-rose-100 text-rose-700",
  restored: "bg-emerald-100 text-emerald-700",
};

export function RiskDrawer({ projectId, risk, onClose }: RiskDrawerProps) {
  const {
    members,
    getMember,
    role,
    changeRiskStatus,
    assignRisk,
    updateRisk,
    addRiskComment,
    softDeleteRisk,
    restoreRisk,
  } = useApp();
  const [editing, setEditing] = useState(false);
  const [comment, setComment] = useState("");
  const [progress, setProgress] = useState(risk?.mitigationProgress ?? 0);
  const canEdit = ROLE_POLICIES[role].canEditProject;

  useEffect(() => {
    setEditing(false);
    setComment("");
    setProgress(risk?.mitigationProgress ?? 0);
  }, [risk]);

  useEffect(() => {
    if (!risk) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [risk, onClose]);

  if (!risk) return null;
  const owner = risk.ownerId ? getMember(risk.ownerId) : undefined;

  function submitComment(e: React.FormEvent) {
    e.preventDefault();
    if (!risk) return;
    addRiskComment(projectId, risk.id, comment);
    setComment("");
  }

  function commitProgress() {
    if (!risk) return;
    if (progress !== risk.mitigationProgress) {
      updateRisk(projectId, risk.id, { mitigationProgress: progress });
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="flex-1 bg-slate-900/30" onClick={onClose} />
      <aside className="flex h-full w-full max-w-xl flex-col overflow-hidden border-l border-slate-200 bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{risk.id}</span>
              <SeverityBadge severity={risk.severity} />
              <RiskStatusBadge status={risk.status} />
              <CategoryBadge category={risk.category} />
              {risk.deletedAt ? <span className="badge bg-rose-100 text-rose-700">Deleted</span> : null}
            </div>
            <h3 className="mt-1 truncate text-base font-semibold text-slate-900">{risk.title}</h3>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1 text-slate-500 hover:bg-slate-100">✕</button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {editing && canEdit ? (
            <RiskForm
              members={members}
              initial={risk}
              submitLabel="Save changes"
              onSubmit={(patch) => {
                updateRisk(projectId, risk.id, {
                  title: patch.title,
                  description: patch.description,
                  category: patch.category,
                  probability: patch.probability,
                  impact: patch.impact,
                  mitigation: patch.mitigation,
                  dueDate: patch.dueDate,
                });
                if ((patch.ownerId ?? "") !== (risk.ownerId ?? "")) {
                  assignRisk(projectId, risk.id, patch.ownerId);
                }
                setEditing(false);
              }}
              onCancel={() => setEditing(false)}
            />
          ) : (
            <>
              <section>
                {risk.description ? <p className="text-sm text-slate-700">{risk.description}</p> : null}
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <ScoreChip probability={risk.probability} impact={risk.impact} />
                  {risk.dueDate ? <span>Due {formatDate(risk.dueDate)}</span> : null}
                  <span>Updated {formatDate(risk.updatedAt)}</span>
                </div>
              </section>

              <section className="grid gap-3 sm:grid-cols-2">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Status</div>
                  <select
                    value={risk.status}
                    disabled={!canEdit || !!risk.deletedAt}
                    onChange={(e) => changeRiskStatus(projectId, risk.id, e.target.value as RiskStatus)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm"
                  >
                    {RISK_STATUSES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Owner</div>
                  <select
                    value={risk.ownerId ?? ""}
                    disabled={!canEdit || !!risk.deletedAt}
                    onChange={(e) => assignRisk(projectId, risk.id, e.target.value || undefined)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm"
                  >
                    <option value="">Unassigned</option>
                    {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                  {owner ? (
                    <div className="mt-1 text-[11px] text-slate-500">{owner.email} · {owner.phone}</div>
                  ) : null}
                </div>
              </section>

              <section>
                <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Mitigation plan</div>
                <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
                  {risk.mitigation || <span className="text-slate-400">No plan recorded yet.</span>}
                </p>
                <div className="mt-2">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Mitigation progress</span>
                    <span className="font-medium text-slate-700">{progress}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    disabled={!canEdit || !!risk.deletedAt}
                    value={progress}
                    onChange={(e) => setProgress(Number(e.target.value))}
                    onMouseUp={commitProgress}
                    onTouchEnd={commitProgress}
                    onBlur={commitProgress}
                    className="mt-1 w-full"
                  />
                </div>
              </section>

              {canEdit ? (
                <div className="flex flex-wrap items-center gap-2">
                  <button onClick={() => setEditing(true)} className="btn-ghost" disabled={!!risk.deletedAt}>Edit details</button>
                  {risk.deletedAt ? (
                    <button onClick={() => restoreRisk(projectId, risk.id)} className="btn bg-emerald-600 text-white hover:bg-emerald-700">
                      Restore
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        if (confirm(`Soft-delete risk "${risk.title}"? It can be restored from the Deleted filter.`)) {
                          softDeleteRisk(projectId, risk.id);
                        }
                      }}
                      className="btn bg-rose-600 text-white hover:bg-rose-700"
                    >
                      Delete
                    </button>
                  )}
                </div>
              ) : null}
            </>
          )}

          <section>
            <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Activity log</div>
            <ol className="mt-2 space-y-2">
              {[...risk.activity].reverse().map((a) => (
                <li key={a.id} className="rounded-lg border border-slate-100 bg-slate-50/60 p-2 text-sm">
                  <div className="flex flex-wrap items-center gap-2 text-[11px]">
                    <span className={`badge ${KIND_TONE[a.kind] ?? "bg-slate-100 text-slate-600"}`}>{KIND_LABEL[a.kind] ?? a.kind}</span>
                    <span className="font-medium text-slate-700">{a.actor}</span>
                    <span className="text-slate-400">{new Date(a.at).toLocaleString()}</span>
                  </div>
                  <p className="mt-1 text-slate-700">{a.message}</p>
                </li>
              ))}
            </ol>
          </section>

          {canEdit && !risk.deletedAt ? (
            <form onSubmit={submitComment} className="flex items-end gap-2">
              <label className="flex-1">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Add comment</span>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={2}
                  placeholder="Note progress, escalations, decisions…"
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                />
              </label>
              <button type="submit" className="btn-primary" disabled={!comment.trim()}>Post</button>
            </form>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
