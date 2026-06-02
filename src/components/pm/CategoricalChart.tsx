"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  Treemap as RTreemap,
} from "recharts";
import { HorizontalLollipop, VerticalLollipop } from "./Lollipop";
import { ChartKind } from "./ChartTypeSelector";

interface Datum {
  name: string;
  count: number;
}

const TEAL = "#2DD4BF";
const TEAL_DARK = "#14B8A6";
const SLATE = "#94A3B8";
const PALETTE = ["#14B8A6", "#2DD4BF", "#5EEAD4", "#94A3B8", "#CBD5E1", "#0F766E", "#0D9488", "#115E59"];

interface Props {
  kind: ChartKind;
  data: Datum[];
  selected?: Set<string>;
  onSelect?: (name: string) => void;
  orientation?: "horizontal" | "vertical";
}

export function CategoricalChart({ kind, data, selected = new Set(), onSelect, orientation = "horizontal" }: Props) {
  if (data.length === 0) return <p className="text-xs text-slate-400">No data.</p>;

  const inactiveOf = (name: string) => selected.size > 0 && !selected.has(name);

  if (kind === "lollipop") {
    return <HorizontalLollipop data={data} selected={selected} onSelect={onSelect} />;
  }

  if (kind === "v-lollipop") {
    return <VerticalLollipop data={data} selected={selected} onSelect={onSelect} />;
  }

  if (kind === "bar" || kind === "v-bar") {
    const horizontal = kind === "bar";
    return (
      <ResponsiveContainer width="100%" height={horizontal ? Math.max(180, data.length * 32) : 220}>
        <BarChart
          data={data}
          layout={horizontal ? "vertical" : "horizontal"}
          margin={{ top: 8, right: 24, bottom: 0, left: horizontal ? 80 : 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={horizontal} horizontal={!horizontal} />
          {horizontal ? (
            <>
              <XAxis type="number" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#475569" }} axisLine={false} tickLine={false} width={80} />
            </>
          ) : (
            <>
              <XAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#475569" }} axisLine={false} tickLine={false} />
              <YAxis type="number" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
            </>
          )}
          <Tooltip cursor={{ fill: "rgba(20, 184, 166, 0.08)" }} />
          <Bar
            dataKey="count"
            radius={horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]}
            onClick={(d) => onSelect && d && (d as { name: string }).name && onSelect((d as { name: string }).name)}
          >
            {data.map((d) => (
              <Cell key={d.name} fill={inactiveOf(d.name) ? SLATE : TEAL} cursor={onSelect ? "pointer" : "default"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (kind === "donut" || kind === "pie") {
    return (
      <SliceChart
        data={data}
        innerRadiusRatio={kind === "donut" ? 0.55 : 0}
        selected={selected}
        onSelect={onSelect}
      />
    );
  }

  if (kind === "treemap") {
    return (
      <ResponsiveContainer width="100%" height={220}>
        <RTreemap
          data={data.map((d, i) => ({ name: d.name, size: d.count, fill: PALETTE[i % PALETTE.length] }))}
          dataKey="size"
          stroke="#fff"
          fill={TEAL}
          content={<TreemapCell selected={selected} onSelect={onSelect} />}
        />
      </ResponsiveContainer>
    );
  }

  // default fallback
  return <HorizontalLollipop data={data} selected={selected} onSelect={onSelect} />;
}

// Local pie/donut renderer (independent from Health donut so we can reuse it for categorical).
function SliceChart({
  data,
  innerRadiusRatio,
  selected,
  onSelect,
}: {
  data: Datum[];
  innerRadiusRatio: number;
  selected: Set<string>;
  onSelect?: (name: string) => void;
}) {
  const total = data.reduce((s, d) => s + d.count, 0);
  if (total === 0) return <p className="text-xs text-slate-400">No data.</p>;
  const cx = 110;
  const cy = 110;
  const r = 90;
  const ri = r * innerRadiusRatio;
  let acc = 0;
  const slices = data.map((d, i) => {
    const start = (acc / total) * Math.PI * 2 - Math.PI / 2;
    const end = ((acc + d.count) / total) * Math.PI * 2 - Math.PI / 2;
    acc += d.count;
    return { d, start, end, color: PALETTE[i % PALETTE.length] };
  });
  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 220 220" className="h-44 w-44">
        {slices.map(({ d, start, end, color }) => {
          if (d.count === 0) return null;
          const inactive = selected.size > 0 && !selected.has(d.name);
          return (
            <path
              key={d.name}
              d={sliceArc(cx, cy, start, end, r, ri)}
              fill={inactive ? "#E2E8F0" : color}
              stroke="#fff"
              strokeWidth={2}
              onClick={onSelect ? () => onSelect(d.name) : undefined}
              className={onSelect ? "cursor-pointer" : ""}
            />
          );
        })}
        {innerRadiusRatio > 0 ? (
          <>
            <text x={cx} y={cy - 2} textAnchor="middle" fontSize={20} fontWeight={700} fill="#0f172a">{total}</text>
            <text x={cx} y={cy + 14} textAnchor="middle" fontSize={10} fill="#64748b">total</text>
          </>
        ) : null}
      </svg>
      <ul className="space-y-1 text-xs">
        {data.map((d, i) => {
          const pct = total > 0 ? (d.count / total) * 100 : 0;
          const isSelected = selected.has(d.name);
          return (
            <li
              key={d.name}
              onClick={onSelect ? () => onSelect(d.name) : undefined}
              className={`flex cursor-pointer items-center gap-2 ${isSelected ? "font-semibold text-slate-900" : "text-slate-600"}`}
            >
              <span className="h-2 w-3 rounded-sm" style={{ background: PALETTE[i % PALETTE.length] }} />
              <span className="flex-1 truncate">{d.name}</span>
              <span className="font-medium">{d.count}</span>
              <span className="text-[10px] text-slate-400">({pct.toFixed(0)}%)</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function sliceArc(cx: number, cy: number, start: number, end: number, ro: number, ri: number): string {
  const large = end - start > Math.PI ? 1 : 0;
  const x0 = cx + ro * Math.cos(start);
  const y0 = cy + ro * Math.sin(start);
  const x1 = cx + ro * Math.cos(end);
  const y1 = cy + ro * Math.sin(end);
  if (ri <= 0) {
    return `M ${cx} ${cy} L ${x0} ${y0} A ${ro} ${ro} 0 ${large} 1 ${x1} ${y1} Z`;
  }
  const xi1 = cx + ri * Math.cos(end);
  const yi1 = cy + ri * Math.sin(end);
  const xi0 = cx + ri * Math.cos(start);
  const yi0 = cy + ri * Math.sin(start);
  return `M ${x0} ${y0} A ${ro} ${ro} 0 ${large} 1 ${x1} ${y1} L ${xi1} ${yi1} A ${ri} ${ri} 0 ${large} 0 ${xi0} ${yi0} Z`;
}

function TreemapCell(props: {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  name?: string;
  size?: number;
  fill?: string;
  selected?: Set<string>;
  onSelect?: (n: string) => void;
}) {
  const { x = 0, y = 0, width = 0, height = 0, name = "", size, fill, selected, onSelect } = props;
  if (!name) return null;
  const inactive = selected && selected.size > 0 && !selected.has(name);
  return (
    <g onClick={onSelect ? () => onSelect(name) : undefined} className={onSelect ? "cursor-pointer" : ""}>
      <rect x={x} y={y} width={width} height={height} fill={inactive ? "#E2E8F0" : fill ?? TEAL_DARK} stroke="#fff" strokeWidth={2} />
      {width > 60 && height > 30 ? (
        <>
          <text x={x + 6} y={y + 16} fontSize={11} fontWeight={600} fill="#fff">{name}</text>
          <text x={x + 6} y={y + 30} fontSize={10} fill="#fff" opacity={0.8}>{size}</text>
        </>
      ) : null}
    </g>
  );
}
