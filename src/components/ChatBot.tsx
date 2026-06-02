"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useApp } from "./AppProvider";
import { parseAndExecute, BotReply, BotApi } from "@/lib/chatbot";
import { Project } from "@/lib/types";
import { assessRisk, forecastCost, forecastSchedule } from "@/lib/analytics";
import { formatCurrency, formatDate } from "@/lib/format";
import { StatusBadge, RiskBadge } from "./ui";

interface ChatMessage {
  id: string;
  role: "user" | "bot";
  text: string;
  card?: BotReply["card"];
  navigate?: string;
  followups?: string[];
}

const INITIAL_FOLLOWUPS = [
  "Show delayed projects",
  "Tell me about Core Banking Modernization",
  "Create task Document API in Core Banking",
  "Email Layla about Core Banking status",
];

const STORAGE_KEY = "portfolio.chat.v1";

export function ChatBot({ embedded = false }: { embedded?: boolean }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const app = useApp();

  // Seed the welcome message once (also restore prior chat if any).
  useEffect(() => {
    if (typeof window === "undefined") return;
    let restored: ChatMessage[] | null = null;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) restored = JSON.parse(raw);
    } catch {
      // ignore
    }
    if (restored && restored.length > 0) {
      setMessages(restored);
    } else {
      setMessages([
        {
          id: "welcome",
          role: "bot",
          text:
            "Hi! I'm the portfolio assistant. Ask me about a project, run a filter, create a project / sub-project / task / sub-task / member, or send a notification email.",
          followups: INITIAL_FOLLOWUPS,
        },
      ]);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (messages.length > 0) {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-30)));
      } catch {
        // ignore
      }
    }
  }, [messages]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    setInput("");
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      text: trimmed,
    };
    const api: BotApi = {
      projects: app.allProjects,
      members: app.members,
      filters: app.filters,
      setFilters: app.setFilters,
      resetFilters: app.resetFilters,
      addProject: app.addProject,
      addSubProject: app.addSubProject,
      addTask: app.addTask,
      addMember: app.addMember,
      addProjectMember: app.addProjectMember,
      sendNotification: app.sendNotification,
    };
    const reply = parseAndExecute(trimmed, api);
    const botMsg: ChatMessage = {
      id: `b-${Date.now()}`,
      role: "bot",
      text: reply.text,
      card: reply.card,
      navigate: reply.navigate,
      followups: reply.followups,
    };
    setMessages((prev) => [...prev, userMsg, botMsg]);
  }

  function clearChat() {
    setMessages([
      {
        id: "welcome",
        role: "bot",
        text: "Chat cleared. What would you like to do?",
        followups: INITIAL_FOLLOWUPS,
      },
    ]);
  }

  const panel = (
    <div className={`flex flex-col ${embedded ? "h-[calc(100vh-180px)] min-h-[520px]" : "h-[640px] max-h-[80vh]"} overflow-hidden ${embedded ? "card" : "rounded-2xl border border-slate-200 bg-white shadow-2xl"}`}>
      {!embedded ? (
        <div className="flex items-center justify-between border-b border-slate-200 bg-brand-900 px-4 py-2.5 text-white">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-500 text-xs font-bold">✦</span>
            AI Assistant
          </div>
          <div className="flex items-center gap-2 text-xs">
            <button onClick={clearChat} className="text-brand-200 hover:text-white">Clear</button>
            <button onClick={() => setOpen(false)} className="text-brand-200 hover:text-white" aria-label="Close">✕</button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-700">✦ Conversation</h2>
            <p className="text-xs text-slate-500">Multi-turn — local chat history is preserved in your browser.</p>
          </div>
          <button onClick={clearChat} className="btn-ghost">Clear chat</button>
        </div>
      )}

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-slate-50/60 px-4 py-3">
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} onFollowup={send} />
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex items-center gap-2 border-t border-slate-200 bg-white px-3 py-2.5"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask, search, create, email…"
          className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
        <button type="submit" className="btn-primary" disabled={!input.trim()}>
          Send
        </button>
      </form>
    </div>
  );

  if (embedded) return panel;

  // The /assistant page renders an embedded ChatBot itself; suppress the
  // floating bubble there to avoid two competing instances.
  if (pathname === "/assistant") return null;

  return (
    <>
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full bg-brand-600 px-4 py-3 text-white shadow-xl transition-transform hover:scale-105 hover:bg-brand-700"
          aria-label="Open AI assistant"
        >
          <span className="text-lg leading-none">✦</span>
          <span className="text-sm font-semibold">Ask the AI assistant</span>
        </button>
      ) : (
        <div className="fixed bottom-5 right-5 z-50 w-[400px] max-w-[calc(100vw-2.5rem)]">
          {panel}
        </div>
      )}
    </>
  );
}

