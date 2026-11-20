import { create } from 'zustand';
import rawData from '../../../main/data/flight_network.json';
import {
  CONFIG,
  generateRecoveryPlan,
  normalizeDataset,
  simulate,
  type AdvisorRecommendation,
  type NormalizedDataset,
  type PlannerCandidate,
  type RecoveryAction,
  type Scenario,
  type SimulationResult,
} from '@domino/main';
import { fetchAdvisorRecommendation } from '../api/advisorApi.js';

export interface SimulatorState {
  dataset: NormalizedDataset;
  scenario: Scenario;
  baselineResult: SimulationResult; // Disrupted result without recovery actions
  activeResult: SimulationResult;   // Active result with applied recovery actions
  candidates: PlannerCandidate[];
  selectedCandidateId: string | null;
  recommendation: AdvisorRecommendation | null;
  selectedFlightId: string | null;
  currentTimeMinute: number; // For scrubber & cascade animation
  isPlaying: boolean;
  playbackSpeed: number;
  isAdvisorLoading: boolean;
  showCalculation: boolean;
  computeLatencyMs: number;

  // Actions
  init: () => void;
  setClosure: (airport: string, start: number, end: number) => void;
  clearClosures: () => void;
  applyCandidate: (candidateId: string) => void;
  revertRecovery: () => void;
  resetAll: () => void;
  triggerDemo: () => void;
  setSelectedFlightId: (id: string | null) => void;
  setSelectedCandidateId: (id: string | null) => void;
  setCurrentTimeMinute: (mins: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setPlaybackSpeed: (speed: number) => void;
  setShowCalculation: (show: boolean) => void;
  requestAdvisorRecommendation: () => Promise<void>;
}

// Initial dataset loaded synchronously so UI renders immediately
const initialDataset = normalizeDataset(rawData);
const initialScenario: Scenario = { closures: [], actions: [] };
const initialBaselineResult = simulate(initialDataset, initialScenario);

export const useSimulatorStore = create<SimulatorState>((set, get) => {
  let worker: Worker | null = null;
  let workerRequestId = 0;

  // Initialize Web Worker if supported in environment
  const initWorker = () => {
    if (typeof window !== 'undefined' && window.Worker && !worker) {
      try {
        worker = new Worker(new URL('../workers/engine.worker.ts', import.meta.url), {
          type: 'module',
        });
        worker.postMessage({
          id: ++workerRequestId,
          type: 'INIT_DATASET',
          payload: { rawData },
        });
      } catch (err) {
        console.warn('Could not initialize Web Worker, using synchronous fallback:', err);
      }
    }
  };

  const executeSimulation = (scenario: Scenario, actionsToApply: RecoveryAction[] = []) => {
    const { dataset } = get();
    const startMs = performance.now();

    // Baseline disruption (without recovery actions)
    const baseScenario: Scenario = {
      closures: scenario.closures,
      actions: [],
    };
    const baselineResult = simulate(dataset, baseScenario);

    // Active scenario (with any applied recovery actions)
    const activeScenario: Scenario = {
      closures: scenario.closures,
      actions: actionsToApply,
    };
    const activeResult = simulate(dataset, activeScenario);

    // Generate recovery candidates from the baseline disruption
    const candidates = scenario.closures.length > 0
      ? generateRecoveryPlan(dataset, baseScenario, baselineResult)
      : [];

    const durationMs = performance.now() - startMs;

    set({
      scenario: activeScenario,
      baselineResult,
      activeResult,
      candidates,
      selectedCandidateId: candidates.length > 0 ? candidates[0].id : null,
      recommendation: null, // Reset advisor recommendation on scenario change
      computeLatencyMs: Math.round(durationMs * 10) / 10,
    });
  };

  return {
    dataset: initialDataset,
    scenario: initialScenario,
    baselineResult: initialBaselineResult,
    activeResult: initialBaselineResult,
    candidates: [],
    selectedCandidateId: null,
    recommendation: null,
    selectedFlightId: null,
    currentTimeMinute: 480, // Default 08:00
    isPlaying: false,
    playbackSpeed: 1,
    isAdvisorLoading: false,
    showCalculation: false,
    computeLatencyMs: 0,

    init: () => {
      initWorker();
    },

    setClosure: (airport, start, end) => {
      const { scenario } = get();
      const otherClosures = scenario.closures.filter((c) => c.airport !== airport);
      const newScenario: Scenario = {
        closures: [...otherClosures, { airport, start, end }],
        actions: [],
      };
      executeSimulation(newScenario, []);
    },

    clearClosures: () => {
      executeSimulation({ closures: [], actions: [] }, []);
    },

    applyCandidate: (candidateId) => {
      const { candidates, scenario } = get();
      const cand = candidates.find((c) => c.id === candidateId);
      if (!cand) return;

      executeSimulation(scenario, cand.actions);
      set({ selectedCandidateId: candidateId });
    },

    revertRecovery: () => {
      const { scenario } = get();
      executeSimulation(scenario, []);
    },

    resetAll: () => {
      executeSimulation({ closures: [], actions: [] }, []);
      set({
        selectedFlightId: null,
        selectedCandidateId: null,
        recommendation: null,
        currentTimeMinute: 480,
        isPlaying: false,
      });
    },

    triggerDemo: () => {
      const golden = CONFIG.goldenScenario;
      const demoScenario: Scenario = {
        closures: [{ airport: golden.airport, start: golden.start, end: golden.end }],
        actions: [],
      };
      executeSimulation(demoScenario, []);
      set({ currentTimeMinute: 570 }); // Position scrubber at closure end to view full cascade!
    },

    setSelectedFlightId: (id) => set({ selectedFlightId: id }),
    setSelectedCandidateId: (id) => set({ selectedCandidateId: id }),
    setCurrentTimeMinute: (mins) => set({ currentTimeMinute: mins }),
    setIsPlaying: (playing) => set({ isPlaying: playing }),
    setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),
    setShowCalculation: (show) => set({ showCalculation: show }),

    requestAdvisorRecommendation: async () => {
      const { scenario, baselineResult, candidates } = get();
      if (scenario.closures.length === 0 || candidates.length === 0) return;

      set({ isAdvisorLoading: true });
      const firstClosure = scenario.closures[0];

      try {
        const recommendation = await fetchAdvisorRecommendation({
          closedAirport: firstClosure.airport,
          closureStart: firstClosure.start,
          closureEnd: firstClosure.end,
          baselineMetrics: baselineResult.metrics,
          candidates,
        });
        set({ recommendation, isAdvisorLoading: false });
      } catch (err) {
        console.error('Failed to get advisor recommendation:', err);
        set({ isAdvisorLoading: false });
      }
    },
  };
});
