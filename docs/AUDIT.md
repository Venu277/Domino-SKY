# Domino Sky — Verification & Code Quality Audit

> **Audit Date**: 2026-11-20  
> **Status**: Report Only (Phase 0)  
> **Scope**: `main/`, `frontend/`, `backend/`, root configuration  

---

## 1. Dataset Duplication: `flight_network.json`

### Finding
`flight_network.json` is duplicated across two locations in the repository:
1. `C:\Users\Venugopal\OneDrive\Desktop\Domino-sky\flight_network.json` (Repo Root: 20,914 bytes)
2. `C:\Users\Venugopal\OneDrive\Desktop\Domino-sky\main\data\flight_network.json` (`main/data/`: 20,914 bytes)

A byte-by-byte comparison (`Buffer.compare`) confirms both files are 100% identical.

### Evidence & Import Graph
Every file across the codebase imports exclusively from `main/data/flight_network.json`:
- `frontend/src/store/useSimulatorStore.ts:2`:
  ```ts
  import rawData from '../../../main/data/flight_network.json';
  ```
- `main/package.json:14`:
  ```json
  "./data/flight_network.json": "./data/flight_network.json"
  ```
- `main/tests/golden.test.ts:2`:
  ```ts
  import rawData from '../data/flight_network.json' with { type: 'json' };
  ```
- `main/tests/invariants.test.ts:3`:
  ```ts
  import rawData from '../data/flight_network.json' with { type: 'json' };
  ```
- `main/tests/loader.test.ts:2`:
  ```ts
  import rawData from '../data/flight_network.json' with { type: 'json' };
  ```
- `main/tests/planner.test.ts:2`:
  ```ts
  import rawData from '../data/flight_network.json' with { type: 'json' };
  ```
- `main/tests/regression.test.ts:4`:
  ```ts
  import rawData from '../data/flight_network.json' with { type: 'json' };
  ```

**Conclusion**: The root `flight_network.json` is an unreferenced, redundant duplicate that should be deleted.

---

## 2. Server-Side Trust & Verifier Whitelist Vulnerability in `/api/advise`

### Finding
**Yes**, `/api/advise` builds its verifier whitelist and placeholder substitution values entirely from client-supplied metrics and candidates in `req.body`. A tampered client request **can** make fabricated numbers pass verification without any server-side validation.

### Evidence & Code Paths
1. In `backend/src/routes/advise.ts:57-66`:
   ```ts
   const { closedAirport, closureStart, closureEnd, baselineMetrics, candidates } = parseResult.data;

   if (!env.LLM_API_KEY) {
     const fallback = generateFallbackRecommendation(
       candidates as PlannerCandidate[],
       baselineMetrics as SimulationMetrics
     );
     res.json({ recommendation: fallback });
     return;
   }
   ```
2. In `backend/src/routes/advise.ts:99-103`:
   ```ts
   const verification1 = verifyAdvisorOutput({
     rawOutput: rawOutput1,
     candidates: candidates as PlannerCandidate[],
     baselineMetrics: baselineMetrics as SimulationMetrics,
   }, 'llm');
   ```
3. In `main/src/advisor/verifier.ts:107`:
   ```ts
   // Builds placeholder substitutions directly from input arguments passed from req.body!
   const { map: subMap } = buildSubstitutionMap({ baselineMetrics, candidates });
   ```
4. In `main/src/advisor/placeholders.ts:38-42`:
   ```ts
   subMap.set(`${c.id}.stranded`, String(c.metrics.strandedPaxTotal));
   subMap.set(`${c.id}.delay`, String(c.metrics.totalDelayMinutes));
   subMap.set(`${c.id}.saved_stranded`, String(c.netStrandedSaved));
   ```

### Tampering Scenario
An attacker can POST a tampered payload to `/api/advise`:
```json
{
  "closedAirport": "BOM",
  "closureStart": 480,
  "closureEnd": 570,
  "baselineMetrics": { "strandedPaxTotal": 999999, "totalDelayMinutes": 888888, ... },
  "candidates": [{
    "id": "C1",
    "title": "Fabricated Action",
    "netStrandedSaved": 999999,
    "metrics": { "strandedPaxTotal": 0, "totalDelayMinutes": 0, ... }
  }]
}
```
Because the server never executes `simulate()` or `generateRecoveryPlan()` itself:
- The whitelist and placeholder table are populated with the fabricated values (`999999`, `888888`).
- The AI placeholder `{{C1.saved_stranded}}` resolves directly to `999999`.
- In the template fallback path, the API echoes back fabricated client figures into verified text.