function MessageBubble({ message, onFollowup }: { message: ChatMessage; onFollowup: (s: string) => void }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${isUser ? "bg-brand-600 text-white" : "bg-white text-slate-800 shadow-sm border border-slate-100"}`}>
        <RichText text={message.text} />
        {message.card ? <CardRenderer card={message.card} /> : null}
        {message.navigate && !isUser ? (
          <Link href={message.navigate} className="mt-2 inline-block text-xs font-medium text-brand-600 hover:underline">
            Open {message.navigate} →
          </Link>
        ) : null}
        {message.followups && message.followups.length > 0 && !isUser ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {message.followups.map((f, i) => (
              <button
                key={i}
                onClick={() => onFollowup(f)}
                className="rounded-full border border-brand-200 bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-700 hover:bg-brand-100"
              >
                {f}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

// Minimal markdown rendering: **bold**, line breaks, • bullets.
function RichText({ text }: { text: string }) {
  return (
    <div className="whitespace-pre-wrap leading-snug">
      {text.split("\n").map((line, i) => (
        <div key={i} dangerouslySetInnerHTML={{ __html: renderInline(line) }} />
      ))}
    </div>
  );
}

function renderInline(s: string): string {
  const escaped = s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return escaped
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>");
}

function CardRenderer({ card }: { card: NonNullable<BotReply["card"]> }) {
  const { allProjects, getMember } = useApp();
  if (card.kind === "project") {
    const id = (card.payload as { projectId: string }).projectId;
    const p = allProjects.find((x) => x.id === id);
    if (!p) return null;
    return <ProjectMiniCard project={p} />;
  }
  if (card.kind === "project-list") {
    const ids = (card.payload as { projectIds: string[] }).projectIds;
    const list = ids.map((id) => allProjects.find((x) => x.id === id)).filter(Boolean) as Project[];
    return (
      <div className="mt-2 space-y-1 rounded-lg border border-slate-100 bg-slate-50/60 p-2">
        {list.slice(0, 8).map((p) => (
          <Link key={p.id} href={`/projects/${p.id}`} className="flex items-center justify-between gap-2 rounded px-1.5 py-1 text-xs hover:bg-white">
            <span className="truncate font-medium text-slate-800">{p.name}</span>
            <div className="flex items-center gap-2">
              <StatusBadge status={p.status} />
              <RiskBadge level={assessRisk(p).level} score={assessRisk(p).score} />
            </div>
          </Link>
        ))}
        {list.length > 8 ? <div className="px-1.5 py-1 text-[11px] text-slate-400">+ {list.length - 8} more</div> : null}
      </div>
    );
  }
  if (card.kind === "member") {
    const id = (card.payload as { memberId: string }).memberId;
    const member = getMember(id);
    if (!member) return null;
    return (
      <div className="mt-2 rounded-lg border border-slate-100 bg-slate-50/60 p-2 text-xs">
        <div className="font-medium text-slate-800">{member.name}</div>
        <div className="text-slate-500">{member.email}</div>
        <div className="text-slate-500">{member.phone}{member.title ? ` · ${member.title}` : ""}</div>
      </div>
    );
  }
  if (card.kind === "email-preview") {
    const p = card.payload as { subject: string; body: string; to: string };
    return (
      <div className="mt-2 rounded-lg border border-slate-100 bg-slate-50/70 p-2 text-xs">
        <div className="text-[10px] uppercase text-slate-400">Email preview · to {p.to}</div>
        <div className="mt-0.5 font-medium text-slate-800">{p.subject}</div>
        <pre className="mt-1 whitespace-pre-wrap font-sans text-slate-600">{p.body.length > 240 ? p.body.slice(0, 240) + "…" : p.body}</pre>
      </div>
    );
  }
  return null;
}

function ProjectMiniCard({ project }: { project: Project }) {
  const cost = forecastCost(project);
  const sched = forecastSchedule(project);
  const risk = assessRisk(project);
  return (
    <Link
      href={`/projects/${project.id}`}
      className="mt-2 block rounded-lg border border-slate-100 bg-slate-50/60 p-2 hover:bg-white"
    >
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="font-semibold text-slate-800">{project.name}</span>
        <StatusBadge status={project.status} />
      </div>
      <div className="mt-1 text-[11px] text-slate-500">{project.code} · {project.subsidiary} · {project.country}</div>
      <div className="mt-1 grid grid-cols-3 gap-2 text-[11px]">
        <div>
          <div className="text-slate-400">Budget</div>
          <div className="font-medium text-slate-700">{formatCurrency(project.budget)}</div>
        </div>
        <div>
          <div className="text-slate-400">EAC</div>
          <div className={`font-medium ${cost.projectedOverrun > 0 ? "text-rose-600" : "text-emerald-600"}`}>{formatCurrency(cost.estimateAtCompletion)}</div>
        </div>
        <div>
          <div className="text-slate-400">Predicted end</div>
          <div className={`font-medium ${sched.predictedDelayDays > 7 ? "text-rose-600" : "text-emerald-600"}`}>
            {formatDate(sched.predictedEndDate.toISOString())}
          </div>
        </div>
      </div>
      <div className="mt-1 flex items-center gap-2 text-[11px]">
        <RiskBadge level={risk.level} score={risk.score} />
        <span className="text-slate-500">{risk.drivers[0]}</span>
      </div>
    </Link>
  );
}
