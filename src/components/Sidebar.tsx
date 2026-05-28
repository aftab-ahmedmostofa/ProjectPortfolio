"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Dashboard", icon: "▦" },
  { href: "/projects", label: "Projects", icon: "▤" },
  { href: "/approvals", label: "Approvals", icon: "✓" },
  { href: "/ai-insights", label: "AI Insights", icon: "✦" },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-200 bg-brand-900 text-white md:flex">
      <div className="flex items-center gap-2 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500 text-lg font-bold">
          AI
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold">Portfolio Tracker</div>
          <div className="text-[11px] text-brand-200">Governance &amp; Analytics</div>
        </div>
      </div>
      <nav className="mt-2 flex flex-col gap-1 px-3">
        {NAV.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                active ? "bg-brand-600 font-medium" : "text-brand-100 hover:bg-brand-800"
              }`}
            >
              <span className="w-4 text-center">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto px-5 py-4 text-[11px] text-brand-300">
        SRS v1.0 · Demo build
      </div>
    </aside>
  );
}
