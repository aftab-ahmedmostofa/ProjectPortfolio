# Performance & Security Remediation Plan — AI Portfolio Dashboard

**Companion to:** `PERFORMANCE_AUDIT.md`
**Date:** 2026-06-10
**Sequencing principle:** strict ROI order — high-impact/low-risk first.

> **Awaiting approval before implementation.** Nothing in this plan has been
> applied. Pick the items you want and I will implement them in order,
> re-measuring after each.

---

## Baseline to beat (from `next build`)

| Route | First Load JS (now) | Target |
| --- | --- | --- |
| `/pm-summary` | **275 kB** | ≤ ~160 kB |
| `/` (dashboard) | **223 kB** | ≤ ~170 kB |
| Shared baseline | 87.3 kB | ≤ 87.3 kB (no regression) |

Re-measurement method after each change: `npm run build`, compare the route
table; for render-cost items, React DevTools Profiler before/after on the
relevant page.

---

## Tier 1 — High impact / low risk (do first)

### T1.1 — Move the world map off the client critical path  *(P1)*
- **Change:** Precompute the SVG `LAND_PATH` once at build time (a small script
  or a generated `.ts` constant) so `world-atlas` (105 KB JSON) +
  `topojson-client` are no longer imported into the client bundle. Load
  `WorldBubbleMap` via `next/dynamic(..., { ssr: false })`.
- **Files:** `src/components/pm/WorldBubbleMap.tsx`, the `/pm-summary` page, +1 generated constants file.
- **Expected impact:** First Load `/pm-summary` −80–120 kB; faster TTI; no DB/network change.
- **Rollback:** Revert to static import (single-file change).
- **Re-measure:** build table row for `/pm-summary`.

### T1.2 — Lazy-load chart panels  *(P2)*
- **Change:** Wrap recharts-based panels on `/` and `/pm-summary` in
  `next/dynamic`; keep the first above-the-fold chart eager, defer the rest.
- **Files:** `src/app/page.tsx`, `src/app/pm-summary/page.tsx`, `src/components/dashboard/DashCharts.tsx`, `src/components/pm/*`.
- **Expected impact:** First Load `/` and `/pm-summary` −40–80 kB; charts stream in just after paint.
- **Rollback:** Replace `dynamic()` with static import.
- **Re-measure:** build table; verify charts still render (Playwright probe `scripts/check.mjs`).

### T1.3 — Memoize the context `value`  *(P3, folds in P6)*
- **Change:** Wrap the `AppProvider` `value` object in `useMemo` over its real
  deps; move `unreadCount` inside it. (Optional follow-up: split stable
  dispatch from changing state into two contexts.)
- **Files:** `src/components/AppProvider.tsx`.
- **Expected impact:** Stops every `useApp()` consumer from re-rendering on each
  notification/filter/watchlist change. Memory: fewer transient allocations.
- **Rollback:** Remove the `useMemo` wrapper.
- **Re-measure:** React DevTools Profiler — toggle a filter, confirm unrelated
  subtrees no longer re-render.

### T1.4 — Close dependency CVEs  *(S6)*
- **Change:** `npm audit`; re-pin `next` to the latest patched 14.2.x (undo the
  `^14.2.3` loosening); bump other critical/high advisories that don't break.
- **Files:** `package.json`, `package-lock.json`.
- **Expected impact:** Removes known-vulnerable resolutions; infra/security posture.
- **Rollback:** Restore lockfile.
- **Re-measure:** `npm audit` before/after; `npm run build` + probe to confirm no regression.

---

## Tier 2 — High impact / medium risk

### T2.1 — Harden `POST /api/insights`  *(S2)*
- **Change:** Validate body shape, cap `projects` length & request size, reject
  oversized payloads (413), add lightweight rate limiting; gate behind
  same-origin or a token when Azure is configured.
- **Files:** `src/app/api/insights/route.ts` (+ a small validation helper).
- **Expected impact:** Protects Azure OpenAI spend from cost-amplification/DoS;
  no change to the happy path.
- **Risk:** Medium — must not break the legitimate dashboard call. Mitigate with
  a test for the existing payload.

### T2.2 — Neutralize prompt injection  *(S3)*
- **Change:** Wrap user-derived strings (project names/descriptions) in clear
  delimiters in the LLM prompt and instruct the model to treat them as data;
  bound output length.
- **Files:** `src/lib/llm.ts`, possibly `src/lib/analytics.ts`.
- **Expected impact:** Removes injection vector; only affects the Azure path.
- **Risk:** Medium — verify heuristic fallback unchanged.

