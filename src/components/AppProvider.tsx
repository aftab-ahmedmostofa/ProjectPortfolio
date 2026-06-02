"use client";

import { createContext, useContext, useMemo, useState, useEffect, ReactNode, useCallback } from "react";
import {
  Project,
  PortfolioFilters,
  Role,
  EMPTY_FILTERS,
  AppNotification,
  NotificationKind,
  Member,
  Task,
  ProjectMembership,
  MembershipRole,
} from "@/lib/types";
import { projects as seedProjects, seedMembers } from "@/lib/data";
import { scopeProjects, ROLE_POLICIES } from "@/lib/rbac";
import { assessRisk } from "@/lib/analytics";

interface AppState {
  role: Role;
  setRole: (r: Role) => void;
  filters: PortfolioFilters;
  setFilters: (f: PortfolioFilters) => void;
  resetFilters: () => void;
  allProjects: Project[];
  projects: Project[];
  updateApproval: (
    projectId: string,
    level: number,
    decision: "Approved" | "Rejected",
    comment: string
  ) => void;
  addProject: (p: Project) => void;
  countries: string[];
  businessUnits: string[];
  subsidiaries: string[];
  // Watchlist
  watchlist: string[];
  toggleWatch: (projectId: string) => void;
  isWatched: (projectId: string) => boolean;
  // Notifications
  notifications: AppNotification[];
  unreadCount: number;
  markAllRead: () => void;
  markRead: (id: string) => void;
  sendNotification: (n: Omit<AppNotification, "id" | "createdAt" | "read">) => void;
  // Member directory
  members: Member[];
  getMember: (id: string) => Member | undefined;
  addMember: (m: Omit<Member, "id">) => Member;
  updateMember: (id: string, patch: Partial<Omit<Member, "id">>) => void;
  removeMember: (id: string) => void;
  // Sub-projects & project hierarchy
  getSubProjects: (parentId: string) => Project[];
  addSubProject: (parentId: string, partial: Partial<Project> & { name: string; budget: number; plannedEndDate: string }) => void;
  // Tasks
  addTask: (projectId: string, fields: { title: string; priority: Task["priority"]; assigneeId?: string; dueDate?: string; parentTaskId?: string }) => void;
  updateTask: (projectId: string, taskId: string, patch: Partial<Task>) => void;
  removeTask: (projectId: string, taskId: string) => void;
  // Project members
  addProjectMember: (projectId: string, memberId: string, role: MembershipRole) => void;
  updateProjectMemberRole: (projectId: string, memberId: string, role: MembershipRole) => void;
  removeProjectMember: (projectId: string, memberId: string) => void;
}

const AppContext = createContext<AppState | null>(null);

const WATCHLIST_KEY = "portfolio.watchlist.v1";

