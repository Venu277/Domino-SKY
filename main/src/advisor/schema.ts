import { z } from 'zod';

/**
 * Forced JSON response schema expected from the LLM.
 */
export const AdvisorOutputSchema = z.object({
  recommendedCandidateId: z.string().regex(/^C\d+$/, 'Must be a valid candidate ID (e.g. C1, C2)'),
  rationale: z.string().min(10, 'Rationale must be substantial'),
  tradeoffs: z.array(z.string()).min(1, 'At least one tradeoff must be stated'),
  alternativesConsidered: z.array(z.string()).min(1, 'At least one alternative must be evaluated'),
});

export type RawAdvisorOutput = z.infer<typeof AdvisorOutputSchema>;

export interface DisruptionSummaryForLLM {
  closedAirport: string;
  closureWindow: string;
  durationMinutes: number;
  baselineMetrics: {
    strandedPaxTotal: number;
    totalDelayMinutes: number;
    delayedFlightsCount: number;
    cancelledFlightsCount: number;
    crewsAtRiskCount: number;
    onTimePct: number;
  };
  candidates: Array<{
    id: string;
    title: string;
    summary: string;
    metrics: {
      strandedPaxTotal: number;
      totalDelayMinutes: number;
      delayedFlightsCount: number;
      cancelledFlightsCount: number;
      crewsAtRiskCount: number;
      onTimePct: number;
    };
    netStrandedSaved: number;
    netDelaySaved: number;
  }>;
}
