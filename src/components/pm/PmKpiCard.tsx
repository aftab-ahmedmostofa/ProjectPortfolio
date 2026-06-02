"use client";

import { Sparkline } from "./Sparkline";

export function PmKpiCard({
  label,
  value,
  series,
  delta,
  selected = false,
  onClick,
}: {
  label: string;
  value: string;
  series: number[];
  delta?: string;
  selected?: boolean;
  onClick?: () => void;
}) {
  const interactive = !!onClick;
  return (
    <div
      onClick={onClick}
      className={`group relative flex items-center justify-between rounded-md border bg-white px-4 py-3 transition-shadow ${interactive ? "cursor-pointer hover:shadow-md" : ""} ${selected ? "border-teal-400 ring-2 ring-teal-200" : "border-slate-200"}`}
    >
      <span className={`absolute inset-y-3 left-0 w-1 rounded-r ${selected ? "bg-teal-500" : "bg-teal-400"}`} aria-hidden />
      <div className="pl-2">
        <div className="text-[26px] font-bold leading-none tracking-tight text-slate-900">{value}</div>
        <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</div>
      </div>
      <div className="text-right">
        {delta ? <div className="mb-0.5 text-[11px] font-medium text-slate-500">{delta}</div> : null}
        <Sparkline data={series} />
      </div>
    </div>
  );
}
