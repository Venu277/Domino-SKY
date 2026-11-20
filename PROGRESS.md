# Domino Sky — Project Progress

## Overview
Interactive airline disruption simulator with deterministic delay cascade engine, passenger connection tracking, crew duty management, heuristic recovery planner, and hallucination-proof AI dispatcher.

---

## Phase Status

### Phase 1: Foundation & Data Layer
- [x] Create project structure (`main/`, `frontend/`, `backend/`) and workspace configuration
- [x] Inspect dataset (`flight_network.json`) and report all anomalies / schema specifics
- [x] Write `main/docs/DATA_NOTES.md`, `main/docs/ARCHITECTURE.md`, `main/docs/ASSUMPTIONS.md`
- [x] Implement `main/src/types.ts`
- [x] Implement `main/src/config.ts` (centralized assumptions & score weights)
- [x] Implement `main/src/loader.ts` (Zod schemas, normalization to minutes, indexes)
- [x] Verify dataset loading & normalization

### Phase 2: Core Simulation Engine & Tests
- [x] Implement `main/src/simulate.ts` (pure deterministic cascade function)
- [x] Implement `main/src/causes.ts` (binding constraint, cause graph, plain-English "why" chain)
- [x] Implement `main/src/crew.ts` (duty limits, timeout detection, reserve swap)
- [x] Implement `main/src/pax.ts` (stranded cancellation, broken connections, no double-counting)
- [x] Write unit & property tests in `main/tests/` (golden Mumbai 90m scenario, invariants, conservation)

### Phase 3: Frontend Foundation & Operations UI
- [x] Setup React + Vite + Tailwind CSS + Zustand
- [x] Setup Web Worker (`workers/engine.worker.ts`) running `@domino/main` off-thread
- [x] Build Control Panel (airport picker, closure start/end sliders, time scrubber, reset, demo button)
- [x] Build Aircraft Gantt chart (scheduled vs actual, delay propagation along chains, hatched cancelled)
- [x] Build Flight Table with filtering, sorting, and "Why" drawer
- [x] Build KPI Strip (stranded pax, delayed flights, cancellations, crews at risk)
- [x] Build Assumptions Panel

### Phase 4: Network Map & Cascade Animation
- [x] Build SVG route map with airport nodes and flight arcs
- [x] Status coloring (on-time, delayed, cancelled, closed airport pulsing)
- [x] Interactive scrubber-driven cascade propagation animation

### Phase 5: Recovery Planner
- [x] Implement `main/src/planner.ts` (candidate generation: cancellations, aircraft swaps, crew replacements, connection holds)
- [x] Candidate evaluation & scoring via `simulate()`
- [x] Multi-action search / ranking (top 3-5 candidates with IDs `C1`, `C2`, etc.)
- [x] Planner unit tests

### Phase 6: AI Dispatcher & Backend
- [x] Setup Express backend (`/api/health`, `/api/advise`)
- [x] Implement `main/src/advisor/schema.ts`, `placeholders.ts`, `verifier.ts`, `fallback.ts`
- [x] Implement LLM provider integration with Gemini (and fallback if no key)
- [x] Verifier tests (whitelisted numbers, rejection of hallucinated digits, template fallback)
- [x] Connect Frontend AI Panel with before/after comparison and calculation transparency toggle

### Phase 7: Apple-Inspired Full UI/UX Redesign
- [x] **Light Mode & Apple Design Tokens**:
  - [x] Default light mode (`#F5F5F7` background, `#FFFFFF` surfaces, hairline `#D2D2D7`)
  - [x] Strict two-color text hierarchy (`#1D1D1F` primary, `#6E6E73` secondary)
  - [x] ONE accent color: `#0071E3` (Apple blue)
  - [x] Semantic colors only for data (`#34C759` on-time, `#FF9F0A` delayed, `#FF3B30` cancelled)
  - [x] SF Pro / Inter typography with tabular numbers (`tnum`)
- [x] **Single Scrolling Page Layout**:
  - [x] 56px sticky glass top nav (`apple-glass` backdrop blur) with section navigation (Network, Aircraft, Flights, Recovery), theme toggle, and "Run demo" pill button
  - [x] Hero section with clean centered headline ("See how one storm moves the whole network.") and single rounded card closure controls
  - [x] Quick scenario presets: Mumbai 90m Storm (Golden Demo), Delhi Fog 120m, Bengaluru Runway Work 60m
- [x] **Real Indian Political Airspace Map**:
  - [x] Authentic state boundaries and national borders pre-projected into SVG
  - [x] 16 airports positioned geographically with hover cards
  - [x] Curved flight arcs colored by delay state with in-transit airborne aircraft
  - [x] Closed airport soft expanding ring (`animate-soft-ring`, no neon glow)
  - [x] Floating glass time scrubber pill at bottom of map (Play/Pause, slider, time display, 1x/2x/5x speed)
- [x] **Impact & Aircraft Gantt**:
  - [x] KPIStrip with 4 clean stat cards and animated count-up
  - [x] Gantt with thin 12px rounded bars: scheduled base outline vs actual delayed fill (delay visibly slides right)
- [x] **Flight Table & Why Drawer**:
  - [x] Table with hairline row dividers, no zebra stripes, sticky header, segmented status filter (All / Late / Cancelled), search
  - [x] Slide-over Why Drawer sheet with Apple spring transition, plain-English root cause, and vertical domino steps
- [x] **Recovery & Before/After**:
  - [x] AIPanel with recommendation headline, body rationale, trade-offs, alternative candidate cards, verified badge, inline calculation audit
  - [x] BeforeAfter with 3 columns (Normal / Disrupted / Recovered) and "What Changed" flight diff table
  - [x] "How this is calculated" footer accordion
- [x] **Landing Page & Homepage Redesign**:
  - [x] Removed 3D airplane and removed the two blocks below the button
  - [x] Centered website name, clean subtitle, tactile skeuomorphic "Go to Simulator" button
  - [x] Seamless transition between Landing and Simulator
