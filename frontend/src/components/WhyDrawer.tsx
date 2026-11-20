import React from 'react';
import { useSimulatorStore } from '../store/useSimulatorStore.js';
import {
  formatMinutesToTimeString,
  generatePlainEnglishWhy,
  traceCauseChain,
} from '@domino/main';
import { Sheet } from './ui/Sheet.js';
import { Pill } from './ui/Pill.js';

export const WhyDrawer: React.FC = () => {
  const { dataset, activeResult, selectedFlightId, setSelectedFlightId } = useSimulatorStore();

  if (!selectedFlightId) return null;

  const flight = activeResult.flightsById[selectedFlightId];
  if (!flight) return null;

  // Convert flightsById to Map for engine functions
  const flightMap = new Map(Object.entries(activeResult.flightsById));

  const plainWhy = generatePlainEnglishWhy(selectedFlightId, flightMap, dataset);
  const causeChain = traceCauseChain(selectedFlightId, flightMap);

  // Connection impacts
  const brokenConnectionsFromThis = activeResult.brokenConnections.filter(
    (c) => c.from_flight === selectedFlightId
  );
  const brokenConnectionsToThis = activeResult.brokenConnections.filter(
    (c) => c.to_flight === selectedFlightId
  );

  let statusPill: 'ontime' | 'delayed' | 'cancelled' = 'ontime';
  if (flight.status === 'DELAYED') statusPill = 'delayed';
  if (flight.status === 'CANCELLED') statusPill = 'cancelled';

  return (
    <Sheet
      isOpen={Boolean(selectedFlightId)}
      onClose={() => setSelectedFlightId(null)}
      title={`Flight ${flight.flight_id}`}
      subtitle={`${flight.origin} → ${flight.destination} • Aircraft ${flight.tail_id}`}
    >
      <div className="space-y-6">
        {/* Status Card */}
        <div className="bg-[#F5F5F7] dark:bg-[#2C2C2E] border border-[#D2D2D7]/50 dark:border-[#38383A] rounded-[16px] p-4 flex items-center justify-between">
          <div>
            <div className="text-[12px] font-semibold text-[#6E6E73] dark:text-[#98989D] uppercase tracking-wider mb-1">
              Flight Status
            </div>
            <div className="text-[16px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
              {flight.status === 'DELAYED'
                ? `Delayed +${flight.depDelay}m`
                : flight.status === 'CANCELLED'
                ? 'Flight Cancelled'
                : 'Operating On-time'}
            </div>
          </div>
          <Pill
            label={flight.status}
            variant={statusPill}
            size="md"
          />
        </div>

        {/* Schedule vs Actual Times */}
        <div className="grid grid-cols-2 gap-3 text-[13px]">
          <div className="bg-[#F5F5F7] dark:bg-[#2C2C2E] border border-[#D2D2D7]/40 dark:border-[#38383A] rounded-[14px] p-3">
            <span className="text-[11px] text-[#6E6E73] dark:text-[#98989D] block mb-1">Departure</span>
            <div className="font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
              {flight.status === 'CANCELLED' ? 'Cancelled' : formatMinutesToTimeString(flight.actualDep)}
            </div>
            <div className="text-[11px] text-[#6E6E73] dark:text-[#98989D]">
              Sched: {formatMinutesToTimeString(flight.schedDep)}
            </div>
          </div>

          <div className="bg-[#F5F5F7] dark:bg-[#2C2C2E] border border-[#D2D2D7]/40 dark:border-[#38383A] rounded-[14px] p-3">
            <span className="text-[11px] text-[#6E6E73] dark:text-[#98989D] block mb-1">Arrival</span>
            <div className="font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
              {flight.status === 'CANCELLED' ? 'Cancelled' : formatMinutesToTimeString(flight.actualArr)}
            </div>
            <div className="text-[11px] text-[#6E6E73] dark:text-[#98989D]">
              Sched: {formatMinutesToTimeString(flight.schedArr)}
            </div>
          </div>
        </div>

        {/* Plain English Root Cause Explanation */}
        <div>
          <h4 className="text-[12px] font-semibold text-[#6E6E73] dark:text-[#98989D] uppercase tracking-wider mb-2">
            Deterministic Cause Explanation
          </h4>
          <div className="bg-white dark:bg-[#242426] border border-[#D2D2D7]/70 dark:border-[#38383A] rounded-[16px] p-4 text-[14px] text-[#1D1D1F] dark:text-[#F5F5F7] leading-relaxed">
            {plainWhy}
          </div>
        </div>

        {/* Vertical Cause Timeline */}
        <div>
          <h4 className="text-[12px] font-semibold text-[#6E6E73] dark:text-[#98989D] uppercase tracking-wider mb-3">
            Domino Cascade Steps
          </h4>

          <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#D2D2D7] dark:before:bg-[#38383A]">
            {causeChain.map((step, idx) => {
              const isCurrent = step.flightId === selectedFlightId;
              return (
                <div key={idx} className="relative group">
                  <div
                    className={`absolute -left-6 top-1.5 w-4 h-4 rounded-full border-2 bg-white dark:bg-[#1C1C1E] ${
                      isCurrent
                        ? 'border-[#0071E3] bg-[#0071E3]'
                        : 'border-[#6E6E73]'
                    }`}
                  />

                  <div
                    onClick={() => {
                      if (!isCurrent) setSelectedFlightId(step.flightId);
                    }}
                    className={`p-3.5 rounded-[14px] border transition-all ${
                      isCurrent
                        ? 'bg-[#0071E3]/5 border-[#0071E3]/40'
                        : 'bg-[#F5F5F7] dark:bg-[#2C2C2E] border-[#D2D2D7]/50 dark:border-[#38383A] hover:border-[#0071E3]/40 cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-[13px] text-[#1D1D1F] dark:text-[#F5F5F7]">
                        {step.flightId} ({step.route})
                      </span>
                      <span className="text-[12px] font-medium text-[#FF9F0A]">
                        +{step.depDelay}m
                      </span>
                    </div>

                    <p className="text-[12px] text-[#6E6E73] dark:text-[#98989D] leading-snug">
                      {step.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Broken Passenger Connections */}
        {(brokenConnectionsFromThis.length > 0 || brokenConnectionsToThis.length > 0) && (
          <div>
            <h4 className="text-[12px] font-semibold text-[#6E6E73] dark:text-[#98989D] uppercase tracking-wider mb-2">
              Broken Passenger Connections
            </h4>
            <div className="space-y-2">
              {brokenConnectionsFromThis.map((c, i) => (
                <div
                  key={`from-${i}`}
                  className="p-3 bg-[#FF3B30]/10 border border-[#FF3B30]/20 rounded-[12px] text-[12px] flex items-center justify-between"
                >
                  <span className="text-[#FF3B30] font-medium">
                    {c.passengers} pax missed connection to {c.to_flight} at {c.airport}
                  </span>
                  <span className="text-[#6E6E73]">
                    Gap: {c.gap}m (needed {c.minRequired}m)
                  </span>
                </div>
              ))}
              {brokenConnectionsToThis.map((c, i) => (
                <div
                  key={`to-${i}`}
                  className="p-3 bg-[#FF9F0A]/10 border border-[#FF9F0A]/20 rounded-[12px] text-[12px] flex items-center justify-between"
                >
                  <span className="text-[#B25E00] dark:text-[#FF9F0A] font-medium">
                    {c.passengers} pax arriving on {c.from_flight} missed this departure
                  </span>
                  <span className="text-[#6E6E73]">
                    Gap: {c.gap}m
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Sheet>
  );
};
