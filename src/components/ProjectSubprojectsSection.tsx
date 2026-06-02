"use client";

import Link from "next/link";
import { useState } from "react";
import { useApp } from "./AppProvider";
import { Project } from "@/lib/types";
import { StatusBadge, ProgressBar } from "./ui";
import { ROLE_POLICIES } from "@/lib/rbac";
import { formatCurrency, formatDate } from "@/lib/format";

export function ProjectSubprojectsSection({ project }: { project: Project }) {
  const { getSubProjects, addSubProject, role } = useApp();
  const canCreate = ROLE_POLICIES[role].canRegisterProject;
  const children = getSubProjects(project.id);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    manager: "",
    budget: 250000,
    plannedEndDate: project.plannedEndDate,
    priority: "Medium" as "Low" | "Medium" | "High",
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    addSubProject(project.id, {
      name: form.name.trim(),
      description: form.description.trim() || `Sub-project of ${project.name}.`,
      manager: form.manager.trim() || project.manager,
      budget: Number(form.budget) || 0,
      plannedEndDate: form.plannedEndDate,
      priority: form.priority,
    });
    setForm({ ...form, name: "", description: "", manager: "" });
    setShow(false);
  }

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-700">Sub-projects ({children.length})</h2>
        {canCreate ? (
          <button onClick={() => setShow((s) => !s)} className="text-xs font-medium text-brand-600 hover:underline">
            {show ? "Cancel" : "+ Create sub-project"}
          </button>
        ) : null}
      </div>

      {show && canCreate ? (
        <form onSubmit={submit} className="mt-3 grid gap-2 rounded-lg border border-slate-100 bg-slate-50/70 p-3 sm:grid-cols-2">
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Sub-project name" required className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm sm:col-span-2" />
          <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Short description (optional)" className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm sm:col-span-2" />
          <input value={form.manager} onChange={(e) => setForm({ ...form, manager: e.target.value })} placeholder={`Manager (defaults to ${project.manager})`} className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm" />
          <input type="number" value={form.budget} min={0} onChange={(e) => setForm({ ...form, budget: Number(e.target.value) })} placeholder="Budget" className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm" />
          <input type="date" value={form.plannedEndDate} onChange={(e) => setForm({ ...form, plannedEndDate: e.target.value })} className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm" />
          <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as typeof form.priority })} className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm">
            {(["Low", "Medium", "High"] as const).map((p) => <option key={p}>{p}</option>)}
          </select>
          <div className="sm:col-span-2">
            <button type="submit" className="btn-primary">Create &amp; route for approval</button>
            <span className="ml-2 text-[11px] text-slate-500">Inherits {project.subsidiary} / {project.country} / {project.businessUnit}.</span>
          </div>
        </form>
      ) : null}

      <ul className="mt-3 divide-y divide-slate-100">
        {children.length === 0 ? (
          <li className="py-3 text-sm text-slate-400">No sub-projects yet.</li>
        ) : (
          children.map((c) => (
            <li key={c.id} className="py-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <Link href={`/projects/${c.id}`} className="text-sm font-medium text-brand-700 hover:underline">
                  ↳ {c.name}
                </Link>
                <StatusBadge status={c.status} />
                <span className="text-xs text-slate-400">{c.code}</span>
                <span className="ml-auto text-xs text-slate-500">{formatCurrency(c.budget)} · ends {formatDate(c.plannedEndDate)}</span>
              </div>
              <div className="mt-1">
                <ProgressBar value={c.progress} tone={c.status === "Delayed" ? "amber" : "brand"} />
                <div className="mt-1 text-[11px] text-slate-400">{c.progress}% complete · {c.manager}</div>
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
