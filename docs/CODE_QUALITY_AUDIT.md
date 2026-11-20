# Domino Sky — Code Quality & Architecture Audit

> **Audit Date**: 2026-11-20  
> **Target Scope**: `main/`, `frontend/`, `backend/`  
> **Initial Code Quality Score**: 89/100 (Efficiency: 100, Testing: 98, Security: 96, Accessibility: 95, Problem Alignment: 100)  
> **Target Code Quality Score**: 98+/100  

---

## Executive Summary & Top 15 Impact Rankings

The audit evaluated all 39 source files across the monorepo (`main/src`, `backend/src`, `frontend/src`) across 9 structural dimensions. While core algorithmic efficiency and problem alignment are flawless, the code exhibits monolithic functions, inline component data transformations, non-null assertions, unvalidated type casts in API handlers, and duplicate styling logic.

### Top 15 Findings Ranked by Impact

| Rank | Issue | File Path & Lines | Impact Category | Severity |
|---|---|---|---|---|
| **1** | Monolithic `simulate()` function with Cyclomatic Complexity 56 & 405 lines | `main/src/simulate.ts:65-469` | Complexity / Responsibility | **Critical** |
| **2** | Untyped `req.body` with 8 repeated `as` type casts in advise router | `backend/src/routes/advise.ts:64, 65, 101, 102, 123, 124, 138, 143, 144` | Type Safety / API Robustness | **Critical** |
| **3** | Monolithic `AirspaceMap` (401 lines, Complexity 39) mixing Bezier math, timer loops, and SVG rendering | `frontend/src/components/Map.tsx:7-407` | Separation of Concerns | **High** |
| **4** | Non-null assertions (`!`) bypassing strict null checks in engine & advisor | `main/src/simulate.ts:150, 163, 171, 292`, `main/src/advisor/placeholders.ts:71` | Type Safety / Runtime Errors | **High** |
| **5** | Unvalidated cast `as RawAdvisorOutput` on parsed LLM JSON response | `backend/src/llm/provider.ts:144` | Schema Validation / Security | **High** |
| **6** | Monolithic `generateRecoveryPlan()` with Cyclomatic Complexity 30 & 165 lines | `main/src/planner.ts:23-187` | Complexity / Maintainability | **High** |
| **7** | Hardcoded heuristics and magic numbers in planner & simulation | `main/src/planner.ts:42, 56, 73, 75`, `main/src/simulate.ts:351, 358, 366` | Configuration / Maintainability | **Medium-High** |
| **8** | `FlightTable` (241 lines, Complexity 37) mixing search, multi-column sorting & pagination into JSX | `frontend/src/components/FlightTable.tsx:11-251` | React Component Architecture | **Medium-High** |
| **9** | Monolithic `Gantt` component (245 lines, Complexity 20) mixing timeline math with DOM | `frontend/src/components/Gantt.tsx:9-253` | React Component Architecture | **Medium** |
| **10** | Monolithic `AIPanel` (235 lines, Complexity 26) mixing cost delta calculations with card layout | `frontend/src/components/AIPanel.tsx:8-242` | React Component Architecture | **Medium** |
| **11** | Duplicated Quadratic Bezier point math in map rendering | `frontend/src/components/Map.tsx:142-149, 189-196` | Code Duplication | **Medium** |
| **12** | Duplicated flight status resolution and badge styling across 4 components | `FlightTable.tsx:22-38`, `Gantt.tsx:165-175`, `Map.tsx:155-165`, `KPIStrip.tsx:25-35` | Code Duplication / DRY | **Medium** |
| **13** | Dead/unused dependencies `three` and `@types/three` in `frontend/package.json` | `frontend/package.json:16, 20` | Dependency Hygiene | **Medium** |
| **14** | Leftover `console.log`, `console.warn`, and `console.error` calls in production code (11 instances) | `backend/src/routes/advise.ts`, `backend/src/server.ts`, `frontend/src/api/advisorApi.ts`, `frontend/src/store/useSimulatorStore.ts` | Logging & Observability | **Medium-Low** |
| **15** | Missing JSDoc documentation on public exports across `main/src` | `main/src/simulate.ts`, `main/src/planner.ts`, `main/src/pax.ts`, `main/src/crew.ts`, `main/src/causes.ts` | Developer Experience / Readability | **Medium-Low** |

---

## Detailed Findings by Category

