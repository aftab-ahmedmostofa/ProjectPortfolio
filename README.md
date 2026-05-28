# AI Dashboard / Project Portfolio Tracking System

A centralized, AI-powered portal for monitoring project **cost, delivery, quality, approvals,
and subsidiary-wise performance** across a portfolio. This repository is a working,
self-contained reference implementation of the SRS — it runs end-to-end with no external
services or API keys required.

## Quick start

```bash
npm install
npm run dev        # http://localhost:3000
# or
npm run build && npm run start
```

Use the **role switcher** (top-right) to view the portal as different roles, and the
**Country / Business Unit / Subsidiary** filters to slice the portfolio.

## What's implemented

| Module | Where | Notes |
| --- | --- | --- |
| Real-time dashboard, KPI cards, charts | `src/app/page.tsx`, `src/components/Charts.tsx` | Total Projects, Budget Utilization, Delayed, High Risk, Delivery Success, Forecast Overrun |
| Country heatmap | `src/components/CountryHeatmap.tsx` | Average AI risk score by country |
| Drill-down analytics | `src/app/projects/[id]/page.tsx` | Per-project cost/schedule/risk forecasts |
| Country / BU / Subsidiary filters | `src/components/TopBar.tsx`, `AppProvider.tsx` | Applied across all views |
| Project tracking | `src/app/projects/` | Registration, milestones, risk register, cost monitoring |
| Approval workflow | `src/app/approvals/page.tsx` | Go / No-Go, multi-level authorization, sequential gating |
| Role-based access control | `src/lib/rbac.ts` | Admin / CDO Office / PMO / Subsidiary Manager / Viewer; subsidiary scoping |
| **AI analytics** | `src/lib/analytics.ts` | See below |

### AI analytics (`src/lib/analytics.ts`)

These are real, explainable heuristics — they run offline and require no model key:

- **Predictive cost overrun** — Estimate-at-Completion via Cost Performance Index
  (`EAC = Actual / %complete`, `CPI = EarnedValue / Actual`).
- **Delay prediction** — velocity-based forecast of the finish date from progress-to-date,
  compared against the planned end date.
- **Risk scoring** — composite 0–100 score blending cost overrun, schedule slip, and the
  open risk register (severity × likelihood), with status adjustments.
- **Anomaly detection** — z-score outlier detection (≥1.5σ) on cost and schedule variance
  across the active portfolio.
- **Executive insight generation** — narrative brief synthesized from the metrics above
  (`/api/insights`), with an **optional Azure OpenAI** rewrite layer.

### Optional Azure OpenAI

Copy `.env.example` to `.env.local` and set `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_API_KEY`,
and `AZURE_OPENAI_DEPLOYMENT` to have the executive brief rewritten by Azure OpenAI
(`src/lib/llm.ts`). Without these, the deterministic heuristic engine is used automatically.

## Technology stack

Aligned to the SRS proposed stack: **React / Next.js** (App Router, TypeScript) frontend,
Node.js (Next.js route handlers) for the API layer, **Tailwind CSS** + **Recharts** for the UI,
and an **Azure OpenAI** integration point for the AI layer.

> **Demo data layer.** To keep the reference implementation runnable without infrastructure,
> the portfolio is served from an in-repo seed (`src/lib/data.ts`) instead of PostgreSQL/MongoDB.
> In production this layer is replaced by the integrations below; the domain model
> (`src/lib/types.ts`) and analytics are storage-agnostic.

## SRS coverage & production roadmap

Fully demonstrated here: dashboards, KPIs, drill-down, filters, project/milestone/risk tracking,
multi-level approvals, RBAC, and the full AI analytics suite.

Stubbed for a production deployment (architecture in place, infra out of scope for this demo):

- **SSO / MFA** (Azure AD / Okta) — the role switcher simulates authenticated roles.
- **Persistent database** (PostgreSQL / MongoDB) — replace the seed module with a repository.
- **External integrations** — ERP, HR, PM tools, SharePoint, and email.
- **Non-functional** — horizontal scaling, encryption at rest/in transit, and audit logging
  are deployment concerns; API responses already meet the <1s target locally.

## User roles (SRS Appendix A)

| Role | Permission |
| --- | --- |
| Admin | Full access |
| CDO Office | Governance and approvals |
| PMO | Portfolio management |
| Subsidiary Manager | Manage subsidiary projects (data scoped to their subsidiary) |
| Viewer | Read-only access |

## Project structure

```
src/
  app/
    page.tsx              # Dashboard
    projects/             # List, registration, drill-down
    approvals/            # Go/No-Go workflow
    ai-insights/          # AI analytics
    api/insights/         # Insight generation endpoint
  components/             # AppProvider, nav, charts, UI primitives
  lib/
    types.ts              # Domain model
    data.ts               # Seed portfolio (swap for DB/ERP)
    analytics.ts          # AI analytics engine
    rbac.ts               # Roles & scoping
    llm.ts                # Optional Azure OpenAI augmentation
```
