/**
 * Core type definitions for Domino Sky simulator.
 * All times are normalized to integer minutes since midnight (00:00 = 0, 06:00 = 360, 24:00 = 1440).
 */

export type AirportTier = 'mega_hub' | 'regional_hub' | 'spoke';

export interface Airport {
  id: string; // IATA 3-letter code
  name: string;
  city: string;
  lat: number;
  lng: number;
  tier: AirportTier;
  capacity_per_hour: number;
}

export interface RawFlight {
  flight_id: string;
  tail_id: string;
  leg_order: number;
  origin: string;
  destination: string;
  dep: string; // "HH:MM"
  arr: string; // "HH:MM"
  block_minutes: number;
  pax: number;
  turnaround_before_min: number | null;
}

export interface NormalizedFlight {
  flight_id: string;
  tail_id: string;
  leg_order: number;
  origin: string;
  destination: string;
  schedDep: number; // minutes from 00:00
  schedArr: number; // minutes from 00:00
  blockMinutes: number;
  pax: number;
  turnaroundBeforeMin: number | null;
}

export interface RawConnection {
  connection_id: string;
  airport: string;
  from_flight: string;
  to_flight: string;
  passengers: number;
  min_connect_minutes: number;
}

export interface NormalizedConnection {
  connection_id: string;
  airport: string;
  from_flight: string;
  to_flight: string;
  passengers: number;
  minConnectMinutes: number;
}

export interface RawCrew {
  crew_id: string;
  tail_id: string;
  base: string;
  duty_start: string; // "HH:MM"
  max_duty_mins: number;
  flight_ids: string[];
}

export interface NormalizedCrew {
  crew_id: string;
  tail_id: string;
  base: string;
  dutyStart: number; // minutes from 00:00
  maxDutyMins: number;
  flight_ids: string[];
}

export interface RawSpareAircraft {
  tail_id: string;
  base: string;
  available_from: string; // "HH:MM"
  seats: number;
}

export interface NormalizedSpareAircraft {
  tail_id: string;
  base: string;
  availableFrom: number; // minutes from 00:00
  seats: number;
}

export interface RawDataset {
  meta: {
    dataset: string;
    operating_day: string;
    min_turnaround_minutes: number;
    seats_per_aircraft: number;
    notes?: string[];
  };
  airports: Airport[];
  flights: RawFlight[];
  connections: RawConnection[];
  crews: RawCrew[];
  spare_aircraft: RawSpareAircraft[];
}

export interface NormalizedDataset {
  meta: {
    dataset: string;
    operating_day: string;
    minTurnaroundMinutes: number;
    seatsPerAircraft: number;
  };
  airports: Airport[];
  flights: NormalizedFlight[];
  connections: NormalizedConnection[];
  crews: NormalizedCrew[];
  spareAircraft: NormalizedSpareAircraft[];

  // Pre-indexed lookups
  airportsById: Map<string, Airport>;
  flightsById: Map<string, NormalizedFlight>;
  flightsByAircraft: Map<string, NormalizedFlight[]>;
  flightsByCrew: Map<string, NormalizedFlight[]>;
  connectionsByInbound: Map<string, NormalizedConnection[]>;
  connectionsByOutbound: Map<string, NormalizedConnection[]>;
  crewsById: Map<string, NormalizedCrew>;
  spareAircraftById: Map<string, NormalizedSpareAircraft>;
}

// Scenarios & Actions
export interface AirportClosure {
  airport: string;
  start: number; // minutes from 00:00
  end: number;   // minutes from 00:00
}

export type ActionType =
  | 'CANCEL_FLIGHT'
  | 'SWAP_SPARE'
  | 'SWAP_AIRCRAFT_CHAINS'
  | 'HOLD_CONNECTION'
  | 'REPLACE_CREW';

export interface CancelFlightAction {
  type: 'CANCEL_FLIGHT';
  flightId: string;
  reason?: string;
}

export interface SwapSpareAction {
  type: 'SWAP_SPARE';
  flightId: string;
  spareTailId: string;
}

export interface SwapAircraftChainsAction {
  type: 'SWAP_AIRCRAFT_CHAINS';
  tail1: string;
  tail2: string;
  fromFlightId: string;
}

export interface HoldConnectionAction {
  type: 'HOLD_CONNECTION';
  outboundFlightId: string;
  holdMinutes: number;
}

export interface ReplaceCrewAction {
  type: 'REPLACE_CREW';
  crewId: string;
  fromFlightId: string;
}

export type RecoveryAction =
  | CancelFlightAction
  | SwapSpareAction
  | SwapAircraftChainsAction
  | HoldConnectionAction
  | ReplaceCrewAction;

export interface Scenario {
  closures: AirportClosure[];
  actions: RecoveryAction[];
}

// Simulation Output Types
export type FlightStatus = 'ON_TIME' | 'DELAYED' | 'CANCELLED';

export type CauseType =
  | 'SCHEDULED'
  | 'CLOSURE'
  | 'ROTATION'
  | 'CREW'
  | 'CURFEW'
  | 'ACTION';

export interface FlightCause {
  type: CauseType;
  parentFlightId?: string;
  minutes: number;
  description: string;
}

export interface SimulatedFlight {
  flight_id: string;
  tail_id: string;
  crew_id: string;
  leg_order: number;
  origin: string;
  destination: string;
  schedDep: number;
  schedArr: number;
  actualDep: number;
  actualArr: number;
  blockMinutes: number;
  depDelay: number;
  arrDelay: number;
  status: FlightStatus;
  cause: FlightCause;
  pax: number;
  strandedPax: number;
}

export type BrokenConnectionReason =
  | 'INBOUND_LATE'
  | 'INBOUND_CANCELLED'
  | 'OUTBOUND_CANCELLED';

export interface BrokenConnection {
  connection_id: string;
  airport: string;
  from_flight: string;
  to_flight: string;
  passengers: number;
  inboundArr: number;
  outboundDep: number;
  gap: number;
  minRequired: number;
  reason: BrokenConnectionReason;
}

export interface CrewViolation {
  crew_id: string;
  dutyStart: number;
  dutyEnd: number;
  maxDuty: number;
  exceededBy: number;
  lastFlightId: string;
}

export interface SimulationMetrics {
  onTimePct: number;              // 0 - 100
  totalDelayMinutes: number;
  delayedFlightsCount: number;
  cancelledFlightsCount: number;
  crewsAtRiskCount: number;
  strandedPaxTotal: number;
  strandedCancelledPax: number;
  strandedConnectionPax: number;
  cost: number;
}

export interface SimulationResult {
  flights: SimulatedFlight[];
  flightsById: Record<string, SimulatedFlight>;
  brokenConnections: BrokenConnection[];
  crewViolations: CrewViolation[];
  metrics: SimulationMetrics;
  scenario: Scenario;
}

// Planner Types
export interface PlannerCandidate {
  id: string; // e.g. "C1", "C2", "C3"
  title: string;
  actions: RecoveryAction[];
  metrics: SimulationMetrics;
  score: number;
  netStrandedSaved: number;
  netDelaySaved: number;
  netCancellationsDelta: number;
  summary: string;
}

// AI Advisor Types
export interface AdvisorRecommendation {
  recommendedCandidateId: string;
  rationale: string;
  tradeoffs: string[];
  alternativesConsidered: string[];
  path: 'llm' | 'retry' | 'fallback';
  rawResponse?: string;
}