**Fix**: The server must accept only the `scenario` object, independently run `simulate()` and `generateRecoveryPlan()` from `@domino/main`, and construct the whitelist strictly from server-computed ground truth.

---

## 3. Vercel Deployment & `/api/advise` Execution Path

### Finding
The Vercel deployment **never reaches the backend Express server or the real LLM path**. The live site deployed on Vercel runs exclusively on the client-side template fallback.

### Evidence & Configuration
1. `vercel.json`:
   ```json
   {
     "$schema": "https://openapi.vercel.sh/vercel.json",
     "buildCommand": "pnpm --filter @domino/frontend build",
     "outputDirectory": "frontend/dist",
     "framework": "vite",
     "rewrites": [
       {
         "source": "/(.*)",
         "destination": "/index.html"
       }
     ]
   }
   ```
   - Only `@domino/frontend` is built.
   - All requests `/(.*)` are rewritten directly to `/index.html` (pure static Single Page Application).
   - No Vercel Serverless Function (e.g. `/api/advise.ts` or Node server entrypoint) is defined.
2. In `frontend/src/api/advisorApi.ts:20-39`:
   ```ts
   try {
     const res = await fetch('/api/advise', { method: 'POST', ... });
     if (!res.ok) {
       return generateFallbackRecommendation(req.candidates, req.baselineMetrics);
     }
     const data = await res.json();
     return data.recommendation;
   } catch (err) {
     return generateFallbackRecommendation(req.candidates, req.baselineMetrics);
   }
   ```
   - On Vercel, `fetch('/api/advise')` hits the rewrite rule and receives `index.html` (HTML content).
   - `res.json()` fails to parse HTML, catches the exception, and falls back to running `generateFallbackRecommendation` in the browser.

---

## 4. Hardcoded Airport Codes, Flight IDs, Preset Names & Times

### Finding
**Yes**, hardcoded airport codes, preset names, and minute offsets exist outside the dataset in both `frontend/` and `main/src/`.

### Evidence with File Paths and Line Numbers
1. **`frontend/src/components/ControlPanel.tsx`**:
   - Line 20: Hardcoded default airport fallback: `currentClosure ? currentClosure.airport : 'BOM'`
   - Line 23: Hardcoded default start minute: `currentClosure ? currentClosure.start : 480` (08:00)
   - Line 26: Hardcoded default end minute: `currentClosure ? currentClosure.end : 570` (09:30)
   - Line 177: Hardcoded preset title: `"Mumbai 90m Storm (Golden Demo)"`
   - Line 181: Hardcoded preset trigger: `onClick={() => setClosure('DEL', 420, 540)}` (Delhi 2h fog)
   - Line 188: Hardcoded preset trigger: `onClick={() => setClosure('BLR', 600, 660)}` (Bengaluru runway)
2. **`frontend/src/components/Map.tsx`**:
   - Line 261: Hardcoded interactive node click closure window: `setClosure(airport.id, 480, 570)`
   - Line 384: Hardcoded scrubber reset time: `onClick={() => setCurrentTimeMinute(480)}`
   - Line 386: Hardcoded tooltip label: `title="Reset to 08:00"`
3. **`frontend/src/store/useSimulatorStore.ts`**:
   - Line 122: Hardcoded initial scrubber time: `currentTimeMinute: 480`
   - Line 167: Hardcoded reset time: `currentTimeMinute: 480`
   - Line 179: Hardcoded demo scrubber position: `set({ currentTimeMinute: 570 })`
4. **`main/src/config.ts`**:
   - Lines 61–67:
     ```ts
     goldenScenario: {
       airport: 'BOM',
       start: 480, // 08:00
       end: 570,   // 09:30
       durationMinutes: 90,
       description: 'Busiest hub (Mumbai/BOM) closed for 90 minutes (08:00 - 09:30) due to severe thunderstorm.',
     }
     ```

**Fix**: Extract all preset scenarios and demo parameters into a single, typed constants module (e.g. `main/src/constants/presets.ts`), derive default values from the dataset, and reference them consistently.

