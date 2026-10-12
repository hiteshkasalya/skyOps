import { describe, it, expect } from 'vitest';
import {
  getFlights,
  normalizeFlightRecord,
  getConflicts,
  getHealth,
  getAirports,
} from '../src/services/apiClient';
import { RawBackendFlightRecord } from '../src/types/api';

describe('SkyOps GET /api/v1/flights Typed Client & Historical Record Rules', () => {
  it('normalizes raw backend schema matching backend/app/schemas/flight.py', () => {
    const raw: RawBackendFlightRecord = {
      flight_id: '6E-204-DEL-BOM-20261012',
      flight_number: '6E 204',
      airline: 'IndiGo',
      origin_airport: 'DEL',
      destination_airport: 'BOM',
      aircraft_type: 'A321neo',
      tail_number: 'VT-IMG',
      scheduled_departure: '2026-10-12T08:00:00Z',
      scheduled_arrival: '2026-10-12T10:15:00Z',
      actual_departure: '2026-10-12T08:45:00Z',
      actual_arrival: '2026-10-12T11:00:00Z',
      status: 'DELAYED',
      delay_minutes: 45,
      delay_reason: 'LATE_INBOUND_AIRCRAFT',
      terminal: 'T3',
      gate: '42',
      record_type: 'HISTORICAL',
      data_source: 'SYNTHETIC_DEMO',
    };

    const normalized = normalizeFlightRecord(raw);

    expect(normalized.id).toBe('6E-204-DEL-BOM-20261012');
    expect(normalized.flight_number).toBe('6E 204');
    expect(normalized.origin).toBe('DEL');
    expect(normalized.destination).toBe('BOM');
    expect(normalized.registration).toBe('VT-IMG');
    expect(normalized.assigned_gate).toBe('42');
    expect(normalized.record_type).toBe('HISTORICAL');
    expect(normalized.data_source).toBe('SYNTHETIC_DEMO');
    expect(normalized.delay_minutes).toBe(45);
    expect(normalized.actual_arrival).toBe('2026-10-12T11:00:00Z');
  });

  it('correctly classifies historical records and does not assume airborne', () => {
    const raw: RawBackendFlightRecord = {
      flight_id: '6E-102-BLR-DEL-20261012',
      flight_number: '6E 102',
      origin_airport: 'BLR',
      destination_airport: 'DEL',
      scheduled_departure: '2026-10-12T04:45:00Z',
      scheduled_arrival: '2026-10-12T07:35:00Z',
      actual_departure: '2026-10-12T05:10:00Z',
      actual_arrival: '2026-10-12T07:55:00Z',
      record_type: 'HISTORICAL',
    };

    const normalized = normalizeFlightRecord(raw);
    expect(normalized.record_type).toBe('HISTORICAL');
    // Flight already touched down at 07:55 UTC
    expect(normalized.actual_arrival).toBeDefined();
  });

  it('reports network error without hardcoding fake success when live_only backend is offline', async () => {
    const result = await getFlights(undefined, 'live_only');
    expect(result.status).toMatch(/NETWORK_ERROR|HTTP_ERROR/);
    expect(result.httpStatusCode).not.toBe(200);
    expect(result.errorMessage).toBeDefined();
    expect(result.data.length).toBe(0);
  });

  it('falls back to benchmark dataset in auto mode when live server is offline', async () => {
    const result = await getFlights(undefined, 'auto');
    expect(result.data.length).toBeGreaterThanOrEqual(10);
    expect(result.isHistoricalDataset).toBe(true);
    expect(result.status).toBe('OFFLINE_BENCHMARK');
    expect(result.errorMessage).toContain('FastAPI backend is unreachable');
  });

  it('filters benchmark flights by origin airport', async () => {
    const result = await getFlights({ origin: 'DEL' }, 'benchmark_only');
    expect(result.data.length).toBeGreaterThan(0);
    expect(result.data.every((f) => f.origin === 'DEL')).toBe(true);
  });

  it('supports search query matching flight number, gate, or tail number', async () => {
    const result = await getFlights({ search: 'VT-IMG' }, 'benchmark_only');
    expect(result.data.length).toBeGreaterThan(0);
    expect(result.data.every((f) => f.registration === 'VT-IMG')).toBe(true);
  });

  it('supports pagination via limit and offset', async () => {
    const p1 = await getFlights({ limit: 4, offset: 0 }, 'benchmark_only');
    const p2 = await getFlights({ limit: 4, offset: 4 }, 'benchmark_only');

    expect(p1.data.length).toBe(4);
    expect(p2.data.length).toBe(4);
    expect(p1.data[0].id).not.toBe(p2.data[0].id);
  });
});
