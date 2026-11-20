import { describe, expect, it } from 'vitest';
import rawData from '../data/flight_network.json' with { type: 'json' };
import { CONFIG } from '../src/config.js';
import { normalizeDataset } from '../src/loader.js';
import { simulate } from '../src/simulate.js';
import type { Scenario } from '../src/types.js';

describe('Golden Scenario: Mumbai (BOM) 90-Minute Closure', () => {
  const dataset = normalizeDataset(rawData);

  // Scenario: Mumbai closed 08:00 - 09:30 (480 to 570 minutes)
  const goldenScenario: Scenario = {
    closures: [
      {
        airport: CONFIG.goldenScenario.airport, // 'BOM'
        start: CONFIG.goldenScenario.start,     // 480 (08:00)
        end: CONFIG.goldenScenario.end,         // 570 (09:30)
      },
    ],
    actions: [],
  };

  it('correctly simulates delay cascade and preserves network invariants', () => {
    const result = simulate(dataset, goldenScenario);

    // Verify aggregate impact
    expect(result.metrics.delayedFlightsCount).toBeGreaterThan(0);
    expect(result.metrics.totalDelayMinutes).toBeGreaterThan(0);
    expect(result.metrics.strandedPaxTotal).toBeGreaterThan(0);

    /**
     * MANUAL VERIFICATION OF CHAIN 1: Aircraft VT-DS05
     * Rotation: BOM -> BLR -> COK -> BLR -> MAA
     *
     * 1. Leg 1: DS0501 BOM -> BLR
     *    - Scheduled: dep 08:15 (495 min), arr 10:00 (600 min), block 105 min.
     *    - Disruption: Origin BOM closed until 09:30 (570 min).
     *    - Actual Dep: max(495, 570) = 570 (09:30) -> Dep Delay = 75 min.
     *    - Actual Arr: 570 + 105 = 675 (11:15) -> Arr Delay = 75 min.
     *    - Cause: CLOSURE at BOM.
     *
     * 2. Leg 2: DS0502 BLR -> COK
     *    - Scheduled: dep 11:10 (670 min), arr 12:10 (730 min), block 60 min.
     *    - Inbound leg DS0501 arrives at 675 min.
     *    - Min turnaround = 30 min -> Aircraft ready at 675 + 30 = 705 min (11:45).
     *    - Actual Dep: max(670, 705) = 705 (11:45) -> Dep Delay = 35 min.
     *    - Actual Arr: 705 + 60 = 765 (12:45) -> Arr Delay = 35 min.
     *    - Cause: ROTATION (parent DS0501). Notice the 70 min scheduled turnaround buffer
     *      absorbed 40 minutes of delay (75 min -> 35 min)!
     *
     * 3. Leg 3: DS0503 COK -> BLR
     *    - Scheduled: dep 13:15 (795 min), arr 14:15 (855 min).
     *    - Aircraft ready at 765 + 30 = 795 min.
     *    - Actual Dep: max(795, 795) = 795 (13:15) -> Dep Delay = 0 min (ON_TIME).
     *    - The remaining delay is completely absorbed by the scheduled ground buffer!
     */
    const ds0501 = result.flightsById['DS0501'];
    expect(ds0501).toBeDefined();
    expect(ds0501.status).toBe('DELAYED');
    expect(ds0501.actualDep).toBe(570);
    expect(ds0501.depDelay).toBe(75);
    expect(ds0501.actualArr).toBe(675);
    expect(ds0501.cause.type).toBe('CLOSURE');

    const ds0502 = result.flightsById['DS0502'];
    expect(ds0502).toBeDefined();
    expect(ds0502.status).toBe('DELAYED');
    expect(ds0502.actualDep).toBe(705);
    expect(ds0502.depDelay).toBe(35);
    expect(ds0502.cause.type).toBe('ROTATION');
    expect(ds0502.cause.parentFlightId).toBe('DS0501');

    const ds0503 = result.flightsById['DS0503'];
    expect(ds0503).toBeDefined();
    expect(ds0503.status).toBe('ON_TIME');
    expect(ds0503.depDelay).toBe(0);

    /**
     * MANUAL VERIFICATION OF CHAIN 2: Aircraft VT-DS12
     * Rotation: AMD -> BOM -> AMD -> DEL -> AMD
     *
     * 1. Leg 1: DS1201 AMD -> BOM
     *    - Scheduled: dep 06:30 (390 min), arr 07:40 (460 min).
     *    - Arrives BEFORE Mumbai closure (08:00).
     *    - Actual Dep: 390 (06:30), Arr: 460 (07:40) -> ON_TIME.
     *
     * 2. Leg 2: DS1202 BOM -> AMD
     *    - Scheduled: dep 08:10 (490 min), arr 09:20 (560 min), block 70 min.
     *    - Origin BOM is closed until 09:30 (570 min).
     *    - Actual Dep: 570 (09:30) -> Dep Delay = 80 min.
     *    - Actual Arr: 570 + 70 = 640 (10:40) -> Arr Delay = 80 min.
     *    - Cause: CLOSURE at BOM.
     *
     * 3. Leg 3: DS1203 AMD -> DEL
     *    - Scheduled: dep 10:35 (635 min), arr 12:10 (730 min), block 95 min.
     *    - Aircraft ready at 640 + 30 = 670 min (11:10).
     *    - Actual Dep: max(635, 670) = 670 (11:10) -> Dep Delay = 35 min.
     *    - Cause: ROTATION (parent DS1202).
     */
    const ds1201 = result.flightsById['DS1201'];
    expect(ds1201.status).toBe('ON_TIME');
    expect(ds1201.depDelay).toBe(0);

    const ds1202 = result.flightsById['DS1202'];
    expect(ds1202.status).toBe('DELAYED');
    expect(ds1202.actualDep).toBe(570);
    expect(ds1202.depDelay).toBe(80);
    expect(ds1202.cause.type).toBe('CLOSURE');

    const ds1203 = result.flightsById['DS1203'];
    expect(ds1203.status).toBe('DELAYED');
    expect(ds1203.actualDep).toBe(670);
    expect(ds1203.depDelay).toBe(35);
    expect(ds1203.cause.type).toBe('ROTATION');
    expect(ds1203.cause.parentFlightId).toBe('DS1202');

    // Confirm broken connections occur in golden scenario
    expect(result.brokenConnections.length).toBeGreaterThan(0);
  });
});