### Category 1: Functions over 40 Lines or Cyclomatic Complexity > 10

The following 30 functions exceed either 40 lines of code or a cyclomatic complexity score of 10:

| File Path | Function / Method | Lines | Length | Cyclomatic Complexity | Action Required |
|---|---|---|---|---|---|
| `main/src/simulate.ts` | `simulate` | 65–469 | 405 lines | **56** | Split into submodules (`readiness.ts`, `cancellation.ts`, `causes.ts`, `metrics.ts`) |
| `frontend/src/components/Map.tsx` | `AirspaceMap` | 7–407 | 401 lines | **39** | Extract hooks `useMapProjection`, `useFlightAnimation`, and split subcomponents |
| `frontend/src/components/Gantt.tsx` | `Gantt` | 9–253 | 245 lines | **20** | Extract timeline geometry hook and `GanttBar` subcomponent |
| `frontend/src/components/FlightTable.tsx` | `FlightTable` | 11–251 | 241 lines | **37** | Extract `useFlightTable` hook (search, filter, sort, pagination) |
| `frontend/src/components/AIPanel.tsx` | `AIPanel` | 8–242 | 235 lines | **26** | Extract `CandidateCard` and `RecoveryActionBadge` components |
| `frontend/src/components/BeforeAfter.tsx` | `BeforeAfter` | 7–224 | 218 lines | **17** | Extract `MetricComparisonRow` helper component |
| `frontend/src/components/ControlPanel.tsx` | `ControlPanel` | 7–197 | 191 lines | **13** | Extract closure input controls into subcomponents |
| `frontend/src/App.tsx` | `App` | 15–197 | 183 lines | 9 | Extract `TopNavigation` bar and layout container |
| `frontend/src/components/WhyDrawer.tsx` | `WhyDrawer` | 11–186 | 176 lines | **14** | Extract `DominoChainStep` subcomponent |
| `main/src/planner.ts` | `generateRecoveryPlan` | 23–187 | 165 lines | **30** | Decompose candidate generation into separate strategy functions |
| `frontend/src/store/useSimulatorStore.ts` | Store Creator | 55–211 | 157 lines | **11** | Split state slices (scenario slice, simulation slice, UI slice) |
| `main/src/loader.ts` | `normalizeDataset` | 125–240 | 116 lines | **12** | Extract indexing helpers (`buildFlightIndexes`, `buildCrewIndexes`) |
| `main/src/advisor/verifier.ts` | `verifyAdvisorOutput` | 25–134 | 110 lines | **18** | Extract whitelist builder and token extraction helpers |
| `backend/src/routes/advise.ts` | Route Handler Callback | 46–151 | 106 lines | 9 | Extract controller and validate body with Zod schema |
| `frontend/src/components/AssumptionsPanel.tsx` | `AssumptionsPanel` | 5–109 | 105 lines | 3 | Extract assumption category cards |
| `frontend/src/components/Gantt.tsx` | Aircraft Timeline Row | 125–208 | 84 lines | 10 | Move to isolated `AircraftGanttRow` component |
| `frontend/src/components/KPIStrip.tsx` | `KPIStrip` | 6–84 | 79 lines | **15** | Extract stat configuration array and map over `Stat` |
| `frontend/src/components/ui/Stat.tsx` | `Stat` | 15–93 | 79 lines | **11** | Simplify conditional trend/color rendering |
| `main/src/pax.ts` | `computePassengerImpact` | 24–98 | 75 lines | **11** | Extract helper `evaluateConnection()` |
| `frontend/src/components/ui/Sheet.tsx` | `Sheet` | 12–85 | 74 lines | 6 | Clean up backdrop and dialog layout |
| `main/src/advisor/fallback.ts` | `generateFallbackRecommendation` | 9–77 | 69 lines | 9 | Extract candidate template formatter |
| `frontend/src/workers/engine.worker.ts` | `onmessage` Handler | 11–76 | 66 lines | 8 | Extract message router |
| `main/src/crew.ts` | `evaluateCrewDuty` | 20–80 | 61 lines | **11** | Extract helper `calculateCrewFlightDuty()` |
| `frontend/src/components/Map.tsx` | Position Calculation Callback | 244–303 | 60 lines | **11** | Move to `useFlightAnimation` hook |
| `frontend/src/components/FlightTable.tsx` | Row Render Callback | 187–245 | 59 lines | 7 | Extract `FlightTableRow` component |
| `frontend/src/components/Gantt.tsx` | Flight Block Callback | 146–204 | 59 lines | 8 | Extract `GanttFlightBlock` component |
| `frontend/src/components/Map.tsx` | Flight Arc Generator | 136–188 | 53 lines | **13** | Extract to `geometry/arc.ts` |
| `frontend/src/components/ui/Segmented.tsx` | `Segmented` | 17–68 | 52 lines | 4 | Simplify button mapping |
| `backend/src/llm/provider.ts` | `buildPrompt` | 37–85 | 49 lines | 2 | Extract prompt template string |
| `main/src/causes.ts` | `generatePlainEnglishWhy` | 57–104 | 48 lines | **11** | Simplify cause chain formatters |
| `backend/src/llm/provider.ts` | `generateRecommendation` | 100–145 | 46 lines | 3 | Extract JSON parsing and retry helper |
| `frontend/src/components/LandingPage.tsx` | `LandingPage` | 8–55 | 48 lines | 1 | Extract feature pills |
| `frontend/src/components/Map.tsx` | Airport Marker Renderer | 193–239 | 47 lines | 4 | Extract `AirportMarker` component |
| `frontend/src/components/FlightTable.tsx` | Filter/Sort Memo Callback | 20–63 | 44 lines | **18** | Extract into pure selector / hook |
| `main/src/advisor/placeholders.ts` | `buildSubstitutionMap` | 17–58 | 42 lines | 3 | Simplify placeholder map generation |
| `main/src/planner.ts` | `isCompatible` | 189–201 | 13 lines | **11** | Simplify boolean condition checks |

