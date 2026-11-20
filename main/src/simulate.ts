import { CONFIG } from './config.js';
import { evaluateCrewDuty } from './crew.js';
import { computePassengerImpact } from './pax.js';
import type {
  AirportClosure,
  CancelFlightAction,
  FlightCause,
  FlightStatus,
  HoldConnectionAction,
  NormalizedDataset,
  NormalizedFlight,
  RecoveryAction,
  ReplaceCrewAction,
  Scenario,
  SimulatedFlight,
  SimulationMetrics,
  SimulationResult,
  SwapAircraftChainsAction,
  SwapSpareAction,
} from './types.js';

interface AircraftState {
  tailId: string;
  currentAirport: string;
  readyTime: number; // minutes from 00:00
  lastFlightId?: string;
  isChainBroken?: boolean;
}

interface CrewState {
  crewId: string;
  currentAirport: string;
  readyTime: number;
  lastFlightId?: string;
}

/**
 * Checks whether an airport is closed at a given target minute.
 * Returns the closure end time if closed, or null if open.
 */
function getActiveClosureEnd(
  airportId: string,
  targetMinute: number,
  closures: AirportClosure[]
): number | null {
  for (const c of closures) {
    if (c.airport === airportId && targetMinute >= c.start && targetMinute < c.end) {
      return c.end;
    }
  }
  return null;
}

/**
 * Pure, deterministic simulation function:
 * simulate(dataset, scenario) -> SimulationResult
 *
 * Rules:
 * 1. Zero side-effects, no network, no clock, no random numbers.
 * 2. Strict propagation along aircraft and crew chains.
 * 3. Exact binding constraint tracking for domino cause graph.
 * 4. Ground hold policy for arrivals into closed airports.
 * 5. Strict conservation of passengers (no double counting).
 */
