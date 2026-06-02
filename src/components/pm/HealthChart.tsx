"use client";

import { HealthDonut } from "./PmCharts";
import { HealthCategory } from "@/lib/pmAnalytics";
import { ChartKind } from "./ChartTypeSelector";

const HEALTH_COLOR: Record<HealthCategory, string> = {
  "On Track": "#14B8A6",
  "Needs Attention": "#5EEAD4",
  "At Risk": "#F97316",
  Blocked: "#94A3B8",
  "Not Set": "#CBD5E1",
};

export function HealthChart({
  kind,
  data,
  selected = new Set<string>(),
  onSelect,
}: {
  kind: ChartKind;
  data: { name: HealthCategory; count: number }[];
  selected?: Set<string>;
  onSelect?: (name: HealthCategory) => void;
}) {
  if (kind === "donut") return <HealthDonut data={data} selected={selected} onSelect={onSelect} />;

  if (kind === "pie") {
    return <HealthPie data={data} selected={selected} onSelect={onSelect} inner={0} />;
  }

  // Horizontal bar chart variant
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <ul className="space-y-3">
      {data.map((d) => {
        const isSelected = selected.has(d.name);
        const inactive = selected.size > 0 && !isSelected;
        const pct = (d.count / max) * 100;
        return (
          <li
            key={d.name}
            onClick={onSelect ? () => onSelect(d.name) : undefined}
            className="grid items-center gap-2 cursor-pointer"
            style={{ gridTemplateColumns: "120px 1fr 32px" }}
          >
            <span className={`truncate text-xs ${isSelected ? "font-semibold text-slate-900" : "text-slate-600"}`}>
              {d.name}
            </span>
            <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${pct}%`,
                  background: inactive ? "#CBD5E1" : HEALTH_COLOR[d.name],
                }}
              />
            </div>
            <span className="text-right text-xs font-medium text-slate-700">{d.count}</span>
          </li>
        );
      })}
    </ul>
  );
}

function HealthPie({
  data,
  selected,
  onSelect,
  inner,
}: {
  data: { name: HealthCategory; count: number }[];
  selected: Set<string>;
  onSelect?: (name: HealthCategory) => void;
  inner: number;
}) {
  const total = data.reduce((s, d) => s + d.count, 0);
  if (total === 0) return <p className="text-xs text-slate-400">No data.</p>;
  const cx = 110;
  const cy = 110;
  const r = 90;
  let acc = 0;
  const slices = data.map((d) => {
    const start = (acc / total) * Math.PI * 2 - Math.PI / 2;
    const end = ((acc + d.count) / total) * Math.PI * 2 - Math.PI / 2;
    acc += d.count;
    return { d, start, end };
  });

  function arc(start: number, end: number) {
    const large = end - start > Math.PI ? 1 : 0;
    const x0 = cx + r * Math.cos(start);
    const y0 = cy + r * Math.sin(start);
    const x1 = cx + r * Math.cos(end);
    const y1 = cy + r * Math.sin(end);
    if (inner <= 0) return `M ${cx} ${cy} L ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1} Z`;
    const xi1 = cx + inner * Math.cos(end);
    const yi1 = cy + inner * Math.sin(end);
    const xi0 = cx + inner * Math.cos(start);
    const yi0 = cy + inner * Math.sin(start);
    return `M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1} L ${xi1} ${yi1} A ${inner} ${inner} 0 ${large} 0 ${xi0} ${yi0} Z`;
  }

  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 220 220" className="h-44 w-44">
        {slices.map(({ d, start, end }) => {
          if (d.count === 0) return null;
          const inactive = selected.size > 0 && !selected.has(d.name);
          return (
            <path
              key={d.name}
              d={arc(start, end)}
              fill={inactive ? "#E2E8F0" : HEALTH_COLOR[d.name]}
              stroke="#fff"
              strokeWidth={2}
              onClick={onSelect ? () => onSelect(d.name) : undefined}
              className={onSelect ? "cursor-pointer" : ""}
            />
          );
        })}
      </svg>
      <ul className="space-y-1.5 text-xs">
        {data.map((d) => {
          const pct = total > 0 ? (d.count / total) * 100 : 0;
          const isSelected = selected.has(d.name);
          return (
            <li
              key={d.name}
              onClick={onSelect ? () => onSelect(d.name) : undefined}
              className={`flex cursor-pointer items-center gap-2 ${isSelected ? "font-semibold text-slate-900" : "text-slate-600"}`}
            >
              <span className="h-2 w-3 rounded-sm" style={{ background: HEALTH_COLOR[d.name] }} />
              <span className="flex-1">{d.name}</span>
              <span className="font-medium">{d.count}</span>
              <span className="text-[10px] text-slate-400">({pct.toFixed(1)}%)</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
