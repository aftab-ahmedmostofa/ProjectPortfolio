"use client";

// Horizontal lollipop: thin teal line ending in a circle with the value badge.
export function HorizontalLollipop({
  data,
  onSelect,
  selected = new Set<string>(),
  formatLabel = (s) => s,
}: {
  data: { name: string; count: number }[];
  onSelect?: (name: string) => void;
  selected?: Set<string>;
  formatLabel?: (s: string) => string;
}) {
  if (data.length === 0) return <p className="text-xs text-slate-400">No data.</p>;
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <ul className="space-y-3">
      {data.map((d) => {
        const pct = (d.count / max) * 100;
        const isSelected = selected.has(d.name);
        const inactive = selected.size > 0 && !isSelected;
        return (
          <li
            key={d.name}
            onClick={onSelect ? () => onSelect(d.name) : undefined}
            className={`grid items-center gap-2 ${onSelect ? "cursor-pointer" : ""}`}
            style={{ gridTemplateColumns: "150px 1fr 32px" }}
          >
            <span className={`truncate text-xs ${isSelected ? "font-semibold text-slate-900" : "text-slate-600"}`}>
              {formatLabel(d.name)}
            </span>
            <div className="relative h-2">
              <div className="absolute inset-y-1/2 left-0 h-px w-full -translate-y-1/2 bg-slate-100" />
              <div
                className={`absolute inset-y-1/2 left-0 h-0.5 -translate-y-1/2 transition-all ${inactive ? "bg-slate-300" : "bg-teal-400"}`}
                style={{ width: `${pct}%` }}
              />
              <div
                className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border-2 border-white shadow-sm ${inactive ? "bg-slate-300" : "bg-teal-400"}`}
                style={{ left: `calc(${pct}% - 8px)` }}
              />
            </div>
            <span className="text-right text-xs font-medium text-slate-700">{d.count}</span>
          </li>
        );
      })}
    </ul>
  );
}

// Vertical lollipop: circles on top of thin vertical lines (used for Priority).
export function VerticalLollipop({
  data,
  onSelect,
  selected = new Set<string>(),
}: {
  data: { name: string; count: number }[];
  onSelect?: (name: string) => void;
  selected?: Set<string>;
}) {
  if (data.length === 0) return <p className="text-xs text-slate-400">No data.</p>;
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="grid grid-cols-1 gap-2" style={{ gridTemplateColumns: `repeat(${data.length}, minmax(0, 1fr))` }}>
      {data.map((d) => {
        const heightPct = (d.count / max) * 100;
        const isSelected = selected.has(d.name);
        const inactive = selected.size > 0 && !isSelected;
        return (
          <button
            key={d.name}
            type="button"
            onClick={onSelect ? () => onSelect(d.name) : undefined}
            className="flex h-44 flex-col items-center justify-end gap-1"
          >
            <div
              className="relative flex flex-col items-center justify-end"
              style={{ height: `${Math.max(20, heightPct)}%`, minHeight: 32 }}
            >
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full border-2 ${inactive ? "border-slate-300 text-slate-400" : "border-teal-400 text-teal-700"} bg-white text-xs font-semibold`}
              >
                {d.count}
              </div>
              <div className={`mt-0 w-px flex-1 ${inactive ? "bg-slate-200" : "bg-teal-400"}`} />
            </div>
            <span className={`text-[11px] ${isSelected ? "font-semibold text-slate-900" : "text-slate-500"}`}>
              {d.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}
