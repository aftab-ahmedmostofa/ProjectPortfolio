"use client";

import Link from "next/link";
import { Project } from "@/lib/types";
import { formatCurrency } from "@/lib/format";

export function ApprovalQueueWidget({ projects }: { projects: Project[] }) {
  const queue = projects
    .map((p) => {
      const pending = p.approvals.find((a) => a.decision === "Pending");
      const blocked = p.approvals.some((a) => a.decision === "Rejected");
      return pending && !blocked ? { p, level: pending.level, role: pending.role } : null;
    })
    .filter(Boolean) as { p: Project; level: number; role: string }[];

  const total = queue.length;
  const preview = queue.slice(0, 4);

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <div>
          <div className="text-3xl font-semibold text-slate-900">{total}</div>
          <div className="text-xs text-slate-500">awaiting decision</div>
        </div>
        <Link href="/approvals" className="text-xs font-medium text-brand-600 hover:underline">
          Review queue →
        </Link>
      </div>

      <ul className="mt-3 divide-y divide-slate-100">
        {preview.map(({ p, level, role }) => (
          <li key={p.id} className="flex items-center justify-between py-2">
            <Link href={`/projects/${p.id}`} className="min-w-0">
              <div className="truncate text-sm font-medium text-slate-700">{p.name}</div>
              <div className="truncate text-xs text-slate-400">
                {p.subsidiary} · {formatCurrency(p.budget)}
              </div>
            </Link>
            <span className="badge bg-amber-100 text-amber-800">L{level} · {role}</span>
          </li>
        ))}
        {preview.length === 0 ? (
          <li className="py-2 text-sm text-slate-400">No pending approvals.</li>
        ) : null}
      </ul>
    </div>
  );
}
