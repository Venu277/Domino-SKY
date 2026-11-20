import { buildSubstitutionMap, substitutePlaceholders } from './placeholders.js';
import type { AdvisorRecommendation, PlannerCandidate, SimulationMetrics } from '../types.js';

/**
 * Deterministic Template Fallback for the AI Dispatcher.
 * Guarantees the application operates flawlessly even when no API key is provided
 * or when LLM responses violate verification rules.
 */
export function generateFallbackRecommendation(
  candidates: PlannerCandidate[],
  baselineMetrics: SimulationMetrics
): AdvisorRecommendation {
  if (!candidates || candidates.length === 0) {
    return {
      recommendedCandidateId: 'NONE',
      rationale:
        'No viable recovery candidates identified. Baseline operations maintain network stability without additional interventions.',
      tradeoffs: ['Maintaining status quo accepts baseline delays without risking secondary cancellations.'],
      alternativesConsidered: ['Do-nothing baseline evaluated against operational thresholds.'],
      path: 'fallback',
    };
  }

  const best = candidates[0];
  const { map } = buildSubstitutionMap({ baselineMetrics, candidates });

  const rawRationale =
    `Operations Control recommends Candidate {{${best.id}.id}} (${best.title}). ` +
    `Baseline network disruption generates {{baseline.stranded}} stranded passengers and {{baseline.delay}} total delay minutes across {{baseline.delayedCount}} flights. ` +
    `Applying this candidate reduces stranded passengers by {{${best.id}.strandedSaved}} and recovers {{${best.id}.delaySaved}} delay minutes, ` +
    `achieving {{${best.id}.onTimePct}}% network on-time performance with {{${best.id}.crewsAtRisk}} crews at risk.`;

  const rawTradeoffs: string[] = [];
  if (best.actions.some((a) => a.type === 'SWAP_SPARE')) {
    rawTradeoffs.push(
      'Consumes standby spare aircraft capacity, leaving downstream stations without immediate spare cover.'
    );
  }
  if (best.actions.some((a) => a.type === 'CANCEL_FLIGHT')) {
    rawTradeoffs.push(
      'Requires strategic flight cancellation, forfeiting direct flight revenue to preserve network rotation continuity.'
    );
  }
  if (best.actions.some((a) => a.type === 'HOLD_CONNECTION')) {
    rawTradeoffs.push(
      'Introduces controlled outbound gate delay to protect connecting passenger transfer itineraries.'
    );
  }
  if (rawTradeoffs.length === 0) {
    rawTradeoffs.push('Requires tactical gate reallocation and passenger transfer re-routing.');
  }

  const rawAlternatives: string[] = [];
  for (let i = 1; i < Math.min(candidates.length, 4); i++) {
    const alt = candidates[i];
    rawAlternatives.push(
      `Candidate {{${alt.id}.id}} (${alt.title}): achieves {{${alt.id}.strandedSaved}} pax saved and {{${alt.id}.delaySaved}} min delay recovered, but yields an overall recovery score of {{${alt.id}.score}} compared to {{${best.id}.score}} for {{${best.id}.id}}.`
    );
  }
  if (rawAlternatives.length === 0) {
    rawAlternatives.push(
      `Baseline Disruption (Do Nothing): accepts {{baseline.stranded}} stranded passengers and {{baseline.delay}} minutes of cascade delay.`
    );
  }

  const substitutedRationale = substitutePlaceholders(rawRationale, map).resultText;
  const substitutedTradeoffs = rawTradeoffs.map((t) => substitutePlaceholders(t, map).resultText);
  const substitutedAlternatives = rawAlternatives.map((a) => substitutePlaceholders(a, map).resultText);

  return {
    recommendedCandidateId: best.id,
    rationale: substitutedRationale,
    tradeoffs: substitutedTradeoffs,
    alternativesConsidered: substitutedAlternatives,
    path: 'fallback',
  };
}
