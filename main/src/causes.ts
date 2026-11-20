import { formatMinutesToTimeString } from './loader.js';
import type {
  FlightCause,
  NormalizedDataset,
  SimulatedFlight,
} from './types.js';

export interface CauseChainNode {
  flightId: string;
  route: string;
  tailId: string;
  depDelay: number;
  arrDelay: number;
  status: string;
  cause: FlightCause;
  description: string;
}

/**
 * Traverses parent pointers backwards to reconstruct the exact domino cause chain
 * from root disruption down to the target flight.
 */
export function traceCauseChain(
  flightId: string,
  flightsById: Map<string, SimulatedFlight>
): CauseChainNode[] {
  const chain: CauseChainNode[] = [];
  const visited = new Set<string>();
  let currentId: string | undefined = flightId;

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    const flight = flightsById.get(currentId);
    if (!flight) break;

    chain.unshift({
      flightId: flight.flight_id,
      route: `${flight.origin} → ${flight.destination}`,
      tailId: flight.tail_id,
      depDelay: flight.depDelay,
      arrDelay: flight.arrDelay,
      status: flight.status,
      cause: flight.cause,
      description: flight.cause.description,
    });

    currentId = flight.cause.parentFlightId;
  }

  return chain;
}

/**
 * Generates a clean, plain-English explanation for why a flight is delayed or cancelled.
 * Example: "DS0304 DEL→CCU is 145 min late because VT-DS03 arrived late from BOM on DS0303 (145 min late), which was held by the BOM closure."
 */
export function generatePlainEnglishWhy(
  flightId: string,
  flightsById: Map<string, SimulatedFlight>,
  dataset: NormalizedDataset
): string {
  const flight = flightsById.get(flightId);
  if (!flight) return `Flight ${flightId} not found.`;

  if (flight.status === 'ON_TIME') {
    return `${flight.flight_id} (${flight.origin} → ${flight.destination}) is operating on schedule (scheduled dep ${formatMinutesToTimeString(flight.schedDep)}).`;
  }

  const chain = traceCauseChain(flightId, flightsById);
  if (chain.length === 0) return `${flight.flight_id} status: ${flight.status}.`;

  if (chain.length === 1) {
    // Root flight directly affected
    const root = chain[0];
    if (root.cause.type === 'CLOSURE') {
      return `${flight.flight_id} (${flight.origin} → ${flight.destination}) is ${flight.status === 'CANCELLED' ? 'cancelled' : `${flight.depDelay} min late`} due directly to the closure of ${root.cause.description}.`;
    }
    if (root.cause.type === 'ACTION') {
      return `${flight.flight_id} (${flight.origin} → ${flight.destination}) was ${flight.status.toLowerCase()} by an operational recovery action (${root.cause.description}).`;
    }
    if (root.cause.type === 'CURFEW') {
      return `${flight.flight_id} (${flight.origin} → ${flight.destination}) is cancelled due to curfew breach at ${flight.destination}.`;
    }
    return `${flight.flight_id} is ${flight.depDelay} min late (${root.cause.description}).`;
  }

  // Multi-step domino chain
  const target = chain[chain.length - 1];
  const root = chain[0];
  const intermediate = chain.slice(1, chain.length - 1);

  let explanation = `${target.flightId} (${target.route}) is ${
    target.status === 'CANCELLED' ? 'cancelled' : `${target.depDelay} min late`
  } because `;

  if (intermediate.length === 0) {
    explanation += `aircraft ${target.tailId} arrived late from ${root.flightId} (${root.route}), which was held by ${root.cause.description}.`;
  } else {
    const parent = chain[chain.length - 2];
    explanation += `aircraft ${target.tailId} arrived late on ${parent.flightId} (${parent.route}, +${parent.arrDelay} min), cascading from ${root.flightId} (${root.route}) held by ${root.cause.description}.`;
  }

  return explanation;
}

export interface DominoEdge {
  source: string;
  target: string;
  type: string;
  minutes: number;
}

export interface DominoGraph {
  nodes: SimulatedFlight[];
  edges: DominoEdge[];
}

/**
 * Builds the full network domino cascade graph for visualization.
 */
export function buildDominoGraph(flights: SimulatedFlight[]): DominoGraph {
  const edges: DominoEdge[] = [];
  for (const f of flights) {
    if (f.cause.parentFlightId) {
      edges.push({
        source: f.cause.parentFlightId,
        target: f.flight_id,
        type: f.cause.type,
        minutes: f.cause.minutes,
      });
    }
  }
  return {
    nodes: flights,
    edges,
  };
}
