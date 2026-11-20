import type {
  BrokenConnection,
  NormalizedConnection,
  NormalizedDataset,
  SimulatedFlight,
} from './types.js';

export interface PaxAccountingResult {
  brokenConnections: BrokenConnection[];
  strandedCancelledPax: number;
  strandedConnectionPax: number;
  strandedPaxTotal: number;
  strandedByFlight: Map<string, number>;
  strandedByAirport: Map<string, number>;
}

/**
 * Deterministically computes passenger stranding with strict conservation:
 * 1. stranded_cancelled: booked passengers on cancelled flights.
 * 2. stranded_connection: transferring passengers whose inbound arrived too late for outbound,
 *    provided neither inbound nor outbound was cancelled (to prevent double counting).
 * 3. Total stranded = stranded_cancelled + stranded_connection.
 */
export function computePassengerImpact(
  dataset: NormalizedDataset,
  simulatedFlights: Map<string, SimulatedFlight>
): PaxAccountingResult {
  const brokenConnections: BrokenConnection[] = [];
  const strandedByFlight = new Map<string, number>();
  const strandedByAirport = new Map<string, number>();

  const addAirportStranded = (airport: string, count: number) => {
    strandedByAirport.set(airport, (strandedByAirport.get(airport) || 0) + count);
  };

  const addFlightStranded = (flightId: string, count: number) => {
    strandedByFlight.set(flightId, (strandedByFlight.get(flightId) || 0) + count);
  };

  let strandedCancelledPax = 0;

  // 1. Account for cancelled flights
  for (const sim of simulatedFlights.values()) {
    if (sim.status === 'CANCELLED') {
      const paxCount = sim.pax;
      strandedCancelledPax += paxCount;
      addFlightStranded(sim.flight_id, paxCount);
      addAirportStranded(sim.origin, paxCount);
    }
  }

  // 2. Account for broken connections (only between flights that both operated)
  let strandedConnectionPax = 0;

  for (const conn of dataset.connections) {
    const inbound = simulatedFlights.get(conn.from_flight);
    const outbound = simulatedFlights.get(conn.to_flight);

    if (!inbound || !outbound) continue;

    // If inbound or outbound is cancelled, passengers are already counted under stranded_cancelled
    if (inbound.status === 'CANCELLED' || outbound.status === 'CANCELLED') {
      continue;
    }

    const availableConnectTime = outbound.actualDep - inbound.actualArr;
    if (availableConnectTime < conn.minConnectMinutes) {
      // Connection is broken
      strandedConnectionPax += conn.passengers;
      brokenConnections.push({
        connection_id: conn.connection_id,
        airport: conn.airport,
        from_flight: conn.from_flight,
        to_flight: conn.to_flight,
        passengers: conn.passengers,
        inboundArr: inbound.actualArr,
        outboundDep: outbound.actualDep,
        gap: availableConnectTime,
        minRequired: conn.minConnectMinutes,
        reason: 'INBOUND_LATE',
      });

      addAirportStranded(conn.airport, conn.passengers);
      addFlightStranded(conn.from_flight, conn.passengers);
    }
  }

  const strandedPaxTotal = strandedCancelledPax + strandedConnectionPax;

  return {
    brokenConnections,
    strandedCancelledPax,
    strandedConnectionPax,
    strandedPaxTotal,
    strandedByFlight,
    strandedByAirport,
  };
}
