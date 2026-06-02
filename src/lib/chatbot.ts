import {
  Project,
  Member,
  PortfolioFilters,
  MembershipRole,
  ProjectStatus,
  AppNotification,
  EMPTY_FILTERS,
} from "./types";
import {
  assessRisk,
  forecastCost,
  forecastSchedule,
  projectNarrative,
} from "./analytics";
import { alertsForProject } from "./alerts";

export interface BotCard {
  kind: "project" | "project-list" | "alerts" | "member" | "email-preview";
  payload: unknown;
}

export interface BotReply {
  text: string;
  card?: BotCard;
  navigate?: string;
  followups?: string[];
}

// Mutators the chatbot can drive. Kept narrow so this module stays
// loosely-coupled from the React layer.
export interface BotApi {
  projects: Project[];
  members: Member[];
  filters: PortfolioFilters;
  setFilters: (f: PortfolioFilters) => void;
  resetFilters: () => void;
  addProject: (p: Project) => void;
  addSubProject: (
    parentId: string,
    partial: Partial<Project> & { name: string; budget: number; plannedEndDate: string }
  ) => void;
  addTask: (
    projectId: string,
    fields: { title: string; priority: "Low" | "Medium" | "High"; assigneeId?: string; dueDate?: string; parentTaskId?: string }
  ) => void;
  addMember: (m: Omit<Member, "id">) => Member;
  addProjectMember: (projectId: string, memberId: string, role: MembershipRole) => void;
  sendNotification: (n: Omit<AppNotification, "id" | "createdAt" | "read">) => void;
}

// -------- Fuzzy match helpers --------

function score(query: string, haystack: string): number {
  const q = query.toLowerCase().trim();
  const h = haystack.toLowerCase();
  if (!q) return 0;
  if (h === q) return 100;
  if (h.includes(q)) return 80 + Math.min(15, q.length);
  const qWords = q.split(/\s+/).filter(Boolean);
  let hits = 0;
  for (const w of qWords) if (h.includes(w)) hits++;
  if (hits === 0) return 0;
  return Math.round((hits / qWords.length) * 60);
}

function findProject(projects: Project[], query: string): Project | null {
  const ranked = projects
    .map((p) => ({ p, s: Math.max(score(query, p.name), score(query, p.code), score(query, p.id)) }))
    .filter((r) => r.s > 30)
    .sort((a, b) => b.s - a.s);
  return ranked[0]?.p ?? null;
}

function findMember(members: Member[], query: string): Member | null {
  const ranked = members
    .map((m) => ({ m, s: Math.max(score(query, m.name), score(query, m.email), score(query, m.title ?? "")) }))
    .filter((r) => r.s > 30)
    .sort((a, b) => b.s - a.s);
  return ranked[0]?.m ?? null;
}

function parseMoney(s: string): number | undefined {
  // "$2M" / "2 million" / "2000000" / "500K" / "500,000"
  const m = s.match(/(\$?\s*\d+(?:[\.,]\d+)?\s*(?:m|million|k|thousand)?)/i);
  if (!m) return undefined;
  let raw = m[1].toLowerCase().replace(/[$,\s]/g, "");
  let mult = 1;
  if (raw.endsWith("m") || raw.endsWith("million")) {
    mult = 1_000_000;
    raw = raw.replace(/m(illion)?$/, "");
  } else if (raw.endsWith("k") || raw.endsWith("thousand")) {
    mult = 1_000;
    raw = raw.replace(/k|thousand$/, "");
  }
  const n = Number(raw);
  return Number.isFinite(n) ? Math.round(n * mult) : undefined;
}

