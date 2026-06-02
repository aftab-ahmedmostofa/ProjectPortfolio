"use client";

import { useApp } from "./AppProvider";
import { MultiSelect } from "./MultiSelect";
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

interface Chip {
  label: string;
  remove: () => void;
}

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

  const removeValue = (key: keyof PortfolioFilters, value: string) => {
    const current = filters[key] as string[];
    update({ [key]: current.filter((v) => v !== value) } as Partial<PortfolioFilters>);
  };

  const chips: Chip[] = [];
  filters.country.forEach((v) => chips.push({ label: `Country: ${v}`, remove: () => removeValue("country", v) }));
  filters.subsidiary.forEach((v) => chips.push({ label: `Subsidiary: ${v}`, remove: () => removeValue("subsidiary", v) }));
  filters.businessUnit.forEach((v) => chips.push({ label: `BU: ${v}`, remove: () => removeValue("businessUnit", v) }));
  filters.status.forEach((v) => chips.push({ label: `Status: ${v}`, remove: () => removeValue("status", v) }));
  filters.priority.forEach((v) => chips.push({ label: `Priority: ${v}`, remove: () => removeValue("priority", v) }));
  filters.riskLevel.forEach((v) => chips.push({ label: `Risk: ${v}`, remove: () => removeValue("riskLevel", v) }));
  if (filters.dateFrom) chips.push({ label: `Ends ≥ ${filters.dateFrom}`, remove: () => update({ dateFrom: "" }) });
  if (filters.dateTo) chips.push({ label: `Ends ≤ ${filters.dateTo}`, remove: () => update({ dateTo: "" }) });
  if (filters.search.trim()) chips.push({ label: `“${filters.search.trim()}”`, remove: () => update({ search: "" }) });

  return (
    <div className="sticky top-[49px] z-10 border-b border-slate-200 bg-slate-50/95 backdrop-blur">
      <div className="flex flex-wrap items-center gap-2 px-6 py-2.5">
        <MultiSelect label="Country" values={filters.country} options={countries} onChange={(v) => update({ country: v })} />
        <MultiSelect label="Subsidiary" values={filters.subsidiary} options={subsidiaries} onChange={(v) => update({ subsidiary: v })} />
        <MultiSelect label="Business Unit" values={filters.businessUnit} options={businessUnits} onChange={(v) => update({ businessUnit: v })} />
        <MultiSelect label="Status" values={filters.status} options={STATUSES as unknown as string[]} onChange={(v) => update({ status: v as ProjectStatus[] })} />
        <MultiSelect label="Priority" values={filters.priority} options={PRIORITIES as unknown as string[]} onChange={(v) => update({ priority: v as PortfolioFilters["priority"] })} />
        <MultiSelect label="Risk" values={filters.riskLevel} options={RISK_LEVELS as unknown as string[]} onChange={(v) => update({ riskLevel: v as PortfolioFilters["riskLevel"] })} />

        <div className="flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs shadow-sm">
          <span className="text-slate-500">Ends</span>
          <input type="date" value={filters.dateFrom} onChange={(e) => update({ dateFrom: e.target.value })} className="bg-transparent text-slate-700 focus:outline-none" />
          <span className="text-slate-400">→</span>
          <input type="date" value={filters.dateTo} onChange={(e) => update({ dateTo: e.target.value })} className="bg-transparent text-slate-700 focus:outline-none" />
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
          {chips.map((c, i) => (
            <button
              key={i}
              onClick={c.remove}
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
