import React, { useState } from 'react';
import { CONFIG } from '@domino/main';
import { ChevronDown, ChevronUp, Shield, Cpu, Clock } from 'lucide-react';

export const AssumptionsPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="w-full border-t border-[#D2D2D7]/60 dark:border-[#38383A] pt-8 mt-12 pb-16">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between text-left group cursor-pointer select-none py-2"
      >
        <div>
          <h3 className="text-[17px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] group-hover:text-[#0071E3] transition-colors">
            How this is calculated
          </h3>
          <p className="text-[13px] text-[#6E6E73] dark:text-[#98989D] mt-0.5">
            Deterministic simulation parameters, legal duty thresholds, and scoring formulation.
          </p>
        </div>

        <div className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 text-[#6E6E73] transition-colors">
          {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
      </button>

      {isOpen && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6 text-[13px] pt-4 border-t border-[#D2D2D7]/40 dark:border-[#38383A]/60">
          {/* Column 1: Ground Buffers & Turnaround */}
          <div className="space-y-2.5">
            <h4 className="text-[12px] font-semibold text-[#6E6E73] dark:text-[#98989D] uppercase tracking-wider">
              Turnaround & Buffers
            </h4>
            <div className="space-y-2 text-[#1D1D1F] dark:text-[#F5F5F7]">
              <div className="flex justify-between border-b border-[#D2D2D7]/30 dark:border-[#38383A]/30 pb-1.5">
                <span className="text-[#6E6E73]">Min Aircraft Turnaround</span>
                <span className="font-semibold">{CONFIG.turnaround.minTurnaroundMinutes} min</span>
              </div>
              <div className="flex justify-between border-b border-[#D2D2D7]/30 dark:border-[#38383A]/30 pb-1.5">
                <span className="text-[#6E6E73]">Crew Turnaround Buffer</span>
                <span className="font-semibold">{CONFIG.turnaround.crewTurnaroundMinutes} min</span>
              </div>
              <div className="flex justify-between border-b border-[#D2D2D7]/30 dark:border-[#38383A]/30 pb-1.5">
                <span className="text-[#6E6E73]">Min Connection Time (MCT)</span>
                <span className="font-semibold">{CONFIG.turnaround.defaultMCTMinutes} min</span>
              </div>
              <div className="flex justify-between pb-1.5">
                <span className="text-[#6E6E73]">Crew Sign-On Buffer</span>
                <span className="font-semibold">{CONFIG.turnaround.crewSignOnBufferMinutes} min</span>
              </div>
            </div>
          </div>

          {/* Column 2: Legal Limits & Policies */}
          <div className="space-y-2.5">
            <h4 className="text-[12px] font-semibold text-[#6E6E73] dark:text-[#98989D] uppercase tracking-wider">
              Operational Thresholds
            </h4>
            <div className="space-y-2 text-[#1D1D1F] dark:text-[#F5F5F7]">
              <div className="flex justify-between border-b border-[#D2D2D7]/30 dark:border-[#38383A]/30 pb-1.5">
                <span className="text-[#6E6E73]">On-Time Standard</span>
                <span className="font-semibold">≤ {CONFIG.thresholds.onTimeDelayMinutes} min</span>
              </div>
              <div className="flex justify-between border-b border-[#D2D2D7]/30 dark:border-[#38383A]/30 pb-1.5">
                <span className="text-[#6E6E73]">Max Delay Before Cancel</span>
                <span className="font-semibold">≥ {CONFIG.thresholds.maxDelayBeforeCancelMinutes} min</span>
              </div>
              <div className="flex justify-between border-b border-[#D2D2D7]/30 dark:border-[#38383A]/30 pb-1.5">
                <span className="text-[#6E6E73]">Max Legal Crew Duty</span>
                <span className="font-semibold">{CONFIG.thresholds.maxCrewDutyMinutes / 60}h ({CONFIG.thresholds.maxCrewDutyMinutes} min)</span>
              </div>
              <div className="flex justify-between pb-1.5">
                <span className="text-[#6E6E73]">Destination Closed Rule</span>
                <span className="font-semibold">{CONFIG.policy.destinationClosedRule}</span>
              </div>
            </div>
          </div>

          {/* Column 3: AI & Deterministic Guarantee */}
          <div className="space-y-2.5">
            <h4 className="text-[12px] font-semibold text-[#6E6E73] dark:text-[#98989D] uppercase tracking-wider">
              Deterministic AI Guarantee
            </h4>
            <div className="space-y-2 text-[#1D1D1F] dark:text-[#F5F5F7]">
              <div className="flex justify-between border-b border-[#D2D2D7]/30 dark:border-[#38383A]/30 pb-1.5">
                <span className="text-[#6E6E73]">Engine Calculation</span>
                <span className="font-semibold text-[#34C759]">Pure Function (0% RNG)</span>
              </div>
              <div className="flex justify-between border-b border-[#D2D2D7]/30 dark:border-[#38383A]/30 pb-1.5">
                <span className="text-[#6E6E73]">AI Number Generation</span>
                <span className="font-semibold text-[#34C759]">Strictly Forbidden (0 Hallucination)</span>
              </div>
              <div className="flex justify-between border-b border-[#D2D2D7]/30 dark:border-[#38383A]/30 pb-1.5">
                <span className="text-[#6E6E73]">Passenger Counting</span>
                <span className="font-semibold">Disjoint / Non-overlapping</span>
              </div>
              <div className="flex justify-between pb-1.5">
                <span className="text-[#6E6E73]">Cost Objective</span>
                <span className="font-mono text-[11px]">5×Pax + 1×Mins + 500×Cxl + 200×Crew</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
