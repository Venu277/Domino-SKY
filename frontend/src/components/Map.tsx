import React, { useMemo, useState, useEffect } from 'react';
import { useSimulatorStore } from '../store/useSimulatorStore.js';
import { INDIA_STATES, projectCoordinates, INDIA_MAP_CONFIG } from '../data/indiaMapPaths.js';
import { formatMinutesToTimeString, type Airport, type SimulatedFlight } from '@domino/main';
import { Play, Pause, RotateCcw } from 'lucide-react';

export const AirspaceMap: React.FC = () => {
  const {
    dataset,
    activeResult,
    scenario,
    currentTimeMinute,
    setCurrentTimeMinute,
    isPlaying,
    setIsPlaying,
    playbackSpeed,
    setPlaybackSpeed,
    selectedFlightId,
    setSelectedFlightId,
    setClosure,
    clearClosures,
  } = useSimulatorStore();

  const [hoveredAirport, setHoveredAirport] = useState<Airport | null>(null);
  const [hoveredFlight, setHoveredFlight] = useState<SimulatedFlight | null>(null);

  const currentClosure = scenario.closures[0];

  // Playback timer loop
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      const { currentTimeMinute: time, isPlaying: playing } = useSimulatorStore.getState();
      if (!playing) return;
      if (time >= 1430) {
        setIsPlaying(false);
      } else {
        setCurrentTimeMinute(time + 2 * playbackSpeed);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed, setCurrentTimeMinute, setIsPlaying]);

  // Airport positions lookup
  const airportCoords = useMemo(() => {
    const coords = new Map<string, { x: number; y: number; airport: Airport }>();
    for (const a of dataset.airports) {
      const [x, y] = projectCoordinates(a.lng, a.lat);
      coords.set(a.id, { x, y, airport: a });
    }
    return coords;
  }, [dataset.airports]);

  // Airborne flights at current scrubber minute
  const airborneFlights = useMemo(() => {
    return activeResult.flights.filter(
      (f) =>
        f.status !== 'CANCELLED' &&
        f.actualDep <= currentTimeMinute &&
        f.actualArr > currentTimeMinute
    );
  }, [activeResult.flights, currentTimeMinute]);

  // Metrics summary
  const delayedFlightsCount = useMemo(() => {
    return activeResult.flights.filter((f) => f.status === 'DELAYED').length;
  }, [activeResult.flights]);

  const cancelledFlightsCount = useMemo(() => {
    return activeResult.flights.filter((f) => f.status === 'CANCELLED').length;
  }, [activeResult.flights]);

  return (
    <div className="bg-white dark:bg-[#1C1C1E] border border-[#D2D2D7]/60 dark:border-[#38383A] rounded-[20px] shadow-[0_4px_24px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.4)] p-6 sm:p-8 flex flex-col relative overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#D2D2D7]/40 dark:border-[#38383A]/60">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-[21px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] tracking-tight">
              Airspace Network
            </h2>
            <span className="text-[12px] font-medium text-[#6E6E73] dark:text-[#98989D] bg-[#F5F5F7] dark:bg-[#2C2C2E] px-2.5 py-0.5 rounded-full border border-[#D2D2D7]/50 dark:border-[#38383A]">
              16 Airports • {activeResult.flights.length} Scheduled Flights
            </span>
          </div>
          <p className="text-[13px] text-[#6E6E73] dark:text-[#98989D] mt-1">
            Real Indian political airspace with live flight paths. Arcs reflect schedule and delay propagation.
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
            <span>Delayed ({delayedFlightsCount})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF3B30]"></span>
            <span>Cancelled ({cancelledFlightsCount})</span>
          </div>
          {currentClosure && (
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full border border-[#FF3B30] bg-[#FF3B30]/20"></span>
              <span className="text-[#FF3B30] font-semibold">{currentClosure.airport} Closed</span>
            </div>
          )}
        </div>
      </div>

      {/* Map SVG Stage */}
      <div className="relative w-full flex items-center justify-center py-4 bg-[#FBFBFD] dark:bg-[#151516] rounded-[16px] border border-[#D2D2D7]/30 dark:border-[#2C2C2E] my-4 overflow-hidden">
        <svg
          viewBox={INDIA_MAP_CONFIG.viewBox}
          className="w-full max-w-[760px] h-auto select-none"
        >
          {/* Real Indian Political State Boundaries */}
          <g id="india-states">
            {INDIA_STATES.map((state, idx) => (
              <path
                key={idx}
                d={state.path}
                className="fill-[#F5F5F7] dark:fill-[#202022] stroke-[#D2D2D7]/80 dark:stroke-[#38383A] stroke-[0.8] hover:fill-[#EDEDF0] dark:hover:fill-[#2A2A2D] transition-colors duration-150"
              >
                <title>{state.name}</title>
              </path>
            ))}
          </g>

          {/* Flight Routes & Arcs */}
          <g id="flight-arcs">
            {activeResult.flights.map((flight) => {
              const orig = airportCoords.get(flight.origin);
              const dest = airportCoords.get(flight.destination);
              if (!orig || !dest) return null;

              const dx = dest.x - orig.x;
              const dy = dest.y - orig.y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              const curvature = Math.min(dist * 0.18, 50);
              const midX = (orig.x + dest.x) / 2 - (dy / dist) * curvature;
              const midY = (orig.y + dest.y) / 2 + (dx / dist) * curvature;

              const pathData = `M ${orig.x} ${orig.y} Q ${midX} ${midY} ${dest.x} ${dest.y}`;

              const isSelected = selectedFlightId === flight.flight_id;
              const isHovered = hoveredFlight?.flight_id === flight.flight_id;
              const isCancelled = flight.status === 'CANCELLED';
              const isDelayed = flight.status === 'DELAYED';

              let strokeColor = '#34C759';
              if (isDelayed) strokeColor = '#FF9F0A';
              if (isCancelled) strokeColor = '#FF3B30';

              const strokeWidth = isSelected || isHovered ? 2.5 : isDelayed ? 1.8 : 1.2;
              const strokeOpacity = isSelected || isHovered ? 1 : isCancelled ? 0.4 : 0.65;

              return (
                <g key={flight.flight_id}>
                  {/* Invisible hit area for easier mouseover */}
                  <path
                    d={pathData}
                    fill="none"
                    stroke="transparent"
                    strokeWidth={14}
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredFlight(flight)}
                    onMouseLeave={() => setHoveredFlight(null)}
                    onClick={() => setSelectedFlightId(isSelected ? null : flight.flight_id)}
                  />

                  {/* Visible Flight Arc */}
                  <path
                    d={pathData}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeOpacity={strokeOpacity}
                    strokeDasharray={isCancelled ? '4 4' : undefined}
                    className="transition-all duration-200 pointer-events-none"
                  />
                </g>
              );
            })}
          </g>

          {/* Airborne In-Transit Planes at currentTimeMinute */}
          <g id="airborne-aircraft">
            {airborneFlights.map((flight) => {
              const orig = airportCoords.get(flight.origin);
              const dest = airportCoords.get(flight.destination);
              if (!orig || !dest) return null;

              const totalDuration = flight.actualArr - flight.actualDep;
              const progress = Math.max(
                0,
                Math.min(1, (currentTimeMinute - flight.actualDep) / totalDuration)
              );

              const dx = dest.x - orig.x;
              const dy = dest.y - orig.y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              const curvature = Math.min(dist * 0.18, 50);
              const midX = (orig.x + dest.x) / 2 - (dy / dist) * curvature;
              const midY = (orig.y + dest.y) / 2 + (dx / dist) * curvature;

              const t = progress;
              const curX =
                Math.pow(1 - t, 2) * orig.x + 2 * (1 - t) * t * midX + Math.pow(t, 2) * dest.x;
              const curY =
                Math.pow(1 - t, 2) * orig.y + 2 * (1 - t) * t * midY + Math.pow(t, 2) * dest.y;

              const isDelayed = flight.status === 'DELAYED';
              const planeColor = isDelayed ? '#FF9F0A' : '#0071E3';

              return (
                <g key={`plane-${flight.flight_id}`} className="pointer-events-none">
                  <circle
                    cx={curX}
                    cy={curY}
                    r={5}
                    fill={planeColor}
                    fillOpacity={0.25}
                  />
                  <circle
                    cx={curX}
                    cy={curY}
                    r={3}
                    fill={planeColor}
                    stroke="#FFFFFF"
                    strokeWidth={1}
                  />
                </g>
              );
            })}
          </g>

          {/* Airport Nodes */}
          <g id="airports">
            {dataset.airports.map((airport) => {
              const pos = airportCoords.get(airport.id);
              if (!pos) return null;

              const isClosed = currentClosure?.airport === airport.id;
              const isHovered = hoveredAirport?.id === airport.id;

              return (
                <g
                  key={airport.id}
                  className="cursor-pointer group"
                  onMouseEnter={() => setHoveredAirport(airport)}
                  onMouseLeave={() => setHoveredAirport(null)}
                  onClick={() => {
                    if (isClosed) {
                      clearClosures();
                    } else {
                      setClosure(airport.id, 480, 570);
                    }
                  }}
                >
                  {/* Soft Expanding Ring for Closed Airport */}
                  {isClosed && (
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      fill="none"
                      stroke="#FF3B30"
                      className="animate-soft-ring"
                    />
                  )}

                  {/* Airport Node Circle */}
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={isClosed ? 6 : isHovered ? 5.5 : 4}
                    fill={isClosed ? '#FF3B30' : isHovered ? '#0071E3' : '#FFFFFF'}
                    stroke={isClosed ? '#FFFFFF' : '#1D1D1F'}
                    strokeWidth={1.5}
                    className="transition-all duration-200"
                  />

                  {/* Airport Code Label */}
                  <text
                    x={pos.x + 8}
                    y={pos.y + 4}
                    className={`text-[11px] font-semibold select-none transition-all duration-150 ${
                      isClosed
                        ? 'fill-[#FF3B30] font-bold'
                        : isHovered
                        ? 'fill-[#0071E3] font-bold'
                        : 'fill-[#1D1D1F] dark:fill-[#F5F5F7]'
                    }`}
                  >
                    {airport.id}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>

        {/* Hover Airport Info Card */}
        {hoveredAirport && (
          <div className="absolute top-4 left-4 apple-glass rounded-[12px] p-3 shadow-lg pointer-events-none text-left z-20">
            <div className="text-[14px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
              {hoveredAirport.city} ({hoveredAirport.id})
            </div>
            <div className="text-[12px] text-[#6E6E73] dark:text-[#98989D]">
              {hoveredAirport.name}
            </div>
            <div className="text-[11px] text-[#6E6E73] dark:text-[#98989D] mt-1">
              Tier: {hoveredAirport.tier} • Capacity: {hoveredAirport.capacity_per_hour}/hr
            </div>
          </div>
        )}

        {/* Hover Flight Info Card */}
        {hoveredFlight && (
          <div className="absolute bottom-16 right-4 apple-glass rounded-[12px] p-3 shadow-lg pointer-events-none text-left z-20">
            <div className="flex items-center gap-2">
              <span className="text-[14px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                Flight {hoveredFlight.flight_id}
              </span>
              <span
                className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                  hoveredFlight.status === 'DELAYED'
                    ? 'bg-[#FF9F0A]/15 text-[#B25E00] dark:text-[#FF9F0A]'
                    : hoveredFlight.status === 'CANCELLED'
                    ? 'bg-[#FF3B30]/15 text-[#D70015] dark:text-[#FF453A]'
                    : 'bg-[#34C759]/15 text-[#248A3D] dark:text-[#30D158]'
                }`}
              >
                {hoveredFlight.status}
              </span>
            </div>
            <div className="text-[12px] text-[#1D1D1F] dark:text-[#F5F5F7] mt-1">
              {hoveredFlight.origin} → {hoveredFlight.destination} ({hoveredFlight.tail_id})
            </div>
            <div className="text-[11px] text-[#6E6E73] dark:text-[#98989D] mt-0.5">
              Sched: {formatMinutesToTimeString(hoveredFlight.schedDep)} • Dep: {formatMinutesToTimeString(hoveredFlight.actualDep)} (Delay: +{hoveredFlight.depDelay}m)
            </div>
          </div>
        )}

        {/* Floating Apple Glass Time Scrubber Pill */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[92%] max-w-[620px] apple-glass rounded-full px-4 sm:px-5 py-2.5 shadow-[0_8px_32px_rgba(0,0,0,0.08)] flex items-center justify-between gap-3 sm:gap-4 z-30">
          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-8 h-8 rounded-full bg-[#0071E3] hover:bg-[#0077ED] text-white flex items-center justify-center cursor-pointer transition-transform active:scale-95 shrink-0"
            aria-label={isPlaying ? 'Pause simulation' : 'Play simulation'}
          >
            {isPlaying ? (
              <Pause size={14} strokeWidth={2} />
            ) : (
              <Play size={14} strokeWidth={2} className="translate-x-0.5" />
            )}
          </button>

          <div className="flex-1 flex items-center gap-3">
            <input
              type="range"
              min={360}
              max={1440}
              step={5}
              value={currentTimeMinute}
              onChange={(e) => setCurrentTimeMinute(Number(e.target.value))}
              className="w-full h-1.5 bg-[#D2D2D7] dark:bg-[#38383A] rounded-lg appearance-none cursor-pointer accent-[#0071E3]"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="tnum text-[13px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] tracking-tight min-w-[70px] text-right">
              {formatMinutesToTimeString(currentTimeMinute)} IST
            </span>

            <button
              type="button"
              onClick={() => setCurrentTimeMinute(480)}
              className="p-1 text-[#6E6E73] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7] rounded-full hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors"
              title="Reset to 08:00"
            >
              <RotateCcw size={14} strokeWidth={1.5} />
            </button>

            <button
              type="button"
              onClick={() => {
                const speeds = [1, 2, 5];
                const next = speeds[(speeds.indexOf(playbackSpeed) + 1) % speeds.length];
                setPlaybackSpeed(next);
              }}
              className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-[#1D1D1F] dark:text-[#F5F5F7] hover:bg-black/10 cursor-pointer"
            >
              {playbackSpeed}x
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export { AirspaceMap as Map };
