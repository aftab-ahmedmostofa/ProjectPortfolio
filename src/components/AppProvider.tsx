"use client";

import { createContext, useContext, useMemo, useState, ReactNode } from "react";
import { Project, PortfolioFilters, Role, EMPTY_FILTERS } from "@/lib/types";
import { projects as seedProjects } from "@/lib/data";
import { scopeProjects, ROLE_POLICIES } from "@/lib/rbac";
import { assessRisk } from "@/lib/analytics";

interface AppState {
  role: Role;
  setRole: (r: Role) => void;
  filters: PortfolioFilters;
  setFilters: (f: PortfolioFilters) => void;
  resetFilters: () => void;
  allProjects: Project[]; // scoped by role only
  projects: Project[]; // scoped by role + filters
  updateApproval: (
    projectId: string,
    level: number,
    decision: "Approved" | "Rejected",
    comment: string
  ) => void;
  addProject: (p: Project) => void;
  countries: string[];
  businessUnits: string[];
  subsidiaries: string[];
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>("Admin");
  const [filters, setFilters] = useState<PortfolioFilters>(EMPTY_FILTERS);
  const [data, setData] = useState<Project[]>(seedProjects);

  const allProjects = useMemo(() => scopeProjects(data, role), [data, role]);

  const projects = useMemo(() => {
    const term = filters.search.trim().toLowerCase();
    return allProjects.filter((p) => {
      if (filters.country !== "All" && p.country !== filters.country) return false;
      if (filters.businessUnit !== "All" && p.businessUnit !== filters.businessUnit) return false;
      if (filters.subsidiary !== "All" && p.subsidiary !== filters.subsidiary) return false;
      if (filters.status !== "All" && p.status !== filters.status) return false;
      if (filters.priority !== "All" && p.priority !== filters.priority) return false;
      if (filters.riskLevel !== "All" && assessRisk(p).level !== filters.riskLevel) return false;
      if (filters.dateFrom && p.plannedEndDate < filters.dateFrom) return false;
      if (filters.dateTo && p.plannedEndDate > filters.dateTo) return false;
      if (term) {
        const hay = `${p.name} ${p.code} ${p.manager} ${p.description}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  }, [allProjects, filters]);

  const resetFilters = () => setFilters(EMPTY_FILTERS);

  const countries = useMemo(
    () => Array.from(new Set(allProjects.map((p) => p.country))).sort(),
    [allProjects]
  );
  const businessUnits = useMemo(
    () => Array.from(new Set(allProjects.map((p) => p.businessUnit))).sort(),
    [allProjects]
  );
  const subsidiaries = useMemo(
    () => Array.from(new Set(allProjects.map((p) => p.subsidiary))).sort(),
    [allProjects]
  );

  function updateApproval(
    projectId: string,
    level: number,
    decision: "Approved" | "Rejected",
    comment: string
  ) {
    if (!ROLE_POLICIES[role].canApprove) return;
    setData((prev) =>
      prev.map((p) => {
        if (p.id !== projectId) return p;
        return {
          ...p,
          approvals: p.approvals.map((a) =>
            a.level === level
              ? { ...a, decision, comment, decidedAt: new Date().toISOString().slice(0, 10) }
              : a
          ),
        };
      })
    );
  }

  function addProject(p: Project) {
    setData((prev) => [p, ...prev]);
  }

  const value: AppState = {
    role,
    setRole,
    filters,
    setFilters,
    resetFilters,
    allProjects,
    projects,
    updateApproval,
    addProject,
    countries,
    businessUnits,
    subsidiaries,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
