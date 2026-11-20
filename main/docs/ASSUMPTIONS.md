# Domino Sky — Operational Assumptions & Rules

All assumptions are explicitly centralized in `main/src/config.ts` and surfaced directly in the frontend Assumptions Panel.

---

## 1. Ground Buffers & Turnaround
- **Aircraft Minimum Turnaround**: Default 30 minutes (from `flight_network.json` meta). For wide-bodies or custom hubs, configurable.
- **Crew Turnaround**: Default 30 minutes between consecutive flights for the same crew.
- **Crew Sign-On Buffer**: 45 minutes prior to scheduled departure of the crew's first leg.

---

## 2. Airport Closures & Arrival Policy
When an airport is closed during window $[T_{start}, T_{end}]$:
- **Origin Closed**: A flight departing from a closed airport cannot depart until $T_{end}$.
- **Destination Closed (Hold at Origin Policy)**:
  - Standard airline procedure is ground hold: hold departure at the origin airport until $T_{end} - \text{block\_minutes}$ so the aircraft touches down after the destination reopens at $T_{end}$.
  - Departure time becomes $\max(\text{readyAircraft}, \text{readyCrew}, T_{end} - \text{block\_minutes})$.
  - If the required ground hold would cause the departure delay to exceed the Cancellation Threshold, the flight is cancelled instead.

---

## 3. Flight Cancellation Thresholds
A flight is marked `CANCELLED` if:
1. **Excessive Delay**: Cumulative departure delay $\ge$ `maxDelayBeforeCancelMinutes` (default: 240 minutes / 4 hours).
2. **Curfew Breach**: Flight projected arrival exceeds destination curfew (default: 02:00 next day / 1560 minutes).
3. **Crew Timeout Without Reserve**: The flight's operating crew exceeds maximum legal duty period (600 minutes) and no reserve crew is available.
4. **Explicit Recovery Action**: A dispatcher recovery action explicitly cancels the flight.

When a flight is cancelled:
- Its booked passengers are marked as `stranded_cancelled`.
- Subsequent flights on that aircraft chain:
  - If the aircraft never departs, it remains at the origin of the cancelled flight unless an aircraft swap or ferry is performed.
  - In baseline cascade, subsequent flights on the same aircraft chain cannot depart if the aircraft never arrives, and are thus cancelled due to missing aircraft rotation.

---

## 4. Crew Duty Rules (DGCA FDTL Compliant Baseline)
- **Maximum Daily Duty Period**: 600 minutes (10 hours) per single-day operational window.
- **Duty Period Calculation**: $\text{Duty End} - \text{Duty Start}$, where $\text{Duty End} = \text{Actual Arrival of Crew's Final Operated Flight}$.
- **Crew Timeout**: If projected actual arrival $\gt \text{Duty Start} + \text{max\_duty\_mins}$, the crew is flagged as `CREW_TIMEOUT`.

---

## 5. Passenger Accounting & No-Double-Counting Invariant
Passengers are tracked under mutually exclusive, non-overlapping categories:
1. **`stranded_cancelled`**: Booked passengers on a flight that was cancelled ($N_{pax}$).
2. **`stranded_connection`**: Passengers booked on a connecting itinerary $(F_1 \rightarrow F_2)$ where:
   $$\text{ActualArr}(F_1) + \text{MCT} > \text{ActualDep}(F_2)$$
   and $F_2$ was not held for the connection.
3. **No Double Counting**:
   - If flight $F_1$ is cancelled, its passengers are counted under `stranded_cancelled`; they do not generate broken connection records because they never took off.
   - If flight $F_2$ is cancelled, connections onto $F_2$ are absorbed under $F_2$'s cancelled passenger count.
   - Total stranded passengers = $\sum \text{stranded\_cancelled} + \sum \text{stranded\_connection}$.

---

## 6. Recovery Planner Scoring Function
Cost function minimized by recovery candidates:
$$\text{Cost} = w_1 \cdot \text{strandedPax} + w_2 \cdot \text{totalDelayMinutes} + w_3 \cdot \text{cancellations} + w_4 \cdot \text{crewViolations}$$

Default weights:
- $w_1 (\text{strandedPax}) = 100$
- $w_2 (\text{totalDelayMinutes}) = 1$
- $w_3 (\text{cancellations}) = 5000$
- $w_4 (\text{crewViolations}) = 2000$
