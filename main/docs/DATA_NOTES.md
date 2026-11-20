# Domino Sky — Dataset Analysis & Schema Notes

## 1. Source Data Overview
The dataset represents an Indian domestic airline ("Domino Sky") network operating on a single operational day. All times are local Indian Standard Time (IST, UTC+05:30).

- **File**: `flight_network.json`
- **Airports**: 16
- **Flights**: 70
- **Aircraft (Operating)**: 16 (VT-DS01 through VT-DS16)
- **Aircraft (Spares)**: 2 (VT-DS17 at BLR, VT-DS18 at DEL)
- **Crews**: 16 (CR01 through CR16)
- **Passenger Connections**: 21 (CX01 through CX21)

---

## 2. Entity Schemas & Sample Rows

### 2.1 Meta (`meta`)
```json
{
  "dataset": "Domino Sky flight network",
  "operating_day": "single day, all times local IST (UTC+05:30), 24-hour HH:MM",
  "min_turnaround_minutes": 30,
  "seats_per_aircraft": 180,
  "notes": [...]
}
```

### 2.2 Airports (`airports`)
- **Key Fields**:
  - `id`: Airport 3-letter IATA code (`string`, unique)
  - `name`: Full airport name (`string`)
  - `city`: City name (`string`)
  - `lat`: Latitude (`number`, -90 to 90)
  - `lng`: Longitude (`number`, -180 to 180)
  - `tier`: Category enum (`"mega_hub"` | `"regional_hub"` | `"spoke"`)
  - `capacity_per_hour`: Hourly runway movements capacity (`number`, 8 to 40)
- **Sample Row**:
  ```json
  {"id":"BOM","name":"Chhatrapati Shivaji Maharaj International","city":"Mumbai","lat":19.0896,"lng":72.8656,"tier":"mega_hub","capacity_per_hour":32}
  ```

### 2.3 Flights (`flights`)
- **Key Fields**:
  - `flight_id`: Flight number (`string`, unique, e.g. "DS0101")
  - `tail_id`: Assigned aircraft registration (`string`, e.g. "VT-DS01")
  - `leg_order`: Sequence number in the aircraft's daily rotation (`number`, 1 to 5)
  - `origin`: Origin airport code (`string`)
  - `destination`: Destination airport code (`string`)
  - `dep`: Scheduled departure time (`"HH:MM"`)
  - `arr`: Scheduled arrival time (`"HH:MM"`)
  - `block_minutes`: Scheduled flight duration (`number`)
  - `pax`: Scheduled booked passengers (`number`, 113 to 173)
  - `turnaround_before_min`: Scheduled ground buffer before this flight (`number | null`)
- **Sample Row**:
  ```json
  {"flight_id":"DS0201","tail_id":"VT-DS02","leg_order":1,"origin":"DEL","destination":"BOM","dep":"06:00","arr":"08:10","block_minutes":130,"pax":153,"turnaround_before_min":null}
  ```

### 2.4 Passenger Connections (`connections`)
- **Key Fields**:
  - `connection_id`: Unique identifier (`string`, e.g. "CX01")
  - `airport`: Connecting hub code (`string`, matches inbound destination and outbound origin)
  - `from_flight`: Inbound flight number (`string`)
  - `to_flight`: Outbound flight number (`string`)
  - `passengers`: Number of transferring passengers (`number`, 14 to 46)
  - `min_connect_minutes`: Minimum Connection Time (MCT) required (`number`, 40 or 45)
- **Sample Row**:
  ```json
  {"connection_id":"CX01","airport":"BOM","from_flight":"DS1201","to_flight":"DS1502","passengers":43,"min_connect_minutes":45}
  ```

### 2.5 Crews (`crews`)
- **Key Fields**:
  - `crew_id`: Unique identifier (`string`, e.g. "CR01")
  - `tail_id`: Initial paired aircraft (`string`)
  - `base`: Crew domicile airport (`string`)
  - `duty_start`: Time crew signs on for duty (`"HH:MM"`)
  - `max_duty_mins`: Maximum legal flight duty period (`number`, 600 minutes / 10 hours)
  - `flight_ids`: Array of flight numbers flown in sequence (`string[]`)
- **Sample Row**:
  ```json
  {"crew_id":"CR02","tail_id":"VT-DS02","base":"DEL","duty_start":"05:15","max_duty_mins":600,"flight_ids":["DS0201","DS0202","DS0203","DS0204"]}
  ```

### 2.6 Spare Aircraft (`spare_aircraft`)
- **Key Fields**:
  - `tail_id`: Registration (`string`, e.g. "VT-DS17", "VT-DS18")
  - `base`: Physical parking airport (`string`, "BLR", "DEL")
  - `available_from`: Ready time (`"HH:MM"`, "05:00")
  - `seats`: Seat capacity (`number`, 180)
- **Sample Row**:
  ```json
  {"tail_id":"VT-DS17","base":"BLR","available_from":"05:00","seats":180}
  ```

---

## 3. Data Integrity & Anomaly Audit Findings

1. **Spatial Consistency**:
   - Every aircraft chain is continuous: for every leg $k+1$, `origin` equals leg $k$'s `destination`.
   - Every crew chain is continuous: no teleportation between flights.
   - All connection itineraries match the connecting airport physically.
2. **Temporal Consistency**:
   - In scheduled state, every leg turnaround $\ge$ 30 minutes (values range from 30 to 80 minutes).
   - In scheduled state, `block_minutes == arr - dep` for all 70 flights.
   - In scheduled state, all connection buffers satisfy $\ge$ `min_connect_minutes`.
   - In scheduled state, all crews are within the 600-minute duty limit.
3. **Time Formatting & Day-Boundary Handling**:
   - All times are formatted `"HH:MM"`.
   - Earliest scheduled departure: 06:00 (360 minutes).
   - Latest scheduled arrival: 21:45 (1305 minutes).
   - Under cascade delays, actual arrival can exceed 1440 minutes (24:00+). Normalization maps all times to integer minutes from midnight `00:00` (allowing values $> 1440$ without modulo truncation, preserving sequence logic).
