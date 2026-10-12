import { describe, it, expect } from 'vitest';
import { runRunwayClosureSimulation } from '../src/services/apiClient';
import { RunwayClosureRequest } from '../src/types/api';

describe('SkyOps Runway-Closure Simulation API & Validation (docs/api.md Section 8)', () => {
  const validRequest: RunwayClosureRequest = {
    airport_code: 'DEL',
    runway_identifier: '10/28',
    closure_start: '2026-10-12T09:00:00Z',
    closure_end: '2026-10-12T11:30:00Z',
    reason: 'EMERGENCY_INSPECTION_FOD',
  };

  it('runs simulation in mock_only mode and returns schema conforming to docs/api.md', async () => {
    const res = await runRunwayClosureSimulation(validRequest, 'mock_only');

    expect(res.data).toBeDefined();
    expect(res.data.simulation_id).toBeDefined();
    expect(res.data.airport_code).toBe('DEL');
    expect(res.data.runway_identifier).toBe('10/28');
    expect(res.data.closure_window.duration_minutes).toBe(150);

    // Impact summary checks
    expect(res.data.impact_summary.capacity_reduction_percentage).toBe(28.5);
    expect(res.data.impact_summary.total_impacted_flights).toBe(18);
    expect(res.data.impact_summary.total_projected_delay_minutes).toBe(495);
    expect(res.data.impact_summary.ground_delayed_departures_count).toBe(12);
    expect(res.data.impact_summary.diverted_flights_count).toBe(2);

    // Affected flights checks
    expect(res.data.affected_flights.length).toBeGreaterThan(0);
    expect(res.data.affected_flights[0].action_required).toBe('REROUTE_RUNWAY');
    expect(res.data.affected_flights[0].assigned_alternate_runway).toBe('09/27');

    // Recovery proposals checks
    expect(res.data.recovery_proposals.length).toBeGreaterThan(0);
    expect(res.data.recovery_proposals[0].proposal_id).toBe('prop-1');
    expect(res.data.recovery_proposals[0].estimated_delay_mitigation_minutes).toBe(140);

    // Provenance check
    expect(res.data.is_simulated).toBe(true);
  });

  it('returns explicit network error in live_only mode when backend is offline without faking success', async () => {
    const res = await runRunwayClosureSimulation(validRequest, 'live_only');

    expect(res.status).toMatch(/NETWORK_ERROR|HTTP_ERROR/);
    expect(res.errorMessage).toBeDefined();
    expect(res.httpStatusCode).not.toBe(200);
  });

  it('falls back to demo simulation in auto mode with transparent offline notice', async () => {
    const res = await runRunwayClosureSimulation(validRequest, 'auto');

    expect(res.data).toBeDefined();
    expect(res.status).toBe('OFFLINE_BENCHMARK');
    expect(res.errorMessage).toContain('FastAPI simulation service');
    expect(res.data.is_simulated).toBe(true);
  });

  it('handles custom duration calculations accurately', async () => {
    const customRequest: RunwayClosureRequest = {
      ...validRequest,
      closure_start: '2026-10-12T10:00:00Z',
      closure_end: '2026-10-12T11:00:00Z', // 60 mins
    };

    const res = await runRunwayClosureSimulation(customRequest, 'mock_only');
    expect(res.data.closure_window.duration_minutes).toBe(60);
  });
});