---

## 5. Map Geometry Storage, Size & Bundling

### Finding
The real Indian political map geometry is stored in a dedicated TypeScript file:
- **Location**: `frontend/src/data/indiaMapPaths.ts`
- **File Size**: **229,946 bytes (230 KB / ~225 KiB)**
- **Structure**: 170 lines containing SVG path strings for 36 Indian states and Union Territories pre-projected into viewBox `0 0 800 880`.

### Bundling Evidence
In `frontend/src/components/Map.tsx:3`:
```ts
import { INDIA_STATES, projectCoordinates, INDIA_MAP_CONFIG } from '../data/indiaMapPaths.js';
```
While the geometry is not inlined inside the JSX of `Map.tsx`, it is **statically imported as code** into the main JavaScript application bundle. This increases initial bundle weight by ~230 KB.

**Fix**: Move the raw state boundary path data into a static JSON asset (e.g. `frontend/public/data/india-states.json`) and lazy-load it with `fetch` or dynamic `import()`.

---

## 6. Planner Cancellation Recommendations & Cost Arithmetic

### Finding
**Yes**, the planner recommends `CANCEL_FLIGHT` actions under specific conditions, and can rank a plan containing a cancellation as **C1** or as a cost-saving recommendation.

### Heuristic Mechanism
In `main/src/planner.ts:54-68`, any flight with `status === 'DELAYED'` and `depDelay >= 60` that has downstream flights on its aircraft chain generates a candidate:
```ts
{
  type: 'CANCEL_FLIGHT',
  flightId: flight.flight_id,
  reason: 'Strategic cancellation to isolate downstream rotation delay',
}
```

### Case Study: Cost Arithmetic for Scenario `CCU` Closed 11:00 - 16:00 (Minutes 660–960)

In a 5-hour closure of Kolkata (CCU), massive rotational delays cascade into late-night curfew breaches (02:00 next day).

#### System Cost Weights (`CONFIG.weights`)
- `strandedPax`: 100
- `delayMinute`: 1
- `cancellation`: 5,000
- `crewViolation`: 2,000

#### 1. Baseline Disrupted Simulation (0 Actions)
- Cancelled Flights: 4 flights (`DS1004`, `DS1005`, `DS1103`, `DS1104` breach curfew or break rotation)
- Delayed Flights: 5 flights
- Total Delay Minutes: 850 minutes
- Crews at Risk: 1 crew (timeout violation)
- Stranded Passengers: 587 passengers
$$\begin{aligned}
\text{Cost}_{\text{baseline}} &= (587 \times 100) + (850 \times 1) + (4 \times 5,000) + (1 \times 2,000) \\
&= 58,700 + 850 + 20,000 + 2,000 \\
&= \mathbf{81,550}
\end{aligned}$$

#### 2. Candidate C3: `Swap VT-DS18 → DS1102` + `Cancel DS1004`
By strategically cancelling flight `DS1004` earlier, downstream rotations are contained before compounding into curfew limits:
- Cancelled Flights: 3 flights (decreased by 1!)
- Delayed Flights: 3 flights (decreased by 2!)
- Total Delay Minutes: 525 minutes (saved 325 delay minutes!)
- Crews at Risk: 0 crews (prevented crew violation!)
- Stranded Passengers: 414 passengers (saved 173 stranded passengers!)
$$\begin{aligned}
\text{Cost}_{\text{C3}} &= (414 \times 100) + (525 \times 1) + (3 \times 5,000) + (0 \times 2,000) \\
&= 41,400 + 525 + 15,000 + 0 \\
&= \mathbf{56,925}
\end{aligned}$$

$$\text{Net Savings} = 81,550 - 56,925 = \mathbf{+24,625\text{ cost units}}$$

In this scenario, cancelling one flight strategically contained network domino propagation, resulting in fewer total cancellations, fewer stranded passengers, zero crew timeouts, and a 30% reduction in total operational disruption cost.

---

## 7. Code Quality Metrics: Long Functions, Files, Types & Hygiene

### Files Exceeding 300 Lines
1. `main/src/simulate.ts`: **470 lines** (Multiple responsibilities: simulation, readiness, cause assignment, metrics)
2. `frontend/src/components/Map.tsx`: **410 lines** (Multiple responsibilities: projection math, Bezier geometry, animation loop, SVG rendering)

