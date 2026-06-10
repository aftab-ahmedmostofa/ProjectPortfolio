# Performance & Security Audit — AI Portfolio Dashboard

**Auditor role:** Principal Software Architect / Performance Engineer
**Date:** 2026-06-10
**Branch:** `claude/ai-dashboard-portfolio-srs-f1Gv7`
**Scope:** Full codebase (`src/`), dependencies, build output, deploy config.

> **Status: AUDIT ONLY.** No application code was modified. Findings below are
> backed by a production build and direct code reading. Implementation waits for
> approval — see `PERFORMANCE_PLAN.md`.

---

## 1. Architecture summary

A self-contained **Next.js 14.2 (App Router)** portfolio dashboard. Key facts
that shape every finding:

| Aspect | Finding |
| --- | --- |
| Rendering model | **14 of 14 page routes are `"use client"`** — the app is effectively a client-rendered SPA bolted onto App Router. Server components/SSR are unused for data. |
| Data layer | **No database.** All data is a static in-memory seed (`src/lib/data.ts`, 540 lines: **14 projects, 15 members**, nested risks/tasks/approvals) imported directly and held in React state via `AppProvider`. |
| State | One large React context (`AppProvider.tsx`, 702 lines) holds all projects, members, notifications, watchlist + ~30 mutator callbacks. |
| Charts | `recharts` (5.2 MB in `node_modules`) + a world map built from `world-atlas` TopoJSON (**105 KB raw**) via `d3-geo` + `topojson-client`. |
| Backend | One API route, `POST /api/insights`, optionally calls Azure OpenAI; falls back to an offline heuristic engine. No DB, no queue, no cache, no background jobs. |
| Code splitting | **None** — zero `next/dynamic` / `React.lazy` usages anywhere. |
| Images | **None** — no `<img>` / `next/image`. (No image-perf surface; checklist item N/A.) |

### What does NOT apply to this stack (honesty note)
The original audit checklist covers many server concerns that **have no surface
here** and are deliberately marked N/A rather than invented: SQL query plans /
indexes / composite indexes / eager loading / pagination at the DB / Redis /
queue throughput / connection pooling / worker config / serialization cost on
the wire. There is no database, ORM, cache server, or queue in this project.
The real performance story is **client bundle size and React render cost**; the
real risk story is **the one API route and client-only RBAC**.

### Measured baseline (production build, `next build`)

| Route | Route JS | **First Load JS** |
| --- | --- | --- |
| `/pm-summary` | **58.3 kB** | **275 kB** ← heaviest |
| `/` (dashboard) | 6.59 kB | **223 kB** |
| `/assistant` | 1.06 kB | 117 kB |
| `/projects/[id]` | 8.66 kB | 115 kB |
| `/risks`, `/timeline`, `/alerts`, `/projects` … | <3 kB | 108–113 kB |
| Shared baseline (all routes) | — | 87.3 kB |

The two dashboards (`/pm-summary`, `/`) are the outliers and the right place to
spend optimization effort. Everything else is already lean.

---

## 2. Performance findings

Severity = impact × likelihood of being hit on a real page load.

| ID | Finding | File | Severity | Impact (measured/est.) | Root cause | Recommended fix | Risk | Expected gain |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **P1** | `world-atlas` TopoJSON shipped in client bundle | `pm/WorldBubbleMap.tsx:7,54` | **High** | **Measured:** `/pm-summary` First Load = **275 kB**; the 105 KB JSON + `d3-geo`/`topojson-client` parse + `buildLandPath()` run at module load on the client | Full country geometry imported statically and path-built in the browser, though the map only needs ~18 static centroids | `next/dynamic(..., { ssr:false })` the map; precompute `LAND_PATH` to a static string at build time so `topojson-client`/raw JSON never reach the client | Low | −80–120 kB First Load on `/pm-summary`; faster TTI |
| **P2** | No code-splitting of chart libraries | whole app; `recharts` 5.2 MB pkg | **High** | **Measured:** `/` = 223 kB First Load even though charts are below the fold | recharts + all dashboard chart variants statically imported into the page chunk | Lazy-load chart panels (`next/dynamic`); split the rarely-used chart kinds (treemap/scatter) from the default render | Low | −40–80 kB First Load on `/` and `/pm-summary` |
| **P3** | Context `value` object rebuilt every render | `AppProvider.tsx:650` | **High** | **Est. high:** the `value` passed to `AppContext.Provider` is a fresh object literal on every render → **every** `useApp()` consumer re-renders whenever any provider state changes (notifications, filters, watchlist…) | `value` not wrapped in `useMemo`; despite individual `useCallback`s, the container object changes identity each render | Wrap `value` in `useMemo` keyed on its real dependencies (or split into stable-dispatch + changing-state contexts) | Low | Eliminates app-wide re-render storms on every notification/filter change |
| **P4** | Dashboard analytics recomputed every render, unmemoized | `app/page.tsx:33-46` | **Medium** | **Est. medium:** `portfolioKpis`, `executiveInsights`, `evaluateAlerts`, and a per-project `forecastCost` map all run on every render of `/`, not just when `projects` changes | No `useMemo` around derived analytics | `useMemo([projects])` around each derived value | Low | Removes redundant O(n) passes per render; smoother interaction |
| **P5** | `executiveInsights` does repeated multi-pass scans + `find`-after-`topBy` | `lib/analytics.ts:~254-306` | **Medium** | **Est. low–med** (n=14 today): `.filter().filter()` and `.filter().map().filter()` chains walk the list 2–3× and call `forecastCost`/`forecastSchedule` repeatedly; `topBy()` then `list.find()` re-scans for the same project | Convenience chaining; fine at n=14 but O(n·passes) and re-derives forecasts | Single-pass reduce; compute each project's forecast once into a map and reuse | Low | Lower constant factor; matters only if the dataset grows |
| **P6** | `unreadCount` computed inline, not memoized | `AppProvider.tsx:266` | **Low** | Recomputed every provider render (compounds P3) | Inline `.filter().length` | Fold into the memoized `value` (P3 fix covers it) | Low | Minor |
| **P7** | `Math.max(...points.map())` spread on render | `pm/WorldBubbleMap.tsx:86` | **Low** | Allocates an array + spread each render; trivial at current sizes | Spread over mapped array | Reduce to a single `for` max, or memoize | Low | Negligible now; tidy-up |
| **P8** | Unbounded localStorage growth (chat history) | `ChatBot.tsx:44,68` | **Low** | Chat messages persisted with a 30-item cap on messages but no byte budget | No quota guard | Already capped at 30; optionally cap serialized size | Low | Avoids rare quota errors |

