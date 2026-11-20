import React from 'react';
import { useSimulatorStore } from '../store/useSimulatorStore.js';
import { Card } from './ui/Card.js';
import { Pill } from './ui/Pill.js';
import { ArrowRight } from 'lucide-react';

export const BeforeAfter: React.FC = () => {
  const { baselineResult, activeResult, scenario } = useSimulatorStore();

  const isRecovered = scenario.actions.length > 0;
  const baseMetrics = baselineResult.metrics;
  const recoveredMetrics = activeResult.metrics;

  // Flights that changed between disrupted baseline and recovered scenario
  const flightDiffs = activeResult.flights.filter((f) => {
    const baseFlight = baselineResult.flightsById[f.flight_id];
    if (!baseFlight) return false;
    return (
      baseFlight.status !== f.status ||
      baseFlight.depDelay !== f.depDelay ||
      baseFlight.tail_id !== f.tail_id ||
      baseFlight.strandedPax !== f.strandedPax
    );
  });

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between mb-4">
        <div>
          <h2 className="text-[21px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] tracking-tight">
            Before vs After Comparison
          </h2>
          <p className="text-[13px] text-[#6E6E73] dark:text-[#98989D] mt-0.5">
            Audit comparing original schedule, disrupted cascade, and active recovery plan.
          </p>
        </div>
      </div>

      {/* 3 Columns: Normal Schedule vs Disrupted Baseline vs Recovered Plan */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Column 1: Normal Schedule */}
        <Card padding="md">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[12px] font-semibold text-[#6E6E73] dark:text-[#98989D] uppercase tracking-wider">
              1. Normal Schedule
            </span>
            <Pill label="Baseline" variant="neutral" size="sm" />
          </div>

          <div className="space-y-4">
            <div>
              <span className="text-[12px] text-[#6E6E73] block mb-0.5">Stranded Passengers</span>
              <span className="tnum text-[36px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">0</span>
            </div>
            <div>
              <span className="text-[12px] text-[#6E6E73] block mb-0.5">Delayed Flights</span>
              <span className="tnum text-[28px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">0</span>
            </div>
            <div>
              <span className="text-[12px] text-[#6E6E73] block mb-0.5">Total Delay</span>
              <span className="tnum text-[28px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">0m</span>
            </div>
            <div>
              <span className="text-[12px] text-[#6E6E73] block mb-0.5">Cancellations</span>
              <span className="tnum text-[28px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">0</span>
            </div>
          </div>
        </Card>

        {/* Column 2: Disrupted Scenario */}
        <Card padding="md" className={isRecovered ? 'opacity-80' : 'ring-2 ring-[#FF9F0A]/40'}>
          <div className="flex items-center justify-between mb-4">
            <span className="text-[12px] font-semibold text-[#FF9F0A] uppercase tracking-wider">
              2. Disrupted Scenario
            </span>
            <Pill label="Unmitigated" variant="delayed" size="sm" />
          </div>

          <div className="space-y-4">
            <div>
              <span className="text-[12px] text-[#6E6E73] block mb-0.5">Stranded Passengers</span>
              <span className="tnum text-[36px] font-semibold text-[#FF3B30]">
                {baseMetrics.strandedPaxTotal.toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-[12px] text-[#6E6E73] block mb-0.5">Delayed Flights</span>
              <span className="tnum text-[28px] font-semibold text-[#FF9F0A]">
                {baseMetrics.delayedFlightsCount}
              </span>
            </div>
            <div>
              <span className="text-[12px] text-[#6E6E73] block mb-0.5">Total Delay</span>
              <span className="tnum text-[28px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                {baseMetrics.totalDelayMinutes.toLocaleString()}m
              </span>
            </div>
            <div>
              <span className="text-[12px] text-[#6E6E73] block mb-0.5">Cancellations</span>
              <span className="tnum text-[28px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                {baseMetrics.cancelledFlightsCount}
              </span>
            </div>
          </div>
        </Card>

        {/* Column 3: Recovered Plan */}
        <Card padding="md" className={isRecovered ? 'ring-2 ring-[#0071E3]' : ''}>
          <div className="flex items-center justify-between mb-4">
            <span className="text-[12px] font-semibold text-[#0071E3] uppercase tracking-wider">
              3. Recovered Plan
            </span>
            <Pill
              label={isRecovered ? 'Active Plan' : 'Pending Apply'}
              variant={isRecovered ? 'ontime' : 'neutral'}
              size="sm"
            />
          </div>

          <div className="space-y-4">
            <div>
              <span className="text-[12px] text-[#6E6E73] block mb-0.5">Stranded Passengers</span>
              <span className="tnum text-[36px] font-semibold text-[#34C759]">
                {recoveredMetrics.strandedPaxTotal.toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-[12px] text-[#6E6E73] block mb-0.5">Delayed Flights</span>
              <span className="tnum text-[28px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                {recoveredMetrics.delayedFlightsCount}
              </span>
            </div>
            <div>
              <span className="text-[12px] text-[#6E6E73] block mb-0.5">Total Delay</span>
              <span className="tnum text-[28px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                {recoveredMetrics.totalDelayMinutes.toLocaleString()}m
              </span>
            </div>
            <div>
              <span className="text-[12px] text-[#6E6E73] block mb-0.5">Cancellations</span>
              <span className="tnum text-[28px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                {recoveredMetrics.cancelledFlightsCount}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* "What Changed" Flight Diff List */}
      <Card padding="md">
        <div className="flex items-center justify-between mb-3 pb-3 border-b border-[#D2D2D7]/40 dark:border-[#38383A]/60">
          <h3 className="text-[15px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
            What Changed ({flightDiffs.length} flight modifications)
          </h3>
          <span className="text-[12px] text-[#6E6E73] dark:text-[#98989D]">
            Comparing Disrupted Baseline → Recovered Plan
          </span>
        </div>

        {flightDiffs.length === 0 ? (
          <p className="text-[13px] text-[#6E6E73] dark:text-[#98989D] py-4 text-center">
            {isRecovered
              ? 'No flight status differences detected.'
              : 'Apply a recovery recommendation above to view the exact flight diff.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-[#D2D2D7]/40 dark:border-[#38383A]/60 text-[11px] font-semibold text-[#6E6E73] uppercase tracking-wider">
                  <th className="py-2.5 px-3">Flight</th>
                  <th className="py-2.5 px-3">Route</th>
                  <th className="py-2.5 px-3">Disrupted Baseline</th>
                  <th className="py-2.5 px-3"></th>
                  <th className="py-2.5 px-3">Recovered Plan</th>
                  <th className="py-2.5 px-3 text-right">Net Impact</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D2D2D7]/30 dark:divide-[#38383A]/40">
                {flightDiffs.map((f) => {
                  const base = baselineResult.flightsById[f.flight_id];
                  const delaySaved = (base ? base.depDelay : 0) - f.depDelay;

                  return (
                    <tr key={f.flight_id} className="hover:bg-[#F5F5F7] dark:hover:bg-[#252528] transition-colors">
                      <td className="py-3 px-3 font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                        {f.flight_id}
                      </td>
                      <td className="py-3 px-3 text-[#6E6E73]">
                        {f.origin} → {f.destination}
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-[#FF9F0A] font-medium">
                          {base.status === 'CANCELLED' ? 'Cancelled' : `Delayed +${base.depDelay}m`}
                        </span>
                        <span className="text-[11px] text-[#6E6E73] block">
                          Tail: {base.tail_id}
                        </span>
                      </td>
                      <td className="py-3 px-1 text-[#6E6E73]">
                        <ArrowRight size={14} />
                      </td>
                      <td className="py-3 px-3">
                        <span className={f.status === 'CANCELLED' ? 'text-[#FF3B30]' : 'text-[#34C759] font-medium'}>
                          {f.status === 'CANCELLED' ? 'Cancelled' : f.depDelay === 0 ? 'On-time' : `Delayed +${f.depDelay}m`}
                        </span>
                        <span className="text-[11px] text-[#6E6E73] block">
                          Tail: {f.tail_id}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-medium text-[#34C759]">
                        {delaySaved > 0 ? `-${delaySaved}m delay` : 'Status swap'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
