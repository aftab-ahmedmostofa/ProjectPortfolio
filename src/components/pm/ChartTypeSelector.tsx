"use client";

export type ChartKind =
  | "bar"
  | "lollipop"
  | "donut"
  | "pie"
  | "treemap"
  | "line"
  | "area"
  | "bars" // grouped bars
  | "scatter"
  | "v-lollipop"
  | "v-bar";

const ICONS: Record<ChartKind, React.ReactNode> = {
  bar: (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5">
      <rect x="2" y="3" width="10" height="2" rx="1" fill="currentColor" />
      <rect x="2" y="7" width="6" height="2" rx="1" fill="currentColor" />
      <rect x="2" y="11" width="12" height="2" rx="1" fill="currentColor" />
    </svg>
  ),
  lollipop: (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5">
      <line x1="2" y1="4" x2="12" y2="4" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="13" cy="4" r="2" fill="currentColor" />
      <line x1="2" y1="8" x2="7" y2="8" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="8" cy="8" r="2" fill="currentColor" />
      <line x1="2" y1="12" x2="9" y2="12" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="10" cy="12" r="2" fill="currentColor" />
    </svg>
  ),
  donut: (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5">
      <path d="M 8 1 A 7 7 0 1 1 1 8 L 4 8 A 4 4 0 1 0 8 4 Z" fill="currentColor" />
    </svg>
  ),
  pie: (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5">
      <path d="M 8 1 A 7 7 0 1 1 1 8 L 8 8 Z" fill="currentColor" />
    </svg>
  ),
  treemap: (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5">
      <rect x="1" y="1" width="8" height="9" fill="currentColor" />
      <rect x="10" y="1" width="5" height="5" fill="currentColor" opacity="0.7" />
      <rect x="10" y="7" width="5" height="3" fill="currentColor" opacity="0.5" />
      <rect x="1" y="11" width="14" height="4" fill="currentColor" opacity="0.35" />
    </svg>
  ),
  line: (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5">
      <polyline points="1,12 4,8 7,10 10,5 13,7 15,3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  ),
  area: (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5">
      <path d="M 1 14 L 4 9 L 7 11 L 10 6 L 13 8 L 15 4 L 15 14 Z" fill="currentColor" opacity="0.45" />
      <polyline points="1,14 4,9 7,11 10,6 13,8 15,4" fill="none" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  ),
  bars: (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5">
      <rect x="2" y="6" width="2" height="8" fill="currentColor" />
      <rect x="5" y="3" width="2" height="11" fill="currentColor" opacity="0.65" />
      <rect x="9" y="8" width="2" height="6" fill="currentColor" />
      <rect x="12" y="5" width="2" height="9" fill="currentColor" opacity="0.65" />
    </svg>
  ),
  scatter: (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5">
      <circle cx="3" cy="11" r="1.5" fill="currentColor" />
      <circle cx="6" cy="6" r="2.4" fill="currentColor" opacity="0.7" />
      <circle cx="10" cy="9" r="1.7" fill="currentColor" />
      <circle cx="12" cy="4" r="1.4" fill="currentColor" opacity="0.7" />
    </svg>
  ),
  "v-lollipop": (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5">
      <line x1="3" y1="14" x2="3" y2="6" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="3" cy="5" r="2" fill="currentColor" />
      <line x1="8" y1="14" x2="8" y2="3" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="8" cy="2.5" r="2" fill="currentColor" />
      <line x1="13" y1="14" x2="13" y2="8" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="13" cy="7" r="2" fill="currentColor" />
    </svg>
  ),
  "v-bar": (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5">
      <rect x="2" y="6" width="3" height="9" fill="currentColor" />
      <rect x="6.5" y="3" width="3" height="12" fill="currentColor" opacity="0.65" />
      <rect x="11" y="9" width="3" height="6" fill="currentColor" />
    </svg>
  ),
};

const LABEL: Record<ChartKind, string> = {
  bar: "Horizontal bar",
  lollipop: "Lollipop",
  donut: "Donut",
  pie: "Pie",
  treemap: "Treemap",
  line: "Line",
  area: "Area",
  bars: "Grouped bars",
  scatter: "Scatter",
  "v-lollipop": "Vertical lollipop",
  "v-bar": "Vertical bar",
};

export function ChartTypeSelector({
  options,
  value,
  onChange,
}: {
  options: ChartKind[];
  value: ChartKind;
  onChange: (v: ChartKind) => void;
}) {
  return (
    <div className="inline-flex items-center gap-0.5 rounded-md border border-slate-200 bg-slate-50 p-0.5">
      {options.map((opt) => {
        const active = opt === value;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            title={LABEL[opt]}
            aria-label={LABEL[opt]}
            aria-pressed={active}
            className={`flex h-6 w-6 items-center justify-center rounded transition-colors ${
              active ? "bg-white text-teal-600 shadow-sm" : "text-slate-400 hover:text-slate-700"
            }`}
          >
            {ICONS[opt]}
          </button>
        );
      })}
    </div>
  );
}
