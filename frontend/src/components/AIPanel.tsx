import React, { useEffect } from 'react';
import { useSimulatorStore } from '../store/useSimulatorStore.js';
import { Card } from './ui/Card.js';
import { Button } from './ui/Button.js';
import { Pill } from './ui/Pill.js';
import { Check, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';

export const AIPanel: React.FC = () => {
  const {
    candidates,
    recommendation,
    isAdvisorLoading,
    requestAdvisorRecommendation,
    applyCandidate,
    revertRecovery,
    scenario,
    selectedCandidateId,
    setSelectedCandidateId,
    showCalculation,
    setShowCalculation,
  } = useSimulatorStore();

  const isApplied = scenario.actions.length > 0;
  const currentCandidate =
    candidates.find((c) => c.id === selectedCandidateId) ||
    (recommendation ? candidates.find((c) => c.id === recommendation.recommendedCandidateId) : candidates[0]);

  // Automatically request recommendation when candidates appear and no recommendation exists
  useEffect(() => {
    if (candidates.length > 0 && !recommendation && !isAdvisorLoading && scenario.closures.length > 0) {
      requestAdvisorRecommendation();
    }
  }, [candidates.length, recommendation, isAdvisorLoading, scenario.closures.length]);

  const handleApply = () => {
    if (isApplied) {
      revertRecovery();
    } else if (recommendation) {
      applyCandidate(recommendation.recommendedCandidateId);
    } else if (currentCandidate) {
      applyCandidate(currentCandidate.id);
    }
  };

  if (candidates.length === 0) {
    return (
      <div className="w-full">
        <h2 className="text-[21px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] tracking-tight mb-4">
          Recovery Plan
        </h2>
        <Card padding="lg" className="text-center py-12">
          <p className="text-[15px] text-[#6E6E73] dark:text-[#98989D] max-w-md mx-auto">
            Close any airport in the controls above or select a Quick Scenario to activate the AI Dispatcher and generate deterministic recovery candidates.
          </p>
        </Card>
      </div>
    );
  }

  const rationale =
    recommendation?.rationale ||
    currentCandidate?.summary ||
    'Planner evaluates spare aircraft substitutions and selective cancellations to minimize passenger strandings and crew duty exceedances.';

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between mb-4">
        <div>
          <h2 className="text-[21px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] tracking-tight">
            Recovery Plan
          </h2>
          <p className="text-[13px] text-[#6E6E73] dark:text-[#98989D] mt-0.5">
            Zero-hallucination AI dispatcher backed by pure deterministic candidate evaluation.
          </p>
        </div>

        {/* Verified by Engine Badge */}
        <div className="mt-2 sm:mt-0 flex items-center gap-2">
          <Pill
            label="Verified by Engine"
            variant="ontime"
            icon={<Check size={12} strokeWidth={2.5} />}
            size="md"
          />
          {recommendation && (
            <span className="text-[11px] text-[#6E6E73] dark:text-[#98989D] bg-black/5 dark:bg-white/5 px-2.5 py-1 rounded-full border border-[#D2D2D7]/40 dark:border-[#38383A]">
              Path: {recommendation.path.toUpperCase()}
            </span>
          )}
        </div>
      </div>

      {/* Large Featured Recommendation Card */}
      <Card padding="lg" className="flex flex-col space-y-6">
        <div>
          <div className="text-[12px] font-semibold text-[#0071E3] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Sparkles size={14} strokeWidth={1.5} />
            <span>Recommended Dispatch Action</span>
          </div>
          <h3 className="text-[24px] sm:text-[28px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] tracking-tight leading-snug">
            {currentCandidate?.title || 'Spare Aircraft Swap & Targeted Delay Mitigation'}
          </h3>
        </div>

        <div className="text-[15px] text-[#1D1D1F] dark:text-[#F5F5F7] leading-relaxed max-w-3xl">
          {isAdvisorLoading ? (
            <span className="text-[#6E6E73] italic">Synthesizing verified AI dispatcher explanation...</span>
          ) : (
            rationale
          )}
        </div>

        {/* Trade-offs & Expected Results List */}
        {currentCandidate && (
          <div className="bg-[#F5F5F7] dark:bg-[#242426] border border-[#D2D2D7]/60 dark:border-[#38383A] rounded-[16px] p-5">
            <h4 className="text-[12px] font-semibold text-[#6E6E73] dark:text-[#98989D] uppercase tracking-wider mb-3">
              Trade-offs & Resulting Metrics
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <span className="text-[11px] text-[#6E6E73] block mb-0.5">Stranded Pax</span>
                <span className="tnum text-[18px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                  {currentCandidate.metrics.strandedPaxTotal}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-[#6E6E73] block mb-0.5">Total Delay</span>
                <span className="tnum text-[18px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                  {currentCandidate.metrics.totalDelayMinutes}m
                </span>
              </div>
              <div>
                <span className="text-[11px] text-[#6E6E73] block mb-0.5">Cancellations</span>
                <span className="tnum text-[18px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                  {currentCandidate.metrics.cancelledFlightsCount}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-[#6E6E73] block mb-0.5">Crew Overduty</span>
                <span className="tnum text-[18px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                  {currentCandidate.metrics.crewsAtRiskCount}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Alternative Candidates */}
        <div>
          <h4 className="text-[12px] font-semibold text-[#6E6E73] dark:text-[#98989D] uppercase tracking-wider mb-3">
            Alternative Planner Candidates ({candidates.length})
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {candidates.map((c) => {
              const isSelected = currentCandidate?.id === c.id;
              const isRecommended = recommendation?.recommendedCandidateId === c.id;

              return (
                <div
                  key={c.id}
                  onClick={() => setSelectedCandidateId(c.id)}
                  className={`p-4 rounded-[14px] border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-[#0071E3]/5 border-[#0071E3] ring-1 ring-[#0071E3]'
                      : 'bg-[#F5F5F7] dark:bg-[#2C2C2E] border-[#D2D2D7]/60 dark:border-[#38383A] hover:border-[#0071E3]/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-semibold text-[13px] text-[#1D1D1F] dark:text-[#F5F5F7]">
                      {c.id}
                    </span>
                    {isRecommended && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#0071E3]/15 text-[#0071E3]">
                        Recommended
                      </span>
                    )}
                  </div>
                  <p className="text-[12px] text-[#6E6E73] dark:text-[#98989D] line-clamp-2 leading-snug">
                    {c.title}
                  </p>
                  <div className="text-[11px] text-[#6E6E73] dark:text-[#98989D] mt-2 pt-2 border-t border-[#D2D2D7]/40 dark:border-[#38383A]/60 flex justify-between">
                    <span>Score: {Math.round(c.score)}</span>
                    <span>{c.actions.length} action(s)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Show Calculation Breakdown */}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => setShowCalculation(!showCalculation)}
            className="text-[13px] font-medium text-[#0071E3] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>{showCalculation ? 'Hide deterministic calculation breakdown' : 'Show calculation breakdown'}</span>
            {showCalculation ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {showCalculation && currentCandidate && (
            <div className="mt-4 p-5 bg-[#F5F5F7] dark:bg-[#242426] rounded-[16px] border border-[#D2D2D7]/60 dark:border-[#38383A] text-[13px]">
              <h5 className="font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] mb-2">
                Deterministic Scoring Formulation
              </h5>
              <p className="text-[12px] text-[#6E6E73] dark:text-[#98989D] mb-3 leading-relaxed">
                Objective Function: minimize Cost = 5.0 × (Stranded Pax) + 1.0 × (Delay Mins) + 500 × (Cancellations) + 200 × (Crew Risks).
              </p>
              <div className="space-y-1 font-mono text-[12px] text-[#1D1D1F] dark:text-[#F5F5F7]">
                <div>Candidate: {currentCandidate.id} — {currentCandidate.title}</div>
                <div>Stranded Pax Cost: 5.0 × {currentCandidate.metrics.strandedPaxTotal} = {5 * currentCandidate.metrics.strandedPaxTotal}</div>
                <div>Delay Cost: 1.0 × {currentCandidate.metrics.totalDelayMinutes} = {currentCandidate.metrics.totalDelayMinutes}</div>
                <div>Cancellation Penalty: 500 × {currentCandidate.metrics.cancelledFlightsCount} = {500 * currentCandidate.metrics.cancelledFlightsCount}</div>
                <div>Crew Overduty Risk: 200 × {currentCandidate.metrics.crewsAtRiskCount} = {200 * currentCandidate.metrics.crewsAtRiskCount}</div>
                <div className="pt-1.5 font-bold border-t border-[#D2D2D7]/60 dark:border-[#38383A]">Total Score: {currentCandidate.score}</div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom CTA Button */}
        <div className="pt-4 border-t border-[#D2D2D7]/40 dark:border-[#38383A]/60 flex items-center justify-between flex-wrap gap-4">
          <div className="text-[13px] text-[#6E6E73] dark:text-[#98989D]">
            {isApplied
              ? 'Recovery actions applied to active timeline. Switch views or examine Before vs After below.'
              : 'Applying executes swap actions and re-simulates entire network deterministically.'}
          </div>

          <Button
            variant={isApplied ? 'secondary' : 'primary'}
            size="lg"
            onClick={handleApply}
            className="w-full sm:w-auto"
          >
            {isApplied ? 'Revert to Disrupted Baseline' : 'Apply Recommendation'}
          </Button>
        </div>
      </Card>
    </div>
  );
};
