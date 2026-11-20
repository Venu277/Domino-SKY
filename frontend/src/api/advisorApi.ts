import {
  generateFallbackRecommendation,
  type AdvisorRecommendation,
  type PlannerCandidate,
  type SimulationMetrics,
} from '@domino/main';

export interface AdviseApiRequest {
  closedAirport: string;
  closureStart: number;
  closureEnd: number;
  baselineMetrics: SimulationMetrics;
  candidates: PlannerCandidate[];
}

export async function fetchAdvisorRecommendation(
  req: AdviseApiRequest
): Promise<AdvisorRecommendation> {
  try {
    const res = await fetch('/api/advise', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req),
    });

    if (!res.ok) {
      console.warn('Backend /api/advise returned error status:', res.status);
      // Fallback client-side
      return generateFallbackRecommendation(req.candidates, req.baselineMetrics);
    }

    const data = await res.json();
    return data.recommendation;
  } catch (err) {
    console.warn('Network error reaching /api/advise, using local fallback:', err);
    return generateFallbackRecommendation(req.candidates, req.baselineMetrics);
  }
}
