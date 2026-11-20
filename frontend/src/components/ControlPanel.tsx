import React, { useState, useEffect } from 'react';
import { useSimulatorStore } from '../store/useSimulatorStore.js';
import { formatMinutesToTimeString } from '@domino/main';
import { RotateCcw, AlertTriangle, Sparkles } from 'lucide-react';
import { Button } from './ui/Button.js';

export const ControlPanel: React.FC = () => {
  const {
    dataset,
    scenario,
    setClosure,
    clearClosures,
    resetAll,
    triggerDemo,
  } = useSimulatorStore();

  const currentClosure = scenario.closures[0];

  const [selectedAirport, setSelectedAirport] = useState<string>(
    currentClosure ? currentClosure.airport : 'BOM'
  );
  const [startMin, setStartMin] = useState<number>(
    currentClosure ? currentClosure.start : 480 // 08:00
  );
  const [endMin, setEndMin] = useState<number>(
    currentClosure ? currentClosure.end : 570 // 09:30
  );

  useEffect(() => {
    if (currentClosure) {
      setSelectedAirport(currentClosure.airport);
      setStartMin(currentClosure.start);
      setEndMin(currentClosure.end);
    }
  }, [currentClosure]);

  const durationMin = Math.max(0, endMin - startMin);

  const handleApplyClosure = () => {
    setClosure(selectedAirport, startMin, endMin);
  };

  const handleClear = () => {
    clearClosures();
  };

  const isClosed = Boolean(currentClosure);

  return (
    <div className="w-full max-w-4xl mx-auto bg-white dark:bg-[#1C1C1E] border border-[#D2D2D7]/70 dark:border-[#38383A] rounded-[20px] shadow-[0_4px_24px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)] p-6 sm:p-8">
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-6">
        {/* Airport Picker */}
        <div className="flex-1 flex flex-col">
          <label className="text-[12px] font-semibold text-[#6E6E73] dark:text-[#98989D] uppercase tracking-wider mb-2">
            Disrupted Airport
          </label>
          <div className="relative">
            <select
              value={selectedAirport}
              onChange={(e) => setSelectedAirport(e.target.value)}
              className="w-full bg-[#F5F5F7] dark:bg-[#2C2C2E] border border-[#D2D2D7]/80 dark:border-[#38383A] rounded-[12px] px-4 py-2.5 text-[15px] font-medium text-[#1D1D1F] dark:text-[#F5F5F7] appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#0071E3]/30"
            >
              {dataset.airports.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.city} ({a.id}) — {a.name}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#6E6E73]">
              <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
                <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
        </div>

        {/* Time Window Controls */}
        <div className="flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <label className="text-[12px] font-semibold text-[#6E6E73] dark:text-[#98989D] uppercase tracking-wider">
              Closure Window
            </label>
            <span className="text-[12px] font-medium text-[#0071E3]">
              {durationMin} minutes ({formatMinutesToTimeString(startMin)} – {formatMinutesToTimeString(endMin)})
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col">
              <span className="text-[11px] text-[#6E6E73] mb-1">Start Time</span>
              <input
                type="time"
                value={`${String(Math.floor(startMin / 60)).padStart(2, '0')}:${String(startMin % 60).padStart(2, '0')}`}
                onChange={(e) => {
                  const [h, m] = e.target.value.split(':').map(Number);
                  if (!isNaN(h) && !isNaN(m)) {
                    const newStart = h * 60 + m;
                    setStartMin(newStart);
                    if (newStart >= endMin) setEndMin(newStart + 60);
                  }
                }}
                className="bg-[#F5F5F7] dark:bg-[#2C2C2E] border border-[#D2D2D7]/80 dark:border-[#38383A] rounded-[12px] px-3 py-2 text-[14px] font-medium text-[#1D1D1F] dark:text-[#F5F5F7] text-center"
              />
            </div>

            <div className="flex flex-col">
              <span className="text-[11px] text-[#6E6E73] mb-1">End Time</span>
              <input
                type="time"
                value={`${String(Math.floor(endMin / 60)).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`}
                onChange={(e) => {
                  const [h, m] = e.target.value.split(':').map(Number);
                  if (!isNaN(h) && !isNaN(m)) {
                    const newEnd = h * 60 + m;
                    setEndMin(newEnd);
                    if (newEnd <= startMin) setStartMin(Math.max(0, newEnd - 60));
                  }
                }}
                className="bg-[#F5F5F7] dark:bg-[#2C2C2E] border border-[#D2D2D7]/80 dark:border-[#38383A] rounded-[12px] px-3 py-2 text-[14px] font-medium text-[#1D1D1F] dark:text-[#F5F5F7] text-center"
              />
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex flex-col justify-end pt-2 md:pt-0">
          <label className="text-[12px] font-semibold text-transparent select-none mb-2 hidden md:block">
            Action
          </label>
          <div className="flex items-center gap-2">
            {isClosed ? (
              <Button
                variant="secondary"
                size="lg"
                onClick={handleClear}
                className="w-full md:w-auto text-[#FF3B30] border-[#FF3B30]/30 hover:bg-[#FF3B30]/10"
              >
                Reopen Airport
              </Button>
            ) : (
              <button
                type="button"
                onClick={handleApplyClosure}
                className="apple-button-primary w-full md:w-auto px-6 py-3 text-[15px] font-medium cursor-pointer"
              >
                Close Airport
              </button>
            )}

            {isClosed && (
              <button
                type="button"
                onClick={resetAll}
                className="p-3 text-[#6E6E73] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7] rounded-[12px] border border-[#D2D2D7]/60 dark:border-[#38383A] hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors"
                title="Reset simulation"
              >
                <RotateCcw size={16} strokeWidth={1.5} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Preset Scenarios Pill Bar */}
      <div className="mt-6 pt-5 border-t border-[#D2D2D7]/40 dark:border-[#38383A]/60 flex flex-wrap items-center justify-between gap-3 text-[13px]">
        <div className="flex items-center gap-2 text-[#6E6E73] dark:text-[#98989D]">
          <Sparkles size={14} strokeWidth={1.5} className="text-[#0071E3]" />
          <span>Quick Scenarios:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={triggerDemo}
            className="text-[12px] font-medium py-1 px-3 rounded-full bg-[#0071E3]/10 hover:bg-[#0071E3]/15 text-[#0071E3] border border-[#0071E3]/20 transition-colors cursor-pointer"
          >
            Mumbai 90m Storm (Golden Demo)
          </button>
          <button
            type="button"
            onClick={() => setClosure('DEL', 420, 540)}
            className="text-[12px] font-medium py-1 px-3 rounded-full bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-[#1D1D1F] dark:text-[#F5F5F7] border border-[#D2D2D7]/50 dark:border-[#38383A] transition-colors cursor-pointer"
          >
            Delhi Morning Fog (120m)
          </button>
          <button
            type="button"
            onClick={() => setClosure('BLR', 600, 660)}
            className="text-[12px] font-medium py-1 px-3 rounded-full bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-[#1D1D1F] dark:text-[#F5F5F7] border border-[#D2D2D7]/50 dark:border-[#38383A] transition-colors cursor-pointer"
          >
            Bengaluru Runway Work (60m)
          </button>
        </div>
      </div>
    </div>
  );
};
