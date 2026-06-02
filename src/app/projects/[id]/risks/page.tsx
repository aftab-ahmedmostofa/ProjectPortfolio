"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useApp } from "@/components/AppProvider";
import { RiskRegister } from "@/components/RiskRegister";
import { RiskDashboardStats } from "@/components/RiskDashboardStats";

export default function ProjectRisksPage() {
  const params = useParams();
  const { allProjects } = useApp();
  const project = allProjects.find((p) => p.id === params.id);

  if (!project) {
    return (
      <div className="card p-8 text-center">
        <p className="text-slate-600">Project not found or outside your access scope.</p>
        <Link href="/projects" className="mt-3 inline-block text-sm text-brand-600 hover:underline">
          ← Back to projects
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-2 text-sm">
          <Link href={`/projects/${project.id}`} className="text-brand-600 hover:underline">← {project.name}</Link>
          <span className="text-slate-400">· Risk register</span>
        </div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Risk Register · {project.name}</h1>
        <p className="text-sm text-slate-500">
          Add, edit, assign and track risks for this project. Severity is calculated automatically from probability × impact.
        </p>
      </div>

      <RiskDashboardStats projects={[project]} title="Project risk dashboard" />

      <RiskRegister projects={[project]} defaultProjectId={project.id} mode="project" />
    </div>
  );
}
