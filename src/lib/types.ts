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
  description: string;
  severity: Severity;
  likelihood: number; // 0..1
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
  budget: number; // approved budget
  actualCost: number; // cost incurred to date
  progress: number; // 0..100 physical completion
  startDate: string; // ISO
  plannedEndDate: string; // ISO
  milestones: Milestone[];
  risks: Risk[];
  approvals: ApprovalStep[];
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
