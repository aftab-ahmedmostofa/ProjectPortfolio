"use client";

import { ChatBot } from "@/components/ChatBot";

const EXAMPLES: { heading: string; items: string[] }[] = [
  {
    heading: "Inquire about a project",
    items: [
      "Tell me about Enterprise Data Lakehouse",
      "Status of Zero-Trust Security Program",
      "Show alerts for AIOps Observability Platform",
    ],
  },
  {
    heading: "Search & filter",
    items: [
      "Show delayed projects",
      "High risk projects in UAE",
      "Over budget projects",
      "Search payments",
    ],
  },
  {
    heading: "Create",
    items: [
      "Create project Mobile Banking with budget 2M",
      "Create sub-project Payments QA under Core Banking",
      "Create task Document API in Core Banking due 2026-06-30",
      "Add sub-task Confirm rollback to Document API",
      "Add member Jane Doe email jane@portfolio.local phone +44 7900 123",
      "Assign Layla to AIOps as Manager",
    ],
  },
  {
    heading: "Email & notify",
    items: [
      "Email Hind about Zero-Trust progress",
      "Notify PMO Board about HR Workforce Analytics",
      "Remind Layla about Core Banking cutover",
    ],
  },
];

export default function AssistantPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">✦ AI Assistant</h1>
        <p className="text-sm text-slate-500">
          A conversational front-end to the portfolio: ask, filter, create projects / sub-projects
          / tasks / sub-tasks / members, or send notification emails — all hands-free.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ChatBot embedded />
        </div>
        <div className="space-y-3">
          {EXAMPLES.map((group) => (
            <div key={group.heading} className="card p-3">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{group.heading}</div>
              <ul className="mt-2 space-y-1">
                {group.items.map((item) => (
                  <li key={item} className="text-xs text-slate-600">
                    <span className="text-brand-500">›</span> {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
