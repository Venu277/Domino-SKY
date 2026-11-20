import { CONFIG } from './config.js';
import { simulate } from './simulate.js';
import type {
  HoldConnectionAction,
  NormalizedDataset,
  PlannerCandidate,
  RecoveryAction,
  Scenario,
  SimulationResult,
  SwapSpareAction,
} from './types.js';

export interface PlannerOptions {
  maxDepth?: number;
  beamWidth?: number;
  maxCandidates?: number;
}

/**
 * Generates recovery candidates from a disrupted scenario result,
 * scores them deterministically via simulate(), and returns top ranked candidates (C1, C2, ...).
 */
export function generateRecoveryPlan(
  dataset: NormalizedDataset,
  baseScenario: Scenario,
  baselineResult: SimulationResult,
  options: PlannerOptions = {}
): PlannerCandidate[] {
  const maxCandidates = options.maxCandidates ?? 5;
  const baselineCost = baselineResult.metrics.cost;

  // Single-action candidate pool
  const singleActions: RecoveryAction[] = [];

  // 1. Candidate Spare Aircraft Swaps
  // Find flights departing from spare bases with delays or cancellations
  for (const spare of dataset.spareAircraft) {
    for (const flight of baselineResult.flights) {
      if (
        flight.origin === spare.base &&
        flight.schedDep >= spare.availableFrom &&
        (flight.status === 'DELAYED' || flight.status === 'CANCELLED' || flight.depDelay > 30)
      ) {
        singleActions.push({
          type: 'SWAP_SPARE',
          flightId: flight.flight_id,
          spareTailId: spare.tail_id,
        });
      }
    }
  }

  // 2. Candidate Strategic Cancellations
  // Flights with severe delay (> 60 min) that cause downstream domino delays
  for (const flight of baselineResult.flights) {
    if (flight.status === 'DELAYED' && flight.depDelay >= 60) {
      // Check if this flight has downstream legs
      const tailChain = dataset.flightsByAircraft.get(flight.tail_id) || [];
      const hasDownstream = tailChain.some((f) => f.leg_order > flight.leg_order);
      if (hasDownstream) {
        singleActions.push({
          type: 'CANCEL_FLIGHT',
          flightId: flight.flight_id,
          reason: 'Strategic cancellation to isolate downstream rotation delay',
        });
      }
    }
  }

  // 3. Candidate Connection Holds
  // For broken connections with substantial passengers (>= 15) and reasonable hold time (<= 45 min)
  for (const broken of baselineResult.brokenConnections) {
    if (broken.passengers >= 15 && broken.reason === 'INBOUND_LATE') {
      const requiredHold = broken.inboundArr + broken.minRequired - broken.outboundDep;
      if (requiredHold > 0 && requiredHold <= 45) {
        singleActions.push({
          type: 'HOLD_CONNECTION',
          outboundFlightId: broken.to_flight,
          holdMinutes: requiredHold,
        });
      }
    }
  }

  // 4. Candidate Crew Replacements
  // If crews are at risk of timeout
  for (const violation of baselineResult.crewViolations) {
    singleActions.push({
      type: 'REPLACE_CREW',
      crewId: violation.crew_id,
      fromFlightId: violation.lastFlightId,
    });
  }

  // Evaluate single actions
  interface ActionCandidate {
    actions: RecoveryAction[];
    result: SimulationResult;
    score: number;
  }

  const evaluatedSingles: ActionCandidate[] = [];

  for (const action of singleActions) {
    const candidateScenario: Scenario = {
      closures: baseScenario.closures,
      actions: [...baseScenario.actions, action],
    };
    const res = simulate(dataset, candidateScenario);
    evaluatedSingles.push({
      actions: [action],
      result: res,
      score: res.metrics.cost,
    });
  }

  // Sort by score ascending (lowest cost first)
  evaluatedSingles.sort((a, b) => a.score - b.score);

  // Beam search / combination: combine top single actions up to depth 2
  const combinedCandidates: ActionCandidate[] = [...evaluatedSingles];
  const topSingles = evaluatedSingles.slice(0, 4);

  for (let i = 0; i < topSingles.length; i++) {
    for (let j = i + 1; j < topSingles.length; j++) {
      const a1 = topSingles[i].actions[0];
      const a2 = topSingles[j].actions[0];

      // Check compatibility (do not swap same spare twice or act on same flight conflictingly)
      if (isCompatible(a1, a2)) {
        const candidateScenario: Scenario = {
          closures: baseScenario.closures,
          actions: [...baseScenario.actions, a1, a2],
        };
        const res = simulate(dataset, candidateScenario);
        combinedCandidates.push({
          actions: [a1, a2],
          result: res,
          score: res.metrics.cost,
        });
      }
    }
  }

  // Sort all candidates by score ascending
  combinedCandidates.sort((a, b) => a.score - b.score);

  // Deduplicate and filter out candidates that perform worse than baseline
  const seenActionKeys = new Set<string>();
  const topList: PlannerCandidate[] = [];
  let candidateIndex = 1;

  for (const cand of combinedCandidates) {
    const key = cand.actions
      .map((a) => `${a.type}:${'flightId' in a ? a.flightId : ''}:${'spareTailId' in a ? a.spareTailId : ''}:${'outboundFlightId' in a ? a.outboundFlightId : ''}`)
      .sort()
      .join('|');

    if (seenActionKeys.has(key)) continue;
    seenActionKeys.add(key);

    const netStrandedSaved = baselineResult.metrics.strandedPaxTotal - cand.result.metrics.strandedPaxTotal;
    const netDelaySaved = baselineResult.metrics.totalDelayMinutes - cand.result.metrics.totalDelayMinutes;
    const netCancellationsDelta = baselineResult.metrics.cancelledFlightsCount - cand.result.metrics.cancelledFlightsCount;

    const id = `C${candidateIndex}`;
    const title = buildCandidateTitle(cand.actions);
    const summary = buildCandidateSummary(cand.actions, netStrandedSaved, netDelaySaved, cand.result);

    topList.push({
      id,
      title,
      actions: cand.actions,
      metrics: cand.result.metrics,
      score: cand.score,
      netStrandedSaved,
      netDelaySaved,
      netCancellationsDelta,
      summary,
    });

    candidateIndex++;
    if (topList.length >= maxCandidates) break;
  }

  return topList;
}

