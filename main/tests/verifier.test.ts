import { describe, expect, it } from 'vitest';
import { generateFallbackRecommendation } from '../src/advisor/fallback.js';
import { verifyAdvisorOutput } from '../src/advisor/verifier.js';
import type { PlannerCandidate, SimulationMetrics } from '../src/types.js';

describe('AI Output Verifier & Placeholder System', () => {
  const dummyBaselineMetrics: SimulationMetrics = {
    onTimePct: 65.5,
    totalDelayMinutes: 520,
    delayedFlightsCount: 12,
    cancelledFlightsCount: 2,
    crewsAtRiskCount: 1,
    strandedPaxTotal: 145,
    strandedCancelledPax: 90,
    strandedConnectionPax: 55,
    cost: 25000,
  };

  const dummyCandidate: PlannerCandidate = {
    id: 'C1',
    title: 'Deploy spare VT-DS17 on flight DS1202',
    actions: [{ type: 'SWAP_SPARE', flightId: 'DS1202', spareTailId: 'VT-DS17' }],
    metrics: {
      onTimePct: 88.0,
      totalDelayMinutes: 180,
      delayedFlightsCount: 4,
      cancelledFlightsCount: 0,
      crewsAtRiskCount: 0,
      strandedPaxTotal: 20,
      strandedCancelledPax: 0,
      strandedConnectionPax: 20,
      cost: 4500,
    },
    score: 4500,
    netStrandedSaved: 125,
    netDelaySaved: 340,
    netCancellationsDelta: 2,
    summary: 'Saves 125 stranded passengers and 340 minutes of delay.',
  };

  it('rejects AI output containing hallucinated raw numbers', () => {
    const hallucinatedOutput = {
      recommendedCandidateId: 'C1',
      rationale: 'We recommend C1 because it saves 125 passengers and reduces delay by 340 minutes directly.',
      tradeoffs: ['Consumes spare aircraft capacity.'],
      alternativesConsidered: ['Evaluated do nothing baseline.'],
    };

    const res = verifyAdvisorOutput({
      rawOutput: hallucinatedOutput,
      candidates: [dummyCandidate],
      baselineMetrics: dummyBaselineMetrics,
    });

    expect(res.isValid).toBe(false);
    expect(res.error).toContain('Forbidden raw digit');
  });

  it('rejects AI output referencing an unknown candidate ID', () => {
    const unknownCandidateOutput = {
      recommendedCandidateId: 'C99',
      rationale: 'We recommend {{C99.id}} which recovers {{C99.strandedSaved}} passengers.',
      tradeoffs: ['None.'],
      alternativesConsidered: ['Baseline.'],
    };

    const res = verifyAdvisorOutput({
      rawOutput: unknownCandidateOutput,
      candidates: [dummyCandidate],
      baselineMetrics: dummyBaselineMetrics,
    });

    expect(res.isValid).toBe(false);
    expect(res.error).toContain("Invalid candidate ID 'C99'");
  });

  it('accepts valid placeholder syntax and substitutes exact engine values', () => {
    const validOutput = {
      recommendedCandidateId: 'C1',
      rationale:
        'We recommend {{C1.id}} because it saves {{C1.strandedSaved}} passengers and reduces delay by {{C1.delaySaved}} minutes, achieving {{C1.onTimePct}}% on-time.',
      tradeoffs: ['Consumes spare aircraft capacity.'],
      alternativesConsidered: [
        'Baseline suffered {{baseline.stranded}} stranded passengers and {{baseline.delay}} delay minutes.',
      ],
    };

    const res = verifyAdvisorOutput({
      rawOutput: validOutput,
      candidates: [dummyCandidate],
      baselineMetrics: dummyBaselineMetrics,
    });

    expect(res.isValid).toBe(true);
    expect(res.verified).toBeDefined();

    const verified = res.verified!;
    expect(verified.recommendedCandidateId).toBe('C1');
    expect(verified.rationale).toBe(
      'We recommend C1 because it saves 125 passengers and reduces delay by 340 minutes, achieving 88% on-time.'
    );
    expect(verified.alternativesConsidered[0]).toBe(
      'Baseline suffered 145 stranded passengers and 520 delay minutes.'
    );
  });

  it('generates a clean template fallback recommendation when requested', () => {
    const fallback = generateFallbackRecommendation([dummyCandidate], dummyBaselineMetrics);

    expect(fallback.recommendedCandidateId).toBe('C1');
    expect(fallback.path).toBe('fallback');
    expect(fallback.rationale).toContain('reduces stranded passengers by 125');
    expect(fallback.rationale).toContain('recovers 340 delay minutes');
    expect(fallback.tradeoffs.length).toBeGreaterThan(0);
    expect(fallback.alternativesConsidered.length).toBeGreaterThan(0);
  });
});
