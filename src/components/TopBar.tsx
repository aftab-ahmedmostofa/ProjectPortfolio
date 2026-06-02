"use client";

import { useApp } from "./AppProvider";
import { ALL_ROLES, ROLE_POLICIES } from "@/lib/rbac";
import { Role } from "@/lib/types";
import { TODAY } from "@/lib/data";

export function TopBar() {
  const { role, setRole, filters, setFilters } = useApp();
  const policy = ROLE_POLICIES[role];

  const asOf = TODAY.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="flex flex-wrap items-center gap-3 px-6 py-2.5">
        <div className="mr-auto flex items-center gap-2 text-xs text-slate-500">
          <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
          <span>Live · As of {asOf}</span>
        </div>

        <div className="relative">
          <input
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            placeholder="Search projects, codes, managers…"
            className="w-64 rounded-lg border border-slate-300 bg-white py-1.5 pl-8 pr-3 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          <span className="pointer-events-none absolute left-2.5 top-1.5 text-slate-400">⌕</span>
        </div>

        <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
          <span className="text-xs text-slate-500">Signed in as</span>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm font-medium shadow-sm"
            aria-label="Active role"
          >
            {ALL_ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <span className="badge bg-brand-50 text-brand-700">{policy.permission}</span>
        </div>
      </div>
    </header>
  );
}
