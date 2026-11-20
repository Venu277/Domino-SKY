/**
 * Centralized configuration and operational assumptions for Domino Sky.
 * Every assumption is exported here and surfaced in the UI Assumptions Panel.
 */

export interface SystemConfig {
  turnaround: {
    minTurnaroundMinutes: number;
    crewTurnaroundMinutes: number;
    crewSignOnBufferMinutes: number;
    defaultMCTMinutes: number;
  };
  thresholds: {
    onTimeDelayMinutes: number; // <= 15 min considered ON_TIME
    maxDelayBeforeCancelMinutes: number; // > 240 min delay triggers cancellation
    curfewMinutes: number; // 02:00 next day (1560 min)
    maxCrewDutyMinutes: number; // 600 min
  };
  policy: {
    destinationClosedRule: 'HOLD_AT_ORIGIN' | 'DIVERT' | 'CANCEL';
    crewTimeoutRule: 'FLAG_AND_HOLD' | 'CANCEL_LEG';
  };
  weights: {
    strandedPax: number;
    delayMinute: number;
    cancellation: number;
    crewViolation: number;
  };
  goldenScenario: {
    airport: string;
    start: number; // 08:00 = 480
    end: number;   // 09:30 = 570
    durationMinutes: number;
    description: string;
  };
}

export const CONFIG: SystemConfig = {
  turnaround: {
    minTurnaroundMinutes: 30,
    crewTurnaroundMinutes: 30,
    crewSignOnBufferMinutes: 45,
    defaultMCTMinutes: 45,
  },
  thresholds: {
    onTimeDelayMinutes: 15,
    maxDelayBeforeCancelMinutes: 240, // 4 hours
    curfewMinutes: 1560,             // 02:00 next day
    maxCrewDutyMinutes: 600,         // 10 hours
  },
  policy: {
    destinationClosedRule: 'HOLD_AT_ORIGIN',
    crewTimeoutRule: 'FLAG_AND_HOLD',
  },
  weights: {
    strandedPax: 100,
    delayMinute: 1,
    cancellation: 5000,
    crewViolation: 2000,
  },
  goldenScenario: {
    airport: 'BOM',
    start: 480, // 08:00
    end: 570,   // 09:30
    durationMinutes: 90,
    description: 'Busiest hub (Mumbai/BOM) closed for 90 minutes (08:00 - 09:30) due to severe thunderstorm.',
  },
};
