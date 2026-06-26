"use client";

import { useEffect, useRef } from "react";
import { geoOrthographic, geoPath, geoGraticule10, geoDistance } from "d3-geo";
import { COUNTRIES } from "./worldGeo";
import { SIGNAL_BY_KIND, type GlobeEvent, type SignalKind } from "./data";

type Props = {
  events: GlobeEvent[];
  enabled: Set<SignalKind>;
  // Rotation target [lon, lat]; the globe eases toward [-lon, -lat].
  target: { lon: number; lat: number } | null;
  // Highlighted country name (matched against feature properties.name).
  highlightName: string | null;
  // Continuous idle spin when the user isn't steering to a country.
  autoSpin: boolean;
  // Reports the on-screen position of the highlighted country's centroid so
  // the parent can anchor an HTML info card. null when off-globe / none.
  onHighlightPoint?: (p: { x: number; y: number; visible: boolean } | null) => void;
};

const graticule = geoGraticule10();
const sphere = { type: "Sphere" } as const;

// Quintic ease — slow at both ends, like the reference's settle-on-country move.
const easeInOut = (t: number) =>
  t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2;

export function Globe({
  events,
  enabled,
  target,
  highlightName,
  autoSpin,
  onHighlightPoint,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Mutable rendering state kept in refs so the rAF loop never re-subscribes.
  const rotRef = useRef<[number, number]>([-105, -22]); // current rotation
  const tweenRef = useRef<{
    from: [number, number];
    to: [number, number];
    start: number;
    dur: number;
  } | null>(null);
  const stateRef = useRef({ events, enabled, highlightName, autoSpin });
  stateRef.current = { events, enabled, highlightName, autoSpin };

  // Start an eased rotation tween whenever the target country changes.
  useEffect(() => {
    if (!target) return;
    const to: [number, number] = [-target.lon, -target.lat];
    const from = rotRef.current;
    // Normalise the longitude delta to the short way round (avoid 350° spins).
    let dLon = ((to[0] - from[0] + 540) % 360) - 180;
    const dest: [number, number] = [from[0] + dLon, to[1]];
    tweenRef.current = {
      from: [from[0], from[1]],
      to: dest,
      start: performance.now(),
      dur: 1100,
    };
  }, [target]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const projection = geoOrthographic().clipAngle(90).precision(0.4);
    const path = geoPath(projection, ctx);
    let width = 0;
    let height = 0;
    let dpr = 1;

    function resize() {
      const rect = wrap!.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas!.width = Math.round(width * dpr);
      canvas!.height = Math.round(height * dpr);
      canvas!.style.width = `${width}px`;
      canvas!.style.height = `${height}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      const r = Math.min(width, height) / 2 - 6;
      projection
        .scale(r)
        .translate([width / 2, height / 2]);
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    let raf = 0;
    let last = performance.now();

    function frame(t: number) {
      const dt = Math.min(t - last, 64);
      last = t;
      const { events, enabled, highlightName, autoSpin } = stateRef.current;

      // --- advance rotation -------------------------------------------------
      const tween = tweenRef.current;
      if (tween) {
        const k = Math.min((t - tween.start) / tween.dur, 1);
        const e = easeInOut(k);
        rotRef.current = [
          tween.from[0] + (tween.to[0] - tween.from[0]) * e,
          tween.from[1] + (tween.to[1] - tween.from[1]) * e,
        ];
        if (k >= 1) tweenRef.current = null;
      } else if (autoSpin) {
        rotRef.current = [rotRef.current[0] + dt * 0.0045, rotRef.current[1]];
      }
      const rot = rotRef.current;
      projection.rotate([rot[0], rot[1], 0]);
      const center: [number, number] = [-rot[0], -rot[1]];

      // --- draw -------------------------------------------------------------
      ctx!.clearRect(0, 0, width, height);
      const cx = width / 2;
      const cy = height / 2;
      const R = projection.scale();

      // Outer atmosphere glow.
      const atmo = ctx!.createRadialGradient(cx, cy, R * 0.86, cx, cy, R * 1.16);
      atmo.addColorStop(0, "rgba(56,189,248,0.16)");
      atmo.addColorStop(1, "rgba(56,189,248,0)");
      ctx!.fillStyle = atmo;
      ctx!.beginPath();
      ctx!.arc(cx, cy, R * 1.16, 0, Math.PI * 2);
      ctx!.fill();

      // Ocean sphere with a subtly lit gradient.
      const ocean = ctx!.createRadialGradient(
        cx - R * 0.35,
        cy - R * 0.4,
        R * 0.1,
        cx,
        cy,
        R
      );
      ocean.addColorStop(0, "#13314f");
      ocean.addColorStop(0.55, "#0c1f37");
      ocean.addColorStop(1, "#060f1d");
      ctx!.beginPath();
      path(sphere);
      ctx!.fillStyle = ocean;
      ctx!.fill();

      // Graticule.
      ctx!.beginPath();
      path(graticule);
      ctx!.strokeStyle = "rgba(94,180,224,0.12)";
      ctx!.lineWidth = 0.6;
      ctx!.stroke();

      // Country fills.
      for (const f of COUNTRIES) {
        const isHi =
          highlightName && f.properties.name === highlightName ? true : false;
        ctx!.beginPath();
        path(f as unknown as Parameters<typeof path>[0]);
        ctx!.fillStyle = isHi ? "rgba(45,212,191,0.30)" : "rgba(40,78,110,0.55)";
        ctx!.fill();
        ctx!.lineWidth = isHi ? 1.1 : 0.45;
        ctx!.strokeStyle = isHi
          ? "rgba(94,234,212,0.9)"
          : "rgba(86,151,191,0.35)";
        ctx!.stroke();
      }

      // Event markers — only those on the near hemisphere.
      for (const ev of events) {
        if (!enabled.has(ev.kind)) continue;
        if (geoDistance([ev.lon, ev.lat], center) > Math.PI / 2 - 0.02) continue;
        const xy = projection([ev.lon, ev.lat]);
        if (!xy) continue;
        const sig = SIGNAL_BY_KIND[ev.kind];
        const age = (t - ev.born) / 1000;
        const fade = Math.min(age / 0.6, 1); // fade-in
        const pulse = 0.5 + 0.5 * Math.sin(t / 360 + ev.id);
        const baseR = 1.3 + ev.mag * 2.6;
        const glowR = baseR + 5 + pulse * 4 * ev.mag;
        // Halo.
        const g = ctx!.createRadialGradient(xy[0], xy[1], 0, xy[0], xy[1], glowR);
        g.addColorStop(0, `rgba(${sig.glow},${0.55 * fade})`);
        g.addColorStop(1, `rgba(${sig.glow},0)`);
        ctx!.fillStyle = g;
        ctx!.beginPath();
        ctx!.arc(xy[0], xy[1], glowR, 0, Math.PI * 2);
        ctx!.fill();
        // Core.
        ctx!.fillStyle = sig.color;
        ctx!.globalAlpha = fade;
        ctx!.beginPath();
        ctx!.arc(xy[0], xy[1], baseR, 0, Math.PI * 2);
        ctx!.fill();
        ctx!.globalAlpha = 1;
      }

      // Highlight ping ring on the selected country's centroid.
      let hiPoint: { x: number; y: number; visible: boolean } | null = null;
      if (highlightName) {
        const f = COUNTRIES.find((c) => c.properties.name === highlightName);
        if (f) {
          const [lon, lat] = f.centroid;
          const visible = geoDistance([lon, lat], center) < Math.PI / 2;
          const xy = projection([lon, lat]);
          if (xy) {
            hiPoint = { x: xy[0], y: xy[1], visible };
            if (visible) {
              const ping = (t % 1600) / 1600;
              ctx!.beginPath();
              ctx!.arc(xy[0], xy[1], 4 + ping * 22, 0, Math.PI * 2);
              ctx!.strokeStyle = `rgba(94,234,212,${0.7 * (1 - ping)})`;
              ctx!.lineWidth = 1.4;
              ctx!.stroke();
              ctx!.beginPath();
              ctx!.arc(xy[0], xy[1], 3, 0, Math.PI * 2);
              ctx!.fillStyle = "#5eead4";
              ctx!.fill();
            }
          }
        }
      }
      onHighlightPoint?.(hiPoint);

      // Crisp rim.
      ctx!.beginPath();
      ctx!.arc(cx, cy, R, 0, Math.PI * 2);
      ctx!.strokeStyle = "rgba(120,200,240,0.4)";
      ctx!.lineWidth = 1;
      ctx!.stroke();

      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={wrapRef} className="relative h-full w-full">
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
}