---

### Category 2: Files over 300 Lines or with Multiple Responsibilities

1. **`main/src/simulate.ts` (470 lines)**
   - *Current Responsibilities*:
     1. Scenario action validation and indexing (spare swaps, crew replacements, connection holds, cancellations).
     2. Aircraft readiness and turnaround tracking.
     3. Airport closure checking for both departure and arrival holds.
     4. Crew duty and turnaround simulation.
     5. Binding constraint delay determination and cause classification.
     6. Curfew and maximum delay cancellation evaluation.
     7. Passenger connection accounting trigger.
     8. Crew timeout evaluation trigger.
     9. Simulation metrics and operational cost calculation.
   - *Refactoring Target*: Split into single-responsibility submodules under `main/src/engine/`:
     - `engine/actions.ts`: Indexing and validation of candidate actions.
     - `engine/readiness.ts`: Ready-time calculations for aircraft, crew, and airport closures.
     - `engine/causes.ts`: Binding constraint attribution and explanation generation.
     - `engine/metrics.ts`: Metric rollup and weighted cost computation.
     - `simulate.ts`: Pure orchestrator (< 100 lines).

2. **`frontend/src/components/Map.tsx` (410 lines)**
   - *Current Responsibilities*:
     1. Mercator-to-SVG projection coordinate transforms.
     2. Quadratic Bezier curve calculation for curved flight paths.
     3. Bezier point interpolation for real-time aircraft positions.
     4. Time scrubber animation loop using `requestAnimationFrame`.
     5. Airport circle markers and pulse animations.
     6. Active flight arc rendering and selection state.
     7. Tooltip layout and hover state tracking.
   - *Refactoring Target*:
     - `frontend/src/utils/geo.ts`: Pure coordinate projection and Bezier math.
     - `frontend/src/hooks/useAirspaceScrubber.ts`: Timer and animation scrubber state.
     - `frontend/src/components/map/AirportMarker.tsx`: Airport rendering.
     - `frontend/src/components/map/FlightArc.tsx`: Flight arc rendering.
     - `Map.tsx`: Canvas/SVG container composition (< 150 lines).

---

### Category 3: Duplicated Logic (3+ Similar Blocks)

1. **Quadratic Bezier Curve Interpolation Math**:
   - `frontend/src/components/Map.tsx:142-149` (Arc SVG path calculation: $B(t) = (1-t)^2 P_0 + 2(1-t)t P_{mid} + t^2 P_1$)
   - `frontend/src/components/Map.tsx:189-196` (In-flight aircraft position interpolation along the curve)
   - *Fix*: Extract a shared `computeQuadraticBezierPoint(p0, p1, mid, t)` helper in `frontend/src/utils/geo.ts`.

