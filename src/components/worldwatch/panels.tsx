"use client";

import type { ReactNode } from "react";

// Shared chrome for the dashboard's framed panels — thin cyan-tinted border,
// uppercase tracking-wide header with a status dot, optional right-side action.
export function Panel({
  title,
  right,
  children,
  className = "",
  bodyClass = "",
}: {
  title: string;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClass?: string;
}) {
  return (
    <section
      className={`flex min-h-0 flex-col rounded-md border border-cyan-400/15 bg-[#0a1626]/70 backdrop-blur-sm ${className}`}
    >
      <header className="flex items-center justify-between border-b border-cyan-400/10 px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee]" />
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-100/80">
            {title}
          </h2>
        </div>
        {right}
      </header>
      <div className={`min-h-0 flex-1 ${bodyClass}`}>{children}</div>
    </section>
  );
}

// Filled area sparkline used by the PARAMETERS panel.
export function Sparkline({
  data,
  color = "#22d3ee",
  height = 56,
}: {
  data: number[];
  color?: string;
  height?: number;
}) {
  const w = 100;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const span = max - min || 1;
  const step = w / (data.length - 1 || 1);
  const pts = data.map((d, i) => [i * step, height - ((d - min) / span) * height]);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const area = `${line} L${w},${height} L0,${height} Z`;
  const id = `spk-${color.replace("#", "")}`;
  return (
    <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" className="h-full w-full">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.4" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth={1.4} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

// Compact KPI tile for the right-hand stat grid.
export function StatTile({
  label,
  value,
  delta,
  color = "#22d3ee",
}: {
  label: string;
  value: string;
  delta?: string;
  color?: string;
}) {
  const up = delta?.startsWith("+");
  return (
    <div className="rounded border border-white/5 bg-white/[0.02] px-2.5 py-2">
      <div className="text-[9px] uppercase tracking-wider text-slate-400">{label}</div>
      <div className="mt-1 font-mono text-lg leading-none text-slate-100" style={{ color }}>
        {value}
      </div>
      {delta && (
        <div className={`mt-1 text-[10px] font-medium ${up ? "text-emerald-400" : "text-rose-400"}`}>
          {delta}
        </div>
      )}
    </div>
  );
}
