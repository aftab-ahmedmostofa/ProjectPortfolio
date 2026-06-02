import { ReactNode } from "react";

type Tone = "neutral" | "good" | "warn" | "bad";

export function KpiCard({
  label,
  value,
  sub,
  tone = "neutral",
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: Tone;
  icon?: ReactNode;
}) {
  const valueTone = {
    neutral: "text-slate-900",
    good: "text-emerald-600",
    warn: "text-amber-600",
    bad: "text-rose-600",
  }[tone];

  const accent = {
    neutral: "bg-slate-300",
    good: "bg-emerald-500",
    warn: "bg-amber-500",
    bad: "bg-rose-500",
  }[tone];

  return (
    <div className="card relative overflow-hidden p-4 transition-shadow hover:shadow-md">
      <span className={`absolute inset-y-0 left-0 w-1 ${accent}`} aria-hidden />
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</span>
        {icon ? <span className="text-slate-300">{icon}</span> : null}
      </div>
      <div className={`mt-2 text-[26px] font-semibold leading-none ${valueTone}`}>{value}</div>
      {sub ? <div className="mt-1.5 text-xs text-slate-500">{sub}</div> : null}
    </div>
  );
}
