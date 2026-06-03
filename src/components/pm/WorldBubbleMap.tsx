"use client";

import { useMemo } from "react";
import { geoNaturalEarth1, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { FeatureCollection, MultiPolygon, Polygon } from "geojson";
import worldTopo from "world-atlas/countries-110m.json";

// Accurate country centroids (lat, lon). Sourced from public data.
const COUNTRY_COORDS: Record<string, { lat: number; lon: number }> = {
  UAE: { lat: 23.42, lon: 53.85 },
  "Saudi Arabia": { lat: 23.89, lon: 45.08 },
  Egypt: { lat: 26.82, lon: 30.80 },
  UK: { lat: 55.38, lon: -3.44 },
  India: { lat: 20.59, lon: 78.96 },
  Singapore: { lat: 1.35, lon: 103.82 },
  USA: { lat: 37.09, lon: -95.71 },
  Canada: { lat: 56.13, lon: -106.35 },
  Brazil: { lat: -14.24, lon: -51.93 },
  Germany: { lat: 51.17, lon: 10.45 },
  Japan: { lat: 36.20, lon: 138.25 },
  Australia: { lat: -25.27, lon: 133.78 },
  France: { lat: 46.23, lon: 2.21 },
  China: { lat: 35.86, lon: 104.20 },
  Russia: { lat: 61.52, lon: 105.32 },
  Mexico: { lat: 23.63, lon: -102.55 },
  Nigeria: { lat: 9.08, lon: 8.68 },
  "South Africa": { lat: -30.56, lon: 22.94 },
};

const MAP_WIDTH = 1000;
const MAP_HEIGHT = 500;

// Build the projection once. Natural Earth gives a pleasant world shape and
// fits accurately to the supplied viewport.
const projection = geoNaturalEarth1().fitSize([MAP_WIDTH, MAP_HEIGHT], {
  type: "Sphere",
} as unknown as GeoJSON.GeometryObject);

const pathGenerator = geoPath(projection);

// Resolve the topojson countries into a single SVG path string at module load.
function buildLandPath(): string {
  // @ts-expect-error world-atlas topojson typing is loose; we know the shape.
  const fc = feature(worldTopo, worldTopo.objects.countries) as FeatureCollection<Polygon | MultiPolygon>;
  const parts: string[] = [];
  for (const f of fc.features) {
    const d = pathGenerator(f);
    if (d) parts.push(d);
  }
  return parts.join(" ");
}

const LAND_PATH = buildLandPath();

// Project a (lat, lon) point to (x, y) in the SVG viewport. Returns null
// when the point falls outside the map.
function project(lat: number, lon: number): [number, number] | null {
  const xy = projection([lon, lat]);
  return xy ? [xy[0], xy[1]] : null;
}

export function WorldBubbleMap({
  points,
  onSelect,
  selected = new Set<string>(),
}: {
  points: { country: string; count: number; x?: number; y?: number }[];
  onSelect?: (country: string) => void;
  selected?: Set<string>;
}) {
  // Resolve each country's (lat, lon) and project it to SVG coordinates.
  const resolved = useMemo(() => {
    return points
      .map((p) => {
        const coords = COUNTRY_COORDS[p.country];
        if (!coords) return null;
        const xy = project(coords.lat, coords.lon);
        if (!xy) return null;
        return { ...p, x: xy[0], y: xy[1] };
      })
      .filter(Boolean) as { country: string; count: number; x: number; y: number }[];
  }, [points]);

  if (points.length === 0) return <p className="text-xs text-slate-400">No data.</p>;
  const max = Math.max(...points.map((p) => p.count), 1);

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`} className="block w-full">
        {/* Ocean background */}
        <rect x={0} y={0} width={MAP_WIDTH} height={MAP_HEIGHT} fill="#f8fafc" />
        {/* Real-world country outlines */}
        <path d={LAND_PATH} fill="#e2e8f0" stroke="#cbd5e1" strokeWidth={0.4} />

        {/* Bubble markers */}
        {resolved.map((p) => {
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
