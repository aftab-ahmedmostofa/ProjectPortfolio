// Domain model for the AI Portfolio Tracking System.

export type ProjectStatus =
  | "Planning"
  | "In Progress"
  | "Delayed"
  | "On Hold"
  | "Completed"
  | "Cancelled";

export type Severity = "Low" | "Medium" | "High" | "Critical";

export type MilestoneStatus = "Pending" | "In Progress" | "Done" | "Missed";

export type ApprovalDecision = "Pending" | "Approved" | "Rejected";

export type Role =
  | "Admin"
  | "CDO Office"
  | "PMO"
  | "Subsidiary Manager"
  | "Viewer";

export interface Milestone {
  id: string;
  name: string;
  dueDate: string; // ISO date
  status: MilestoneStatus;
  completion: number; // 0..100
}

export interface Risk {
  id: string;
  title: string;
  description: string;
  category: RiskCategory;
  probability: 1 | 2 | 3 | 4 | 5;
  impact: 1 | 2 | 3 | 4 | 5;
  severity: Severity; // derived from probability × impact, cached for fast reads
  mitigation: string;
  mitigationProgress: number; // 0..100
  ownerId?: string;
  status: RiskStatus;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
  // Back-compat for analytics: open = not Closed and not deleted; likelihood derived from probability.
  open: boolean;
  likelihood: number;
  deletedAt?: string; // soft delete
  activity: RiskActivityEntry[];
}

export type RiskCategory =
  | "Technical"
  | "Financial"
  | "Operational"
  | "Compliance"
  | "Security"
  | "Schedule"
  | "Resource"
  | "Stakeholder"
  | "External"
  | "Strategic"
  | "Quality";

export const RISK_CATEGORIES: RiskCategory[] = [
  "Technical",
  "Financial",
  "Operational",
  "Compliance",
  "Security",
  "Schedule",
  "Resource",
  "Stakeholder",
  "External",
  "Strategic",
  "Quality",
];

export type RiskStatus = "Open" | "In Progress" | "Mitigated" | "Accepted" | "Closed";
export const RISK_STATUSES: RiskStatus[] = ["Open", "In Progress", "Mitigated", "Accepted", "Closed"];

export type RiskActivityKind =
  | "created"
  | "updated"
  | "comment"
  | "status-changed"
  | "assigned"
  | "deleted"
  | "restored";

export interface RiskActivityEntry {
  id: string;
  at: string;
  actor: string;
  kind: RiskActivityKind;
  message: string;
}

// Legacy shape used only by the seed in src/lib/data.ts.
// Migrated to Risk via lib/risks.ts → migrateLegacyRisk on app load.
export interface LegacyRisk {
  id: string;
  description: string;
  severity: Severity;
  likelihood: number;
  mitigation: string;
  open: boolean;
}

export interface ApprovalStep {
  level: number;
  role: Role;
  approver: string;
  decision: ApprovalDecision;
  comment?: string;
  decidedAt?: string; // ISO date
}

export interface Member {
  id: string;
  name: string;
  email: string;
  phone: string;
  title?: string;
}

export type MembershipRole = "Sponsor" | "Manager" | "Contributor" | "Reviewer";

export interface ProjectMembership {
  memberId: string;
  role: MembershipRole;
}

export type TaskStatus = "Todo" | "In Progress" | "Done" | "Blocked";

export interface Task {
  id: string;
  projectId: string;
  parentTaskId?: string;
  title: string;
  status: TaskStatus;
  priority: "Low" | "Medium" | "High";
  assigneeId?: string;
  dueDate?: string; // ISO yyyy-mm-dd
  createdAt: string; // ISO
}

export interface Project {
  id: string;
  code: string;
  name: string;
  description: string;
  subsidiary: string;
  businessUnit: string;
  country: string;
  manager: string;
  status: ProjectStatus;
  priority: "Low" | "Medium" | "High";
  budget: number;
  actualCost: number;
  progress: number;
  startDate: string;
  plannedEndDate: string;
  milestones: Milestone[];
  risks: Risk[];
  approvals: ApprovalStep[];
  parentProjectId?: string;
  members: ProjectMembership[];
  tasks: Task[];
}

export type RiskLevel = "Low" | "Medium" | "High";

// Multi-select filters: an empty array means "no filter applied" (i.e. all values).
export interface PortfolioFilters {
  country: string[];
  businessUnit: string[];
  subsidiary: string[];
  status: ProjectStatus[];
  priority: ("Low" | "Medium" | "High")[];
  riskLevel: RiskLevel[];
  dateFrom: string;
  dateTo: string;
  search: string;
}

export const EMPTY_FILTERS: PortfolioFilters = {
  country: [],
  businessUnit: [],
  subsidiary: [],
  status: [],
  priority: [],
  riskLevel: [],
  dateFrom: "",
  dateTo: "",
  search: "",
};

export type AlertSeverity = "info" | "warn" | "critical";

export interface PortfolioAlert {
  id: string;
  projectId: string;
  projectName: string;
  rule: string;
  severity: AlertSeverity;
  title: string;
  message: string;
}

export type NotificationKind =
  | "approval-request"
  | "approval-decided"
  | "project-created"
  | "watch-reminder";

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  from: string;
  to: string;
  subject: string;
  body: string;
  projectId?: string;
  createdAt: string; // ISO
  read: boolean;
}
