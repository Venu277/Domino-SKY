import React from 'react';
import { useSimulatorStore } from '../store/useSimulatorStore.js';
import { Card } from './ui/Card.js';
import { Stat } from './ui/Stat.js';

export const KPIStrip: React.FC = () => {
  const { activeResult, baselineResult, scenario, computeLatencyMs } = useSimulatorStore();

  const metrics = activeResult.metrics;
  const baseMetrics = baselineResult.metrics;
  const hasActions = scenario.actions.length > 0;

  // Before vs after deltas
  const strandedDelta = hasActions ? metrics.strandedPaxTotal - baseMetrics.strandedPaxTotal : undefined;
  const delayDelta = hasActions ? metrics.totalDelayMinutes - baseMetrics.totalDelayMinutes : undefined;
  const cancelDelta = hasActions ? metrics.cancelledFlightsCount - baseMetrics.cancelledFlightsCount : undefined;
  const crewDelta = hasActions ? metrics.crewsAtRiskCount - baseMetrics.crewsAtRiskCount : undefined;

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between mb-4">
        <div>
          <h2 className="text-[21px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] tracking-tight">
            System Impact
          </h2>
          <p className="text-[13px] text-[#6E6E73] dark:text-[#98989D] mt-0.5">
            Deterministic network cascade computed in {computeLatencyMs}ms.
          </p>
        </div>
      </div>

      {/* 2x2 Clean Apple Card Grid (Avoids 3-in-a-row pattern) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Stranded Passengers */}
        <Card padding="md">
          <Stat
            label="Stranded Passengers"
            value={metrics.strandedPaxTotal}
            delta={strandedDelta}
            deltaLabel={strandedDelta && strandedDelta < 0 ? 'recovered' : 'delta'}
            variant={strandedDelta && strandedDelta < 0 ? 'ontime' : 'cancelled'}
            caption={`${metrics.strandedCancelledPax} due to flight cancellation, ${metrics.strandedConnectionPax} broken connections.`}
          />
        </Card>

        {/* 2. Delayed Flights */}
        <Card padding="md">
          <Stat
            label="Delayed Flights"
            value={metrics.delayedFlightsCount}
            delta={delayDelta}
            deltaLabel="min"
            variant={delayDelta && delayDelta < 0 ? 'ontime' : 'delayed'}
            caption={`${metrics.totalDelayMinutes.toLocaleString()} total cascade minutes across network.`}
          />
        </Card>

        {/* 3. Cancellations */}
        <Card padding="md">
          <Stat
            label="Cancelled Flights"
            value={metrics.cancelledFlightsCount}
            delta={cancelDelta}
            deltaLabel="cancellations"
            variant={cancelDelta && cancelDelta < 0 ? 'ontime' : 'cancelled'}
            caption="Rotational chain ground stops or manual dispatcher cancellations."
          />
        </Card>

        {/* 4. Crews at Risk */}
        <Card padding="md">
          <Stat
            label="Crews at Risk"
            value={metrics.crewsAtRiskCount}
            delta={crewDelta}
            deltaLabel="crews"
            variant={crewDelta && crewDelta < 0 ? 'ontime' : 'delayed'}
            caption="Duty limit threshold: 600 minutes max legal duty time."
          />
        </Card>
      </div>
    </div>
  );
};
