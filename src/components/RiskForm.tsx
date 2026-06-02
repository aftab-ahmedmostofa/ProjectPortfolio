"use client";

import { useState } from "react";
import { Risk, RiskCategory, RISK_CATEGORIES, Member } from "@/lib/types";
import { deriveSeverity, PROBABILITY_LABELS, IMPACT_LABELS } from "@/lib/risks";
import { SeverityBadge } from "./RiskBadges";

interface FormState {
  title: string;
  description: string;
  category: RiskCategory;
  probability: 1 | 2 | 3 | 4 | 5;
  impact: 1 | 2 | 3 | 4 | 5;
  mitigation: string;
  ownerId: string;
  dueDate: string;
}

const empty: FormState = {
  title: "",
  description: "",
  category: "Operational",
  probability: 3,
  impact: 3,
  mitigation: "",
  ownerId: "",
  dueDate: "",
};

export function RiskForm({
  members,
  initial,
  onSubmit,
  onCancel,
  submitLabel = "Add risk",
}: {
  members: Member[];
  initial?: Partial<Risk>;
  onSubmit: (f: {
    title: string;
    description: string;
    category: RiskCategory;
    probability: 1 | 2 | 3 | 4 | 5;
    impact: 1 | 2 | 3 | 4 | 5;
    mitigation: string;
    ownerId?: string;
    dueDate?: string;
  }) => void;
  onCancel?: () => void;
  submitLabel?: string;
}) {
  const [form, setForm] = useState<FormState>({
    ...empty,
    ...(initial
      ? {
          title: initial.title ?? "",
          description: initial.description ?? "",
          category: initial.category ?? "Operational",
          probability: (initial.probability ?? 3) as 1 | 2 | 3 | 4 | 5,
          impact: (initial.impact ?? 3) as 1 | 2 | 3 | 4 | 5,
          mitigation: initial.mitigation ?? "",
          ownerId: initial.ownerId ?? "",
          dueDate: initial.dueDate ?? "",
        }
      : {}),
  });

  const previewSeverity = deriveSeverity(form.probability, form.impact);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    onSubmit({
      title: form.title.trim(),
      description: form.description.trim(),
      category: form.category,
      probability: form.probability,
      impact: form.impact,
      mitigation: form.mitigation.trim(),
      ownerId: form.ownerId || undefined,
      dueDate: form.dueDate || undefined,
    });
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Title</span>
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
            placeholder="Concise risk statement"
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Category</span>
          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value as RiskCategory })}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            {RISK_CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
      </div>

      <label className="block">
        <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Description</span>
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          rows={2}
          placeholder="What could happen, why, and the consequences?"
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        />
      </label>

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block">
          <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Probability (1–5)</span>
          <select
            value={form.probability}
            onChange={(e) => setForm({ ...form, probability: Number(e.target.value) as 1 | 2 | 3 | 4 | 5 })}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>{n} — {PROBABILITY_LABELS[n]}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Impact (1–5)</span>
          <select
            value={form.impact}
            onChange={(e) => setForm({ ...form, impact: Number(e.target.value) as 1 | 2 | 3 | 4 | 5 })}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>{n} — {IMPACT_LABELS[n]}</option>
            ))}
          </select>
        </label>
        <div>
          <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Calculated severity</span>
          <div className="mt-1 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
            <span className="text-slate-500">Score {form.probability * form.impact}</span>
            <SeverityBadge severity={previewSeverity} />
          </div>
        </div>
      </div>

      <label className="block">
        <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Mitigation plan</span>
        <textarea
          value={form.mitigation}
          onChange={(e) => setForm({ ...form, mitigation: e.target.value })}
          rows={2}
          placeholder="How will the risk be reduced or handled?"
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        />
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Owner</span>
          <select
            value={form.ownerId}
            onChange={(e) => setForm({ ...form, ownerId: e.target.value })}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="">Unassigned</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} {m.title ? `— ${m.title}` : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Due date</span>
          <input
            type="date"
            value={form.dueDate}
            onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          />
        </label>
      </div>

      <div className="flex gap-2">
        <button type="submit" className="btn-primary">{submitLabel}</button>
        {onCancel ? <button type="button" onClick={onCancel} className="btn-ghost">Cancel</button> : null}
      </div>
    </form>
  );
}
