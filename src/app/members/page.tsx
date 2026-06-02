"use client";

import { useMemo, useState } from "react";
import { useApp } from "@/components/AppProvider";
import { Member } from "@/lib/types";
import { ROLE_POLICIES } from "@/lib/rbac";

const emptyForm = { name: "", email: "", phone: "", title: "" };

export default function MembersPage() {
  const { members, allProjects, addMember, updateMember, removeMember, role } = useApp();
  const canEdit = ROLE_POLICIES[role].canEditProject;
  const [show, setShow] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");

  // Count projects each member is assigned to.
  const projectsByMember = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of allProjects) {
      for (const mm of p.members) {
        counts.set(mm.memberId, (counts.get(mm.memberId) ?? 0) + 1);
      }
    }
    return counts;
  }, [allProjects]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return members;
    return members.filter((m) =>
      `${m.name} ${m.email} ${m.title ?? ""} ${m.phone}`.toLowerCase().includes(term)
    );
  }, [members, search]);

  function startEdit(m: Member) {
    setEditing(m.id);
    setForm({ name: m.name, email: m.email, phone: m.phone, title: m.title ?? "" });
    setShow(true);
  }
  function startAdd() {
    setEditing(null);
    setForm(emptyForm);
    setShow(true);
  }
  function submit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      title: form.title.trim() || undefined,
    };
    if (!payload.name) return;
    if (editing) updateMember(editing, payload);
    else addMember(payload);
    setShow(false);
    setEditing(null);
    setForm(emptyForm);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Member Directory</h1>
          <p className="text-sm text-slate-500">
            {members.length} people in the organisation. Add members here, then assign them to projects.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, title…"
            className="w-64 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          {canEdit ? (
            <button onClick={startAdd} className="btn-primary">+ Add member</button>
          ) : null}
        </div>
      </div>

      {show && canEdit ? (
        <form onSubmit={submit} className="card grid gap-2 p-4 sm:grid-cols-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 sm:col-span-4">
            {editing ? "Edit member" : "New member"}
          </div>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full name" required className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email" type="email" required className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Contact number" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Title (optional)" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <div className="sm:col-span-4 flex gap-2">
            <button type="submit" className="btn-primary">{editing ? "Save" : "Add"}</button>
            <button type="button" onClick={() => setShow(false)} className="btn-ghost">Cancel</button>
          </div>
        </form>
      ) : null}

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Member</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3 text-center">Projects</th>
              {canEdit ? <th className="px-4 py-3 text-right">Actions</th> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={canEdit ? 5 : 4} className="px-4 py-8 text-center text-sm text-slate-400">
                  No members match your search.
                </td>
              </tr>
            ) : (
              filtered.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-800">{m.name}</div>
                    <div className="text-xs text-slate-400">{m.title ?? "—"}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{m.email}</td>
                  <td className="px-4 py-3 text-slate-600">{m.phone}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="badge bg-slate-100 text-slate-600">{projectsByMember.get(m.id) ?? 0}</span>
                  </td>
                  {canEdit ? (
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => startEdit(m)} className="text-xs font-medium text-brand-600 hover:underline">Edit</button>
                      <button
                        onClick={() => {
                          if (confirm(`Remove ${m.name}? They will be removed from all projects.`)) removeMember(m.id);
                        }}
                        className="ml-3 text-xs font-medium text-rose-500 hover:underline"
                      >
                        Remove
                      </button>
                    </td>
                  ) : null}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
