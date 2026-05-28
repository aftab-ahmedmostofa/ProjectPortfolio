"use client";

import Link from "next/link";
import { useState } from "react";
import { useApp } from "@/components/AppProvider";
import { StatusBadge, RiskBadge, ProgressBar } from "@/components/ui";
import { assessRisk, forecastCost } from "@/lib/analytics";
import { formatCurrency } from "@/lib/format";
import { ROLE_POLICIES } from "@/lib/rbac";
import { Project } from "@/lib/types";

export default function ProjectsPage() {
  const { projects, role, addProject } = useApp();
  const [showForm, setShowForm] = useState(false);
  const canRegister = ROLE_POLICIES[role].canRegisterProject;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Projects</h1>
          <p className="text-sm text-slate-500">{projects.length} project(s) in scope.</p>
        </div>
        {canRegister ? (
          <button className="btn-primary" onClick={() => setShowForm((s) => !s)}>
            {showForm ? "Close" : "+ Register Project"}
          </button>
        ) : (
          <span className="text-xs text-slate-400">Read-only for {role}</span>
        )}
      </div>

      {showForm && canRegister ? (
        <RegisterForm
          onCreate={(p) => {
            addProject(p);
            setShowForm(false);
          }}
        />
      ) : null}

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Project</th>
              <th className="px-4 py-3">Subsidiary / Country</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 w-40">Progress</th>
              <th className="px-4 py-3 text-right">Budget / Actual</th>
              <th className="px-4 py-3">Risk</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {projects.map((p) => {
              const risk = assessRisk(p);
              const cost = forecastCost(p);
              const over = cost.projectedOverrun > 0;
              return (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link href={`/projects/${p.id}`} className="font-medium text-brand-700 hover:underline">
                      {p.name}
                    </Link>
                    <div className="text-xs text-slate-400">{p.code} · {p.businessUnit}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {p.subsidiary}
                    <div className="text-xs text-slate-400">{p.country}</div>
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                  <td className="px-4 py-3">
                    <ProgressBar value={p.progress} tone={p.status === "Delayed" ? "amber" : "brand"} />
                    <div className="mt-1 text-xs text-slate-400">{p.progress}%</div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="text-slate-700">{formatCurrency(p.budget)}</div>
                    <div className={`text-xs ${over ? "text-rose-600" : "text-slate-400"}`}>
                      {formatCurrency(p.actualCost)} spent
                    </div>
                  </td>
                  <td className="px-4 py-3"><RiskBadge level={risk.level} score={risk.score} /></td>
                </tr>
              );
            })}
            {projects.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-400">
                  No projects match the current filters / role scope.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RegisterForm({ onCreate }: { onCreate: (p: Project) => void }) {
  const [form, setForm] = useState({
    name: "",
    subsidiary: "Gulf Holdings",
    businessUnit: "Digital",
    country: "UAE",
    manager: "",
    budget: 500000,
    plannedEndDate: "2026-12-31",
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const id = `PRJ-${Math.floor(Math.random() * 9000 + 1000)}`;
    onCreate({
      id,
      code: form.name.slice(0, 4).toUpperCase().replace(/\s/g, "") || "NEW",
      name: form.name || "Untitled Project",
      description: "Newly registered project (pending governance review).",
      subsidiary: form.subsidiary,
      businessUnit: form.businessUnit,
      country: form.country,
      manager: form.manager || "Unassigned",
      status: "Planning",
      priority: "Medium",
      budget: Number(form.budget),
      actualCost: 0,
      progress: 0,
      startDate: new Date().toISOString().slice(0, 10),
      plannedEndDate: form.plannedEndDate,
      milestones: [],
      risks: [],
      approvals: [
        { level: 1, role: "PMO", approver: "PMO Board", decision: "Pending" },
        { level: 2, role: "CDO Office", approver: "Chief Digital Office", decision: "Pending" },
      ],
    });
  }

  const field = "rounded-lg border border-slate-300 px-3 py-2 text-sm";
  return (
    <form onSubmit={submit} className="card grid gap-3 p-4 sm:grid-cols-3">
      <input className={field} placeholder="Project name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
      <input className={field} placeholder="Manager" value={form.manager} onChange={(e) => setForm({ ...form, manager: e.target.value })} />
      <input className={field} type="number" placeholder="Budget" value={form.budget} onChange={(e) => setForm({ ...form, budget: Number(e.target.value) })} />
      <select className={field} value={form.subsidiary} onChange={(e) => setForm({ ...form, subsidiary: e.target.value })}>
        {["Gulf Holdings", "Levant Group", "Asia Pacific Co", "Europe Ltd"].map((s) => <option key={s}>{s}</option>)}
      </select>
      <select className={field} value={form.businessUnit} onChange={(e) => setForm({ ...form, businessUnit: e.target.value })}>
        {["Digital", "Infrastructure", "Operations", "Finance", "R&D"].map((s) => <option key={s}>{s}</option>)}
      </select>
      <select className={field} value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })}>
        {["UAE", "Saudi Arabia", "Egypt", "UK", "India", "Singapore"].map((s) => <option key={s}>{s}</option>)}
      </select>
      <label className="flex items-center gap-2 text-sm text-slate-600">
        Planned end
        <input className={field} type="date" value={form.plannedEndDate} onChange={(e) => setForm({ ...form, plannedEndDate: e.target.value })} />
      </label>
      <div className="sm:col-span-3">
        <button type="submit" className="btn-primary">Create &amp; route for approval</button>
      </div>
    </form>
  );
}
