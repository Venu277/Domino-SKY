import { describe, expect, it } from 'vitest';
import rawData from '../data/flight_network.json' with { type: 'json' };
import { normalizeDataset } from '../src/loader.js';
import { simulate } from '../src/simulate.js';
import { generateRecoveryPlan } from '../src/planner.js';
import type { Scenario } from '../src/types.js';

describe('Regression Snapshots: 3 Fixed Simulation Scenarios', () => {
  const dataset = normalizeDataset(rawData);

  it('Scenario 1: Baseline Normal Schedule (0 closures, 0 actions)', () => {
    const scenario: Scenario = { closures: [], actions: [] };
    const result = simulate(dataset, scenario);
    expect(result).toMatchSnapshot();
  });

  it('Scenario 2: Golden Disruption (BOM closed 08:00 - 09:30, 0 actions)', () => {
    const scenario: Scenario = {
      closures: [{ airport: 'BOM', start: 480, end: 570 }],
      actions: [],
    };
    const result = simulate(dataset, scenario);
    expect(result).toMatchSnapshot();
  });

  it('Scenario 3: Recovered Plan (BOM closed 08:00 - 09:30 + Candidate C1 actions)', () => {
    const baseScenario: Scenario = {
      closures: [{ airport: 'BOM', start: 480, end: 570 }],
      actions: [],
    };
    const baseResult = simulate(dataset, baseScenario);
    const candidates = generateRecoveryPlan(dataset, baseScenario, baseResult);
    const c1Actions = candidates[0]?.actions ?? [];

    const recoveredScenario: Scenario = {
      closures: baseScenario.closures,
      actions: c1Actions,
    };
    const result = simulate(dataset, recoveredScenario);
    expect(result).toMatchSnapshot();
  });
});
