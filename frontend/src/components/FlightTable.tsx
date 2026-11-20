import React, { useState, useMemo } from 'react';
import { useSimulatorStore } from '../store/useSimulatorStore.js';
import { formatMinutesToTimeString, type SimulatedFlight } from '@domino/main';
import { Search, ChevronDown, ChevronUp, ChevronRight } from 'lucide-react';
import { Segmented } from './ui/Segmented.js';
import { Pill } from './ui/Pill.js';

type SortKey = 'id' | 'origin' | 'aircraft' | 'schedDep' | 'actualDep' | 'delay';
type FilterStatus = 'ALL' | 'DELAYED' | 'CANCELLED';

export const FlightTable: React.FC = () => {
  const { activeResult, selectedFlightId, setSelectedFlightId } = useSimulatorStore();

  const [filter, setFilter] = useState<FilterStatus>('ALL');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('schedDep');
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  // Filtered and sorted flights
  const flights = useMemo(() => {
    return activeResult.flights
      .filter((f) => {
        if (filter === 'DELAYED' && f.status !== 'DELAYED') return false;
        if (filter === 'CANCELLED' && f.status !== 'CANCELLED') return false;

        if (search.trim()) {
          const q = search.toLowerCase().trim();
          const matchId = f.flight_id.toLowerCase().includes(q);
          const matchTail = f.tail_id.toLowerCase().includes(q);
          const matchOrigin = f.origin.toLowerCase().includes(q);
          const matchDest = f.destination.toLowerCase().includes(q);
          const matchCause = f.cause.description.toLowerCase().includes(q);
          if (!matchId && !matchTail && !matchOrigin && !matchDest && !matchCause) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => {
        let cmp = 0;
        switch (sortKey) {
          case 'id':
            cmp = a.flight_id.localeCompare(b.flight_id);
            break;
          case 'origin':
            cmp = a.origin.localeCompare(b.origin);
            break;
          case 'aircraft':
            cmp = a.tail_id.localeCompare(b.tail_id);
            break;
          case 'schedDep':
            cmp = a.schedDep - b.schedDep;
            break;
          case 'actualDep':
            cmp = a.actualDep - b.actualDep;
            break;
          case 'delay':
            cmp = a.depDelay - b.depDelay;
            break;
        }
        return sortAsc ? cmp : -cmp;
      });
  }, [activeResult.flights, filter, search, sortKey, sortAsc]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  // Counts for filter pills
  const counts = useMemo(() => {
    return {
      all: activeResult.flights.length,
      delayed: activeResult.flights.filter((f) => f.status === 'DELAYED').length,
      cancelled: activeResult.flights.filter((f) => f.status === 'CANCELLED').length,
    };
  }, [activeResult.flights]);

  return (
    <div className="bg-white dark:bg-[#1C1C1E] border border-[#D2D2D7]/60 dark:border-[#38383A] rounded-[20px] shadow-[0_4px_24px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.4)] p-6 sm:p-8 flex flex-col relative overflow-hidden">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#D2D2D7]/40 dark:border-[#38383A]/60">
        <div>
          <h2 className="text-[21px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] tracking-tight">
            Flight Operations
          </h2>
          <p className="text-[13px] text-[#6E6E73] dark:text-[#98989D] mt-0.5">
            Click any row to view its exact cause chain in the Why Drawer.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Segmented Filter */}
          <Segmented<FilterStatus>
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'ALL', label: 'All', count: counts.all },
              { value: 'DELAYED', label: 'Late', count: counts.delayed },
              { value: 'CANCELLED', label: 'Cancelled', count: counts.cancelled },
            ]}
          />

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#6E6E73] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search flights..."
              className="bg-[#F5F5F7] dark:bg-[#2C2C2E] border border-[#D2D2D7]/60 dark:border-[#38383A] rounded-full pl-8 pr-3 py-1.5 text-[13px] text-[#1D1D1F] dark:text-[#F5F5F7] placeholder-[#6E6E73] focus:outline-none focus:ring-2 focus:ring-[#0071E3]/30 w-44 sm:w-52"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto mt-2">
        <table className="w-full text-left border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-[#D2D2D7]/60 dark:border-[#38383A] text-[#6E6E73] dark:text-[#98989D] text-[12px] font-semibold uppercase tracking-wider select-none">
              <th
                onClick={() => handleSort('id')}
                className="py-3 px-3 cursor-pointer hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7]"
              >
                <div className="flex items-center gap-1">
                  <span>Flight</span>
                  {sortKey === 'id' && (sortAsc ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                </div>
              </th>
              <th
                onClick={() => handleSort('origin')}
                className="py-3 px-3 cursor-pointer hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7]"
              >
                <div className="flex items-center gap-1">
                  <span>Route</span>
                  {sortKey === 'origin' && (sortAsc ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                </div>
              </th>
              <th
                onClick={() => handleSort('aircraft')}
                className="py-3 px-3 cursor-pointer hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7]"
              >
                <div className="flex items-center gap-1">
                  <span>Aircraft</span>
                  {sortKey === 'aircraft' && (sortAsc ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                </div>
              </th>
              <th
                onClick={() => handleSort('schedDep')}
                className="py-3 px-3 cursor-pointer hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7]"
              >
                <div className="flex items-center gap-1">
                  <span>Sched Dep</span>
                  {sortKey === 'schedDep' && (sortAsc ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                </div>
              </th>
              <th
                onClick={() => handleSort('actualDep')}
                className="py-3 px-3 cursor-pointer hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7]"
              >
                <div className="flex items-center gap-1">
                  <span>Actual Dep</span>
                  {sortKey === 'actualDep' && (sortAsc ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                </div>
              </th>
              <th
                onClick={() => handleSort('delay')}
                className="py-3 px-3 cursor-pointer hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7]"
              >
                <div className="flex items-center gap-1">
                  <span>Delay</span>
                  {sortKey === 'delay' && (sortAsc ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                </div>
              </th>
              <th className="py-3 px-3">Status</th>
              <th className="py-3 px-2 text-right">Details</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-[#D2D2D7]/40 dark:divide-[#38383A]/50">
            {flights.map((flight) => {
              const isSelected = selectedFlightId === flight.flight_id;

              let pillVariant: 'ontime' | 'delayed' | 'cancelled' = 'ontime';
              let statusLabel = 'On-time';

              if (flight.status === 'DELAYED') {
                pillVariant = 'delayed';
                statusLabel = `Delayed +${flight.depDelay}m`;
              } else if (flight.status === 'CANCELLED') {
                pillVariant = 'cancelled';
                statusLabel = 'Cancelled';
              }

              return (
                <tr
                  key={flight.flight_id}
                  onClick={() => setSelectedFlightId(isSelected ? null : flight.flight_id)}
                  className={`cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-[#0071E3]/8 dark:bg-[#0071E3]/15'
                      : 'hover:bg-[#F5F5F7] dark:hover:bg-[#252528]'
                  }`}
                >
                  <td className="py-3 px-3 font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                    {flight.flight_id}
                  </td>
                  <td className="py-3 px-3 text-[#1D1D1F] dark:text-[#F5F5F7]">
                    <span className="font-medium">{flight.origin}</span>
                    <span className="text-[#6E6E73] mx-1.5">→</span>
                    <span className="font-medium">{flight.destination}</span>
                  </td>
                  <td className="py-3 px-3 font-mono text-[12px] text-[#6E6E73] dark:text-[#98989D]">
                    {flight.tail_id}
                  </td>
                  <td className="py-3 px-3 tnum text-[#6E6E73] dark:text-[#98989D]">
                    {formatMinutesToTimeString(flight.schedDep)}
                  </td>
                  <td className="py-3 px-3 tnum font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">
                    {flight.status === 'CANCELLED' ? '—' : formatMinutesToTimeString(flight.actualDep)}
                  </td>
                  <td className="py-3 px-3 tnum">
                    {flight.depDelay > 0 ? (
                      <span className="font-medium text-[#B25E00] dark:text-[#FF9F0A]">
                        +{flight.depDelay}m
                      </span>
                    ) : (
                      <span className="text-[#6E6E73]">—</span>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    <Pill label={statusLabel} variant={pillVariant} size="sm" />
                  </td>
                  <td className="py-3 px-2 text-right text-[#6E6E73]">
                    <ChevronRight size={16} strokeWidth={1.5} className="inline opacity-60" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
