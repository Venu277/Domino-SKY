import React, { useRef, useState } from 'react';
import { useSimulatorStore } from '../store/useSimulatorStore.js';
import { formatMinutesToTimeString, type SimulatedFlight } from '@domino/main';

const TIMELINE_START = 330; // 05:30
const TIMELINE_END = 1380;  // 23:00
const TOTAL_MINS = TIMELINE_END - TIMELINE_START;

export const Gantt: React.FC = () => {
  const {
    dataset,
    activeResult,
    currentTimeMinute,
    selectedFlightId,
    setSelectedFlightId,
  } = useSimulatorStore();

  const [hoveredFlight, setHoveredFlight] = useState<{
    flight: SimulatedFlight;
    x: number;
    y: number;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Group flights by aircraft tail
  const flightsByTail = new Map<string, SimulatedFlight[]>();
  for (const f of activeResult.flights) {
    const list = flightsByTail.get(f.tail_id) || [];
    list.push(f);
    flightsByTail.set(f.tail_id, list);
  }

  for (const list of flightsByTail.values()) {
    list.sort((a, b) => a.leg_order - b.leg_order);
  }

  // Operating aircraft tails
  const operatingTails = Array.from(dataset.flightsByAircraft.keys()).sort();
  // Spare aircraft tails
  const spareTails = dataset.spareAircraft.map((s) => s.tail_id);
  const allTails = [...operatingTails, ...spareTails];

  const getPercent = (minutes: number) => {
    const clamped = Math.max(TIMELINE_START, Math.min(TIMELINE_END, minutes));
    return ((clamped - TIMELINE_START) / TOTAL_MINS) * 100;
  };

  // Faint hour markers
  const hourMarkers: number[] = [];
  for (let m = 360; m <= 1380; m += 120) {
    hourMarkers.push(m);
  }

  const scrubberPercent = getPercent(currentTimeMinute);

  return (
    <div className="bg-white dark:bg-[#1C1C1E] border border-[#D2D2D7]/60 dark:border-[#38383A] rounded-[20px] shadow-[0_4px_24px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.4)] p-6 sm:p-8 flex flex-col relative overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#D2D2D7]/40 dark:border-[#38383A]/60">
        <div>
          <h2 className="text-[21px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] tracking-tight">
            Aircraft Rotation & Cascade
          </h2>
          <p className="text-[13px] text-[#6E6E73] dark:text-[#98989D] mt-0.5">
            Thin bars illustrate scheduled position (outline) vs actual delayed position (solid fill).
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-[12px] font-medium text-[#6E6E73] dark:text-[#98989D]">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#34C759]"></span>
            <span>On-time</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF9F0A]"></span>
            <span>Delayed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF3B30]"></span>
            <span>Cancelled</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-2 rounded border border-[#D2D2D7] dark:border-[#48484A]"></span>
            <span>Scheduled Base</span>
          </div>
        </div>
      </div>

      {/* Gantt Viewport */}
      <div className="overflow-x-auto relative mt-4 select-none" ref={containerRef}>
        <div className="min-w-[960px] pb-4">
          {/* Timeline Hour Scale */}
          <div className="relative h-7 border-b border-[#D2D2D7]/50 dark:border-[#38383A]/60 mb-3 ml-28">
            {hourMarkers.map((m) => {
              const leftPct = getPercent(m);
              return (
                <div
                  key={m}
                  className="absolute transform -translate-x-1/2 flex flex-col items-center"
                  style={{ left: `${leftPct}%` }}
                >
                  <span className="text-[11px] font-medium text-[#6E6E73] dark:text-[#98989D] tracking-tight">
                    {formatMinutesToTimeString(m)}
                  </span>
                  <div className="w-px h-1.5 bg-[#D2D2D7] dark:bg-[#38383A] mt-1" />
                </div>
              );
            })}
          </div>

          {/* Aircraft Rows */}
          <div className="relative space-y-1.5">
            {/* Live Scrubber Line */}
            {scrubberPercent >= 0 && scrubberPercent <= 100 && (
              <div
                className="absolute top-0 bottom-0 w-px bg-[#0071E3] z-20 pointer-events-none transition-all duration-75"
                style={{ left: `calc(7rem + (100% - 7rem) * ${scrubberPercent / 100})` }}
              >
                <div className="w-2 h-2 rounded-full bg-[#0071E3] -translate-x-[3.5px] -translate-y-1 shadow-sm" />
              </div>
            )}

            {allTails.map((tail) => {
              const flights = flightsByTail.get(tail) || [];
              const isSpare = spareTails.includes(tail);

              return (
                <div
                  key={tail}
                  className="flex items-center h-8 hover:bg-[#F5F5F7]/60 dark:hover:bg-[#2C2C2E]/40 rounded-lg transition-colors group"
                >
                  {/* Tail Identifier */}
                  <div className="w-28 shrink-0 flex items-center justify-between pr-3 text-[12px] font-medium text-[#6E6E73] dark:text-[#98989D]">
                    <span>{tail}</span>
                    {isSpare && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#0071E3]/10 text-[#0071E3] font-semibold">
                        Spare
                      </span>
                    )}
                  </div>

                  {/* Flight Track Bar */}
                  <div className="flex-1 h-full relative">
                    {flights.map((flight) => {
                      const schedLeft = getPercent(flight.schedDep);
                      const schedWidth = Math.max(1, getPercent(flight.schedArr) - schedLeft);

                      const actualLeft = getPercent(flight.actualDep);
                      const actualWidth = Math.max(1, getPercent(flight.actualArr) - actualLeft);

                      const isSelected = selectedFlightId === flight.flight_id;
                      const isCancelled = flight.status === 'CANCELLED';
                      const isDelayed = flight.status === 'DELAYED';

                      let barColor = '#34C759';
                      if (isDelayed) barColor = '#FF9F0A';
                      if (isCancelled) barColor = '#FF3B30';

                      return (
                        <React.Fragment key={flight.flight_id}>
                          {/* Faint Scheduled Base Outline (shows delay shift) */}
                          <div
                            className="absolute top-2 h-3 rounded-full border border-[#D2D2D7]/80 dark:border-[#48484A] bg-transparent pointer-events-none opacity-40"
                            style={{
                              left: `${schedLeft}%`,
                              width: `${schedWidth}%`,
                            }}
                          />

                          {/* Actual Flight Bar (Thin 12px rounded bar) */}
                          <div
                            onClick={() => setSelectedFlightId(isSelected ? null : flight.flight_id)}
                            onMouseEnter={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              setHoveredFlight({
                                flight,
                                x: rect.left + rect.width / 2,
                                y: rect.top,
                              });
                            }}
                            onMouseLeave={() => setHoveredFlight(null)}
                            className={`absolute top-2 h-3 rounded-full cursor-pointer transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                              isSelected
                                ? 'ring-2 ring-[#0071E3] ring-offset-1 dark:ring-offset-[#1C1C1E]'
                                : ''
                            } ${isCancelled ? 'opacity-40 border border-dashed border-[#FF3B30]' : ''}`}
                            style={{
                              left: `${actualLeft}%`,
                              width: `${actualWidth}%`,
                              backgroundColor: isCancelled ? 'transparent' : barColor,
                            }}
                          >
                            {/* Inner Flight ID text if bar is wide enough */}
                            {actualWidth > 3.5 && (
                              <span className="absolute inset-0 flex items-center justify-center text-[9px] font-semibold text-white tracking-tight pointer-events-none truncate px-1">
                                {flight.flight_id}
                              </span>
                            )}
                          </div>
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Floating Hover Tooltip */}
      {hoveredFlight && (
        <div
          className="fixed z-50 apple-glass rounded-[12px] p-3 shadow-xl pointer-events-none text-left transform -translate-x-1/2 -translate-y-full -mt-2 min-w-[200px]"
          style={{ left: hoveredFlight.x, top: hoveredFlight.y }}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[13px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
              Flight {hoveredFlight.flight.flight_id}
            </span>
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                hoveredFlight.flight.status === 'DELAYED'
                  ? 'bg-[#FF9F0A]/15 text-[#B25E00] dark:text-[#FF9F0A]'
                  : hoveredFlight.flight.status === 'CANCELLED'
                  ? 'bg-[#FF3B30]/15 text-[#D70015] dark:text-[#FF453A]'
                  : 'bg-[#34C759]/15 text-[#248A3D] dark:text-[#30D158]'
              }`}
            >
              {hoveredFlight.flight.status}
            </span>
          </div>

          <div className="text-[12px] text-[#1D1D1F] dark:text-[#F5F5F7] mt-1">
            {hoveredFlight.flight.origin} → {hoveredFlight.flight.destination} ({hoveredFlight.flight.tail_id})
          </div>

          <div className="text-[11px] text-[#6E6E73] dark:text-[#98989D] mt-1">
            Dep: {formatMinutesToTimeString(hoveredFlight.flight.actualDep)} • Arr: {formatMinutesToTimeString(hoveredFlight.flight.actualArr)}
          </div>

          {hoveredFlight.flight.depDelay > 0 && (
            <div className="text-[11px] font-medium text-[#FF9F0A] mt-0.5">
              +{hoveredFlight.flight.depDelay}m delay ({hoveredFlight.flight.cause.description})
            </div>
          )}
        </div>
      )}
    </div>
  );
};
