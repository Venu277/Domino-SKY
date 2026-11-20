import { describe, expect, it } from 'vitest';
import rawData from '../data/flight_network.json' with { type: 'json' };
import { formatMinutesToTimeString, normalizeDataset, parseTimeStringToMinutes } from '../src/loader.js';

describe('Loader and Normalizer', () => {
  it('parses and formats time strings accurately', () => {
    expect(parseTimeStringToMinutes('00:00')).toBe(0);
    expect(parseTimeStringToMinutes('06:00')).toBe(360);
    expect(parseTimeStringToMinutes('08:30')).toBe(510);
    expect(parseTimeStringToMinutes('23:59')).toBe(1439);

    expect(formatMinutesToTimeString(0)).toBe('00:00');
    expect(formatMinutesToTimeString(360)).toBe('06:00');
    expect(formatMinutesToTimeString(510)).toBe('08:30');
    expect(formatMinutesToTimeString(1439)).toBe('23:59');
    expect(formatMinutesToTimeString(1450, true)).toBe('00:10 (+1d)');
  });

  it('validates and normalizes the full dataset schema', () => {
    const dataset = normalizeDataset(rawData);

    expect(dataset.airports.length).toBe(16);
    expect(dataset.flights.length).toBe(70);
    expect(dataset.connections.length).toBe(21);
    expect(dataset.crews.length).toBe(16);
    expect(dataset.spareAircraft.length).toBe(2);

    expect(dataset.airportsById.size).toBe(16);
    expect(dataset.flightsById.size).toBe(70);
    expect(dataset.crewsById.size).toBe(16);
    expect(dataset.spareAircraftById.size).toBe(2);

    // Verify lookup index integrity
    for (const [tailId, chain] of dataset.flightsByAircraft.entries()) {
      expect(chain.length).toBeGreaterThanOrEqual(1);
      // Legs must be strictly ascending in leg_order
      for (let i = 0; i < chain.length - 1; i++) {
        expect(chain[i].leg_order).toBeLessThan(chain[i + 1].leg_order);
        expect(chain[i].destination).toBe(chain[i + 1].origin);
      }
    }
  });
});
