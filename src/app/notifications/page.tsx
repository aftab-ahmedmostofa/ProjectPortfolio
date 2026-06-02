"use client";

import Link from "next/link";
import { useApp } from "@/components/AppProvider";
import { AppNotification } from "@/lib/types";

const KIND_LABEL: Record<AppNotification["kind"], string> = {
  "approval-request": "Approval requested",
  "approval-decided": "Approval decision",
  "project-created": "Project registered",
  "watch-reminder": "Watchlist reminder",
};

export default function NotificationsPage() {
  const { notifications, markAllRead, unreadCount } = useApp();

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Inbox</h1>
          <p className="text-sm text-slate-500">
            Approval mails and system notifications. {notifications.length} total · {unreadCount} unread.
          </p>
          <p className="mt-1 text-[11px] text-slate-400">
            Demo build: notifications are simulated locally. In production they&apos;d route via the
            org SMTP / MS Graph integration named in the SRS.
          </p>
        </div>
        <button onClick={markAllRead} disabled={unreadCount === 0} className="btn-ghost disabled:cursor-not-allowed disabled:opacity-50">
          Mark all read
        </button>
      </div>

      <div className="card divide-y divide-slate-100">
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            <div className="text-3xl">✉</div>
            <p className="mt-2">Your inbox is empty.</p>
            <p className="mt-1 text-xs text-slate-400">
              Approve a project or register a new one — the system will send the corresponding mail here.
            </p>
            <Link href="/approvals" className="mt-3 inline-block text-sm text-brand-600 hover:underline">
              Go to approvals →
            </Link>
          </div>
        ) : (
          notifications.map((n) => (
            <article key={n.id} className={`p-4 ${n.read ? "" : "bg-brand-50/40"}`}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className={`badge ${n.kind === "approval-decided" ? "bg-emerald-100 text-emerald-700" : n.kind === "approval-request" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600"}`}>
                    {KIND_LABEL[n.kind]}
                  </span>
                  {!n.read ? <span className="text-[10px] font-semibold uppercase text-brand-600">New</span> : null}
                </div>
                <span className="text-xs text-slate-400">{new Date(n.createdAt).toLocaleString()}</span>
              </div>
              <h2 className="mt-1 text-sm font-semibold text-slate-800">{n.subject}</h2>
              <div className="mt-1 text-[12px] text-slate-500">
                <span className="font-medium">From:</span> {n.from} &nbsp;·&nbsp;
                <span className="font-medium">To:</span> {n.to}
              </div>
              <pre className="mt-2 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{n.body}</pre>
              {n.projectId ? (
                <Link href={`/projects/${n.projectId}`} className="mt-2 inline-block text-xs text-brand-600 hover:underline">
                  Open project →
                </Link>
              ) : null}
            </article>
          ))
        )}
      </div>
    </div>
  );
}