2. **Flight Status Determination & Badge Styling**:
   - `frontend/src/components/FlightTable.tsx:22-38` (Determines on-time, delayed, cancelled styling)
   - `frontend/src/components/Gantt.tsx:165-175` (Determines Gantt bar color classes)
   - `frontend/src/components/Map.tsx:155-165` (Determines map flight arc stroke color)
   - `frontend/src/components/KPIStrip.tsx:25-35` (Determines status badge colors)
   - *Fix*: Centralize in `frontend/src/utils/statusStyles.ts` providing `getFlightStatusColor(status, depDelay)`.

3. **Time Formatting & Conversion Helpers**:
   - `main/src/loader.ts:25-45` (`parseTimeStringToMinutes` and `formatMinutesToTimeString`)
   - `frontend/src/components/ControlPanel.tsx:103, 122` (Inline `${Math.floor(m / 60)}...` conversions)
   - `frontend/src/components/Gantt.tsx:45-55` (Inline timeline hour label formatting)
   - *Fix*: Standardize on shared time utilities exported from `@domino/main` or shared `time.ts`.

4. **Error Handling & Deterministic Fallback Invocation**:
   - `backend/src/routes/advise.ts:109-115` (Fallback on LLM parse error)
   - `backend/src/routes/advise.ts:131-137` (Fallback on LLM verification error)
   - `backend/src/routes/advise.ts:138-146` (Fallback on LLM network/provider exception)
   - `frontend/src/api/advisorApi.ts:30-40` (Fallback when backend request fails)
   - *Fix*: Extract a clean fallback pipeline handler in `backend/src/routes/advise.ts`.

---

### Category 4: Magic Numbers and Hardcoded Strings

1. **Hardcoded Thresholds in `main/src/planner.ts`**:
   - Line 42: `depDelay > 30` (Spare swap trigger threshold)
   - Line 56: `depDelay >= 60` (Strategic cancellation domino threshold)
   - Line 73: `broken.passengers >= 15` (Connection hold passenger volume threshold)
   - Line 75: `requiredHold <= 45` (Maximum connection hold duration)
   - *Fix*: Move into `CONFIG.planner` in `main/src/config.ts`.

2. **Hardcoded Limits in `main/src/simulate.ts`**:
   - Line 351: `CONFIG.thresholds.maxDelayBeforeCancelMinutes` used with inline hardcoded fallback comparisons.
   - Line 436: `Math.round((onTimeCount / totalFlights) * 1000) / 10` (Precision rounding factor 1000/10).

3. **Hardcoded SVG Dimensions & Scale Offsets in `frontend/src/components/Map.tsx`**:
   - Lines 85–90: Bounding coordinates `minLat: 6.5`, `maxLat: 36.0`, `minLng: 67.0`, `maxLng: 98.0`
   - Lines 92–95: SVG viewport constants `viewBox: 0 0 800 900`
   - *Fix*: Move into a shared constant file `frontend/src/data/indiaMapPaths.ts` or `frontend/src/constants/map.ts`.

4. **Hardcoded Animation Constants in `frontend/src/components/Map.tsx`**:
   - Lines 52–60: Play speed multiplier `speed = 5`, scrubber tick interval `100ms`, step `2 minutes`.
   - *Fix*: Centralize in `useAirspaceScrubber` configuration options.

---

### Category 5: Type Safety Violations (`any`, `as` casts, `!`, `@ts-ignore`, `eslint-disable`)

Total violations identified: **16** (0 `@ts-ignore`, 0 `eslint-disable`, 0 explicit `any`, 10 `as` casts, 6 non-null assertions `!`).

