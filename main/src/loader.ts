import { z } from 'zod';
import type {
  Airport,
  AirportTier,
  NormalizedConnection,
  NormalizedCrew,
  NormalizedDataset,
  NormalizedFlight,
  NormalizedSpareAircraft,
  RawConnection,
  RawCrew,
  RawDataset,
  RawFlight,
  RawSpareAircraft,
} from './types.js';

/**
 * Parses "HH:MM" 24-hour time string into minutes since midnight (00:00 = 0).
 */
export function parseTimeStringToMinutes(timeStr: string): number {
  if (!timeStr || typeof timeStr !== 'string') {
    throw new Error(`Invalid time string: ${timeStr}`);
  }
  const parts = timeStr.trim().split(':');
  if (parts.length !== 2) {
    throw new Error(`Time string must be HH:MM format, got: ${timeStr}`);
  }
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  if (isNaN(hours) || isNaN(minutes) || hours < 0 || minutes < 0 || minutes >= 60) {
    throw new Error(`Invalid time components in: ${timeStr}`);
  }
  return hours * 60 + minutes;
}

/**
 * Formats minutes from midnight into "HH:MM" (handles > 1440 as next-day +1 HH:MM).
 */
export function formatMinutesToTimeString(minutes: number, showDayOffset = false): string {
  if (isNaN(minutes)) return '--:--';
  const totalMins = Math.round(minutes);
  const days = Math.floor(totalMins / 1440);
  const remMins = totalMins % 1440;
  const normalizedMins = remMins < 0 ? remMins + 1440 : remMins;
  const h = Math.floor(normalizedMins / 60);
  const m = normalizedMins % 60;
  const hStr = h.toString().padStart(2, '0');
  const mStr = m.toString().padStart(2, '0');
  if (showDayOffset && days > 0) {
    return `${hStr}:${mStr} (+${days}d)`;
  }
  return `${hStr}:${mStr}`;
}

// Zod Validation Schemas
export const AirportTierSchema = z.enum(['mega_hub', 'regional_hub', 'spoke']);

export const AirportSchema = z.object({
  id: z.string().min(2).max(4),
  name: z.string().min(1),
  city: z.string().min(1),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  tier: AirportTierSchema,
  capacity_per_hour: z.number().positive(),
});

export const RawFlightSchema = z.object({
  flight_id: z.string().min(1),
  tail_id: z.string().min(1),
  leg_order: z.number().int().positive(),
  origin: z.string().min(2).max(4),
  destination: z.string().min(2).max(4),
  dep: z.string().regex(/^\d{1,2}:\d{2}$/),
  arr: z.string().regex(/^\d{1,2}:\d{2}$/),
  block_minutes: z.number().int().positive(),
  pax: z.number().int().nonnegative(),
  turnaround_before_min: z.number().int().nullable(),
});

export const RawConnectionSchema = z.object({
  connection_id: z.string().min(1),
  airport: z.string().min(2).max(4),
  from_flight: z.string().min(1),
  to_flight: z.string().min(1),
  passengers: z.number().int().nonnegative(),
  min_connect_minutes: z.number().int().positive(),
});

export const RawCrewSchema = z.object({
  crew_id: z.string().min(1),
  tail_id: z.string().min(1),
  base: z.string().min(2).max(4),
  duty_start: z.string().regex(/^\d{1,2}:\d{2}$/),
  max_duty_mins: z.number().int().positive(),
  flight_ids: z.array(z.string().min(1)).min(1),
});

export const RawSpareAircraftSchema = z.object({
  tail_id: z.string().min(1),
  base: z.string().min(2).max(4),
  available_from: z.string().regex(/^\d{1,2}:\d{2}$/),
  seats: z.number().int().positive(),
});

export const RawDatasetSchema = z.object({
  meta: z.object({
    dataset: z.string(),
    operating_day: z.string(),
    min_turnaround_minutes: z.number().int().positive(),
    seats_per_aircraft: z.number().int().positive(),
    notes: z.array(z.string()).optional(),
  }),
  airports: z.array(AirportSchema).min(1),
  flights: z.array(RawFlightSchema).min(1),
  connections: z.array(RawConnectionSchema),
  crews: z.array(RawCrewSchema),
  spare_aircraft: z.array(RawSpareAircraftSchema),
});

