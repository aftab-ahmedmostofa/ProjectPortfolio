"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Globe } from "@/components/worldwatch/Globe";
import { Panel, Sparkline, StatTile } from "@/components/worldwatch/panels";
import {
  REGIONS,
  SIGNALS,
  SIGNAL_BY_KIND,
  makeEvent,
  seedEvents,
  seedSeries,
  type GlobeEvent,
  type SignalKind,
} from "@/components/worldwatch/data";

const EVENT_CAP = 220;

export default function WorldWatchPage() {
  const [enabled, setEnabled] = useState<Set<SignalKind>>(
    () => new Set(SIGNALS.map((s) => s.kind))
  );
  const [selectedId, setSelectedId] = useState("cn");
  const [events, setEvents] = useState<GlobeEvent[]>(() => seedEvents(160, 0));
  const [series, setSeries] = useState<number[]>(() => seedSeries(40));
  const [autoSpin, setAutoSpin] = useState(true);
  const [clock, setClock] = useState<string>("--:--:--");

  const selected = useMemo(
    () => REGIONS.find((r) => r.id === selectedId) ?? REGIONS[0],
    [selectedId]
  );

  // Live event spawning + decay. Client-only timer (Math.random is fine here;
  // the initial seed used a deterministic PRNG for hydration safety).
  useEffect(() => {
    let next = 100000;
    const id = setInterval(() => {
      setEvents((prev) => {
        const now = performance.now();
        const add = Array.from({ length: 3 }, () => makeEvent(Math.random, next++, now));
        const merged = [...prev, ...add];
        return merged.length > EVENT_CAP ? merged.slice(merged.length - EVENT_CAP) : merged;
      });
    }, 900);
    return () => clearInterval(id);
  }, []);

  // Drift the PARAMETERS series.
  useEffect(() => {
    const id = setInterval(() => {
      setSeries((prev) => {
        const v = Math.max(8, Math.min(96, prev[prev.length - 1] + (Math.random() - 0.48) * 16));
        return [...prev.slice(1), Math.round(v)];
      });
    }, 1200);
    return () => clearInterval(id);
  }, []);

  // UTC clock — set after mount to avoid SSR/hydration drift.
  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setClock(
        `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}:${String(d.getUTCSeconds()).padStart(2, "0")}`
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // Selecting a region steers the globe; pause idle spin for a beat afterwards.
  const selectRegion = useCallback((id: string) => {
    setSelectedId(id);
    setAutoSpin(false);
    window.clearTimeout((selectRegion as any)._t);
    (selectRegion as any)._t = window.setTimeout(() => setAutoSpin(true), 6000);
  }, []);

  const toggleSignal = useCallback((kind: SignalKind) => {
    setEnabled((prev) => {
      const next = new Set(prev);
      next.has(kind) ? next.delete(kind) : next.add(kind);
      return next;
    });
  }, []);

  // Per-kind live counts for the legend + stream rows.
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const s of SIGNALS) c[s.kind] = 0;
    for (const e of events) c[e.kind]++;
    return c;
  }, [events]);

  const totalSignals = useMemo(
    () => REGIONS.reduce((a, r) => a + r.signals, 0),
    []
  );

  // Direct-DOM positioning of the floating info card (avoids 60fps React state).
  const cardRef = useRef<HTMLDivElement>(null);
  const onHighlightPoint = useCallback(
    (p: { x: number; y: number; visible: boolean } | null) => {
      const el = cardRef.current;
      if (!el) return;
      if (!p || !p.visible) {
        el.style.opacity = "0";
        return;
      }
      el.style.opacity = "1";
      el.style.transform = `translate(${p.x + 16}px, ${p.y - 18}px)`;
    },
    []
  );

  const target = useMemo(() => ({ lon: selected.lon, lat: selected.lat }), [selected]);

  return (
    <div className="fixed inset-0 z-[60] flex flex-col overflow-hidden bg-[#05070d] font-sans text-slate-200">
      {/* Ambient background: vignette + faint grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.5]"
        style={{
          backgroundImage:
            "radial-gradient(ellipse at 50% 38%, rgba(22,55,90,0.45), rgba(5,7,13,0) 60%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(120,200,240,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(120,200,240,0.5) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
        }}
      />

      <TopBar clock={clock} />

      <div className="relative z-10 flex min-h-0 flex-1 gap-2 px-2 pb-2">
        {/* ---------------- LEFT COLUMN ---------------- */}
        <div className="flex w-[266px] shrink-0 flex-col gap-2">
          <Panel
            title="Signal Streams"
            right={<span className="text-[9px] text-slate-500">{events.length} live</span>}
          >
            <ul className="divide-y divide-white/5">
              {SIGNALS.map((s) => {
                const on = enabled.has(s.kind);
                return (
                  <li key={s.kind}>
                    <button
                      onClick={() => toggleSignal(s.kind)}
                      className={`flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-white/[0.03] ${
                        on ? "" : "opacity-40"
                      }`}
                    >
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ background: s.color, boxShadow: `0 0 7px ${s.color}` }}
                      />
                      <span className="flex-1 text-xs text-slate-300">{s.label}</span>
                      <span className="font-mono text-xs text-slate-400">{counts[s.kind]}</span>
                      <span
                        className={`h-3 w-3 rounded-sm border ${
                          on ? "border-cyan-400/70 bg-cyan-400/20" : "border-white/15"
                        }`}
                      />
                    </button>
                  </li>
                );
              })}
            </ul>
          </Panel>

          <Panel
            title="Active Regions"
            className="flex-1"
            bodyClass="overflow-y-auto"
            right={<span className="text-[9px] text-slate-500">{REGIONS.length}</span>}
          >
            <ul className="divide-y divide-white/5">
              {REGIONS.map((r) => {
                const active = r.id === selectedId;
                const statusColor =
                  r.status === "critical"
                    ? "#fb7185"
                    : r.status === "elevated"
                    ? "#fbbf24"
                    : "#34d399";
                return (
                  <li key={r.id}>
                    <button
                      onClick={() => selectRegion(r.id)}
                      className={`flex w-full items-center gap-2 px-3 py-2 text-left transition-colors ${
                        active ? "bg-cyan-400/10" : "hover:bg-white/[0.03]"
                      }`}
                    >
                      <span
                        className="h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ background: statusColor, boxShadow: `0 0 6px ${statusColor}` }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`truncate text-xs ${active ? "text-cyan-200" : "text-slate-200"}`}
                          >
                            {r.name}
                          </span>
                          <span className="font-mono text-[9px] text-slate-500">{r.code}</span>
                        </div>
                      </div>
                      <span className="font-mono text-xs text-slate-300">
                        {r.signals.toLocaleString()}
                      </span>
                      <span
                        className={`w-9 text-right font-mono text-[10px] ${
                          r.trend >= 0 ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {r.trend >= 0 ? "+" : ""}
                        {r.trend}%
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </Panel>
        </div>

        {/* ---------------- CENTER (GLOBE) ---------------- */}
        <div className="relative flex min-w-0 flex-1 flex-col gap-2">
          <div className="relative min-h-0 flex-1 overflow-hidden rounded-md border border-cyan-400/15 bg-[#070f1c]/60">
            <Globe
              events={events}
              enabled={enabled}
              target={target}
              highlightName={selected.name}
              autoSpin={autoSpin}
              onHighlightPoint={onHighlightPoint}
            />

            {/* corner HUD readouts */}
            <div className="pointer-events-none absolute left-3 top-3 font-mono text-[10px] leading-relaxed text-cyan-200/60">
              <div>LAT {selected.lat.toFixed(2)}°</div>
              <div>LON {selected.lon.toFixed(2)}°</div>
              <div className="text-cyan-300/80">ORTHOGRAPHIC · LIVE</div>
            </div>
            <div className="pointer-events-none absolute right-3 top-3 text-right font-mono text-[10px] leading-relaxed text-cyan-200/60">
              <div>SAT-LINK 0x{(totalSignals % 65536).toString(16).toUpperCase()}</div>
              <div>UTC {clock}</div>
              <div className="text-emerald-400/80">● TRACKING</div>
            </div>

            {/* floating selected-country card (positioned via direct DOM) */}
            <div
              ref={cardRef}
              className="pointer-events-none absolute left-0 top-0 w-44 rounded-md border border-cyan-400/30 bg-[#0a1626]/90 p-2.5 opacity-0 shadow-[0_0_24px_rgba(34,211,238,0.18)] backdrop-blur-sm transition-opacity duration-200"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-cyan-100">{selected.name}</span>
                <span className="font-mono text-[9px] text-slate-500">{selected.code}</span>
              </div>
              <div className="mt-1.5 grid grid-cols-2 gap-1.5 text-[10px]">
                <div>
                  <div className="text-slate-500">Signals</div>
                  <div className="font-mono text-cyan-200">{selected.signals.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-slate-500">24h Trend</div>
                  <div
                    className={`font-mono ${selected.trend >= 0 ? "text-emerald-400" : "text-rose-400"}`}
                  >
                    {selected.trend >= 0 ? "+" : ""}
                    {selected.trend}%
                  </div>
                </div>
                <div>
                  <div className="text-slate-500">Status</div>
                  <div className="font-mono uppercase text-amber-300">{selected.status}</div>
                </div>
                <div>
                  <div className="text-slate-500">Coord</div>
                  <div className="font-mono text-slate-300">
                    {selected.lat.toFixed(0)},{selected.lon.toFixed(0)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* legend ticker under the globe */}
          <div className="flex items-center gap-4 rounded-md border border-cyan-400/15 bg-[#0a1626]/70 px-4 py-2">
            <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-cyan-100/70">
              Signal Mix
            </span>
            <div className="flex flex-1 flex-wrap items-center gap-x-5 gap-y-1">
              {SIGNALS.map((s) => (
                <span key={s.kind} className="flex items-center gap-1.5">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: s.color, boxShadow: `0 0 6px ${s.color}` }}
                  />
                  <span className="text-[11px] text-slate-400">{s.label}</span>
                  <span className="font-mono text-[11px] text-slate-200">{counts[s.kind]}</span>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* ---------------- RIGHT COLUMN ---------------- */}
        <div className="flex w-[300px] shrink-0 flex-col gap-2">
          <Panel title="Global Index">
            <div className="grid grid-cols-3 gap-1.5 p-2.5">
              <StatTile label="Signals" value={totalSignals.toLocaleString()} delta="+3.2%" />
              <StatTile label="Live Feeds" value={`${events.length}`} delta="+12" color="#a3e635" />
              <StatTile label="Regions" value={`${REGIONS.length}`} color="#e879f9" />
              <StatTile label="Quakes" value={`${counts.earthquake}`} delta="+2" color="#fb923c" />
              <StatTile label="Flights" value={`${counts.flight}`} delta="-5" color="#a3e635" />
              <StatTile label="Cameras" value={`${counts.camera}`} delta="+1" color="#facc15" />
            </div>
          </Panel>

          <Panel
            title="Parameters"
            right={
              <span className="font-mono text-[11px] text-cyan-300">{series[series.length - 1]}</span>
            }
          >
            <div className="px-3 pb-2.5 pt-1">
              <div className="flex items-baseline justify-between">
                <span className="text-[10px] text-slate-500">Global activity index</span>
                <span className="text-[10px] text-emerald-400">+1.8% 24h</span>
              </div>
              <div className="mt-1.5 h-16">
                <Sparkline data={series} />
              </div>
              <div className="mt-2 grid grid-cols-3 gap-1.5 text-center">
                {["Volatility", "Coverage", "Latency"].map((k, i) => (
                  <div key={k} className="rounded border border-white/5 bg-white/[0.02] py-1.5">
                    <div className="font-mono text-sm text-slate-100">
                      {[`${(series[series.length - 1] / 10).toFixed(1)}`, "98%", "42ms"][i]}
                    </div>
                    <div className="text-[9px] uppercase tracking-wide text-slate-500">{k}</div>
                  </div>
                ))}
              </div>
            </div>
          </Panel>

          <Panel title="Live Feed" className="flex-1" bodyClass="overflow-y-auto">
            <LiveFeed events={events} />
          </Panel>
        </div>
      </div>

      <StatusBar clock={clock} total={totalSignals} live={events.length} region={selected.name} />
    </div>
  );
}

function TopBar({ clock }: { clock: string }) {
  const nav = ["Global", "Regions", "Signals", "Analytics", "Archive", "Alerts"];
  return (
    <header className="relative z-20 flex h-12 shrink-0 items-center justify-between border-b border-cyan-400/15 bg-[#070f1c]/80 px-3 backdrop-blur-sm">
      <div className="flex items-center gap-2.5">
        <div className="relative grid h-7 w-7 place-items-center rounded-sm bg-cyan-400/10">
          <div className="h-4 w-4 rounded-full border border-cyan-300/80 shadow-[0_0_8px_#22d3ee]" />
          <div className="absolute h-4 w-2 rounded-full border border-cyan-300/40" />
        </div>
        <div className="leading-none">
          <div className="text-sm font-bold tracking-[0.22em] text-slate-100">WORLDWATCH</div>
          <div className="mt-0.5 text-[8px] tracking-[0.3em] text-cyan-300/70">
            REAL-TIME GLOBAL SIGNALS
          </div>
        </div>
        <span className="ml-2 flex items-center gap-1 rounded-sm border border-emerald-400/30 bg-emerald-400/10 px-1.5 py-0.5 text-[9px] font-semibold tracking-wider text-emerald-300">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
          LIVE
        </span>
      </div>

      <nav className="hidden items-center gap-0.5 md:flex">
        {nav.map((n, i) => (
          <button
            key={n}
            className={`rounded px-2.5 py-1 text-[11px] font-medium tracking-wide transition-colors ${
              i === 0 ? "text-cyan-200" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {n}
          </button>
        ))}
      </nav>

      <div className="flex items-center gap-2">
        <span className="hidden font-mono text-[11px] text-slate-400 lg:block">UTC {clock}</span>
        <button className="rounded-sm border border-cyan-400/40 bg-cyan-400/10 px-3 py-1 text-[11px] font-semibold tracking-wide text-cyan-200 transition-colors hover:bg-cyan-400/20">
          Support Project
        </button>
      </div>
    </header>
  );
}

function LiveFeed({ events }: { events: GlobeEvent[] }) {
  // Newest first; show a window of recent events.
  const recent = [...events].slice(-14).reverse();
  return (
    <ul className="divide-y divide-white/5">
      {recent.map((e) => {
        const sig = SIGNAL_BY_KIND[e.kind];
        return (
          <li key={e.id} className="flex items-center gap-2.5 px-3 py-2">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ background: sig.color, boxShadow: `0 0 6px ${sig.color}` }}
            />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[11px] text-slate-200">
                {sig.label} signal detected
              </div>
              <div className="font-mono text-[9px] text-slate-500">
                {e.lat.toFixed(1)}°, {e.lon.toFixed(1)}° · mag {(e.mag * 9).toFixed(1)}
              </div>
            </div>
            <span className="font-mono text-[9px] uppercase text-slate-500">{e.kind}</span>
          </li>
        );
      })}
    </ul>
  );
}

function StatusBar({
  clock,
  total,
  live,
  region,
}: {
  clock: string;
  total: number;
  live: number;
  region: string;
}) {
  return (
    <footer className="relative z-20 flex h-7 shrink-0 items-center justify-between border-t border-cyan-400/15 bg-[#070f1c]/80 px-3 font-mono text-[10px] text-slate-400">
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1.5 text-emerald-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> CONNECTED
        </span>
        <span>NODES 0x{(total % 4096).toString(16).toUpperCase()}</span>
        <span className="hidden sm:inline">FOCUS {region.toUpperCase()}</span>
      </div>
      <div className="flex items-center gap-4">
        <span>SIGNALS {total.toLocaleString()}</span>
        <span className="text-cyan-300">LIVE {live}</span>
        <span>UTC {clock}</span>
      </div>
    </footer>
  );
}
