"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "./AppProvider";
import { useMemo } from "react";
import { evaluateAlerts } from "@/lib/alerts";

const NAV = [
  { href: "/", label: "Dashboard", icon: "▦", badge: "" as const },
  { href: "/pm-summary", label: "PM Summary", icon: "▥", badge: "" as const },
  { href: "/projects", label: "Projects", icon: "▤", badge: "" as const },
  { href: "/timeline", label: "Timeline", icon: "▭", badge: "" as const },
  { href: "/members", label: "Members", icon: "◔", badge: "" as const },
  { href: "/approvals", label: "Approvals", icon: "✓", badge: "approvals" as const },
  { href: "/risks", label: "Risks", icon: "⚠", badge: "" as const },
  { href: "/alerts", label: "Alerts", icon: "!", badge: "alerts" as const },
  { href: "/watchlist", label: "Watchlist", icon: "★", badge: "watch" as const },
  { href: "/ai-insights", label: "AI Insights", icon: "✦", badge: "" as const },
  { href: "/assistant", label: "Assistant", icon: "✦", badge: "" as const },
  { href: "/worldwatch", label: "WorldWatch", icon: "◍", badge: "" as const },
];

export function Sidebar() {
  const pathname = usePathname();
  const { projects, watchlist } = useApp();

  const alertCount = useMemo(() => {
    const list = evaluateAlerts(projects).filter((a) => a.severity !== "info");
    return list.length;
  }, [projects]);

  const pendingApprovals = useMemo(
    () => projects.filter((p) => p.approvals.some((a) => a.decision === "Pending") && !p.approvals.some((a) => a.decision === "Rejected")).length,
    [projects]
  );

  const badgeFor = (k: string) =>
    k === "alerts" ? alertCount : k === "watch" ? watchlist.length : k === "approvals" ? pendingApprovals : 0;

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-200 bg-brand-900 text-white md:flex">
      <div className="flex items-center gap-2 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500 text-lg font-bold">AI</div>
        <div className="leading-tight">
          <div className="text-sm font-semibold">Portfolio Tracker</div>
          <div className="text-[11px] text-brand-200">Governance &amp; Analytics</div>
        </div>
      </div>
      <nav className="mt-2 flex flex-col gap-1 px-3">
        {NAV.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const count = badgeFor(item.badge);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${active ? "bg-brand-600 font-medium" : "text-brand-100 hover:bg-brand-800"}`}
            >
              <span className="w-4 text-center">{item.icon}</span>
              <span className="flex-1">{item.label}</span>
              {count > 0 ? (
                <span className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-semibold ${item.badge === "alerts" ? "bg-rose-500 text-white" : "bg-brand-500 text-white"}`}>
                  {count}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto px-5 py-4 text-[11px] text-brand-300">SRS v1.0 · Demo build</div>
    </aside>
  );
}
