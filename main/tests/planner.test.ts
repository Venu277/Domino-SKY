import { describe, expect, it } from 'vitest';
import rawData from '../data/flight_network.json' with { type: 'json' };
import { CONFIG } from '../src/config.js';
import { normalizeDataset } from '../src/loader.js';
import { generateRecoveryPlan } from '../src/planner.js';
import { simulate } from '../src/simulate.js';
import type { Scenario } from '../src/types.js';

describe('Recovery Planner', () => {
  const dataset = normalizeDataset(rawData);

  const baselineScenario: Scenario = {
    closures: [
      {
        airport: CONFIG.goldenScenario.airport, // 'BOM'
        start: CONFIG.goldenScenario.start,     // 480 (08:00)
        end: CONFIG.goldenScenario.end,         // 570 (09:30)
      },
    ],
    actions: [],
  };

  it('generates recovery candidates that strictly match fresh simulate() evaluations', () => {
    const baselineResult = simulate(dataset, baselineScenario);
    const candidates = generateRecoveryPlan(dataset, baselineScenario, baselineResult);

    expect(candidates.length).toBeGreaterThan(0);

    for (const cand of candidates) {
      // Invariant: stable candidate IDs (C1, C2, C3...)
      expect(cand.id).toMatch(/^C\d+$/);

      // Invariant: predicted metrics must equal fresh independent simulate() run
      const freshResult = simulate(dataset, {
        closures: baselineScenario.closures,
        actions: cand.actions,
      });

      expect(cand.metrics).toEqual(freshResult.metrics);
      expect(cand.score).toBe(freshResult.metrics.cost);

      // Invariant: candidates must improve or equal baseline cost
      expect(cand.score).toBeLessThanOrEqual(baselineResult.metrics.cost);
    }
  });

  it('orders candidates monotonically by score (best candidate first)', () => {
    const baselineResult = simulate(dataset, baselineScenario);
    const candidates = generateRecoveryPlan(dataset, baselineScenario, baselineResult);

    for (let i = 0; i < candidates.length - 1; i++) {
      expect(candidates[i].score).toBeLessThanOrEqual(candidates[i + 1].score);
    }
  });
});