| File Path | Line | Type of Issue | Code Snippet | Root Cause & Proper Fix |
|---|---|---|---|---|
| `main/src/advisor/placeholders.ts` | 71 | Non-null `!` | `return substitutionMap.get(key)!;` | Map lookup may return `undefined`. Guard with `const val = substitutionMap.get(key); return val ?? match;` |
| `main/src/simulate.ts` | 150 | Non-null `!` | `const rep = crewReplacements.get(fid)!;` | Guard with `if (!rep) continue;` |
| `main/src/simulate.ts` | 163 | Non-null `!` | `const sw = chainSwaps.get(fid)!;` | Guard with `if (!sw) continue;` |
| `main/src/simulate.ts` | 171 | Non-null `!` | `assignedTail = spareSwaps.get(fid)!;` | Guard with `const spare = spareSwaps.get(fid); if (spare) assignedTail = spare;` |
| `main/src/simulate.ts` | 292 | Non-null `!` | `readyHold = flight.schedDep + connectionHolds.get(fid)!;` | Guard with `const hold = connectionHolds.get(fid); if (hold !== undefined) readyHold = flight.schedDep + hold;` |
| `backend/src/llm/provider.ts` | 144 | `as` Cast | `return parsed as RawAdvisorOutput;` | Parse through `AdvisorOutputSchema.parse(parsed)` to guarantee runtime type safety |
| `backend/src/routes/advise.ts` | 64 | `as` Cast | `candidates as PlannerCandidate[],` | Validate `req.body` with Zod schema `AdviseRequestSchema` |
| `backend/src/routes/advise.ts` | 65 | `as` Cast | `baselineMetrics as SimulationMetrics` | Validate `req.body` with Zod schema `AdviseRequestSchema` |
| `backend/src/routes/advise.ts` | 101 | `as` Cast | `candidates: candidates as PlannerCandidate[],` | Same as above |
| `backend/src/routes/advise.ts` | 102 | `as` Cast | `baselineMetrics: baselineMetrics as SimulationMetrics,` | Same as above |
| `backend/src/routes/advise.ts` | 123 | `as` Cast | `candidates: candidates as PlannerCandidate[],` | Same as above |
| `backend/src/routes/advise.ts` | 124 | `as` Cast | `baselineMetrics: baselineMetrics as SimulationMetrics,` | Same as above |
| `backend/src/routes/advise.ts` | 138 | `as` Cast | `(llmErr as Error).message` | Use standard type-safe error narrowing: `llmErr instanceof Error ? llmErr.message : String(llmErr)` |
| `backend/src/routes/advise.ts` | 143 | `as` Cast | `candidates as PlannerCandidate[],` | Same as above |
| `backend/src/routes/advise.ts` | 144 | `as` Cast | `baselineMetrics as SimulationMetrics` | Same as above |
| `frontend/src/main.tsx` | 6 | Non-null `!` | `document.getElementById('root')!` | Guard: `const root = document.getElementById('root'); if (!root) throw new Error('Missing root element');` |

---

### Category 6: Unused Exports, Dead Code, Dependencies & Console Calls

1. **Unused Dependencies in `frontend/package.json`**:
   - `three`: `^0.187.0` (Remaining from previous 3D airplane design, completely unused in current UI).
   - `@types/three`: `^0.187.0` (Unused).
   - *Fix*: Remove both from `frontend/package.json`.

2. **Leftover `console` Statements (11 occurrences)**:
   - `backend/src/routes/advise.ts:62`: `console.log('No LLM_API_KEY set...');`
   - `backend/src/routes/advise.ts:110`: `console.warn(...)`
   - `backend/src/routes/advise.ts:132`: `console.warn(...)`
   - `backend/src/routes/advise.ts:138`: `console.warn('Error during LLM call:', ...)`
   - `backend/src/routes/advise.ts:148`: `console.error('Unexpected error in /api/advise:', err)`
   - `backend/src/server.ts:33-34`: `console.log(...)` (Server startup logs — acceptable or can use structured logging)
   - `frontend/src/api/advisorApi.ts:29`: `console.warn(...)`
   - `frontend/src/api/advisorApi.ts:37`: `console.warn(...)`
   - `frontend/src/store/useSimulatorStore.ts:72`: `console.warn(...)`
   - `frontend/src/store/useSimulatorStore.ts:206`: `console.error(...)`
   - *Fix*: Replace ad-hoc console calls with a lightweight logger utility or remove noisy debug logs.

3. **Dead / Redundant Aliases**:
   - `frontend/src/components/Map.tsx:409`: `export const Map = AirspaceMap;` (Duplicate re-export, never imported).

---

### Category 7: Inconsistent Naming, Mixed Async Styles & Inconsistent Error Handling

1. **Mixed Async Styles**:
   - `frontend/src/store/useSimulatorStore.ts`: Web Worker communication uses callback event handlers (`worker.onmessage`), mixed with synchronous fallbacks and `async/await` in `fetchAdvisor`.
   - `backend/src/routes/advise.ts`: Mixes `async/await` with nested imperative try/catch blocks that manually catch errors without utilizing Express next-middleware conventions.

