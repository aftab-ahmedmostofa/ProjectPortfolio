import { Project, Role } from "./types";

export interface RolePolicy {
  role: Role;
  description: string;
  permission: string; // human-readable summary (matches SRS Appendix A)
  canApprove: boolean;
  canRegisterProject: boolean;
  canEditProject: boolean;
  canViewAi: boolean;
  // "all" sees the whole portfolio; "subsidiary" is scoped to one subsidiary.
  scope: "all" | "subsidiary";
  scopedSubsidiary?: string;
}

export const ROLE_POLICIES: Record<Role, RolePolicy> = {
  Admin: {
    role: "Admin",
    description: "Full access",
    permission: "Full access",
    canApprove: true,
    canRegisterProject: true,
    canEditProject: true,
    canViewAi: true,
    scope: "all",
  },
  "CDO Office": {
    role: "CDO Office",
    description: "Governance and approvals",
    permission: "Governance and approvals",
    canApprove: true,
    canRegisterProject: false,
    canEditProject: false,
    canViewAi: true,
    scope: "all",
  },
  PMO: {
    role: "PMO",
    description: "Portfolio management",
    permission: "Portfolio management",
    canApprove: true,
    canRegisterProject: true,
    canEditProject: true,
    canViewAi: true,
    scope: "all",
  },
  "Subsidiary Manager": {
    role: "Subsidiary Manager",
    description: "Manage subsidiary projects",
    permission: "Manage subsidiary projects",
    canApprove: false,
    canRegisterProject: true,
    canEditProject: true,
    canViewAi: true,
    scope: "subsidiary",
    scopedSubsidiary: "Gulf Holdings",
  },
  Viewer: {
    role: "Viewer",
    description: "Read-only access",
    permission: "Read-only access",
    canApprove: false,
    canRegisterProject: false,
    canEditProject: false,
    canViewAi: true,
    scope: "all",
  },
};

export const ALL_ROLES: Role[] = [
  "Admin",
  "CDO Office",
  "PMO",
  "Subsidiary Manager",
  "Viewer",
];

// Apply a role's data scope to the project list (multi-level authorization).
export function scopeProjects(list: Project[], role: Role): Project[] {
  const policy = ROLE_POLICIES[role];
  if (policy.scope === "subsidiary" && policy.scopedSubsidiary) {
    return list.filter((p) => p.subsidiary === policy.scopedSubsidiary);
  }
  return list;
}
