"use client";

import { useState } from "react";
import { useApp } from "./AppProvider";
import { Project, MembershipRole } from "@/lib/types";
import { ROLE_POLICIES } from "@/lib/rbac";

const ROLES: MembershipRole[] = ["Sponsor", "Manager", "Contributor", "Reviewer"];

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function avatarColor(name: string): string {
  const palette = [
    "bg-brand-500",
    "bg-emerald-500",
    "bg-amber-500",
    "bg-rose-500",
    "bg-violet-500",
    "bg-sky-500",
    "bg-orange-500",
    "bg-teal-500",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return palette[Math.abs(hash) % palette.length];
}

export function ProjectMembersSection({ project }: { project: Project }) {
  const {
    members,
    getMember,
    addProjectMember,
    updateProjectMemberRole,
    removeProjectMember,
    role,
  } = useApp();
  const canEdit = ROLE_POLICIES[role].canEditProject;
  const [showAdd, setShowAdd] = useState(false);
  const [pick, setPick] = useState("");
  const [pickRole, setPickRole] = useState<MembershipRole>("Contributor");

  const assigned = new Set(project.members.map((mm) => mm.memberId));
  const available = members.filter((m) => !assigned.has(m.id));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!pick) return;
    addProjectMember(project.id, pick, pickRole);
    setPick("");
    setPickRole("Contributor");
    setShowAdd(false);
  }

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-700">Project members ({project.members.length})</h2>
        {canEdit ? (
          <button onClick={() => setShowAdd((s) => !s)} className="text-xs font-medium text-brand-600 hover:underline">
            {showAdd ? "Cancel" : "+ Add member"}
          </button>
        ) : null}
      </div>

      {showAdd && canEdit ? (
        <form onSubmit={submit} className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-slate-100 bg-slate-50/60 p-2">
          <select value={pick} onChange={(e) => setPick(e.target.value)} className="flex-1 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm" required>
            <option value="">Select a member…</option>
            {available.map((mb) => (
              <option key={mb.id} value={mb.id}>
                {mb.name} — {mb.title ?? "Member"}
              </option>
            ))}
            {available.length === 0 ? <option disabled>All members already assigned</option> : null}
          </select>
          <select value={pickRole} onChange={(e) => setPickRole(e.target.value as MembershipRole)} className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm">
            {ROLES.map((r) => <option key={r}>{r}</option>)}
          </select>
          <button type="submit" className="btn-primary">Add</button>
        </form>
      ) : null}

      <ul className="mt-3 divide-y divide-slate-100">
        {project.members.length === 0 ? (
          <li className="py-3 text-sm text-slate-400">No members assigned yet.</li>
        ) : (
          project.members.map((mm) => {
            const mb = getMember(mm.memberId);
            if (!mb) {
              return (
                <li key={mm.memberId} className="py-2 text-sm text-slate-400">
                  Unknown member ({mm.memberId})
                  {canEdit ? (
                    <button onClick={() => removeProjectMember(project.id, mm.memberId)} className="ml-2 text-rose-500 hover:underline">
                      remove
                    </button>
                  ) : null}
                </li>
              );
            }
            return (
              <li key={mm.memberId} className="flex items-center gap-3 py-2">
                <span className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-white ${avatarColor(mb.name)}`}>
                  {initials(mb.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-slate-800">{mb.name}</div>
                  <div className="truncate text-xs text-slate-500">{mb.email} · {mb.phone}</div>
                </div>
                {canEdit ? (
                  <select
                    value={mm.role}
                    onChange={(e) => updateProjectMemberRole(project.id, mm.memberId, e.target.value as MembershipRole)}
                    className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs"
                  >
                    {ROLES.map((r) => <option key={r}>{r}</option>)}
                  </select>
                ) : (
                  <span className="badge bg-slate-100 text-slate-600">{mm.role}</span>
                )}
                {canEdit ? (
                  <button onClick={() => removeProjectMember(project.id, mm.memberId)} className="text-xs text-rose-500 hover:underline" title="Remove">
                    remove
                  </button>
                ) : null}
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