2. **Inconsistent Naming**:
   - Flight properties: `RawFlight` and `SimulatedFlight` mix snake_case (`flight_id`, `leg_order`, `tail_id`, `crew_id`) with camelCase (`schedDep`, `actualDep`, `depDelay`, `strandedPax`).
   - Module imports: Several files import with `.js` extensions (required by Node ESM) while others import without extensions in the frontend bundle.

3. **Inconsistent Error Handling**:
   - In `backend/src/routes/advise.ts`: When an error occurs during JSON validation or verifier execution, it falls back to template generation; but unexpected exceptions trigger a raw 500 response without standard RFC 7807 error formatting.
   - In `frontend/src/store/useSimulatorStore.ts`: Failures in advisor fetching leave `advisorLoading: false` but do not surface an error message to the UI.

---

### Category 8: Missing or Misleading Types, Comments or JSDoc

1. **Engine Public API (`main/src`)**:
   - `main/src/simulate.ts`: Function `simulate` has minimal single-line documentation without `@param` and `@returns` tags.
   - `main/src/planner.ts`: `generateRecoveryPlan` has minimal documentation; missing explanation of beam search heuristic and compatibility constraints.
   - `main/src/pax.ts`: `computePassengerImpact` lacks documentation of connection graph evaluation.
   - `main/src/crew.ts`: `evaluateCrewDuty` lacks parameter definitions and return type specifications.
   - `main/src/causes.ts`: `buildDominoGraph` and `traceCauseChain` lack documentation on edge construction.

2. **Backend API (`backend/src`)**:
   - `backend/src/routes/advise.ts`: Missing OpenAPI / JSDoc documentation on request schema, query parameters, and error responses.

3. **Frontend UI Components (`frontend/src`)**:
   - Components lack interface comments or JSDoc describing expected props, accessibility constraints, and keyboard navigation semantics.

---

### Category 9: Components Mixing Data Logic with Rendering

1. **`frontend/src/components/FlightTable.tsx`**:
   - Lines 20–63: Contains complex memoized filtering (by origin, destination, status), search string substring matching, sorting comparator logic for 8 different fields, and pagination slicing directly inside the component body.
   - *Fix*: Extract into a custom hook `useFlightTable(flights)`.

2. **`frontend/src/components/Map.tsx`**:
   - Lines 40–80: Scrubber timer logic, interval management, speed multiplier calculations, play/pause state handling.
   - Lines 136–188: Bezier curve midpoint offset calculations, control point geometry, active flight filtering by time.
   - *Fix*: Extract to `useAirspaceScrubber` and `useFlightPaths`.

3. **`frontend/src/components/Gantt.tsx`**:
   - Lines 20–80: Timeline scale computation, hour mark generation, aircraft rotation flight grouping, and pixel-to-percentage width mapping.
   - *Fix*: Extract to `useGanttTimeline`.

4. **`frontend/src/components/AIPanel.tsx`**:
   - Lines 25–85: Candidate scoring comparisons, metric delta computations, action badge grouping logic mixed with card layout.
   - *Fix*: Extract candidate summary selector functions.

5. **`frontend/src/components/BeforeAfter.tsx`**:
   - Lines 30–80: Delta percentage calculations (`calcDelta`), color polarity resolution (where lower delay is positive, but lower on-time is negative) embedded in JSX.
   - *Fix*: Extract a pure `calculateMetricDeltas(baseline, recovered)` utility.

---

## Conclusion & Proposed Execution Roadmap

By addressing these findings across the planned phases:
- **Phase 1**: Tooling (shared strict `tsconfig.base.json`, ESLint strict, Prettier, check scripts, GitHub Actions, `.editorconfig`).
- **Phase 2**: Refactoring (split `simulate.ts`, `Map.tsx`, `FlightTable.tsx`, `planner.ts`; eliminate all `as` and `!` type casts; extract shared hooks and helpers; remove unused `three` dependency; clean console statements).
- **Phase 3**: Comprehensive JSDoc documentation across `main/src` public exports and package READMEs.
- **Phase 4**: Unit tests for extracted modules, maintaining green regression snapshots and pushing to GitHub.

This roadmap will raise the Code Quality score from 89 to **98+** while preserving zero-behavior-change guarantees.
