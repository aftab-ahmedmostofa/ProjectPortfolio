"use client";

import { useApp } from "@/components/AppProvider";
import { RiskRegister } from "@/components/RiskRegister";
import { RiskDashboardStats } from "@/components/RiskDashboardStats";

export default function PortfolioRisksPage() {
  const { projects } = useApp();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Portfolio Risk Dashboard</h1>
        <p className="text-sm text-slate-500">
          Cross-project risk register. Severity is calculated from probability × impact; assigning a
          risk notifies the new owner.
        </p>
      </div>

      <RiskDashboardStats projects={projects} title="Portfolio risk overview" />

      <RiskRegister projects={projects} mode="portfolio" />
    </div>
  );
}
