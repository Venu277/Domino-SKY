import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import {
  generateFallbackRecommendation,
  verifyAdvisorOutput,
  type AdvisorRecommendation,
  type PlannerCandidate,
  type SimulationMetrics,
} from '@domino/main';
import { env } from '../env.js';
import { GeminiProvider, type LLMPromptContext } from '../llm/provider.js';

export const adviseRouter = Router();

const AdviseRequestSchema = z.object({
  closedAirport: z.string().min(2),
  closureStart: z.number().int().nonnegative(),
  closureEnd: z.number().int().positive(),
  baselineMetrics: z.object({
    strandedPaxTotal: z.number(),
    totalDelayMinutes: z.number(),
    delayedFlightsCount: z.number(),
    cancelledFlightsCount: z.number(),
    crewsAtRiskCount: z.number(),
    onTimePct: z.number(),
  }),
  candidates: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      actions: z.array(z.any()),
      metrics: z.any(),
      score: z.number(),
      netStrandedSaved: z.number(),
      netDelaySaved: z.number(),
      netCancellationsDelta: z.number(),
      summary: z.string(),
    })
  ).min(1),
});

/**
 * POST /api/advise
 * Zero-hallucination AI Dispatcher endpoint.
 */
adviseRouter.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = AdviseRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Invalid request payload',
        details: parseResult.error.format(),
      });
      return;
    }

    const { closedAirport, closureStart, closureEnd, baselineMetrics, candidates } =
      parseResult.data;

    // Check if API key is present
    if (!env.LLM_API_KEY) {
      console.log('No LLM_API_KEY set. Returning deterministic template fallback.');
      const fallback = generateFallbackRecommendation(
        candidates as PlannerCandidate[],
        baselineMetrics as SimulationMetrics
      );
      res.json({ recommendation: fallback });
      return;
    }

    // Build LLM Context
    const formatTime = (m: number) => {
      const h = Math.floor(m / 60).toString().padStart(2, '0');
      const min = (m % 60).toString().padStart(2, '0');
      return `${h}:${min}`;
    };

    const promptContext: LLMPromptContext = {
      closedAirport,
      closureWindow: `${formatTime(closureStart)} - ${formatTime(closureEnd)}`,
      durationMinutes: closureEnd - closureStart,
      baselineMetrics,
      candidates: candidates.map((c) => ({
        id: c.id,
        title: c.title,
        summary: c.summary,
        score: c.score,
        netStrandedSaved: c.netStrandedSaved,
        netDelaySaved: c.netDelaySaved,
        actions: c.actions,
      })),
    };

    const provider = new GeminiProvider(env.LLM_API_KEY);

    // Attempt 1: Initial LLM Generation
    try {
      const rawOutput1 = await provider.generateRecommendation(promptContext);
      const verification1 = verifyAdvisorOutput({
        rawOutput: rawOutput1,
        candidates: candidates as PlannerCandidate[],
        baselineMetrics: baselineMetrics as SimulationMetrics,
      }, 'llm');

      if (verification1.isValid && verification1.verified) {
        res.json({ recommendation: verification1.verified });
        return;
      }

      console.warn(
        'LLM response failed verifier on Attempt 1. Reason:',
        verification1.error,
        'Retrying once...'
      );

      // Attempt 2: Single Retry with specific error feedback
      const rawOutput2 = await provider.generateRecommendation(
        promptContext,
        verification1.error
      );
      const verification2 = verifyAdvisorOutput({
        rawOutput: rawOutput2,
        candidates: candidates as PlannerCandidate[],
        baselineMetrics: baselineMetrics as SimulationMetrics,
      }, 'retry');

      if (verification2.isValid && verification2.verified) {
        res.json({ recommendation: verification2.verified });
        return;
      }

      console.warn(
        'LLM response failed verifier on Attempt 2 retry. Reason:',
        verification2.error,
        'Using deterministic template fallback.'
      );
    } catch (llmErr) {
      console.warn('Error during LLM call:', (llmErr as Error).message);
    }

    // Guaranteed Fallback if LLM or Verifier fails
    const fallback = generateFallbackRecommendation(
      candidates as PlannerCandidate[],
      baselineMetrics as SimulationMetrics
    );
    res.json({ recommendation: fallback });
  } catch (err) {
    console.error('Unexpected error in /api/advise:', err);
    res.status(500).json({ error: 'Internal server error processing recovery advice' });
  }
});
