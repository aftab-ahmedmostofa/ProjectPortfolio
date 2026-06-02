"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useApp } from "./AppProvider";
import { AppNotification } from "@/lib/types";

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return `${Math.round(diff)}s ago`;
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
  return `${Math.round(diff / 86400)}d ago`;
}

const KIND_LABEL: Record<AppNotification["kind"], string> = {
  "approval-request": "Approval requested",
  "approval-decided": "Approval decision",
  "project-created": "Project registered",
  "watch-reminder": "Watchlist reminder",
};

export function NotificationsBell() {
  const { notifications, unreadCount, markAllRead, markRead } = useApp();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const preview = notifications.slice(0, 6);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        className="relative rounded-lg border border-slate-300 bg-white p-1.5 text-slate-600 shadow-sm hover:bg-slate-50"
        aria-label="Notifications"
        title="Notifications"
      >
        <span className="block h-4 w-4 leading-none">✉</span>
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
            {unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-30 mt-1 w-96 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
            <div>
              <div className="text-sm font-semibold text-slate-700">Notifications</div>
              <div className="text-[11px] text-slate-400">{notifications.length} total · {unreadCount} unread</div>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <button onClick={markAllRead} className="text-brand-600 hover:underline" disabled={unreadCount === 0}>
                Mark all read
              </button>
              <Link href="/notifications" onClick={() => setOpen(false)} className="text-slate-500 hover:underline">
                Inbox →
              </Link>
            </div>
          </div>
          <ul className="max-h-96 divide-y divide-slate-100 overflow-auto">
            {preview.length === 0 ? (
              <li className="px-3 py-6 text-center text-sm text-slate-400">No notifications yet. Approve or register a project to trigger one.</li>
            ) : (
              preview.map((n) => (
                <li key={n.id}>
                  <Link
                    href={n.projectId ? `/projects/${n.projectId}` : "/notifications"}
                    onClick={() => {
                      markRead(n.id);
                      setOpen(false);
                    }}
                    className={`block px-3 py-2 hover:bg-slate-50 ${n.read ? "" : "bg-brand-50/40"}`}
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className={`badge ${n.kind === "approval-decided" ? "bg-emerald-100 text-emerald-700" : n.kind === "approval-request" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600"}`}>
                        {KIND_LABEL[n.kind]}
                      </span>
                      <span className="text-slate-400">{timeAgo(n.createdAt)}</span>
                    </div>
                    <div className="mt-0.5 truncate text-sm font-medium text-slate-800">{n.subject}</div>
                    <div className="truncate text-[11px] text-slate-500">to {n.to}</div>
                  </Link>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
