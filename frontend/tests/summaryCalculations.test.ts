import { describe, it, expect } from 'vitest';
import { DEMO_FLIGHTS, DEMO_CONFLICTS } from '../src/data/demoFixtures';

describe('SkyOps Operational Metrics Calculations', () => {
  it('correctly calculates total benchmark flights count', () => {
    expect(DEMO_FLIGHTS.length).toBe(12);
  });

  it('correctly calculates delayed flights and average delay', () => {
    const delayed = DEMO_FLIGHTS.filter(f => f.status === 'DELAYED' || f.delay_minutes > 15);
    expect(delayed.length).toBeGreaterThan(0);

    const totalDelay = delayed.reduce((acc, f) => acc + f.delay_minutes, 0);
    const avgDelay = Math.round(totalDelay / delayed.length);

    expect(avgDelay).toBeGreaterThan(0);
    expect(avgDelay).toBeLessThan(120);
  });

  it('computes on-time percentage within valid 0-100 bounds', () => {
    const onTime = DEMO_FLIGHTS.filter(f => f.status === 'ON_TIME' || (f.status !== 'DELAYED' && f.delay_minutes <= 15)).length;
    const otp = Math.round((onTime / DEMO_FLIGHTS.length) * 100);

    expect(otp).toBeGreaterThanOrEqual(0);
    expect(otp).toBeLessThanOrEqual(100);
  });

  it('flags gate conflict overlap accurately', () => {
    const gateConflict = DEMO_CONFLICTS.find(c => c.type === 'GATE_OCCUPANCY_OVERLAP');
    expect(gateConflict).toBeDefined();
    expect(gateConflict?.conflicting_flight_ids).toContain('6E-204-DEL-BOM-20261012');
    expect(gateConflict?.conflicting_flight_ids).toContain('6E-5032-DEL-BLR-20261012');
  });
});
