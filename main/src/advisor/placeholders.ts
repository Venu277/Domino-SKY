import type { PlannerCandidate, SimulationMetrics } from '../types.js';

export interface SubstitutionContext {
  baselineMetrics: SimulationMetrics;
  candidates: PlannerCandidate[];
}

export interface SubstitutionAuditItem {
  placeholder: string;
  value: string;
  source: string;
}

/**
 * Builds the canonical substitution map from deterministic engine metrics.
 */
export function buildSubstitutionMap(
  ctx: SubstitutionContext
): { map: Map<string, string>; audit: SubstitutionAuditItem[] } {
  const map = new Map<string, string>();
  const audit: SubstitutionAuditItem[] = [];

  const add = (key: string, val: number | string, source: string) => {
    const valStr = typeof val === 'number' ? val.toString() : val;
    map.set(key, valStr);
    audit.push({
      placeholder: `{{${key}}}`,
      value: valStr,
      source,
    });
  };

  // Baseline metrics
  add('baseline.stranded', ctx.baselineMetrics.strandedPaxTotal, 'Baseline Stranded Passengers');
  add('baseline.delay', ctx.baselineMetrics.totalDelayMinutes, 'Baseline Total Delay Minutes');
  add('baseline.cancellations', ctx.baselineMetrics.cancelledFlightsCount, 'Baseline Cancellations');
  add('baseline.delayedCount', ctx.baselineMetrics.delayedFlightsCount, 'Baseline Delayed Flights');
  add('baseline.crewsAtRisk', ctx.baselineMetrics.crewsAtRiskCount, 'Baseline Crews At Risk');
  add('baseline.onTimePct', ctx.baselineMetrics.onTimePct, 'Baseline On-Time %');

  // Candidate metrics
  for (const c of ctx.candidates) {
    const pfx = c.id; // e.g. "C1"
    add(`${pfx}.id`, c.id, `${c.id} Candidate ID`);
    add(`${pfx}.title`, c.title, `${c.id} Title`);
    add(`${pfx}.stranded`, c.metrics.strandedPaxTotal, `${c.id} Stranded Passengers`);
    add(`${pfx}.delay`, c.metrics.totalDelayMinutes, `${c.id} Total Delay Minutes`);
    add(`${pfx}.cancellations`, c.metrics.cancelledFlightsCount, `${c.id} Cancellations`);
    add(`${pfx}.delayedCount`, c.metrics.delayedFlightsCount, `${c.id} Delayed Flights`);
    add(`${pfx}.crewsAtRisk`, c.metrics.crewsAtRiskCount, `${c.id} Crews At Risk`);
    add(`${pfx}.onTimePct`, c.metrics.onTimePct, `${c.id} On-Time %`);
    add(`${pfx}.strandedSaved`, c.netStrandedSaved, `${c.id} Net Stranded Saved`);
    add(`${pfx}.delaySaved`, c.netDelaySaved, `${c.id} Net Delay Saved`);
    add(`${pfx}.score`, Math.round(c.score), `${c.id} Cost Score`);
  }

  return { map, audit };
}

/**
 * Replaces all {{placeholder}} tokens with verified engine numbers.
 */
export function substitutePlaceholders(
  text: string,
  substitutionMap: Map<string, string>
): { resultText: string; usedPlaceholders: string[] } {
  const usedPlaceholders: string[] = [];
  const resultText = text.replace(/\{\{([a-zA-Z0-9_.]+)\}\}/g, (match, key) => {
    if (substitutionMap.has(key)) {
      usedPlaceholders.push(key);
      return substitutionMap.get(key)!;
    }
    // Return original match if unknown placeholder (will be caught by verifier)
    return match;
  });

  return { resultText, usedPlaceholders };
}
