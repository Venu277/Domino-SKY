# Domino Sky — System Architecture

```mermaid
flowchart TD
    User([User: Airport Closure / Action]) --> FrontendState[Zustand Store]
    FrontendState --> Worker[Web Worker: @domino/main]
    
    subgraph Engine ["Core Engine (@domino/main) - Pure & Deterministic"]
        Loader[Zod Loader & Normalizer] --> Simulate["simulate(dataset, scenario)"]
        Simulate --> CauseGraph[Cause Graph & Why Chains]
        Simulate --> CrewEngine[Crew Duty Tracking]
        Simulate --> PaxEngine[Passenger & Connection Accounting]
        Simulate --> BaselineDisruptionMetrics[Metrics & Invariants]
        
        BaselineDisruptionMetrics --> Planner[Recovery Planner: Beam Search]
        Planner --> TopCandidates["Top 3-5 Candidates (C1, C2...)"]
    end
    
    Worker --> FrontendState
    FrontendState --> UIViews["UI (Map, Gantt, FlightTable, KPIs, BeforeAfter)"]
    
    FrontendState --> BackendReq["POST /api/advise (Compact Summary + Candidates)"]
    
    subgraph Backend ["Backend (@domino/backend)"]
        AdviseRoute["/api/advise Route"] --> LLMOrFallback{API Key Present?}
        LLMOrFallback -->|Yes| GeminiCall["Gemini 2.5 Flash / LLM Call (Strict JSON Schema)"]
        LLMOrFallback -->|No| TemplateFallback["Template Fallback Engine"]
        GeminiCall --> Verifier["@domino/main Verifier"]
        Verifier -->|Valid| Substitute["Placeholder Substitution {{C1.metric}}"]
        Verifier -->|Invalid Raw Digits| Retry["Single Retry with Warning"]
        Retry -->|Fails Again| TemplateFallback
    end
    
    Substitute --> BackendResp["Verified Recommendation JSON"]
    TemplateFallback --> BackendResp
    BackendResp --> FrontendState
    FrontendState --> AIPanel["AI Panel + Calculation Audit Drawer"]
```

## Core Architectural Guarantees

1. **Zero Hallucination Numbers**:
   - The LLM never invents numbers. All metrics (`stranded`, `delayedCount`, `delayMins`, `cancelledCount`, `cost`) are produced exclusively by deterministic simulation inside `@domino/main`.
   - The LLM writes templates with placeholders (e.g. `{{C1.stranded}}`, `{{C1.totalDelay}}`).
   - The verifier validates that no raw un-whitelisted digits exist in LLM text and substitutes exact engine numbers before display.

2. **Isomorphic Pure Engine**:
   - `simulate()` has zero side-effects, no global state, no `Date.now()`, no `Math.random()`, and no network or DOM access.
   - The exact same code executes inside the browser Web Worker for instant sub-300ms UI responsiveness, inside the test suite, and inside the Node.js backend.

3. **Cause Tracing via Directed Graph**:
   - When a flight is delayed, the engine identifies the binding constraint ($readyAircraft$, $readyCrew$, or $readyAirport$).
   - A backward link to the parent flight creates an unambiguous domino cause chain: e.g. `AI-204 BLR->CCU is 140 min late because VT-X arrived late from BOM, which was held by the BOM closure.`
