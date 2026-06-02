"use client";

import { useApp } from "./AppProvider";
import { PortfolioFilters, ProjectStatus } from "@/lib/types";

const STATUSES: ProjectStatus[] = [
  "Planning",
  "In Progress",
  "Delayed",
  "On Hold",
  "Completed",
  "Cancelled",
];
const PRIORITIES = ["Low", "Medium", "High"] as const;
const RISK_LEVELS = ["Low", "Medium", "High"] as const;

export function FilterBar() {
  const {
    filters,
    setFilters,
    resetFilters,
    countries,
    businessUnits,
    subsidiaries,
    allProjects,
    projects,
  } = useApp();

  const update = (patch: Partial<PortfolioFilters>) => setFilters({ ...filters, ...patch });

  const chips: { key: keyof PortfolioFilters; label: string }[] = [];
  if (filters.country !== "All") chips.push({ key: "country", label: `Country: ${filters.country}` });
  if (filters.subsidiary !== "All") chips.push({ key: "subsidiary", label: `Subsidiary: ${filters.subsidiary}` });
  if (filters.businessUnit !== "All") chips.push({ key: "businessUnit", label: `BU: ${filters.businessUnit}` });
  if (filters.status !== "All") chips.push({ key: "status", label: `Status: ${filters.status}` });
  if (filters.priority !== "All") chips.push({ key: "priority", label: `Priority: ${filters.priority}` });
  if (filters.riskLevel !== "All") chips.push({ key: "riskLevel", label: `Risk: ${filters.riskLevel}` });
  if (filters.dateFrom) chips.push({ key: "dateFrom", label: `Ends ≥ ${filters.dateFrom}` });
  if (filters.dateTo) chips.push({ key: "dateTo", label: `Ends ≤ ${filters.dateTo}` });
  if (filters.search.trim()) chips.push({ key: "search", label: `“${filters.search.trim()}”` });

  function clearChip(key: keyof PortfolioFilters) {
    if (key === "search") return update({ search: "" });
    if (key === "dateFrom") return update({ dateFrom: "" });
    if (key === "dateTo") return update({ dateTo: "" });
    return update({ [key]: "All" } as Partial<PortfolioFilters>);
  }

  return (
    <div className="sticky top-[49px] z-10 border-b border-slate-200 bg-slate-50/95 backdrop-blur">
      <div className="flex flex-wrap items-center gap-2 px-6 py-2.5">
        <FilterSelect label="Country" value={filters.country} options={countries} onChange={(v) => update({ country: v })} />
        <FilterSelect label="Subsidiary" value={filters.subsidiary} options={subsidiaries} onChange={(v) => update({ subsidiary: v })} />
        <FilterSelect label="Business Unit" value={filters.businessUnit} options={businessUnits} onChange={(v) => update({ businessUnit: v })} />
        <FilterSelect label="Status" value={filters.status} options={STATUSES as unknown as string[]} onChange={(v) => update({ status: v as ProjectStatus | "All" })} />
        <FilterSelect label="Priority" value={filters.priority} options={PRIORITIES as unknown as string[]} onChange={(v) => update({ priority: v as PortfolioFilters["priority"] })} />
        <FilterSelect label="Risk" value={filters.riskLevel} options={RISK_LEVELS as unknown as string[]} onChange={(v) => update({ riskLevel: v as PortfolioFilters["riskLevel"] })} />

        <div className="flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs shadow-sm">
          <span className="text-slate-500">Ends</span>
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => update({ dateFrom: e.target.value })}
            className="bg-transparent text-slate-700 focus:outline-none"
          />
          <span className="text-slate-400">→</span>
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => update({ dateTo: e.target.value })}
            className="bg-transparent text-slate-700 focus:outline-none"
          />
        </div>

        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs text-slate-500">
            Showing <span className="font-semibold text-slate-700">{projects.length}</span> of {allProjects.length}
          </span>
          <button
            onClick={resetFilters}
            disabled={chips.length === 0}
            className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Reset filters
          </button>
        </div>
      </div>

      {chips.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-200/80 bg-white/60 px-6 py-1.5">
          <span className="text-[11px] uppercase tracking-wide text-slate-400">Active</span>
          {chips.map((c) => (
            <button
              key={String(c.key)}
              onClick={() => clearChip(c.key)}
              className="group inline-flex items-center gap-1 rounded-full border border-brand-200 bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-700 hover:bg-brand-100"
            >
              {c.label}
              <span className="text-brand-400 group-hover:text-brand-700">×</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
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
  const active = value !== "All";
  return (
    <label className={`flex items-center gap-1 rounded-lg border bg-white px-2 py-1 text-xs shadow-sm ${active ? "border-brand-300" : "border-slate-300"}`}>
      <span className="text-slate-500">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`bg-transparent text-sm focus:outline-none ${active ? "font-medium text-brand-700" : "text-slate-700"}`}
      >
        <option value="All">All</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}
