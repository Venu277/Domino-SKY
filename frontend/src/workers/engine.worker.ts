import {
  generateRecoveryPlan,
  normalizeDataset,
  simulate,
  type NormalizedDataset,
  type Scenario,
} from '@domino/main';

let normalizedDataset: NormalizedDataset | null = null;

self.onmessage = (e: MessageEvent) => {
  const { type, payload, id } = e.data;

  try {
    if (type === 'INIT_DATASET') {
      normalizedDataset = normalizeDataset(payload.rawData);
      self.postMessage({
        id,
        type: 'DATASET_INITIALIZED',
        success: true,
      });
      return;
    }

    if (!normalizedDataset) {
      throw new Error('Engine worker dataset not initialized yet.');
    }

    if (type === 'SIMULATE') {
      const scenario: Scenario = payload.scenario;
      const startTime = performance.now();
      const result = simulate(normalizedDataset, scenario);
      const durationMs = performance.now() - startTime;

      self.postMessage({
        id,
        type: 'SIMULATION_RESULT',
        success: true,
        payload: {
          result,
          durationMs,
        },
      });
      return;
    }

    if (type === 'RUN_PLANNER') {
      const scenario: Scenario = payload.scenario;
      const baselineResult = payload.baselineResult || simulate(normalizedDataset, scenario);
      const startTime = performance.now();
      const candidates = generateRecoveryPlan(normalizedDataset, scenario, baselineResult);
      const durationMs = performance.now() - startTime;

      self.postMessage({
        id,
        type: 'PLANNER_RESULT',
        success: true,
        payload: {
          candidates,
          durationMs,
        },
      });
      return;
    }

    throw new Error(`Unknown worker message type: ${type}`);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    self.postMessage({
      id,
      type: 'ERROR',
      success: false,
      error: errorMsg,
    });
  }
};