function parseDate(s: string): string | undefined {
  // Accepts yyyy-mm-dd or "by end of 2026" or "by June 2026"
  const iso = s.match(/(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1];
  return undefined;
}

function parsePriority(s: string): "Low" | "Medium" | "High" {
  const t = s.toLowerCase();
  if (t.includes("high")) return "High";
  if (t.includes("low")) return "Low";
  return "Medium";
}

function parseRole(s: string): MembershipRole | undefined {
  const t = s.toLowerCase();
  if (t.includes("sponsor")) return "Sponsor";
  if (t.includes("manager") || t.includes("pm") || t.includes("lead")) return "Manager";
  if (t.includes("review")) return "Reviewer";
  if (t.includes("contrib")) return "Contributor";
  return undefined;
}

// -------- Intent handlers --------

type Handler = (msg: string, api: BotApi) => BotReply | null;

// 1) Create project (top-level)
const handleCreateProject: Handler = (msg, api) => {
  const m = msg.match(/^(?:create|add|register|new)\s+(?:project|programme)\s+(?:called\s+|named\s+)?(.+)$/i);
  if (!m || /sub[\s-]?project/i.test(msg)) return null;
  const rest = m[1];
  // Extract budget if present
  const budgetMatch = rest.match(/\bbudget\s+(\$?\s*\d[\d\.,]*\s*(?:m|million|k|thousand)?)/i);
  const budget = budgetMatch ? parseMoney(budgetMatch[1]) ?? 250_000 : 250_000;
  // Strip the budget clause from the name
  const name = rest.replace(/\bwith budget.+$/i, "").replace(/\bbudget\b.+$/i, "").trim().replace(/[".,]+$/, "");
  if (!name) return null;
  const id = `PRJ-${Math.floor(1000 + Math.random() * 9000)}`;
  const code = name.split(/\s+/).slice(0, 2).map((w) => w.slice(0, 4)).join("").toUpperCase();
  const today = new Date().toISOString().slice(0, 10);
  const plannedEnd = new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10);
  api.addProject({
    id,
    code,
    name,
    description: `Project ${name} registered via assistant.`,
    subsidiary: "Gulf Holdings",
    businessUnit: "Digital",
    country: "UAE",
    manager: "Unassigned",
    status: "Planning",
    priority: "Medium",
    budget,
    actualCost: 0,
    progress: 0,
    startDate: today,
    plannedEndDate: plannedEnd,
    milestones: [],
    risks: [],
    approvals: [
      { level: 1, role: "PMO", approver: "PMO Board", decision: "Pending" },
      { level: 2, role: "CDO Office", approver: "Chief Digital Office", decision: "Pending" },
    ],
    members: [],
    tasks: [],
  });
  return {
    text: `Created project **${name}** (${code}) with a $${(budget / 1e6).toFixed(2)}M budget, defaulted to Gulf Holdings / UAE / Digital. It's queued for PMO approval.`,
    navigate: `/projects/${id}`,
    card: { kind: "project", payload: { projectId: id } },
    followups: [`Add a task to ${name}`, `Open ${name}`],
  };
};

// 2) Create sub-project
const handleCreateSubProject: Handler = (msg, api) => {
  const m = msg.match(/^(?:create|add|new)\s+sub[\s-]?project\s+(?:called\s+|named\s+)?(.+?)\s+(?:under|for|inside)\s+(.+)$/i);
  if (!m) return null;
  const childPart = m[1].trim();
  const parentQ = m[2].replace(/[".,]+$/, "").trim();
  const budgetMatch = childPart.match(/\bbudget\s+(\$?\s*\d[\d\.,]*\s*(?:m|million|k|thousand)?)/i);
  const budget = budgetMatch ? parseMoney(budgetMatch[1]) ?? 250_000 : 250_000;
  const name = childPart.replace(/\bwith budget.+$/i, "").replace(/\bbudget\b.+$/i, "").trim();
  const parent = findProject(api.projects, parentQ);
  if (!parent) return { text: `Couldn't find a parent project matching "${parentQ}". Try its exact name or code.` };
  api.addSubProject(parent.id, {
    name,
    budget,
    plannedEndDate: parent.plannedEndDate,
  });
  return {
    text: `Created sub-project **${name}** under ${parent.name} with budget $${(budget / 1e6).toFixed(2)}M. It inherits ${parent.subsidiary} / ${parent.country} and is queued for PMO approval.`,
    navigate: `/projects/${parent.id}`,
    followups: [`Open ${parent.name}`, `Add a task to ${name}`],
  };
};

// 3) Create task
const handleCreateTask: Handler = (msg, api) => {
  const m = msg.match(/^(?:create|add|new)\s+task\s+(?:called\s+|named\s+)?(.+?)\s+(?:in|to|for|under)\s+(.+)$/i);
  if (!m || /sub[\s-]?task/i.test(msg)) return null;
  // Strip trailing date / priority clauses from the project lookup so
  // "...in Core Banking due 2026-07-15" still finds "Core Banking".
  const cleanTail = (s: string) =>
    s
      .replace(/[".,]+$/, "")
      .replace(/\bdue\s+\d{4}-\d{2}-\d{2}\b/i, "")
      .replace(/\b(?:high|low|medium)\s+priority\b/i, "")
      .trim();
  const taskTitlePart = m[1].trim();
  const projectQ = cleanTail(m[2]);
  const priority = parsePriority(msg);
  const dueDate = parseDate(msg);
  const project = findProject(api.projects, projectQ);
  if (!project) return { text: `Couldn't find a project matching "${projectQ}".` };
  // Try to detect assignee: "... assigned to X" or "@X"
  const assigneeMatch = msg.match(/(?:assign(?:ed)?\s+to|@)\s+([A-Z][\w\s.]+?)(?:\s+(?:by|on|due|with)|\s*$)/);
  let assigneeId: string | undefined;
  if (assigneeMatch) {
    const found = findMember(api.members, assigneeMatch[1].trim());
    assigneeId = found?.id;
  }
  api.addTask(project.id, {
    title: taskTitlePart.replace(/\b(high|low|medium)\s+priority\b/i, "").replace(/\bdue\b.+$/i, "").trim(),
    priority,
    assigneeId,
    dueDate,
  });
  return {
    text: `Added task **${taskTitlePart}** to ${project.name}${assigneeId ? `, assigned to ${api.members.find((mm) => mm.id === assigneeId)?.name}` : ""}.`,
    navigate: `/projects/${project.id}`,
    followups: [`Add a sub-task to ${taskTitlePart}`, `Show ${project.name}`],
  };
};

// 4) Create sub-task
const handleCreateSubTask: Handler = (msg, api) => {
  const m = msg.match(/^(?:create|add|new)\s+sub[\s-]?task\s+(?:called\s+|named\s+)?(.+?)\s+(?:to|under|for|in)\s+(.+)$/i);
  if (!m) return null;
  const subTaskTitle = m[1].trim();
  const parentRef = m[2]
    .replace(/[".,]+$/, "")
    .replace(/\bdue\s+\d{4}-\d{2}-\d{2}\b/i, "")
    .replace(/\b(?:high|low|medium)\s+priority\b/i, "")
    .trim();

  // Find the parent task across all projects.
  for (const project of api.projects) {
    const parentTask = project.tasks.find(
      (t) => !t.parentTaskId && (score(parentRef, t.title) > 40 || score(parentRef, t.id) > 60)
    );
    if (parentTask) {
      api.addTask(project.id, {
        title: subTaskTitle,
        priority: parsePriority(msg),
        parentTaskId: parentTask.id,
      });
      return {
        text: `Added sub-task **${subTaskTitle}** under "${parentTask.title}" in ${project.name}.`,
        navigate: `/projects/${project.id}`,
      };
    }
  }
  return { text: `Couldn't find a parent task matching "${parentRef}".` };
};

// 5) Add member to directory
const handleAddMember: Handler = (msg, api) => {
  const m = msg.match(/^(?:add|create|register|new)\s+(?:a\s+)?member\s+(.+)$/i);
  if (!m) return null;
  const rest = m[1];
  const email = rest.match(/[\w.+-]+@[\w-]+\.[\w.-]+/)?.[0];
  const phone = rest.match(/\+?\d[\d\s().-]{7,}/)?.[0];
  // Name: everything before the first " email" / " phone" / email / phone tokens
  let name = rest;
  if (email) name = name.split(email)[0];
  name = name.replace(/\b(with|email|phone|contact|title)\b.*$/i, "").replace(/[",.]+$/, "").trim();
  const titleMatch = rest.match(/\b(?:as|title)\s+([A-Z][^.,]+)$/);
  const title = titleMatch ? titleMatch[1].trim() : undefined;
  if (!name) return { text: "Tell me the member's name. e.g. 'add member Jane Doe email jane@x.com phone +123'." };
  const created = api.addMember({
    name,
    email: email ?? `${name.toLowerCase().replace(/\s+/g, ".")}@portfolio.local`,
    phone: phone ?? "—",
    title,
  });
  return {
    text: `Added **${created.name}** to the directory (${created.email}). They can now be assigned to projects.`,
    navigate: "/members",
    card: { kind: "member", payload: { memberId: created.id } },
    followups: [`Assign ${created.name} to a project`],
  };
};

// 6) Assign existing member to project
const handleAssignMember: Handler = (msg, api) => {
  const m = msg.match(/^(?:assign|add)\s+(.+?)\s+to\s+(.+?)(?:\s+as\s+(\w+))?$/i);
  if (!m) return null;
  const memberQ = m[1].trim();
  const projectQ = m[2].replace(/[".,]+$/, "").trim();
  const roleStr = m[3];

  // The member must be in the directory; otherwise this might be a different intent.
  const member = findMember(api.members, memberQ);
  const project = findProject(api.projects, projectQ);
  if (!member || !project) return null;
  const role = roleStr ? parseRole(roleStr) ?? "Contributor" : "Contributor";
  api.addProjectMember(project.id, member.id, role);
  return {
    text: `Assigned **${member.name}** to ${project.name} as ${role}.`,
    navigate: `/projects/${project.id}`,
  };
};

// 7) Send email / notification
const handleSendEmail: Handler = (msg, api) => {
  const m = msg.match(/^(?:email|send|notify|remind)\s+(.+?)\s+(?:about|that|on|re|regarding)\s+(.+)$/i);
  if (!m) return null;
  const recipientQ = m[1].replace(/^(?:to|an?\s+email\s+to)\s+/i, "").trim();
  const topic = m[2].trim();

  // Try to find the recipient as a member; else treat as a role/group label.
  const member = findMember(api.members, recipientQ);
  const recipientName = member?.name ?? recipientQ;
  const recipientEmail = member?.email ?? `${recipientQ.toLowerCase().replace(/\s+/g, ".")}@portfolio.local`;

  // Try to attach a project reference from the topic.
  const project = findProject(api.projects, topic);

  const subject = project ? `${project.name}: ${topic.replace(project.name, "").trim() || "update"}` : topic;
  const body = project
    ? `${recipientName},\n\nA quick note on ${project.name} (${project.code}). ${projectNarrative(project)}\n\nReply if you'd like the full brief.\n\n— Portfolio Tracker`
    : `${recipientName},\n\n${topic}.\n\n— Portfolio Tracker`;

  api.sendNotification({
    kind: project ? "approval-request" : "watch-reminder",
    from: "Portfolio Assistant <assistant@portfolio.local>",
    to: `${recipientName} <${recipientEmail}>`,
    subject: subject.slice(0, 120),
    body,
    projectId: project?.id,
  });
  return {
    text: `Sent an email to **${recipientName}** about "${topic}"${project ? ` (project: ${project.name})` : ""}. It's in the inbox.`,
    navigate: "/notifications",
    card: { kind: "email-preview", payload: { subject, body, to: recipientName } },
  };
};

// 8) Alerts (for a project or portfolio-wide)
const handleAlerts: Handler = (msg, api) => {
  if (!/\b(alert|alerts|risks?|issues?|reminders?)\b/i.test(msg)) return null;
  const forMatch = msg.match(/\bfor\s+(.+)$/i);
  if (forMatch) {
    const project = findProject(api.projects, forMatch[1]);
    if (project) {
      const alerts = alertsForProject(api.projects, project.id);
      return {
        text: alerts.length
          ? `${project.name} has ${alerts.length} open alert(s):\n` + alerts.slice(0, 6).map((a) => `• [${a.severity.toUpperCase()}] ${a.title} — ${a.message}`).join("\n")
          : `${project.name} has no open alerts.`,
        navigate: `/projects/${project.id}`,
      };
    }
  }
  return {
    text: `Portfolio alerts are listed on the Alerts page, with severity filters.`,
    navigate: "/alerts",
  };
};

// 9) Filter / list / search
const STATUS_WORDS: Record<string, ProjectStatus> = {
  delayed: "Delayed",
  "in progress": "In Progress",
  ongoing: "In Progress",
  planning: "Planning",
  "on hold": "On Hold",
  hold: "On Hold",
  completed: "Completed",
  done: "Completed",
  cancelled: "Cancelled",
};

const handleListOrFilter: Handler = (msg, api) => {
  const lower = msg.toLowerCase();
  if (!/\b(show|list|find|filter|search|all|projects?)\b/.test(lower)) return null;

  const filters: PortfolioFilters = { ...EMPTY_FILTERS };
  const reasons: string[] = [];

  // Status keywords
  for (const [k, v] of Object.entries(STATUS_WORDS)) {
    if (lower.includes(k)) {
      filters.status = [v];
      reasons.push(`Status: ${v}`);
      break;
    }
  }

  // Risk
  if (/\bhigh[\s-]?risk\b|\bat[\s-]?risk\b/.test(lower)) {
    filters.riskLevel = ["High"];
    reasons.push("Risk: High");
  } else if (/\blow[\s-]?risk\b/.test(lower)) {
    filters.riskLevel = ["Low"];
    reasons.push("Risk: Low");
  }

  // Priority
  if (/\bhigh[\s-]?priority\b/.test(lower)) {
    filters.priority = ["High"];
    reasons.push("Priority: High");
  }

  // Country / Subsidiary / BU: try matches
  const countries = Array.from(new Set(api.projects.map((p) => p.country)));
  for (const c of countries) {
    if (lower.includes(c.toLowerCase())) {
      filters.country = [c];
      reasons.push(`Country: ${c}`);
      break;
    }
  }
  const subs = Array.from(new Set(api.projects.map((p) => p.subsidiary)));
  for (const s of subs) {
    if (lower.includes(s.toLowerCase())) {
      filters.subsidiary = [s];
      reasons.push(`Subsidiary: ${s}`);
      break;
    }
  }
  const bus = Array.from(new Set(api.projects.map((p) => p.businessUnit)));
  for (const b of bus) {
    if (lower.includes(b.toLowerCase())) {
      filters.businessUnit = [b];
      reasons.push(`Business unit: ${b}`);
      break;
    }
  }

  // Free-text search after "search" / "find"
  const searchMatch = msg.match(/(?:search|find)\s+(?:for\s+)?["']?([^"']+?)["']?$/i);
  if (searchMatch && !reasons.length) {
    filters.search = searchMatch[1].trim();
    reasons.push(`Search: "${filters.search}"`);
  }

  // Over budget — derived; we don't filter, just list manually
  if (/\bover[\s-]?budget\b/.test(lower)) {
    const list = api.projects.filter((p) => forecastCost(p).projectedOverrun > 0);
    return {
      text: `${list.length} project(s) are forecast to exceed budget. Sorted by projected overrun:`,
      card: { kind: "project-list", payload: { projectIds: list.sort((a, b) => forecastCost(b).projectedOverrun - forecastCost(a).projectedOverrun).map((p) => p.id) } },
      navigate: "/projects",
    };
  }

  if (reasons.length === 0 && !/^\s*(show|list|find|filter|search|projects?)\b/i.test(msg)) {
    return null; // wasn't actually a filter request
  }

  // Compute matching set under these filters
  const matched = api.projects.filter((p) => {
    if (filters.status.length && !filters.status.includes(p.status)) return false;
    if (filters.riskLevel.length && !filters.riskLevel.includes(assessRisk(p).level)) return false;
    if (filters.priority.length && !filters.priority.includes(p.priority)) return false;
    if (filters.country.length && !filters.country.includes(p.country)) return false;
    if (filters.subsidiary.length && !filters.subsidiary.includes(p.subsidiary)) return false;
    if (filters.businessUnit.length && !filters.businessUnit.includes(p.businessUnit)) return false;
    if (filters.search && !`${p.name} ${p.code} ${p.description}`.toLowerCase().includes(filters.search.toLowerCase())) return false;
    return true;
  });

  api.setFilters(filters);

  return {
    text: matched.length
      ? `Applied filters — ${reasons.join(" · ") || "all projects"} — matching ${matched.length} project(s).`
      : `No projects match ${reasons.join(" · ") || "those filters"}. Try a different combination.`,
    card: { kind: "project-list", payload: { projectIds: matched.map((p) => p.id) } },
    navigate: "/projects",
    followups: ["Reset filters", "Show high risk projects"],
  };
};

// 10) Show / inquire about a specific project
const handleShowProject: Handler = (msg, api) => {
  // strip common intro phrases
  const stripped = msg
    .replace(/^(?:show|tell me about|details? (?:of|on)|status of|how is|what'?s|info on|open)\s+/i, "")
    .replace(/[?.!]+$/, "")
    .trim();
  if (!stripped) return null;
  const project = findProject(api.projects, stripped);
  if (!project) return null;
  const cost = forecastCost(project);
  const sched = forecastSchedule(project);
  const risk = assessRisk(project);
  const text = `**${project.name}** (${project.code}) — ${project.status}.\n`
    + `${projectNarrative(project)}\n`
    + `Budget $${(project.budget / 1e6).toFixed(2)}M · EAC $${(cost.estimateAtCompletion / 1e6).toFixed(2)}M (CPI ${cost.cpi.toFixed(2)})\n`
    + `Predicted finish ${sched.predictedEndDate.toISOString().slice(0, 10)} (${sched.predictedDelayDays > 0 ? "+" : ""}${Math.round(sched.predictedDelayDays)}d vs plan)\n`
    + `Risk score ${risk.score}/100 (${risk.level}).`;
  return {
    text,
    card: { kind: "project", payload: { projectId: project.id } },
    navigate: `/projects/${project.id}`,
    followups: [`Show alerts for ${project.name}`, `Add a task to ${project.name}`],
  };
};

// 11) Reset filters
const handleReset: Handler = (msg, api) => {
  if (!/^(?:reset|clear)\s+(?:filters?|all)?$/i.test(msg.trim())) return null;
  api.resetFilters();
  return { text: "Filters cleared. Showing the full portfolio.", navigate: "/projects" };
};

// 12) Help / greetings
const handleSmallTalk: Handler = (msg) => {
  const t = msg.trim().toLowerCase();
  if (/^(hi|hello|hey|good (morning|afternoon|evening)|salaam|hola)\b/.test(t)) {
    return {
      text:
        "Hi! I'm the portfolio assistant. I can answer questions about projects, run filters, create projects / sub-projects / tasks / sub-tasks / members, and send notification emails. Try one of the suggestions below.",
      followups: [
        "Show delayed projects",
        "Tell me about Core Banking Modernization",
        "Create task Document API in Core Banking",
        "Email Layla about Core Banking status",
      ],
    };
  }
  if (/^(help|what can you do|usage|commands)/.test(t)) {
    return {
      text:
        "I understand things like:\n" +
        "• *Show high risk projects in UAE* — runs filters\n" +
        "• *Tell me about Enterprise Data Lakehouse* — project brief with AI metrics\n" +
        "• *Show alerts for AIOps Observability* — open alerts for a project\n" +
        "• *Create project Mobile Banking with budget 2M* — register a new project\n" +
        "• *Create sub-project Payments QA under Core Banking* — sub-programme\n" +
        "• *Add task Brief steerco in Core Banking due 2026-06-30* — new task\n" +
        "• *Add sub-task Confirm rollback to runbook* — child task under a parent\n" +
        "• *Add member Jane Doe email jane@portfolio.local phone +44 7900 000* — directory entry\n" +
        "• *Assign Layla to Core Banking as Manager* — project membership\n" +
        "• *Email Hind about Zero-Trust progress* — sends an inbox notification",
    };
  }
  if (/(thanks|thank you|cheers)/i.test(t)) {
    return { text: "You're welcome! Anything else?" };
  }
  return null;
};

const HANDLERS: Handler[] = [
  handleSmallTalk,
  handleReset,
  handleAddMember,
  handleCreateSubTask,
  handleCreateTask,
  handleCreateSubProject,
  handleCreateProject,
  handleAssignMember,
  handleSendEmail,
  handleAlerts,
  handleListOrFilter,
  handleShowProject,
];

export function parseAndExecute(message: string, api: BotApi): BotReply {
  const trimmed = message.trim();
  if (!trimmed) return { text: "Say something to get started." };
  for (const h of HANDLERS) {
    try {
      const reply = h(trimmed, api);
      if (reply) return reply;
    } catch {
      // swallow handler errors, fall through
    }
  }
  return {
    text:
      "I didn't catch a clear intent. I'm best at things like \"show delayed projects\", \"tell me about <project>\", \"create task X in <project>\", or \"email <person> about <project>\". Type *help* for the full list.",
    followups: ["help", "Show high risk projects", "Tell me about Core Banking Modernization"],
  };
}
