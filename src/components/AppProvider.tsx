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
  Risk,
  RiskCategory,
  RiskStatus,
} from "@/lib/types";
import { projects as seedProjects, seedMembers } from "@/lib/data";
import { scopeProjects, ROLE_POLICIES } from "@/lib/rbac";
import { assessRisk } from "@/lib/analytics";
import { deriveSeverity, refreshDerived } from "@/lib/risks";

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
  // Risk management
  addRisk: (
    projectId: string,
    fields: {
      title: string;
      description?: string;
      category: RiskCategory;
      probability: 1 | 2 | 3 | 4 | 5;
      impact: 1 | 2 | 3 | 4 | 5;
      mitigation?: string;
      ownerId?: string;
      dueDate?: string;
    }
  ) => Risk | null;
  updateRisk: (projectId: string, riskId: string, patch: Partial<Risk>) => void;
  changeRiskStatus: (projectId: string, riskId: string, status: RiskStatus) => void;
  assignRisk: (projectId: string, riskId: string, memberId: string | undefined) => void;
  addRiskComment: (projectId: string, riskId: string, text: string) => void;
  softDeleteRisk: (projectId: string, riskId: string) => void;
  restoreRisk: (projectId: string, riskId: string) => void;
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

  // ---- Risk register ----
  const mutateRisk = useCallback(
    (projectId: string, riskId: string, mutator: (r: Risk) => Risk) => {
      mutateProject(projectId, (p) => ({
        ...p,
        risks: p.risks.map((r) => (r.id === riskId ? refreshDerived(mutator(r)) : r)),
      }));
    },
    [mutateProject]
  );

  const addRisk = useCallback(
    (
      projectId: string,
      fields: {
        title: string;
        description?: string;
        category: RiskCategory;
        probability: 1 | 2 | 3 | 4 | 5;
        impact: 1 | 2 | 3 | 4 | 5;
        mitigation?: string;
        ownerId?: string;
        dueDate?: string;
      }
    ): Risk | null => {
      const id = `R-${Date.now().toString(36)}`;
      const now = new Date().toISOString();
      const risk: Risk = refreshDerived({
        id,
        title: fields.title,
        description: fields.description ?? "",
        category: fields.category,
        probability: fields.probability,
        impact: fields.impact,
        severity: deriveSeverity(fields.probability, fields.impact),
        mitigation: fields.mitigation ?? "",
        mitigationProgress: 0,
        ownerId: fields.ownerId,
        status: "Open",
        dueDate: fields.dueDate,
        createdAt: now,
        updatedAt: now,
        open: true,
        likelihood: fields.probability / 5,
        activity: [
          {
            id: `A-${id}-init`,
            at: now,
            actor: role,
            kind: "created",
            message: `Created risk "${fields.title}" (probability ${fields.probability}, impact ${fields.impact}).`,
          },
        ],
      });
      mutateProject(projectId, (p) => ({ ...p, risks: [...p.risks, risk] }));

      // Notify the assignee on creation if one is set.
      if (fields.ownerId) {
        const owner = members.find((m) => m.id === fields.ownerId);
        const project = data.find((p) => p.id === projectId);
        if (owner && project) {
          sendNotification({
            kind: "approval-request",
            from: "Risk Manager <riskmgr@portfolio.local>",
            to: `${owner.name} <${owner.email}>`,
            subject: `Risk assigned: ${fields.title} (${project.code})`,
            body: `${owner.name},\n\nYou have been assigned a new ${risk.severity} risk on ${project.name}.\n\nTitle: ${fields.title}\nCategory: ${fields.category}\nProbability × Impact: ${fields.probability} × ${fields.impact} = ${fields.probability * fields.impact}\nMitigation plan: ${fields.mitigation || "—"}\n\nPlease open the risk register to review and act.\n\n— Portfolio Risk Manager`,
            projectId,
          });
        }
      }
      return risk;
    },
    [members, data, mutateProject, role, sendNotification]
  );

  const updateRisk = useCallback(
    (projectId: string, riskId: string, patch: Partial<Risk>) => {
      mutateRisk(projectId, riskId, (r) => {
        const changes: string[] = [];
        if (patch.probability && patch.probability !== r.probability) changes.push(`probability ${r.probability}→${patch.probability}`);
        if (patch.impact && patch.impact !== r.impact) changes.push(`impact ${r.impact}→${patch.impact}`);
        if (patch.mitigation !== undefined && patch.mitigation !== r.mitigation) changes.push("mitigation plan updated");
        if (patch.mitigationProgress !== undefined && patch.mitigationProgress !== r.mitigationProgress) changes.push(`progress ${r.mitigationProgress}%→${patch.mitigationProgress}%`);
        if (patch.dueDate !== undefined && patch.dueDate !== r.dueDate) changes.push(`due date set to ${patch.dueDate || "—"}`);
        if (patch.category && patch.category !== r.category) changes.push(`category ${r.category}→${patch.category}`);
        if (patch.title && patch.title !== r.title) changes.push("title updated");
        if (patch.description !== undefined && patch.description !== r.description) changes.push("description updated");
        const next: Risk = {
          ...r,
          ...patch,
          updatedAt: new Date().toISOString(),
        };
        if (changes.length > 0) {
          next.activity = [...r.activity, {
            id: `A-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
            at: next.updatedAt,
            actor: role,
            kind: "updated",
            message: changes.join("; ") + ".",
          }];
        }
        return next;
      });
    },
    [mutateRisk, role]
  );

  const changeRiskStatus = useCallback(
    (projectId: string, riskId: string, status: RiskStatus) => {
      mutateRisk(projectId, riskId, (r) => {
        if (r.status === status) return r;
        return {
          ...r,
          status,
          updatedAt: new Date().toISOString(),
          activity: [...r.activity, {
            id: `A-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
            at: new Date().toISOString(),
            actor: role,
            kind: "status-changed",
            message: `Status changed: ${r.status} → ${status}.`,
          }],
        };
      });
    },
    [mutateRisk, role]
  );

  const assignRisk = useCallback(
    (projectId: string, riskId: string, memberId: string | undefined) => {
      const member = memberId ? members.find((m) => m.id === memberId) : undefined;
      const previousRisk = data.find((p) => p.id === projectId)?.risks.find((r) => r.id === riskId);
      mutateRisk(projectId, riskId, (r) => {
        if (r.ownerId === memberId) return r;
        const prevName = r.ownerId ? members.find((m) => m.id === r.ownerId)?.name ?? "Unassigned" : "Unassigned";
        const newName = member?.name ?? "Unassigned";
        return {
          ...r,
          ownerId: memberId,
          updatedAt: new Date().toISOString(),
          activity: [...r.activity, {
            id: `A-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
            at: new Date().toISOString(),
            actor: role,
            kind: "assigned",
            message: `Owner changed: ${prevName} → ${newName}.`,
          }],
        };
      });

      // Notify the new assignee.
      if (member && previousRisk && previousRisk.ownerId !== memberId) {
        const project = data.find((p) => p.id === projectId);
        if (project) {
          sendNotification({
            kind: "approval-request",
            from: "Risk Manager <riskmgr@portfolio.local>",
            to: `${member.name} <${member.email}>`,
            subject: `Risk assigned: ${previousRisk.title} (${project.code})`,
            body: `${member.name},\n\nYou are now the owner of a ${previousRisk.severity} risk on ${project.name}.\n\nTitle: ${previousRisk.title}\nCategory: ${previousRisk.category}\nStatus: ${previousRisk.status}\nMitigation plan: ${previousRisk.mitigation || "—"}\n\n— Portfolio Risk Manager`,
            projectId,
          });
        }
      }
    },
    [members, data, mutateRisk, role, sendNotification]
  );

  const addRiskComment = useCallback(
    (projectId: string, riskId: string, text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      mutateRisk(projectId, riskId, (r) => ({
        ...r,
        updatedAt: new Date().toISOString(),
        activity: [...r.activity, {
          id: `A-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
          at: new Date().toISOString(),
          actor: role,
          kind: "comment",
          message: trimmed,
        }],
      }));
    },
    [mutateRisk, role]
  );

  const softDeleteRisk = useCallback(
    (projectId: string, riskId: string) => {
      mutateRisk(projectId, riskId, (r) => ({
        ...r,
        deletedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        activity: [...r.activity, {
          id: `A-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
          at: new Date().toISOString(),
          actor: role,
          kind: "deleted",
          message: "Risk soft-deleted.",
        }],
      }));
    },
    [mutateRisk, role]
  );

  const restoreRisk = useCallback(
    (projectId: string, riskId: string) => {
      mutateRisk(projectId, riskId, (r) => ({
        ...r,
        deletedAt: undefined,
        updatedAt: new Date().toISOString(),
        activity: [...r.activity, {
          id: `A-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
          at: new Date().toISOString(),
          actor: role,
          kind: "restored",
          message: "Risk restored.",
        }],
      }));
    },
    [mutateRisk, role]
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
    addRisk,
    updateRisk,
    changeRiskStatus,
    assignRisk,
    addRiskComment,
    softDeleteRisk,
    restoreRisk,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

export type { NotificationKind };