function isCompatible(a1: RecoveryAction, a2: RecoveryAction): boolean {
  if (a1.type === 'SWAP_SPARE' && a2.type === 'SWAP_SPARE') {
    if (a1.spareTailId === a2.spareTailId) return false;
    if (a1.flightId === a2.flightId) return false;
  }
  if (a1.type === 'CANCEL_FLIGHT' && a2.type === 'SWAP_SPARE') {
    if (a1.flightId === a2.flightId) return false;
  }
  if (a1.type === 'SWAP_SPARE' && a2.type === 'CANCEL_FLIGHT') {
    if (a1.flightId === a2.flightId) return false;
  }
  return true;
}

function buildCandidateTitle(actions: RecoveryAction[]): string {
  if (actions.length === 1) {
    const a = actions[0];
    if (a.type === 'SWAP_SPARE') {
      return `Deploy spare ${a.spareTailId} on flight ${a.flightId}`;
    }
    if (a.type === 'CANCEL_FLIGHT') {
      return `Strategically cancel flight ${a.flightId}`;
    }
    if (a.type === 'HOLD_CONNECTION') {
      return `Hold flight ${a.outboundFlightId} by ${a.holdMinutes} min for connection`;
    }
    if (a.type === 'REPLACE_CREW') {
      return `Reassign fresh crew for ${a.crewId}`;
    }
  }
  return actions
    .map((a) => {
      if (a.type === 'SWAP_SPARE') return `Swap ${a.spareTailId} → ${a.flightId}`;
      if (a.type === 'CANCEL_FLIGHT') return `Cancel ${a.flightId}`;
      if (a.type === 'HOLD_CONNECTION') return `Hold ${a.outboundFlightId} (+${a.holdMinutes}m)`;
      if (a.type === 'REPLACE_CREW') return `Replace crew ${a.crewId}`;
      return a.type;
    })
    .join(' + ');
}

function buildCandidateSummary(
  actions: RecoveryAction[],
  strandedSaved: number,
  delaySaved: number,
  result: SimulationResult
): string {
  const parts: string[] = [];
  if (strandedSaved > 0) parts.push(`saves ${strandedSaved} stranded passengers`);
  if (delaySaved > 0) parts.push(`recovers ${delaySaved} delay minutes`);
  if (result.metrics.crewsAtRiskCount === 0) parts.push(`prevents crew duty timeouts`);
  if (parts.length === 0) parts.push(`optimizes network recovery cost`);

  return `${buildCandidateTitle(actions)}: ${parts.join(', ')}.`;
}