### T2.3 — Memoize dashboard analytics  *(P4)*
- **Change:** `useMemo` around `portfolioKpis` / `executiveInsights` /
  `evaluateAlerts` / the CPI map in `app/page.tsx`.
- **Files:** `src/app/page.tsx`.
- **Expected impact:** Removes repeated O(n) passes per render.
- **Risk:** Low–medium (dependency arrays must be correct).

---

## Tier 3 — Low impact / craft & future-proofing (only if you want them)

> These are **not recommended as priority work** at the current data scale
> (n=14 projects). Listed for completeness; flagging them avoids the trap of
> premature optimization.

- **T3.1 (P5):** Single-pass `executiveInsights`; compute each forecast once.
- **T3.2 (P7):** Replace `Math.max(...map)` spread with a loop.
- **T3.3 (S1):** Add a prominent README/code note that RBAC is client-side and
  cosmetic; specify the server-enforcement design needed before real data.
- **T3.4 (S4):** Unit-test pinning `renderInline` escape-before-format order (or
  swap to a vetted markdown renderer).
- **T3.5 (S5):** Stop persisting PII-bearing content to localStorage if real
  data is introduced.

---

## Guardrails for the implementation phase
- Preserve all existing functionality; no breaking changes without flagging.
- Follow existing conventions; keep readability.
- Re-run `npm run build` and the Playwright probe (`node scripts/check.mjs`)
  after each tier; confirm no console errors and charts still render.
- Report per-change: what changed, why, and impact on response time /
  throughput / memory / DB load / infra cost.

---

## Recommended first batch
**T1.1 + T1.2 + T1.3 + T1.4** — biggest measurable win (−120–200 kB First Load
on the two dashboards, eliminated re-render storms, CVEs closed), all low risk,
all verifiable via the existing build + probe.

---

## ✅ Implementation results — Tier 1 (completed 2026-06-10)

Approved and implemented: **T1.1 + T1.2 + T1.3 + T1.4**. Verified with
`npm run build` and a Playwright probe of `/` and `/pm-summary` (no console
errors; all charts and the world map render; lazy placeholders resolved).

### Measured First Load JS (before → after)

| Route | Before | After | Δ |
| --- | --- | --- | --- |
| `/pm-summary` | 275 kB | **107 kB** | **−168 kB (−61%)** |
| `/` (dashboard) | 223 kB | **116 kB** | **−107 kB (−48%)** |
| `/pm-summary` route code | 58.3 kB | **4.58 kB** | −53.7 kB |
| Shared baseline | 87.3 kB | 87.8 kB | +0.5 kB (noise) |

Both dashboards now sit at the shared baseline — recharts and the map load as
async chunks after first paint. Targets (≤160 / ≤170 kB) exceeded.

### What landed
- **T1.1** — `scripts/gen-world-path.mjs` precomputes the land outline into
  `src/components/pm/worldLandPath.ts` (coords rounded to 1 dp, visually
  lossless); `WorldBubbleMap` no longer imports `world-atlas`/`topojson-client`
  and is `next/dynamic`-loaded (`ssr:false`). Removes a dependency + per-mount
  TopoJSON decode; moves the map off First Load.
- **T1.2** — All recharts panels on `/` and `/pm-summary` are `next/dynamic`
  with a skeleton fallback. recharts no longer ships in First Load JS.
- **T1.3** — `AppProvider` context `value` wrapped in `useMemo`; `unreadCount`
  memoized. Consumers no longer re-render on every provider render.
- **T1.4** — `next` re-pinned `^14.2.3` → `14.2.35` (closed the **critical**
  cache-poisoning advisory); `postcss` → `^8.5.10`; `npm audit fix` cleared
  `@babel/runtime`. Remaining 2 advisories (1 high, 1 moderate) are fixed only
  in `next@16` (major/breaking, out of scope) and concern features this app
  does not use (Image Optimizer, i18n middleware, Pages Router). Local audit:
  3 (1 critical) → **2 (0 critical)**.

### Impact on the five dimensions
- **Response time / TTI:** materially faster initial load on the two dashboards
  (−48% / −61% First Load JS); charts stream in just after paint.
- **Throughput:** static-exported pages unchanged; no server cost added.
- **Memory:** fewer transient allocations (memoized context; no per-mount
  TopoJSON feature extraction).
- **DB load:** N/A (no database).
- **Infra cost:** smaller transfer per visit; security posture improved.

Tier 2 / Tier 3 remain **not started** — awaiting a separate go-ahead.
