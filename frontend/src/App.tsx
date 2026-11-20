import React, { useEffect, useState } from 'react';
import { useSimulatorStore } from './store/useSimulatorStore.js';
import { LandingPage } from './components/LandingPage.js';
import { ControlPanel } from './components/ControlPanel.js';
import { AirspaceMap } from './components/Map.js';
import { KPIStrip } from './components/KPIStrip.js';
import { Gantt } from './components/Gantt.js';
import { FlightTable } from './components/FlightTable.js';
import { AIPanel } from './components/AIPanel.js';
import { BeforeAfter } from './components/BeforeAfter.js';
import { AssumptionsPanel } from './components/AssumptionsPanel.js';
import { WhyDrawer } from './components/WhyDrawer.js';
import { Sun, Moon, Play } from 'lucide-react';

export const App: React.FC = () => {
  const { init, triggerDemo, scenario } = useSimulatorStore();

  const [currentView, setCurrentView] = useState<'landing' | 'simulator'>('simulator');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [activeSection, setActiveSection] = useState<'network' | 'aircraft' | 'flights' | 'recovery'>('network');

  useEffect(() => {
    init();
  }, [init]);

  // Handle dark mode toggle
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const scrollToSection = (id: string, section: 'network' | 'aircraft' | 'flights' | 'recovery') => {
    setActiveSection(section);
    const el = document.getElementById(id);
    if (el) {
      const yOffset = -72; // Nav offset
      const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  if (currentView === 'landing') {
    return <LandingPage onEnterSimulator={() => setCurrentView('simulator')} />;
  }

  const isClosed = scenario.closures.length > 0;

  return (
    <div className="min-h-screen bg-[#F5F5F7] dark:bg-black text-[#1D1D1F] dark:text-[#F5F5F7] selection:bg-[#0071E3]/20 flex flex-col font-sans">
      {/* 1. Sticky Glass Nav (56px) */}
      <header className="sticky top-0 z-40 h-14 apple-glass px-4 sm:px-8 flex items-center justify-between select-none">
        {/* Left: Brand Wordmark */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setCurrentView('landing')}
            className="flex items-center gap-2 text-[15px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] hover:opacity-80 transition-opacity cursor-pointer"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-[#0071E3]"></span>
            <span>Domino Sky</span>
          </button>
        </div>

        {/* Center: Section Segmented Navigation */}
        <nav className="flex items-center bg-[#E5E5EA]/70 dark:bg-[#2C2C2E] p-1 rounded-full text-[11px] sm:text-[12px] font-medium overflow-x-auto max-w-[280px] sm:max-w-none">
          <button
            type="button"
            onClick={() => scrollToSection('network', 'network')}
            className={`px-2.5 sm:px-3 py-1 rounded-full transition-all cursor-pointer shrink-0 ${
              activeSection === 'network'
                ? 'bg-white dark:bg-[#3A3A3C] text-[#1D1D1F] dark:text-[#F5F5F7] shadow-sm'
                : 'text-[#6E6E73] dark:text-[#98989D] hover:text-[#1D1D1F]'
            }`}
          >
            Network
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('aircraft', 'aircraft')}
            className={`hidden sm:inline-block px-2.5 sm:px-3 py-1 rounded-full transition-all cursor-pointer shrink-0 ${
              activeSection === 'aircraft'
                ? 'bg-white dark:bg-[#3A3A3C] text-[#1D1D1F] dark:text-[#F5F5F7] shadow-sm'
                : 'text-[#6E6E73] dark:text-[#98989D] hover:text-[#1D1D1F]'
            }`}
          >
            Aircraft
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('flights', 'flights')}
            className={`px-2.5 sm:px-3 py-1 rounded-full transition-all cursor-pointer shrink-0 ${
              activeSection === 'flights'
                ? 'bg-white dark:bg-[#3A3A3C] text-[#1D1D1F] dark:text-[#F5F5F7] shadow-sm'
                : 'text-[#6E6E73] dark:text-[#98989D] hover:text-[#1D1D1F]'
            }`}
          >
            Flights
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('recovery', 'recovery')}
            className={`px-2.5 sm:px-3 py-1 rounded-full transition-all cursor-pointer shrink-0 ${
              activeSection === 'recovery'
                ? 'bg-white dark:bg-[#3A3A3C] text-[#1D1D1F] dark:text-[#F5F5F7] shadow-sm'
                : 'text-[#6E6E73] dark:text-[#98989D] hover:text-[#1D1D1F]'
            }`}
          >
            Recovery
          </button>
        </nav>

        {/* Right: Actions */}
        <div className="flex items-center gap-2.5">
          {/* Dark / Light Toggle */}
          <button
            type="button"
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2 text-[#6E6E73] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7] rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
            aria-label="Toggle theme"
          >
            {isDarkMode ? <Sun size={16} strokeWidth={1.5} /> : <Moon size={16} strokeWidth={1.5} />}
          </button>

          {/* Run Demo Pill Button */}
          <button
            type="button"
            onClick={() => {
              triggerDemo();
              scrollToSection('network', 'network');
            }}
            className="apple-button-primary px-3.5 py-1.5 rounded-full text-[13px] font-medium flex items-center gap-1.5 cursor-pointer"
          >
            <Play size={12} strokeWidth={2.5} className="fill-current" />
            <span>Run demo</span>
          </button>
        </div>
      </header>

      {/* Main Single Scrolling Canvas */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-16 sm:space-y-24">
        {/* 2. Hero Section */}
        <section id="hero" className="text-center pt-6 sm:pt-10">
          <h1 className="text-[40px] sm:text-[56px] font-semibold tracking-[-0.03em] leading-[1.08] text-[#1D1D1F] dark:text-[#F5F5F7] max-w-3xl mx-auto mb-4">
            See how one storm moves the whole network.
          </h1>
          <p className="text-[17px] sm:text-[19px] text-[#6E6E73] dark:text-[#98989D] max-w-xl mx-auto font-normal leading-relaxed mb-10">
            When Mumbai halts for 90 minutes, aircraft rotations cascade and Bengaluru stumbles.
          </p>

          {/* Controls Card */}
          <ControlPanel />
        </section>

        {/* 3. Map Section */}
        <section id="network" className="scroll-mt-20">
          <AirspaceMap />
        </section>

        {/* 4. Impact Section */}
        <section id="impact" className="scroll-mt-20">
          <KPIStrip />
        </section>

        {/* 5. Aircraft Rotation Gantt Section */}
        <section id="aircraft" className="scroll-mt-20">
          <Gantt />
        </section>

        {/* 6. Flights Table Section */}
        <section id="flights" className="scroll-mt-20">
          <FlightTable />
        </section>

        {/* 8. Recovery Plan Section */}
        <section id="recovery" className="scroll-mt-20">
          <AIPanel />
        </section>

        {/* 9. Before vs After Comparison */}
        <section id="compare" className="scroll-mt-20">
          <BeforeAfter />
        </section>

        {/* 10. Assumptions & System Configuration Footer */}
        <section id="assumptions">
          <AssumptionsPanel />
        </section>
      </main>

      {/* 7. Slide-in Why Drawer Sheet (opens when a flight is selected) */}
      <WhyDrawer />
    </div>
  );
};

export default App;