export function AppProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>("Admin");
  const [filters, setFilters] = useState<PortfolioFilters>(EMPTY_FILTERS);
  const [data, setData] = useState<Project[]>(seedProjects);
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [members, setMembers] = useState<Member[]>(seedMembers);

  const mutateProject = useCallback(
    (projectId: string, mutator: (p: Project) => Project) => {
      setData((prev) => prev.map((p) => (p.id === projectId ? mutator(p) : p)));
    },
    []
  );

  // Hydrate watchlist from localStorage on mount.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(WATCHLIST_KEY);
      if (raw) setWatchlist(JSON.parse(raw));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(WATCHLIST_KEY, JSON.stringify(watchlist));
    } catch {
      // ignore quota errors
    }
  }, [watchlist]);

  const allProjects = useMemo(() => scopeProjects(data, role), [data, role]);

  const projects = useMemo(() => {
    const term = filters.search.trim().toLowerCase();
    return allProjects.filter((p) => {
      if (filters.country.length > 0 && !filters.country.includes(p.country)) return false;
      if (filters.subsidiary.length > 0 && !filters.subsidiary.includes(p.subsidiary)) return false;
      if (filters.businessUnit.length > 0 && !filters.businessUnit.includes(p.businessUnit)) return false;
      if (filters.status.length > 0 && !filters.status.includes(p.status)) return false;
      if (filters.priority.length > 0 && !filters.priority.includes(p.priority)) return false;
      if (filters.riskLevel.length > 0 && !filters.riskLevel.includes(assessRisk(p).level)) return false;
      if (filters.dateFrom && p.plannedEndDate < filters.dateFrom) return false;
      if (filters.dateTo && p.plannedEndDate > filters.dateTo) return false;
      if (term) {
        const hay = `${p.name} ${p.code} ${p.manager} ${p.description}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  }, [allProjects, filters]);

  const resetFilters = useCallback(() => setFilters(EMPTY_FILTERS), []);

  const countries = useMemo(
    () => Array.from(new Set(allProjects.map((p) => p.country))).sort(),
    [allProjects]
  );
  const businessUnits = useMemo(
    () => Array.from(new Set(allProjects.map((p) => p.businessUnit))).sort(),
    [allProjects]
  );
  const subsidiaries = useMemo(
    () => Array.from(new Set(allProjects.map((p) => p.subsidiary))).sort(),
    [allProjects]
  );

  const sendNotification = useCallback(
    (n: Omit<AppNotification, "id" | "createdAt" | "read">) => {
      setNotifications((prev) => [
        {
          ...n,
          id: `N-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          createdAt: new Date().toISOString(),
          read: false,
        },
        ...prev,
      ]);
    },
    []
  );

  const updateApproval = useCallback(
    (projectId: string, level: number, decision: "Approved" | "Rejected", comment: string) => {
      if (!ROLE_POLICIES[role].canApprove) return;
      let project: Project | undefined;
      setData((prev) =>
        prev.map((p) => {
          if (p.id !== projectId) return p;
          const updated = {
            ...p,
            approvals: p.approvals.map((a) =>
              a.level === level
                ? { ...a, decision, comment, decidedAt: new Date().toISOString().slice(0, 10) }
                : a
            ),
          };
          project = updated;
          return updated;
        })
      );
      if (!project) return;

      const acted = project.approvals.find((a) => a.level === level)!;
      sendNotification({
        kind: "approval-decided",
        from: `${acted.role} <${acted.approver.replace(/\s+/g, ".").toLowerCase()}@portfolio.local>`,
        to: `${project.manager} <pm@portfolio.local>`,
        subject: `[${project.code}] Level ${level} ${decision}`,
        body: `${project.name} – Level ${level} (${acted.role}) ${decision.toLowerCase()} by ${acted.approver}.${comment ? `\n\nComment: ${comment}` : ""}`,
        projectId: project.id,
      });

      if (decision === "Approved") {
        const next = project.approvals
          .slice()
          .sort((a, b) => a.level - b.level)
          .find((a) => a.level > level && a.decision === "Pending");
        if (next) {
          sendNotification({
            kind: "approval-request",
            from: "Portfolio Tracker <noreply@portfolio.local>",
            to: `${next.approver} <${next.role.replace(/\s+/g, ".").toLowerCase()}@portfolio.local>`,
            subject: `Approval required: ${project.name} (Level ${next.level})`,
            body: `Level ${level} was approved. Your Level ${next.level} (${next.role}) approval is now required for ${project.name} (${project.code}). Budget $${(project.budget / 1e6).toFixed(2)}M.`,
            projectId: project.id,
          });
        }
      }
    },
    [role, sendNotification]
  );

  const addProject = useCallback(
    (p: Project) => {
      setData((prev) => [p, ...prev]);
      const firstPending = p.approvals.find((a) => a.decision === "Pending");
      sendNotification({
        kind: "project-created",
        from: "Portfolio Tracker <noreply@portfolio.local>",
        to: firstPending
          ? `${firstPending.approver} <${firstPending.role.replace(/\s+/g, ".").toLowerCase()}@portfolio.local>`
          : "PMO Board <pmo@portfolio.local>",
        subject: `New project registered: ${p.name}`,
        body: `${p.name} (${p.code}) registered by ${p.manager}, ${p.subsidiary} / ${p.country}. Budget $${(p.budget / 1e6).toFixed(2)}M. ${firstPending ? `Awaiting Level ${firstPending.level} approval.` : ""}`,
        projectId: p.id,
      });
    },
    [sendNotification]
  );

  const toggleWatch = useCallback((projectId: string) => {
    setWatchlist((prev) =>
      prev.includes(projectId) ? prev.filter((id) => id !== projectId) : [...prev, projectId]
    );
  }, []);

  const isWatched = useCallback((id: string) => watchlist.includes(id), [watchlist]);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const markRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // ---- Member directory CRUD ----
  const getMember = useCallback(
    (id: string) => members.find((m) => m.id === id),
    [members]
  );

  const addMember = useCallback((m: Omit<Member, "id">): Member => {
    const newMember: Member = { ...m, id: `M-${Date.now().toString(36)}` };
    setMembers((prev) => [...prev, newMember]);
    return newMember;
  }, []);

  const updateMember = useCallback(
    (id: string, patch: Partial<Omit<Member, "id">>) => {
      setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
    },
    []
  );

  const removeMember = useCallback((id: string) => {
    setMembers((prev) => prev.filter((m) => m.id !== id));
    setData((prev) =>
      prev.map((p) => ({ ...p, members: p.members.filter((mm) => mm.memberId !== id) }))
    );
  }, []);

  // ---- Sub-projects ----
  const getSubProjects = useCallback(
    (parentId: string) => data.filter((p) => p.parentProjectId === parentId),
    [data]
  );

  const addSubProject = useCallback(
    (
      parentId: string,
      partial: Partial<Project> & { name: string; budget: number; plannedEndDate: string }
    ) => {
      const parent = data.find((p) => p.id === parentId);
      if (!parent) return;
      const child: Project = {
        id: `${parentId}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`,
        code: partial.code ?? `${parent.code}-SUB`,
        name: partial.name,
        description: partial.description ?? `Sub-project of ${parent.name}.`,
        subsidiary: partial.subsidiary ?? parent.subsidiary,
        businessUnit: partial.businessUnit ?? parent.businessUnit,
        country: partial.country ?? parent.country,
        manager: partial.manager ?? parent.manager,
        status: partial.status ?? "Planning",
        priority: partial.priority ?? "Medium",
        budget: partial.budget,
        actualCost: partial.actualCost ?? 0,
        progress: partial.progress ?? 0,
        startDate: partial.startDate ?? new Date().toISOString().slice(0, 10),
        plannedEndDate: partial.plannedEndDate,
        milestones: partial.milestones ?? [],
        risks: partial.risks ?? [],
        approvals: partial.approvals ?? [
          { level: 1, role: "PMO", approver: "PMO Board", decision: "Pending" },
        ],
        parentProjectId: parentId,
        members: partial.members ?? [],
        tasks: partial.tasks ?? [],
      };
      setData((prev) => [child, ...prev]);
      sendNotification({
        kind: "project-created",
        from: "Portfolio Tracker <noreply@portfolio.local>",
        to: "PMO Board <pmo@portfolio.local>",
        subject: `Sub-project created under ${parent.name}: ${child.name}`,
        body: `${child.name} (${child.code}) was added as a sub-project of ${parent.name} (${parent.code}). Budget $${(child.budget / 1e6).toFixed(2)}M.`,
        projectId: child.id,
      });
    },
    [data, sendNotification]
  );

  // ---- Tasks ----
  const addTask = useCallback(
    (
      projectId: string,
      fields: {
        title: string;
        priority: Task["priority"];
        assigneeId?: string;
        dueDate?: string;
        parentTaskId?: string;
      }
    ) => {
      const newTask: Task = {
        id: `T-${Date.now().toString(36)}`,
        projectId,
        parentTaskId: fields.parentTaskId,
        title: fields.title,
        status: "Todo",
        priority: fields.priority,
        assigneeId: fields.assigneeId,
        dueDate: fields.dueDate,
        createdAt: new Date().toISOString(),
      };
      mutateProject(projectId, (p) => ({ ...p, tasks: [...p.tasks, newTask] }));
    },
    [mutateProject]
  );

  const updateTask = useCallback(
    (projectId: string, taskId: string, patch: Partial<Task>) => {
      mutateProject(projectId, (p) => ({
        ...p,
        tasks: p.tasks.map((t) => (t.id === taskId ? { ...t, ...patch } : t)),
      }));
    },
    [mutateProject]
  );

  const removeTask = useCallback(
    (projectId: string, taskId: string) => {
      mutateProject(projectId, (p) => ({
        ...p,
        // Drop the task and any of its sub-tasks.
        tasks: p.tasks.filter((t) => t.id !== taskId && t.parentTaskId !== taskId),
      }));
    },
    [mutateProject]
  );

  // ---- Project members ----
  const addProjectMember = useCallback(
    (projectId: string, memberId: string, role: MembershipRole) => {
      mutateProject(projectId, (p) =>
        p.members.some((mm) => mm.memberId === memberId)
          ? p
          : { ...p, members: [...p.members, { memberId, role }] }
      );
    },
    [mutateProject]
  );

  const updateProjectMemberRole = useCallback(
    (projectId: string, memberId: string, role: MembershipRole) => {
      mutateProject(projectId, (p) => ({
        ...p,
        members: p.members.map((mm) => (mm.memberId === memberId ? { ...mm, role } : mm)),
      }));
    },
    [mutateProject]
  );

  const removeProjectMember = useCallback(
    (projectId: string, memberId: string) => {
      mutateProject(projectId, (p) => ({
        ...p,
        members: p.members.filter((mm) => mm.memberId !== memberId),
      }));
    },
    [mutateProject]
  );

  const value: AppState = {
    role,
    setRole,
    filters,
    setFilters,
    resetFilters,
    allProjects,
    projects,
    updateApproval,
    addProject,
    countries,
    businessUnits,
    subsidiaries,
    watchlist,
    toggleWatch,
    isWatched,
    notifications,
    unreadCount,
    markAllRead,
    markRead,
    sendNotification,
    members,
    getMember,
    addMember,
    updateMember,
    removeMember,
    getSubProjects,
    addSubProject,
    addTask,
    updateTask,
    removeTask,
    addProjectMember,
    updateProjectMemberRole,
    removeProjectMember,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

export type { NotificationKind };
