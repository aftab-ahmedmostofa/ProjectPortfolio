// Static + synthesized data for the WORLDWATCH dashboard. The numbers are
// generated deterministically (seeded) so server and client render identically
// on first paint; the live feed then mutates them on a timer client-side.

export type SignalKind =
  | "earthquake"
  | "news"
  | "flight"
  | "market"
  | "camera"
  | "ip";

export const SIGNALS: {
  kind: SignalKind;
  label: string;
  color: string; // marker / glow colour
  glow: string; // rgba used for the soft halo
}[] = [
  { kind: "earthquake", label: "Earthquakes", color: "#fb923c", glow: "251,146,60" },
  { kind: "news", label: "News", color: "#22d3ee", glow: "34,211,238" },
  { kind: "flight", label: "Flights", color: "#a3e635", glow: "163,230,53" },
  { kind: "market", label: "Markets", color: "#e879f9", glow: "232,121,249" },
  { kind: "camera", label: "Cameras", color: "#facc15", glow: "250,204,21" },
  { kind: "ip", label: "IP / Mobile", color: "#5eead4", glow: "94,234,212" },
];

export const SIGNAL_BY_KIND = Object.fromEntries(
  SIGNALS.map((s) => [s.kind, s])
) as Record<SignalKind, (typeof SIGNALS)[number]>;

// Watched regions. lon/lat are rotation targets for the globe; the small
// metrics drive the side-panel rows. Picked to span the hemispheres so the
// globe makes a visible turn between selections.
export type Region = {
  id: string;
  name: string;
  code: string;
  lon: number;
  lat: number;
  signals: number;
  trend: number; // -100..100
  status: "live" | "elevated" | "critical";
};

export const REGIONS: Region[] = [
  { id: "cn", name: "China", code: "CHN", lon: 104.2, lat: 35.9, signals: 1284, trend: 18, status: "elevated" },
  { id: "jp", name: "Japan", code: "JPN", lon: 138.3, lat: 36.2, signals: 942, trend: 6, status: "live" },
  { id: "us", name: "United States", code: "USA", lon: -95.7, lat: 39.1, signals: 1761, trend: -4, status: "live" },
  { id: "in", name: "India", code: "IND", lon: 78.9, lat: 22.6, signals: 1106, trend: 24, status: "elevated" },
  { id: "ru", name: "Russia", code: "RUS", lon: 99.5, lat: 61.5, signals: 658, trend: 11, status: "live" },
  { id: "tr", name: "Türkiye", code: "TUR", lon: 35.2, lat: 38.9, signals: 533, trend: 41, status: "critical" },
  { id: "br", name: "Brazil", code: "BRA", lon: -51.9, lat: -10.8, signals: 487, trend: -8, status: "live" },
  { id: "de", name: "Germany", code: "DEU", lon: 10.4, lat: 51.2, signals: 612, trend: 3, status: "live" },
  { id: "ng", name: "Nigeria", code: "NGA", lon: 8.7, lat: 9.1, signals: 274, trend: 16, status: "elevated" },
  { id: "au", name: "Australia", code: "AUS", lon: 133.8, lat: -25.3, signals: 318, trend: -2, status: "live" },
  { id: "id", name: "Indonesia", code: "IDN", lon: 113.9, lat: -2.5, signals: 701, trend: 33, status: "critical" },
  { id: "za", name: "South Africa", code: "ZAF", lon: 24.9, lat: -29.0, signals: 209, trend: 5, status: "live" },
];

// A point event plotted on the globe.
export type GlobeEvent = {
  id: number;
  kind: SignalKind;
  lon: number;
  lat: number;
  mag: number; // 0..1 — drives marker radius / glow
  born: number; // ms timestamp the marker appeared (for fade-in)
};

// Densely-populated source coordinates so generated events cluster over land /
// cities the way the reference imagery does, rather than scattering over ocean.
const HOTSPOTS: [number, number][] = [
  [116.4, 39.9], [121.5, 31.2], [114.1, 22.4], [113.3, 23.1], [104.1, 30.7], // China
  [139.7, 35.7], [135.5, 34.7], [126.9, 37.6], [127.0, 37.5], // JP/KR
  [77.2, 28.6], [72.9, 19.1], [88.4, 22.6], [80.3, 13.1], // India
  [55.3, 25.3], [46.7, 24.7], [51.4, 35.7], [35.2, 31.8], // ME
  [-74.0, 40.7], [-118.2, 34.1], [-87.6, 41.9], [-95.4, 29.8], [-122.4, 37.8], // US
  [-99.1, 19.4], [-58.4, -34.6], [-46.6, -23.5], [-43.2, -22.9], // LatAm
  [-0.1, 51.5], [2.3, 48.9], [13.4, 52.5], [12.5, 41.9], [37.6, 55.8], [28.9, 41.0], // EU/RU
  [106.8, -6.2], [100.5, 13.8], [101.7, 3.1], [103.8, 1.4], [120.9, 14.6], // SEA
  [3.4, 6.5], [31.2, 30.0], [36.8, -1.3], [18.4, -33.9], // Africa
  [151.2, -33.9], [144.9, -37.8], // Oceania
];

// Mulberry32 — tiny deterministic PRNG so SSR and the first client render agree.
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeEvent(rand: () => number, id: number, now: number): GlobeEvent {
  const [hlon, hlat] = HOTSPOTS[Math.floor(rand() * HOTSPOTS.length)];
  const kind = SIGNALS[Math.floor(rand() * SIGNALS.length)].kind;
  // Jitter around the hotspot so clusters look organic.
  const lon = hlon + (rand() - 0.5) * 14;
  const lat = hlat + (rand() - 0.5) * 10;
  return { id, kind, lon, lat, mag: 0.25 + rand() * 0.75, born: now };
}

// Build the initial field of events. `now` is passed in so callers control the
// timestamp (avoids Date.now() drift between SSR and hydration).
export function seedEvents(count: number, now: number): GlobeEvent[] {
  const rand = mulberry32(0x9e3779b9);
  return Array.from({ length: count }, (_, i) => makeEvent(rand, i, now));
}

// Sparkline series for the PARAMETERS panel — seeded so it's stable on hydrate.
export function seedSeries(points: number): number[] {
  const rand = mulberry32(0x1234567);
  let v = 50;
  return Array.from({ length: points }, () => {
    v = Math.max(8, Math.min(96, v + (rand() - 0.48) * 18));
    return Math.round(v);
  });
}
