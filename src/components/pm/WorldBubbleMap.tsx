"use client";

// Stylised world map with bubble markers per country. Continent silhouettes
// are intentionally rough — enough to read as a globe without shipping a
// 100KB topojson.

const CONTINENT_PATHS: string[] = [
  // North America
  "M 120 180 Q 110 130 160 120 Q 220 100 270 130 Q 320 150 320 200 Q 310 250 270 270 Q 220 290 180 260 Q 130 240 120 180 Z",
  // South America
  "M 300 300 Q 290 290 320 300 Q 360 310 380 360 Q 400 410 360 440 Q 320 450 310 410 Q 290 360 300 300 Z",
  // Greenland
  "M 350 90 Q 360 70 400 80 Q 410 110 380 120 Q 350 120 350 90 Z",
  // Europe + Western Russia
  "M 480 150 Q 490 130 540 130 Q 590 130 600 165 Q 600 195 560 200 Q 510 210 480 195 Q 470 170 480 150 Z",
  // Africa
  "M 510 230 Q 520 215 560 220 Q 600 230 605 280 Q 600 340 560 370 Q 520 380 510 340 Q 495 290 510 230 Z",
  // Asia
  "M 600 160 Q 620 130 700 130 Q 800 130 830 175 Q 840 220 800 245 Q 740 260 690 245 Q 630 245 605 215 Q 595 180 600 160 Z",
  // India subcontinent
  "M 690 230 Q 700 220 730 230 Q 740 260 720 275 Q 700 280 690 260 Q 685 240 690 230 Z",
  // SE Asia
  "M 760 270 Q 780 260 810 280 Q 820 300 800 310 Q 780 305 765 295 Q 755 285 760 270 Z",
  // Australia
  "M 800 340 Q 820 330 870 340 Q 890 365 870 385 Q 830 390 805 375 Q 795 360 800 340 Z",
  // Japan
  "M 855 200 Q 870 195 880 215 Q 885 230 870 235 Q 855 235 850 220 Q 850 205 855 200 Z",
];

export function WorldBubbleMap({
  points,
  onSelect,
  selected = new Set<string>(),
}: {
  points: { country: string; count: number; x: number; y: number }[];
  onSelect?: (country: string) => void;
  selected?: Set<string>;
}) {
  if (points.length === 0) return <p className="text-xs text-slate-400">No data.</p>;
  const max = Math.max(...points.map((p) => p.count), 1);
  return (
    <div className="w-full">
      <svg viewBox="0 0 1000 460" className="block w-full">
        {CONTINENT_PATHS.map((d, i) => (
          <path key={i} d={d} fill="#f1f5f9" stroke="#e2e8f0" strokeWidth={1} />
        ))}
        {points.map((p) => {
          const r = 8 + (p.count / max) * 22;
          const isSelected = selected.has(p.country);
          const inactive = selected.size > 0 && !isSelected;
          const fill = inactive ? "rgba(148, 163, 184, 0.5)" : "rgba(45, 212, 191, 0.7)";
          const stroke = inactive ? "#cbd5e1" : "#14b8a6";
          return (
            <g
              key={p.country}
              onClick={onSelect ? () => onSelect(p.country) : undefined}
              className={onSelect ? "cursor-pointer" : ""}
            >
              <circle cx={p.x} cy={p.y} r={r} fill={fill} stroke={stroke} strokeWidth={1.5} />
              <text
                x={p.x}
                y={p.y + 4}
                textAnchor="middle"
                fontSize={r > 14 ? 12 : 10}
                fontWeight={600}
                fill={inactive ? "#475569" : "#0f766e"}
              >
                {p.count}
              </text>
              <text x={p.x} y={p.y - r - 4} textAnchor="middle" fontSize={10} fill="#475569">
                {p.country}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