export function simulate(
  dataset: NormalizedDataset,
  scenario: Scenario
): SimulationResult {
  const closures = scenario.closures || [];
  const actions = scenario.actions || [];

  // Parse recovery actions
  const cancelledFlightIds = new Set<string>();
  const spareSwaps = new Map<string, string>(); // flightId -> spareTailId
  const chainSwaps = new Map<string, SwapAircraftChainsAction>(); // fromFlightId -> action
  const connectionHolds = new Map<string, number>(); // outboundFlightId -> holdMinutes
  const crewReplacements = new Map<string, ReplaceCrewAction>(); // fromFlightId -> action

  for (const act of actions) {
    if (act.type === 'CANCEL_FLIGHT') {
      cancelledFlightIds.add(act.flightId);
    } else if (act.type === 'SWAP_SPARE') {
      spareSwaps.set(act.flightId, act.spareTailId);
    } else if (act.type === 'SWAP_AIRCRAFT_CHAINS') {
      chainSwaps.set(act.fromFlightId, act);
    } else if (act.type === 'HOLD_CONNECTION') {
      connectionHolds.set(act.outboundFlightId, act.holdMinutes);
    } else if (act.type === 'REPLACE_CREW') {
      crewReplacements.set(act.fromFlightId, act);
    }
  }

  // Initialize aircraft states
  const aircraftStates = new Map<string, AircraftState>();
  for (const [tailId, chain] of dataset.flightsByAircraft.entries()) {
    const firstLeg = chain[0];
    aircraftStates.set(tailId, {
      tailId,
      currentAirport: firstLeg ? firstLeg.origin : '',
      readyTime: 0,
      isChainBroken: false,
    });
  }
  // Initialize spare aircraft
  for (const spare of dataset.spareAircraft) {
    aircraftStates.set(spare.tail_id, {
      tailId: spare.tail_id,
      currentAirport: spare.base,
      readyTime: spare.availableFrom,
      isChainBroken: false,
    });
  }

  // Initialize crew states
  const crewStates = new Map<string, CrewState>();
  const flightToCrewMap = new Map<string, string>();
  for (const crew of dataset.crews) {
    const cFlights = dataset.flightsByCrew.get(crew.crew_id) || [];
    const firstFlight = cFlights[0];
    crewStates.set(crew.crew_id, {
      crewId: crew.crew_id,
      currentAirport: firstFlight ? firstFlight.origin : crew.base,
      readyTime: crew.dutyStart,
    });
    for (const fid of crew.flight_ids) {
      flightToCrewMap.set(fid, crew.crew_id);
    }
  }

  // Active tail substitution map: originalTailId -> activeTailId
  const activeTailMap = new Map<string, string>();
  for (const tailId of dataset.flightsByAircraft.keys()) {
    activeTailMap.set(tailId, tailId);
  }

  // Process flights in scheduled-departure order
  const sortedFlights = [...dataset.flights].sort(
    (a, b) => a.schedDep - b.schedDep || a.leg_order - b.leg_order
  );

  const simulatedFlightsMap = new Map<string, SimulatedFlight>();
  const simulatedFlightsList: SimulatedFlight[] = [];

  for (const flight of sortedFlights) {
    const fid = flight.flight_id;
    let crewId = flightToCrewMap.get(fid) || '';

    // Handle crew replacement action
    if (crewReplacements.has(fid)) {
      const rep = crewReplacements.get(fid)!;
      crewId = rep.crewId + '_REP';
      if (!crewStates.has(crewId)) {
        crewStates.set(crewId, {
          crewId,
          currentAirport: flight.origin,
          readyTime: flight.schedDep,
        });
      }
    }

    // Handle aircraft chain swap
    if (chainSwaps.has(fid)) {
      const sw = chainSwaps.get(fid)!;
      activeTailMap.set(sw.tail1, sw.tail2);
      activeTailMap.set(sw.tail2, sw.tail1);
    }

    // Determine assigned tail
    let assignedTail = activeTailMap.get(flight.tail_id) || flight.tail_id;
    if (spareSwaps.has(fid)) {
      assignedTail = spareSwaps.get(fid)!;
      activeTailMap.set(flight.tail_id, assignedTail);
    }

    let aState = aircraftStates.get(assignedTail);
    if (!aState) {
      aState = {
        tailId: assignedTail,
        currentAirport: flight.origin,
        readyTime: 0,
        isChainBroken: false,
      };
      aircraftStates.set(assignedTail, aState);
    }

    let cState = crewStates.get(crewId);
    if (!cState) {
      cState = {
        crewId,
        currentAirport: flight.origin,
        readyTime: 0,
      };
      crewStates.set(crewId, cState);
    }

    // 1. Explicit cancellation by action
    if (cancelledFlightIds.has(fid)) {
      const sim: SimulatedFlight = {
        flight_id: fid,
        tail_id: assignedTail,
        crew_id: crewId,
        leg_order: flight.leg_order,
        origin: flight.origin,
        destination: flight.destination,
        schedDep: flight.schedDep,
        schedArr: flight.schedArr,
        actualDep: flight.schedDep,
        actualArr: flight.schedArr,
        blockMinutes: flight.blockMinutes,
        depDelay: 0,
        arrDelay: 0,
        status: 'CANCELLED',
        cause: {
          type: 'ACTION',
          description: 'Explicit cancellation by recovery action',
          minutes: 0,
        },
        pax: flight.pax,
        strandedPax: flight.pax,
      };
      simulatedFlightsMap.set(fid, sim);
      simulatedFlightsList.push(sim);

      // The aircraft does not fly to destination, breaking subsequent chain
      aState.isChainBroken = true;
      continue;
    }

    // 2. Cancellation due to broken aircraft chain (previous flight cancelled without swap)
    if (aState.isChainBroken) {
      const parentId = aState.lastFlightId;
      const sim: SimulatedFlight = {
        flight_id: fid,
        tail_id: assignedTail,
        crew_id: crewId,
        leg_order: flight.leg_order,
        origin: flight.origin,
        destination: flight.destination,
        schedDep: flight.schedDep,
        schedArr: flight.schedArr,
        actualDep: flight.schedDep,
        actualArr: flight.schedArr,
        blockMinutes: flight.blockMinutes,
        depDelay: 0,
        arrDelay: 0,
        status: 'CANCELLED',
        cause: {
          type: 'ROTATION',
          parentFlightId: parentId,
          description: `Aircraft rotation broken (previous flight cancelled)`,
          minutes: 0,
        },
        pax: flight.pax,
        strandedPax: flight.pax,
      };
      simulatedFlightsMap.set(fid, sim);
      simulatedFlightsList.push(sim);
      continue;
    }

    // 3. Calculate ready times
    const readyAircraft = aState.readyTime;
    const readyCrew = cState.readyTime;

    // Check airport origin closure
    let readyAirportOrigin = 0;
    const originClosureEnd = getActiveClosureEnd(
      flight.origin,
      Math.max(flight.schedDep, readyAircraft, readyCrew),
      closures
    );
    if (originClosureEnd !== null) {
      readyAirportOrigin = originClosureEnd;
    }

    // Check airport destination closure (ground hold policy at origin)
    let readyAirportDest = 0;
    if (CONFIG.policy.destinationClosedRule === 'HOLD_AT_ORIGIN') {
      const earliestDep = Math.max(flight.schedDep, readyAircraft, readyCrew, readyAirportOrigin);
      const earliestArr = earliestDep + flight.blockMinutes;
      const destClosureEnd = getActiveClosureEnd(flight.destination, earliestArr, closures);
      if (destClosureEnd !== null) {
        readyAirportDest = destClosureEnd - flight.blockMinutes;
      }
    }

    const readyAirport = Math.max(readyAirportOrigin, readyAirportDest);

    // Check connection hold action
    let readyHold = 0;
    if (connectionHolds.has(fid)) {
      readyHold = flight.schedDep + connectionHolds.get(fid)!;
    }

    const actualDepCandidate = Math.max(
      flight.schedDep,
      readyAircraft,
      readyCrew,
      readyAirport,
      readyHold
    );

    const depDelay = actualDepCandidate - flight.schedDep;
    const actualArrCandidate = actualDepCandidate + flight.blockMinutes;
    const arrDelay = actualArrCandidate - flight.schedArr;

    // Determine binding constraint & cause
    let cause: FlightCause;
    if (readyHold > Math.max(flight.schedDep, readyAircraft, readyCrew, readyAirport)) {
      cause = {
        type: 'ACTION',
        minutes: readyHold - flight.schedDep,
        description: `Held for connecting passenger transfer`,
      };
    } else if (readyAirportDest > Math.max(flight.schedDep, readyAircraft, readyCrew, readyAirportOrigin)) {
      cause = {
        type: 'CLOSURE',
        minutes: readyAirportDest - flight.schedDep,
        description: `${flight.destination} closure ground hold`,
      };
    } else if (readyAirportOrigin > Math.max(flight.schedDep, readyAircraft, readyCrew)) {
      cause = {
        type: 'CLOSURE',
        minutes: readyAirportOrigin - flight.schedDep,
        description: `${flight.origin} closure`,
      };
    } else if (readyAircraft >= readyCrew && readyAircraft > flight.schedDep) {
      cause = {
        type: 'ROTATION',
        parentFlightId: aState.lastFlightId,
        minutes: readyAircraft - flight.schedDep,
        description: `Inbound aircraft ${assignedTail} turnaround`,
      };
    } else if (readyCrew > flight.schedDep) {
      cause = {
        type: 'CREW',
        parentFlightId: cState.lastFlightId,
        minutes: readyCrew - flight.schedDep,
        description: `Crew rest and duty turnaround`,
      };
    } else {
      cause = {
        type: 'SCHEDULED',
        minutes: 0,
        description: `Operating on schedule`,
      };
    }

    // Check cancellation conditions
    let status: FlightStatus = 'ON_TIME';
    if (depDelay >= CONFIG.thresholds.maxDelayBeforeCancelMinutes) {
      status = 'CANCELLED';
      cause = {
        ...cause,
        description: `${cause.description} (exceeded ${CONFIG.thresholds.maxDelayBeforeCancelMinutes} min cancellation limit)`,
      };
      aState.isChainBroken = true;
    } else if (actualArrCandidate >= CONFIG.thresholds.curfewMinutes) {
      status = 'CANCELLED';
      cause = {
        type: 'CURFEW',
        minutes: actualArrCandidate - CONFIG.thresholds.curfewMinutes,
        description: `Curfew limit breach at ${flight.destination}`,
      };
      aState.isChainBroken = true;
    } else if (depDelay > CONFIG.thresholds.onTimeDelayMinutes) {
      status = 'DELAYED';
    }

    const sim: SimulatedFlight = {
      flight_id: fid,
      tail_id: assignedTail,
      crew_id: crewId,
      leg_order: flight.leg_order,
      origin: flight.origin,
      destination: flight.destination,
      schedDep: flight.schedDep,
      schedArr: flight.schedArr,
      actualDep: status === 'CANCELLED' ? flight.schedDep : actualDepCandidate,
      actualArr: status === 'CANCELLED' ? flight.schedArr : actualArrCandidate,
      blockMinutes: flight.blockMinutes,
      depDelay: status === 'CANCELLED' ? 0 : depDelay,
      arrDelay: status === 'CANCELLED' ? 0 : arrDelay,
      status,
      cause,
      pax: flight.pax,
      strandedPax: status === 'CANCELLED' ? flight.pax : 0,
    };

    simulatedFlightsMap.set(fid, sim);
    simulatedFlightsList.push(sim);

    if (status !== 'CANCELLED') {
      // Update aircraft state
      aState.currentAirport = flight.destination;
      aState.readyTime = actualArrCandidate + CONFIG.turnaround.minTurnaroundMinutes;
      aState.lastFlightId = fid;

      // Update crew state
      cState.currentAirport = flight.destination;
      cState.readyTime = actualArrCandidate + CONFIG.turnaround.crewTurnaroundMinutes;
      cState.lastFlightId = fid;
    }
  }

  // Passenger Impact Accounting
  const paxResult = computePassengerImpact(dataset, simulatedFlightsMap);

  // Update stranded pax numbers on flights
  for (const sim of simulatedFlightsList) {
    sim.strandedPax = paxResult.strandedByFlight.get(sim.flight_id) || (sim.status === 'CANCELLED' ? sim.pax : 0);
  }

  // Crew Duty Evaluation
  const crewResult = evaluateCrewDuty(dataset, simulatedFlightsMap, actions);

  // Summary Metrics Computation
  let totalDelayMinutes = 0;
  let delayedFlightsCount = 0;
  let cancelledFlightsCount = 0;
  let onTimeCount = 0;

  for (const sim of simulatedFlightsList) {
    if (sim.status === 'CANCELLED') {
      cancelledFlightsCount++;
    } else if (sim.status === 'DELAYED') {
      delayedFlightsCount++;
      totalDelayMinutes += sim.depDelay;
    } else {
      onTimeCount++;
      totalDelayMinutes += sim.depDelay;
    }
  }

  const totalFlights = simulatedFlightsList.length;
  const onTimePct = totalFlights > 0 ? Math.round((onTimeCount / totalFlights) * 1000) / 10 : 100;

  const cost =
    CONFIG.weights.strandedPax * paxResult.strandedPaxTotal +
    CONFIG.weights.delayMinute * totalDelayMinutes +
    CONFIG.weights.cancellation * cancelledFlightsCount +
    CONFIG.weights.crewViolation * crewResult.crewsAtRiskCount;

  const metrics: SimulationMetrics = {
    onTimePct,
    totalDelayMinutes,
    delayedFlightsCount,
    cancelledFlightsCount,
    crewsAtRiskCount: crewResult.crewsAtRiskCount,
    strandedPaxTotal: paxResult.strandedPaxTotal,
    strandedCancelledPax: paxResult.strandedCancelledPax,
    strandedConnectionPax: paxResult.strandedConnectionPax,
    cost,
  };

  const flightsByIdRecord: Record<string, SimulatedFlight> = {};
  for (const [k, v] of simulatedFlightsMap.entries()) {
    flightsByIdRecord[k] = v;
  }

  return {
    flights: simulatedFlightsList,
    flightsById: flightsByIdRecord,
    brokenConnections: paxResult.brokenConnections,
    crewViolations: crewResult.violations,
    metrics,
    scenario,
  };
}