### Functions Exceeding 40 Lines or Cyclomatic Complexity > 10 (Top 12)
1. `main/src/simulate.ts:65-469`: `simulate()` — **405 lines, Complexity 56**
2. `frontend/src/components/Map.tsx:7-407`: `AirspaceMap()` — **401 lines, Complexity 39**
3. `frontend/src/components/Gantt.tsx:9-253`: `Gantt()` — **245 lines, Complexity 20**
4. `frontend/src/components/FlightTable.tsx:11-251`: `FlightTable()` — **241 lines, Complexity 37**
5. `frontend/src/components/AIPanel.tsx:8-242`: `AIPanel()` — **235 lines, Complexity 26**
6. `frontend/src/components/BeforeAfter.tsx:7-224`: `BeforeAfter()` — **218 lines, Complexity 17**
7. `frontend/src/components/ControlPanel.tsx:7-197`: `ControlPanel()` — **191 lines, Complexity 13**
8. `frontend/src/App.tsx:15-197`: `App()` — **183 lines, Complexity 9**
9. `frontend/src/components/WhyDrawer.tsx:11-186`: `WhyDrawer()` — **176 lines, Complexity 14**
10. `main/src/planner.ts:23-187`: `generateRecoveryPlan()` — **165 lines, Complexity 30**
11. `main/src/loader.ts:125-240`: `normalizeDataset()` — **116 lines, Complexity 12**
12. `main/src/advisor/verifier.ts:25-134`: `verifyAdvisorOutput()` — **110 lines, Complexity 18**

### Type Safety Violations
- **`any`**: 0 occurrences
- **`@ts-ignore` / `eslint-disable`**: 0 occurrences
- **`as` Type Casts** (10 occurrences):
  - `backend/src/llm/provider.ts:144`: `parsed as RawAdvisorOutput`
  - `backend/src/routes/advise.ts:64, 65, 101, 102, 123, 124, 143, 144`: 8 repeated `as PlannerCandidate[]`, `as SimulationMetrics`
  - `backend/src/routes/advise.ts:138`: `(llmErr as Error).message`
- **Non-Null Assertions (`!`)** (6 occurrences):
  - `main/src/advisor/placeholders.ts:71`: `substitutionMap.get(key)!`
  - `main/src/simulate.ts:150`: `crewReplacements.get(fid)!`
  - `main/src/simulate.ts:163`: `chainSwaps.get(fid)!`
  - `main/src/simulate.ts:171`: `spareSwaps.get(fid)!`
  - `main/src/simulate.ts:292`: `connectionHolds.get(fid)!`
  - `frontend/src/main.tsx:6`: `document.getElementById('root')!`

### Logging, TODOs & Dependencies
- **`console.log` / `warn` / `error`** (11 occurrences):
  - `backend/src/routes/advise.ts:62, 110, 132, 138, 148`
  - `backend/src/server.ts:33, 34`
  - `frontend/src/api/advisorApi.ts:29, 37`
  - `frontend/src/store/useSimulatorStore.ts:72, 206`
- **TODOs**: 0 occurrences
- **Unused Exports**:
  - `frontend/src/components/Map.tsx:409`: `export const Map = AirspaceMap;`
- **Unused Dependencies**:
  - `three` (`^0.187.0`) in `frontend/package.json:16`
  - `@types/three` (`^0.187.0`) in `frontend/package.json:20`

---

## 8. Test Suites & Root Script Execution

### Finding
- **Backend Tests**: **Exist** (`backend/tests/advise.test.ts` — 2 passing tests).
- **Frontend Tests**: **Do not exist** (0 test files in `frontend/`).
- **Root Script Execution**: The root `package.json` test script **does NOT run backend or frontend tests**:
  ```json
  "test": "pnpm --filter @domino/main test"
  ```
  It exclusively targets `@domino/main`. Tests in `@domino/backend` are omitted unless manually invoked with `pnpm --filter @domino/backend test`.

**Fix**: Update root script to `"test": "pnpm -r test"` to run test suites across all workspaces recursively, and add frontend component tests for `KPIStrip`, `FlightTable`, and `AIPanel`.
