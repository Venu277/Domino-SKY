import React from 'react';
import { ArrowRight } from 'lucide-react';

interface LandingPageProps {
  onEnterSimulator: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onEnterSimulator }) => {
  return (
    <div className="min-h-screen w-full bg-[#F5F5F7] dark:bg-black text-[#1D1D1F] dark:text-[#F5F5F7] flex flex-col justify-between selection:bg-[#0071E3]/20">
      {/* Minimal Top Nav */}
      <header className="max-w-5xl w-full mx-auto px-6 py-8 flex items-center justify-between">
        <div className="text-[15px] font-semibold tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7]">
          Domino Sky
        </div>
        <button
          onClick={onEnterSimulator}
          className="text-[13px] font-medium text-[#6E6E73] dark:text-[#98989D] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7] transition-colors cursor-pointer"
        >
          Skip to Simulator →
        </button>
      </header>

      {/* Centered Minimalist Content */}
      <main className="max-w-3xl w-full mx-auto px-6 text-center flex flex-col items-center my-auto py-16">
        {/* Name of Website in Centre */}
        <h1 className="text-[52px] sm:text-[72px] md:text-[84px] font-semibold tracking-[-0.03em] leading-tight text-[#1D1D1F] dark:text-[#F5F5F7] mb-5">
          Domino Sky
        </h1>

        {/* Calm Subtitle (only secondary text color #6E6E73) */}
        <p className="text-[17px] sm:text-[19px] text-[#6E6E73] dark:text-[#98989D] max-w-xl font-normal leading-relaxed mb-10">
          Airline disruption and cascade simulator. See how one weather delay ripples across the entire airspace network.
        </p>

        {/* Skeuomorphic Tactile Button */}
        <button
          onClick={onEnterSimulator}
          className="group relative inline-flex items-center justify-center px-8 py-4 rounded-[14px] text-[16px] font-semibold text-white bg-[#0071E3] hover:bg-[#0077ED] border-t border-white/25 border-b-2 border-b-[#004EA0] shadow-[0_4px_0_#004EA0,0_10px_20px_rgba(0,113,227,0.3)] hover:shadow-[0_2px_0_#004EA0,0_6px_12px_rgba(0,113,227,0.25)] hover:translate-y-0.5 active:translate-y-1 active:shadow-[0_0_0_#004EA0,inset_0_2px_4px_rgba(0,0,0,0.2)] transition-all cursor-pointer select-none"
        >
          <span className="flex items-center gap-2.5">
            <span>Go to Simulator</span>
            <ArrowRight size={18} strokeWidth={2} className="group-hover:translate-x-1 transition-transform" />
          </span>
        </button>
      </main>

      {/* Clean Minimal Footer */}
      <footer className="max-w-5xl w-full mx-auto px-6 py-8 flex items-center justify-between text-[12px] text-[#6E6E73] dark:text-[#98989D]">
        <span>Deterministic Cascade Engine</span>
        <span>India Airspace Operations</span>
      </footer>
    </div>
  );
};