/**
 * Validates raw data with Zod and transforms into fully normalized, indexed NormalizedDataset.
 * Pure function: runs identically in Browser (Vite/Worker) and Node.js.
 */
export function normalizeDataset(raw: unknown): NormalizedDataset {
  const parsed = RawDatasetSchema.parse(raw);

  // Normalize Flights
  const flights: NormalizedFlight[] = parsed.flights.map((f: RawFlight) => ({
    flight_id: f.flight_id,
    tail_id: f.tail_id,
    leg_order: f.leg_order,
    origin: f.origin,
    destination: f.destination,
    schedDep: parseTimeStringToMinutes(f.dep),
    schedArr: parseTimeStringToMinutes(f.arr),
    blockMinutes: f.block_minutes,
    pax: f.pax,
    turnaroundBeforeMin: f.turnaround_before_min,
  }));

  // Normalize Connections
  const connections: NormalizedConnection[] = parsed.connections.map((c: RawConnection) => ({
    connection_id: c.connection_id,
    airport: c.airport,
    from_flight: c.from_flight,
    to_flight: c.to_flight,
    passengers: c.passengers,
    minConnectMinutes: c.min_connect_minutes,
  }));

  // Normalize Crews
  const crews: NormalizedCrew[] = parsed.crews.map((cr: RawCrew) => ({
    crew_id: cr.crew_id,
    tail_id: cr.tail_id,
    base: cr.base,
    dutyStart: parseTimeStringToMinutes(cr.duty_start),
    maxDutyMins: cr.max_duty_mins,
    flight_ids: [...cr.flight_ids],
  }));

  // Normalize Spare Aircraft
  const spareAircraft: NormalizedSpareAircraft[] = parsed.spare_aircraft.map((s: RawSpareAircraft) => ({
    tail_id: s.tail_id,
    base: s.base,
    availableFrom: parseTimeStringToMinutes(s.available_from),
    seats: s.seats,
  }));

  // Build Lookups & Indexes
  const airportsById = new Map<string, Airport>();
  for (const a of parsed.airports) {
    airportsById.set(a.id, a);
  }

  const flightsById = new Map<string, NormalizedFlight>();
  const flightsByAircraft = new Map<string, NormalizedFlight[]>();
  for (const f of flights) {
    flightsById.set(f.flight_id, f);
    const list = flightsByAircraft.get(f.tail_id) || [];
    list.push(f);
    flightsByAircraft.set(f.tail_id, list);
  }
  // Sort aircraft chains by leg_order
  for (const list of flightsByAircraft.values()) {
    list.sort((a, b) => a.leg_order - b.leg_order);
  }

  const crewsById = new Map<string, NormalizedCrew>();
  const flightsByCrew = new Map<string, NormalizedFlight[]>();
  for (const cr of crews) {
    crewsById.set(cr.crew_id, cr);
    const cFlights: NormalizedFlight[] = [];
    for (const fid of cr.flight_ids) {
      const fl = flightsById.get(fid);
      if (fl) cFlights.push(fl);
    }
    cFlights.sort((a, b) => a.schedDep - b.schedDep);
    flightsByCrew.set(cr.crew_id, cFlights);
  }

  const connectionsByInbound = new Map<string, NormalizedConnection[]>();
  const connectionsByOutbound = new Map<string, NormalizedConnection[]>();
  for (const cx of connections) {
    const inList = connectionsByInbound.get(cx.from_flight) || [];
    inList.push(cx);
    connectionsByInbound.set(cx.from_flight, inList);

    const outList = connectionsByOutbound.get(cx.to_flight) || [];
    outList.push(cx);
    connectionsByOutbound.set(cx.to_flight, outList);
  }

  const spareAircraftById = new Map<string, NormalizedSpareAircraft>();
  for (const sp of spareAircraft) {
    spareAircraftById.set(sp.tail_id, sp);
  }

  return {
    meta: {
      dataset: parsed.meta.dataset,
      operating_day: parsed.meta.operating_day,
      minTurnaroundMinutes: parsed.meta.min_turnaround_minutes,
      seatsPerAircraft: parsed.meta.seats_per_aircraft,
    },
    airports: parsed.airports,
    flights,
    connections,
    crews,
    spareAircraft,
    airportsById,
    flightsById,
    flightsByAircraft,
    flightsByCrew,
    connectionsByInbound,
    connectionsByOutbound,
    crewsById,
    spareAircraftById,
  };
}
