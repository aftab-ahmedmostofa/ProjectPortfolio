"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useApp } from "./AppProvider";
import { Project, Risk, RISK_CATEGORIES, RISK_STATUSES, RiskCategory, RiskStatus, RiskActivityEntry } from "@/lib/types";
import { SeverityBadge, RiskStatusBadge, CategoryBadge, ScoreChip } from "./RiskBadges";
import { RiskForm } from "./RiskForm";
import { RiskDrawer } from "./RiskDrawer";
import { ROLE_POLICIES } from "@/lib/rbac";
import { formatDate } from "@/lib/format";

type RiskRow = { project: Project; risk: Risk };

interface FiltersState {
  status: RiskStatus | "All";
  severity: "All" | "Critical" | "High" | "Medium" | "Low";
  ownerId: string | "All" | "__unassigned";
  category: RiskCategory | "All";
  includeDeleted: boolean;
}

const initialFilters: FiltersState = {
  status: "All",
  severity: "All",
  ownerId: "All",
  category: "All",
  includeDeleted: false,
};

export function RiskRegister({
  projects,
  defaultProjectId,
  mode = "project",
}: {
  projects: Project[];
  defaultProjectId?: string;
  mode?: "project" | "portfolio";
}) {
  const { addRisk, members, getMember, role } = useApp();
  const canEdit = ROLE_POLICIES[role].canEditProject;
  const [showAdd, setShowAdd] = useState(false);
  const [addProjectId, setAddProjectId] = useState(defaultProjectId ?? projects[0]?.id ?? "");
  const [filters, setFilters] = useState<FiltersState>(initialFilters);
  const [selected, setSelected] = useState<{ projectId: string; riskId: string } | null>(null);

  const rows: RiskRow[] = useMemo(() => {
    const all: RiskRow[] = [];
    for (const p of projects) {
      for (const r of p.risks) {
        if (!filters.includeDeleted && r.deletedAt) continue;
        if (filters.status !== "All" && r.status !== filters.status) continue;
        if (filters.severity !== "All" && r.severity !== filters.severity) continue;
        if (filters.category !== "All" && r.category !== filters.category) continue;
        if (filters.ownerId === "__unassigned") {
          if (r.ownerId) continue;
        } else if (filters.ownerId !== "All" && r.ownerId !== filters.ownerId) continue;
        all.push({ project: p, risk: r });
      }
    }
    return all.sort((a, b) => {
      // Critical first, then by severity score
      const sevRank = { Critical: 0, High: 1, Medium: 2, Low: 3 };
      const sevDiff = sevRank[a.risk.severity] - sevRank[b.risk.severity];
      if (sevDiff !== 0) return sevDiff;
      return b.risk.probability * b.risk.impact - a.risk.probability * a.risk.impact;
    });
  }, [projects, filters]);

  const ownerOptions = useMemo(() => {
    const seen = new Set<string>();
    const list: { id: string; name: string }[] = [];
    for (const p of projects) {
      for (const r of p.risks) {
        if (r.ownerId && !seen.has(r.ownerId)) {
          seen.add(r.ownerId);
          list.push({ id: r.ownerId, name: getMember(r.ownerId)?.name ?? r.ownerId });
        }
      }
    }
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [projects, getMember]);

  const selectedRisk =
    selected
      ? projects.find((p) => p.id === selected.projectId)?.risks.find((r) => r.id === selected.riskId) ?? null
      : null;

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <FilterPill label="Status" value={filters.status} options={["All", ...RISK_STATUSES]} onChange={(v) => setFilters({ ...filters, status: v as FiltersState["status"] })} />
            <FilterPill label="Severity" value={filters.severity} options={["All", "Critical", "High", "Medium", "Low"]} onChange={(v) => setFilters({ ...filters, severity: v as FiltersState["severity"] })} />
            <FilterPill label="Category" value={filters.category} options={["All", ...RISK_CATEGORIES]} onChange={(v) => setFilters({ ...filters, category: v as FiltersState["category"] })} />
            <label className="flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs shadow-sm">
              <span className="text-slate-500">Owner</span>
              <select
                value={filters.ownerId}
                onChange={(e) => setFilters({ ...filters, ownerId: e.target.value as FiltersState["ownerId"] })}
                className="bg-transparent text-sm text-slate-700"
              >
                <option value="All">All</option>
                <option value="__unassigned">Unassigned</option>
                {ownerOptions.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </label>
            <label className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs shadow-sm">
              <input
                type="checkbox"
                checked={filters.includeDeleted}
                onChange={(e) => setFilters({ ...filters, includeDeleted: e.target.checked })}
                className="rounded border-slate-300 text-brand-600"
              />
              <span className="text-slate-600">Show deleted</span>
            </label>
            <button onClick={() => setFilters(initialFilters)} className="text-xs text-slate-500 hover:underline">Reset</button>
          </div>
          {canEdit ? (
            <button onClick={() => setShowAdd((s) => !s)} className="btn-primary">{showAdd ? "Cancel" : "+ Add risk"}</button>
          ) : null}
        </div>

        {showAdd && canEdit ? (
          <div className="mt-4 rounded-lg border border-slate-100 bg-slate-50/60 p-4">
            {mode === "portfolio" ? (
              <label className="mb-3 block">
                <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Project</span>
                <select
                  value={addProjectId}
                  onChange={(e) => setAddProjectId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </label>
            ) : null}
            <RiskForm
              members={members}
              onCancel={() => setShowAdd(false)}
              onSubmit={(fields) => {
                addRisk(addProjectId, fields);
                setShowAdd(false);
              }}
            />
          </div>
        ) : null}
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Title</th>
              {mode === "portfolio" ? <th className="px-4 py-3">Project</th> : null}
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Severity · P×I</th>
              <th className="px-4 py-3">Owner</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Due</th>
              <th className="px-4 py-3">Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={mode === "portfolio" ? 8 : 7} className="px-4 py-10 text-center text-sm text-slate-400">
                  No risks match the current filters.
                </td>
              </tr>
            ) : (
              rows.map(({ project, risk }) => {
                const owner = risk.ownerId ? getMember(risk.ownerId) : undefined;
                const overdue = risk.dueDate && risk.dueDate < new Date().toISOString().slice(0, 10) && risk.status !== "Closed" && risk.status !== "Mitigated";
                const lastActivity = lastEntry(risk.activity);
                return (
                  <tr
                    key={`${project.id}-${risk.id}`}
                    onClick={() => setSelected({ projectId: project.id, riskId: risk.id })}
                    className={`cursor-pointer hover:bg-slate-50 ${risk.deletedAt ? "opacity-60" : ""}`}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">{risk.title}</div>
                      <div className="text-[11px] text-slate-400">{risk.id} · {lastActivity ? `${lastActivity.actor} · ${lastActivity.kind}` : "—"}</div>
                    </td>
                    {mode === "portfolio" ? (
                      <td className="px-4 py-3 text-xs">
                        <Link href={`/projects/${project.id}/risks`} onClick={(e) => e.stopPropagation()} className="text-brand-700 hover:underline">
                          {project.name}
                        </Link>
                        <div className="text-slate-400">{project.code}</div>
                      </td>
                    ) : null}
                    <td className="px-4 py-3"><CategoryBadge category={risk.category} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <SeverityBadge severity={risk.severity} />
                        <ScoreChip probability={risk.probability} impact={risk.impact} />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-700">
                      {owner ? owner.name : <span className="text-slate-400">Unassigned</span>}
                    </td>
                    <td className="px-4 py-3"><RiskStatusBadge status={risk.status} /></td>
                    <td className={`px-4 py-3 text-xs ${overdue ? "font-semibold text-rose-600" : "text-slate-500"}`}>
                      {risk.dueDate ? formatDate(risk.dueDate) : "—"}
                      {overdue ? <div className="text-[10px]">overdue</div> : null}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{formatDate(risk.updatedAt)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {selected ? (
        <RiskDrawer projectId={selected.projectId} risk={selectedRisk} onClose={() => setSelected(null)} />
      ) : null}
    </div>
  );
}

function lastEntry(activity: RiskActivityEntry[]): RiskActivityEntry | undefined {
  return activity.length > 0 ? activity[activity.length - 1] : undefined;
}

function FilterPill({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs shadow-sm">
      <span className="text-slate-500">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="bg-transparent text-sm text-slate-700">
        {options.map((o) => <option key={o}>{o}</option>)}
      </select>
    </label>
  );
}
