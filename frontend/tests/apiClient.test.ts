import { describe, it, expect } from 'vitest';
import { getFlights, getConflicts, getHealth, getAirports } from '../src/services/apiClient';

describe('SkyOps API Client & Replaceable Data Layer', () => {
  it('returns contract demo fixtures when offline in mock_only mode', async () => {
    const response = await getFlights(undefined, 'mock_only');
    expect(response.data).toBeDefined();
    expect(response.data.length).toBeGreaterThan(0);
    expect(response.meta.source).toBe('DEMO_FIXTURE');
    expect(response.meta.isSimulated).toBe(false);
  });

  it('filters flights by origin airport correctly', async () => {
    const response = await getFlights({ origin: 'DEL' }, 'mock_only');
    expect(response.data.every((f) => f.origin === 'DEL')).toBe(true);
  });

  it('filters flights by status correctly', async () => {
    const response = await getFlights({ status: 'DELAYED' }, 'mock_only');
    expect(response.data.every((f) => f.status === 'DELAYED')).toBe(true);
  });

  it('filters flights by search term (flight number or gate)', async () => {
    const response = await getFlights({ search: '6E 204' }, 'mock_only');
    expect(response.data.length).toBe(1);
    expect(response.data[0].flight_number).toBe('6E 204');
    expect(response.data[0].assigned_gate).toBe('42');
  });

  it('fetches detected conflicts with high severity flags', async () => {
    const response = await getConflicts('DEL', 'mock_only');
    expect(response.data.length).toBeGreaterThan(0);
    expect(response.data.some((c) => c.severity === 'HIGH')).toBe(true);
    expect(response.data[0].resource_type).toBe('GATE');
  });

  it('conforms to backend health schema', async () => {
    const response = await getHealth('mock_only');
    expect(response.data.status).toBe('healthy');
    expect(response.data.services.conflict_detection).toBeDefined();
  });

  it('provides managed hub airports matching DEL, BOM, BLR', async () => {
    const response = await getAirports();
    const codes = response.data.map((a) => a.iata_code);
    expect(codes).toContain('DEL');
    expect(codes).toContain('BOM');
    expect(codes).toContain('BLR');
  });
});
