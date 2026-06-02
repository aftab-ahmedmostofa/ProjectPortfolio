"use client";

import { useApp } from "@/components/AppProvider";
import { PortfolioTimeline } from "@/components/Timeline";

export default function TimelinePage() {
  const { projects } = useApp();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Portfolio Timeline</h1>
        <p className="text-sm text-slate-500">
          Planned vs actual delivery across every project in scope. Grey is the approved plan,
          blue is physical progress to date, and red marks AI-forecast schedule slip past the
          planned end date.
        </p>
      </div>

      <div className="card p-4">
        <PortfolioTimeline projects={projects} />
      </div>
    </div>
  );
}