**Net:** the entire measurable win is concentrated in **P1–P4**, and almost
entirely on the two dashboard routes. P5–P8 are correctness-of-craft items with
negligible impact at the current data scale (n=14) — included for completeness,
**not** recommended as priority work (avoiding premature optimization).

---

## 3. Security findings

| ID | Finding | File | Severity | Detail | Recommended fix |
| --- | --- | --- | --- | --- | --- |
| **S1** | RBAC is client-side only (cosmetic) | `lib/rbac.ts:79`, `AppProvider.tsx:96,130` | **High** (by design today, but must be understood) | `role` is React state defaulting to `"Admin"`; `scopeProjects()` runs in the browser. A user can flip role/scope in DevTools to see any subsidiary's data or enable approve/edit. There is no server-side authorization. | Acceptable for an offline demo with no real data — **but document it loudly.** If this ever fronts real data, enforce roles server-side (middleware + per-request scoping) and treat the client role as a hint only. |
| **S2** | `POST /api/insights` is unauthenticated & unvalidated | `app/api/insights/route.ts:8-16` | **Medium** | No auth, no schema validation, **no size cap** on `body.projects`. When Azure OpenAI is configured, an attacker can POST large/many payloads → **cost-amplification / DoS** against your OpenAI spend. Input is `as Project[]` with no checks. | Add auth (or restrict to same-origin), validate shape, cap array length & request size, add basic rate limiting. |
| **S3** | Prompt injection: project names → LLM unsanitized | `lib/llm.ts:39`, `lib/analytics.ts` | **Medium** | `executiveInsights()` interpolates raw project names/descriptions into the LLM user message. A crafted project name (`"… ignore previous instructions …"`) is passed verbatim. | Delimit/escape user-derived content in the prompt; instruct the model to treat it as data; validate output length. |
| **S4** | `dangerouslySetInnerHTML` for chat markdown | `ChatBot.tsx:234,240-247` | **Low** (currently safe) | `renderInline()` escapes `&`,`<`,`>` **before** applying `**bold**`/`*italic*` regex, so no tag injection is possible today. Correct, but fragile — a future edit that reorders escaping would reintroduce XSS. | Prefer a tiny vetted markdown renderer, or add a unit test pinning the escape-before-format order. |
| **S5** | Sensitive-ish data in unencrypted localStorage | `AppProvider.tsx:114-128`, `ChatBot.tsx:68` | **Low** | Watchlist + chat history (project names, emails in notifications) stored in plaintext localStorage; readable by any script on the origin (amplifies any future XSS). | Low priority for demo; avoid storing PII-bearing content if real data is introduced. |
| **S6** | Dependency CVEs flagged by GitHub | `package.json` / lockfile | **Medium** | Dependabot reports **25 vulnerabilities (1 critical, 8 high, 12 moderate, 4 low)** on the default branch. Note: the recent commit *loosened* `next` from `14.2.15` → `^14.2.3`, which permits resolving to older, more-vulnerable Next.js builds. | Run `npm audit`; re-pin `next` to a current patched 14.2.x; triage the critical/high advisories. |

> **No hardcoded secrets** were found in the repo. Azure keys are read from
> `process.env` and used **only** in the server-side route/util (`llm.ts` is
> imported solely by the API route) — not shipped to the client. `.env.example`
> contains empty placeholders only. Good.

---

## 4. Estimated-impact rollup

| Priority bucket | Items | Where the win is |
| --- | --- | --- |
| **Highest ROI (high impact / low risk)** | P1, P2, P3, S6 | −120–200 kB First Load on the two dashboards; eliminate re-render storms; close known CVEs |
| **Medium ROI** | P4, S2, S3 | Smoother interaction; protect OpenAI spend; harden the one endpoint |
| **Low / craft** | P5–P8, S1*, S4, S5 | Constant-factor cleanups; documentation & future-proofing (*S1 is doc-only unless real data is added) |

See `PERFORMANCE_PLAN.md` for sequencing, file-level changes, and re-measurement
method. **No changes will be made until you approve.**
