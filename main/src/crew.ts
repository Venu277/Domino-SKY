import type {
  CrewViolation,
  NormalizedCrew,
  NormalizedDataset,
  RecoveryAction,
  ReplaceCrewAction,
  SimulatedFlight,
} from './types.js';

export interface CrewEvaluationResult {
  violations: CrewViolation[];
  crewsAtRiskCount: number;
}

/**
 * Evaluates crew duty limits based on simulated flight arrival times.
 * In airline operations, a crew duty period ends upon arrival of their last operated leg.
 * If projected or actual arrival exceeds dutyStart + maxDutyMins, CREW_TIMEOUT occurs.
 */
export function evaluateCrewDuty(
  dataset: NormalizedDataset,
  simulatedFlights: Map<string, SimulatedFlight>,
  actions: RecoveryAction[] = []
): CrewEvaluationResult {
  const violations: CrewViolation[] = [];

  // Identify any replaced crews from recovery actions
  const replacementActions = actions.filter(
    (a): a is ReplaceCrewAction => a.type === 'REPLACE_CREW'
  );
  const replacedCrewFlightMap = new Map<string, string>(); // crewId -> fromFlightId
  for (const act of replacementActions) {
    replacedCrewFlightMap.set(act.crewId, act.fromFlightId);
  }

  for (const crew of dataset.crews) {
    const cutoffFlightId = replacedCrewFlightMap.get(crew.crew_id);
    let cutoffSeen = false;

    // Get flights assigned to this crew
    const operatedFlights: SimulatedFlight[] = [];
    for (const fid of crew.flight_ids) {
      if (cutoffFlightId && fid === cutoffFlightId) {
        cutoffSeen = true;
      }
      if (cutoffSeen) {
        // Crew was relieved/replaced from this flight onward
        continue;
      }

      const sim = simulatedFlights.get(fid);
      if (sim && sim.status !== 'CANCELLED') {
        operatedFlights.push(sim);
      }
    }

    if (operatedFlights.length === 0) continue;

    // Duty end is the arrival of the last operated leg
    const lastFlight = operatedFlights[operatedFlights.length - 1];
    const dutyEnd = lastFlight.actualArr;
    const maxDutyEnd = crew.dutyStart + crew.maxDutyMins;

    if (dutyEnd > maxDutyEnd) {
      violations.push({
        crew_id: crew.crew_id,
        dutyStart: crew.dutyStart,
        dutyEnd,
        maxDuty: crew.maxDutyMins,
        exceededBy: dutyEnd - maxDutyEnd,
        lastFlightId: lastFlight.flight_id,
      });
    }
  }

  return {
    violations,
    crewsAtRiskCount: violations.length,
  };
}
