import { describe, expect, it } from 'vitest';
import { verifyAdvisorOutput, generateFallbackRecommendation, type PlannerCandidate, type SimulationMetrics } from '@domino/main';

describe('Backend AI Dispatcher & Verifier Fallback Integration', () => {
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

  const dummyCandidates: PlannerCandidate[] = [
    {
      id: 'C1',
      title: 'Deploy standby spare VT-DS17 on flight DS1202',
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
    },
  ];

  it('verifier rejects hallucinated raw numbers and triggers fallback', () => {
    // Simulated hallucinating LLM response containing raw unwhitelisted digits (e.g. "125", "340")
    const hallucinatedLLMResponse = {
      recommendedCandidateId: 'C1',
      rationale: 'I recommend C1 because it rescues 125 passengers and recovers 340 minutes of delay.',
      tradeoffs: ['Consumes standby spare aircraft capacity.'],
      alternativesConsidered: ['Do-nothing baseline evaluated.'],
    };

    const verificationResult = verifyAdvisorOutput({
      rawOutput: hallucinatedLLMResponse,
      candidates: dummyCandidates,
      baselineMetrics: dummyBaselineMetrics,
    });

    // Verification MUST fail due to forbidden raw digits
    expect(verificationResult.isValid).toBe(false);
    expect(verificationResult.error).toContain('Forbidden raw digit');

    // Upon verification rejection, backend invokes deterministic template fallback
    const fallbackRecommendation = generateFallbackRecommendation(
      dummyCandidates,
      dummyBaselineMetrics
    );

    expect(fallbackRecommendation.path).toBe('fallback');
    expect(fallbackRecommendation.recommendedCandidateId).toBe('C1');
    expect(fallbackRecommendation.rationale).toContain('reduces stranded passengers by 125');
  });

  it('correctly substitutes placeholder metrics when LLM follows prompt rules', () => {
    const compliantLLMResponse = {
      recommendedCandidateId: 'C1',
      rationale:
        'Operations control selects {{C1.id}} ({{C1.title}}) saving {{C1.strandedSaved}} stranded passengers and reducing delay by {{C1.delaySaved}} minutes.',
      tradeoffs: ['Draws down station standby spare buffer.'],
      alternativesConsidered: [
        'Baseline suffered {{baseline.stranded}} stranded passengers.',
      ],
    };

    const verificationResult = verifyAdvisorOutput({
      rawOutput: compliantLLMResponse,
      candidates: dummyCandidates,
      baselineMetrics: dummyBaselineMetrics,
    }, 'llm');

    expect(verificationResult.isValid).toBe(true);
    expect(verificationResult.verified).toBeDefined();

    const verified = verificationResult.verified!;
    expect(verified.path).toBe('llm');
    expect(verified.recommendedCandidateId).toBe('C1');
    expect(verified.rationale).toBe(
      'Operations control selects C1 (Deploy standby spare VT-DS17 on flight DS1202) saving 125 stranded passengers and reducing delay by 340 minutes.'
    );
  });
});
