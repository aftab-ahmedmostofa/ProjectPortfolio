"use client";

import { useApp } from "./AppProvider";
import { ALL_ROLES, ROLE_POLICIES } from "@/lib/rbac";
import { Role } from "@/lib/types";

export function TopBar() {
  const {
    role,
    setRole,
    filters,
    setFilters,
    countries,
    businessUnits,
    subsidiaries,
  } = useApp();

  const policy = ROLE_POLICIES[role];

  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 px-6 py-3 backdrop-blur">
      <div className="flex flex-wrap items-center gap-3">
        <div className="mr-auto flex flex-wrap items-center gap-2">
          <FilterSelect
            label="Country"
            value={filters.country}
            options={countries}
            onChange={(v) => setFilters({ ...filters, country: v })}
          />
          <FilterSelect
            label="Business Unit"
            value={filters.businessUnit}
            options={businessUnits}
            onChange={(v) => setFilters({ ...filters, businessUnit: v })}
          />
          <FilterSelect
            label="Subsidiary"
            value={filters.subsidiary}
            options={subsidiaries}
            onChange={(v) => setFilters({ ...filters, subsidiary: v })}
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Signed in as</span>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm font-medium"
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

function FilterSelect({
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
    <label className="flex items-center gap-1.5 text-xs text-slate-500">
      <span className="hidden sm:inline">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-700"
      >
        <option value="All">All {label}s</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}
