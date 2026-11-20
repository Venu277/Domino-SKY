import { describe, expect, it } from 'vitest';
import rawData from '../data/flight_network.json' with { type: 'json' };
import { CONFIG } from '../src/config.js';
import { normalizeDataset } from '../src/loader.js';
import { simulate } from '../src/simulate.js';
import type { Scenario } from '../src/types.js';

describe('Engine Invariants and Physical Properties', () => {
  const dataset = normalizeDataset(rawData);

  const testScenario: Scenario = {
    closures: [
      { airport: 'BOM', start: 480, end: 570 },
      { airport: 'DEL', start: 700, end: 760 },
    ],
    actions: [],
  };

  it('guarantees deterministic execution across repeated runs', () => {
    const run1 = simulate(dataset, testScenario);
    const run2 = simulate(dataset, testScenario);
    const run3 = simulate(dataset, testScenario);

    expect(run1.metrics).toEqual(run2.metrics);
    expect(run2.metrics).toEqual(run3.metrics);
    expect(run1.flights).toEqual(run2.flights);
  });

  it('preserves aircraft physical constraints (no overlap, actual >= scheduled, valid turnaround)', () => {
    const result = simulate(dataset, testScenario);

    // Group operated flights by aircraft tail
    const flightsByTail = new Map<string, typeof result.flights>();
    for (const f of result.flights) {
      if (f.status === 'CANCELLED') continue;
      const list = flightsByTail.get(f.tail_id) || [];
      list.push(f);
      flightsByTail.set(f.tail_id, list);
    }

    for (const [tail, chain] of flightsByTail.entries()) {
      // Sort operated legs chronologically
      chain.sort((a, b) => a.actualDep - b.actualDep);

      for (let i = 0; i < chain.length; i++) {
        const cur = chain[i];

        // Invariant: actual departure never earlier than scheduled
        expect(cur.actualDep).toBeGreaterThanOrEqual(cur.schedDep);
        expect(cur.actualArr).toBeGreaterThanOrEqual(cur.schedArr);

        if (i > 0) {
          const prev = chain[i - 1];

          // Invariant: No aircraft in two places at once (previous leg must have arrived before next leg departs)
          expect(cur.actualDep).toBeGreaterThanOrEqual(prev.actualArr);

          // Invariant: Turnaround buffer respected
          expect(cur.actualDep).toBeGreaterThanOrEqual(
            prev.actualArr + CONFIG.turnaround.minTurnaroundMinutes
          );

          // Invariant: Spatial continuity (no teleportation)
          expect(cur.origin).toBe(prev.destination);
        }
      }
    }
  });

  it('enforces strict passenger conservation with zero double counting', () => {
    const result = simulate(dataset, testScenario);

    const totalNetworkBookedPax = dataset.flights.reduce((sum, f) => sum + f.pax, 0);

    // Invariant: Stranded passengers cannot exceed total network booked passengers
    expect(result.metrics.strandedPaxTotal).toBeLessThanOrEqual(totalNetworkBookedPax);

    // Invariant: Zero double counting
    // Total stranded must strictly equal cancelled flight pax + broken connection pax
    expect(result.metrics.strandedPaxTotal).toBe(
      result.metrics.strandedCancelledPax + result.metrics.strandedConnectionPax
    );

    // Invariant: Non-negative metrics
    expect(result.metrics.totalDelayMinutes).toBeGreaterThanOrEqual(0);
    expect(result.metrics.strandedPaxTotal).toBeGreaterThanOrEqual(0);
    expect(result.metrics.delayedFlightsCount).toBeGreaterThanOrEqual(0);
    expect(result.metrics.cancelledFlightsCount).toBeGreaterThanOrEqual(0);
    expect(result.metrics.crewsAtRiskCount).toBeGreaterThanOrEqual(0);
  });
});
