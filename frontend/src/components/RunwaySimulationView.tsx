'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  AlertTriangle,
  Play,
  RotateCcw,
  Plane,
  Clock,
  ArrowRight,
  ShieldAlert,
  CheckCircle2,
  Sliders,
  TrendingUp,
  Fuel,
  Info,
  Layers,
} from 'lucide-react';
import {
  RunwayClosureRequest,
  RunwayClosureSimulationResult,
  AffectedFlight,
  RecoveryProposal,
  Conflict,
  ApiFetchResult,
} from '../types/api';
import { runRunwayClosureSimulation } from '../services/apiClient';
import { DataSourceBadge } from './DataSourceBadge';

interface RunwaySimulationViewProps {
  defaultAirport?: string;
  dataSourceMode?: 'auto' | 'live_only' | 'mock_only';
}

const RUNWAY_OPTIONS: Record<string, { id: string; name: string; capacity: number }[]> = {
  DEL: [
    { id: '10/28', name: 'Runway 10/28 (Primary - 3,810m)', capacity: 35 },
    { id: '09/27', name: 'Runway 09/27 (Secondary - 3,810m)', capacity: 32 },
    { id: '11/29', name: 'Runway 11/29 (Code F - 4,430m)', capacity: 40 },
    { id: '28/10', name: 'Runway 28/10 (Eastbound - 3,810m)', capacity: 30 },
  ],
  BOM: [
    { id: '09/27', name: 'Runway 09/27 (Main - 3,445m)', capacity: 38 },
    { id: '14/32', name: 'Runway 14/32 (Cross Runway - 2,990m)', capacity: 25 },
  ],
  BLR: [
    { id: '09L/27R', name: 'Runway 09L/27R (North - 4,000m)', capacity: 36 },
    { id: '09R/27L', name: 'Runway 09R/27L (South - 4,000m)', capacity: 36 },
  ],
};

const CLOSURE_REASONS = [
  { id: 'EMERGENCY_INSPECTION_FOD', label: 'Foreign Object Debris (FOD) Inspection' },
  { id: 'DISABLED_AIRCRAFT_EXCURSION', label: 'Disabled Aircraft / Runway Excursion' },
  { id: 'SURFACE_MAINTENANCE_CRACK', label: 'Urgent Surface Pavement Maintenance' },
  { id: 'SEVERE_WEATHER_CROSSWIND', label: 'Severe Weather / Sudden Crosswind Exceedance' },
];

export const RunwaySimulationView: React.FC<RunwaySimulationViewProps> = ({
  defaultAirport = 'DEL',
  dataSourceMode = 'auto',
}) => {
  const [airport, setAirport] = useState<string>(defaultAirport === 'ALL' ? 'DEL' : defaultAirport);
  const [runway, setRunway] = useState<string>('10/28');
  const [startTime, setStartTime] = useState<string>('2026-10-12T09:00');
  const [endTime, setEndTime] = useState<string>('2026-10-12T11:30');
  const [reason, setReason] = useState<string>('EMERGENCY_INSPECTION_FOD');

  const [validationError, setValidationError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [simulationResult, setSimulationResult] = useState<RunwayClosureSimulationResult | null>(null);
  const [appliedProposalIds, setAppliedProposalIds] = useState<string[]>([]);

  const availableRunways = RUNWAY_OPTIONS[airport] || RUNWAY_OPTIONS.DEL;

  const handleAirportChange = (newAirport: string) => {
    setAirport(newAirport);
    const runways = RUNWAY_OPTIONS[newAirport] || RUNWAY_OPTIONS.DEL;
    setRunway(runways[0].id);
  };

  const handleApplyPreset = (durationMinutes: number) => {
    const start = new Date(startTime);
    const end = new Date(start.getTime() + durationMinutes * 60000);
    const isoString = end.toISOString().slice(0, 16);
    setEndTime(isoString);
    setValidationError(null);
  };

  const validateInputs = (): boolean => {
    if (!airport) {
      setValidationError('Please select an airport hub.');
      return false;
    }
    if (!runway) {
      setValidationError('Please select a runway identifier.');
      return false;
    }
    const startDt = new Date(startTime);
    const endDt = new Date(endTime);

    if (isNaN(startDt.getTime())) {
      setValidationError('Invalid closure start timestamp.');
      return false;
    }
    if (isNaN(endDt.getTime())) {
      setValidationError('Invalid closure end timestamp.');
      return false;
    }
    if (endDt <= startDt) {
      setValidationError('Closure end time must be strictly after closure start time.');
      return false;
    }
    const diffMins = (endDt.getTime() - startDt.getTime()) / 60000;
    if (diffMins < 15) {
      setValidationError('Minimum closure simulation duration is 15 minutes.');
      return false;
    }

    setValidationError(null);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateInputs()) return;

    setIsLoading(true);
    setApiError(null);
    setAppliedProposalIds([]);

    const payload: RunwayClosureRequest = {
      airport_code: airport,
      runway_identifier: runway,
      closure_start: new Date(startTime).toISOString(),
      closure_end: new Date(endTime).toISOString(),
      reason,
    };

    try {
      const res: ApiFetchResult<RunwayClosureSimulationResult> = await runRunwayClosureSimulation(
        payload,
        dataSourceMode
      );

      if (res.status === 'NETWORK_ERROR' || res.status === 'HTTP_ERROR') {
        setApiError(res.errorMessage || 'Simulation service failed');
      } else {
        setSimulationResult(res.data);
        if (res.errorMessage) {
          setApiError(res.errorMessage);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown simulation error';
      setApiError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleProposal = (propId: string) => {
    setAppliedProposalIds((prev) =>
      prev.includes(propId) ? prev.filter((id) => id !== propId) : [...prev, propId]
    );
  };

  const totalMitigatedMinutes = simulationResult?.recovery_proposals
    .filter((p) => appliedProposalIds.includes(p.proposal_id))
    .reduce((acc, p) => acc + p.estimated_delay_mitigation_minutes, 0) || 0;

  return (
    <div className="space-y-6">
      {/* Simulation Header Banner */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-sky-800 text-white shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Runway-Closure Disruption Simulator
              </h2>
              <DataSourceBadge source="SIMULATED" />
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Simulates spatial capacity bottlenecks, holding stacks, and tactical recovery schedules (POST /api/v1/simulations/runway-closure).
            </p>
          </div>
        </div>
        <div className="text-xs text-slate-600 font-mono bg-slate-100 px-3 py-1.5 rounded border border-slate-200 self-start sm:self-auto shrink-0">
          Non-Production Scenario
        </div>
      </div>

      {/* Form Section */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Sliders className="w-4 h-4 text-sky-800" />
          Disruption Scenario Parameters
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Airport Hub Selector */}
            <div>
              <label htmlFor="sim-airport" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Airport Hub
              </label>
              <select
                id="sim-airport"
                value={airport}
                onChange={(e) => handleAirportChange(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-xs text-slate-900 font-semibold focus:outline-none focus:border-sky-700 focus:ring-1 focus:ring-sky-700"
              >
                <option value="DEL">DEL — Indira Gandhi Intl (New Delhi)</option>
                <option value="BOM">BOM — Chhatrapati Shivaji (Mumbai)</option>
                <option value="BLR">BLR — Kempegowda Intl (Bengaluru)</option>
              </select>
            </div>

            {/* Runway Selector */}
            <div>
              <label htmlFor="sim-runway" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Target Runway to Close
              </label>
              <select
                id="sim-runway"
                value={runway}
                onChange={(e) => setRunway(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-xs text-slate-900 font-mono font-semibold focus:outline-none focus:border-sky-700 focus:ring-1 focus:ring-sky-700"
              >
                {availableRunways.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Closure Start Time */}
            <div>
              <label htmlFor="sim-start" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Closure Start (UTC)
              </label>
              <input
                id="sim-start"
                type="datetime-local"
                value={startTime}
                onChange={(e) => {
                  setStartTime(e.target.value);
                  setValidationError(null);
                }}
                className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-sky-700 focus:ring-1 focus:ring-sky-700"
              />
            </div>

            {/* Closure End Time */}
            <div>
              <label htmlFor="sim-end" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Closure End (UTC)
              </label>
              <input
                id="sim-end"
                type="datetime-local"
                value={endTime}
                onChange={(e) => {
                  setEndTime(e.target.value);
                  setValidationError(null);
                }}
                className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-sky-700 focus:ring-1 focus:ring-sky-700"
              />
            </div>
          </div>

          {/* Closure Reason & Preset Quick Durations */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div>
              <label htmlFor="sim-reason" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Incident Classification
              </label>
              <select
                id="sim-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-xs text-slate-900 font-medium focus:outline-none focus:border-sky-700 focus:ring-1 focus:ring-sky-700"
              >
                {CLOSURE_REASONS.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <span className="block text-xs font-semibold text-slate-700 mb-1.5">
                Duration Quick Presets
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleApplyPreset(30)}
                  className="px-2.5 py-1.5 rounded bg-slate-100 border border-slate-200 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-200 transition-colors"
                >
                  +30 Mins (Rapid Sweep)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset(60)}
                  className="px-2.5 py-1.5 rounded bg-slate-100 border border-slate-200 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-200 transition-colors"
                >
                  +1 Hour
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset(150)}
                  className="px-2.5 py-1.5 rounded bg-slate-100 border border-slate-200 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-200 transition-colors"
                >
                  +2.5 Hours (Standard Incident)
                </button>
              </div>
            </div>
          </div>

          {/* Validation Alert */}
          {validationError && (
            <div className="p-3 rounded-md bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-200">
            <span className="text-xs text-slate-500 font-mono hidden sm:inline">
              Target: <code className="text-slate-700">POST /api/v1/simulations/runway-closure</code>
            </span>
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-sky-800 hover:bg-sky-900 text-white text-xs font-bold transition-colors disabled:opacity-50 shadow-sm"
            >
              {isLoading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Simulating Operational Impact...
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Run Disruption Simulation
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* API Notice / Fallback Banner */}
      {apiError && (
        <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 truncate">
            <Info className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="truncate">{apiError}</span>
          </div>
          <span className="text-[11px] font-mono text-amber-800 whitespace-nowrap bg-white border border-amber-200 px-2 py-0.5 rounded font-semibold">
            CONTRACT FIXTURE ACTIVE
          </span>
        </div>
      )}

      {/* Empty State: Prompt to Run Simulation */}
      {!simulationResult && !isLoading && (
        <div className="bg-white border border-slate-200 rounded-lg p-10 text-center space-y-3 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Sliders className="w-6 h-6 text-slate-500" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">No Disruption Simulation Executed</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Configure a runway and closure time window above to evaluate capacity loss, arrival holding stacks, and algorithmic schedule recovery.
          </p>
          <button
            onClick={() => handleApplyPreset(150)}
            className="text-xs text-sky-800 hover:text-sky-950 font-semibold underline"
          >
            Load Benchmark 2.5-Hour FOD Incident Scenario
          </button>
        </div>
      )}

      {/* Simulation Results Section */}
      {simulationResult && (
        <div className="space-y-6">
          {/* 1. Before vs After Metrics Comparison */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-sky-800" />
                Operational Impact & Before/After Comparison
              </h3>
              <span className="text-xs font-mono text-slate-500">
                Run ID: <strong className="text-slate-800">{simulationResult.simulation_id}</strong>
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              {/* Metric 1: Capacity */}
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Movement Capacity</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl sm:text-2xl font-bold font-mono text-rose-700">
                    -{simulationResult.impact_summary.capacity_reduction_percentage}%
                  </span>
                  <span className="text-slate-400 line-through text-[10px] font-mono">100% base</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Runway {simulationResult.runway_identifier} closed for {simulationResult.closure_window.duration_minutes}m
                </p>
              </div>

              {/* Metric 2: Total Projected Delay */}
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Projected Delay Surge</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl sm:text-2xl font-bold font-mono text-amber-700">
                    +{simulationResult.impact_summary.total_projected_delay_minutes}m
                  </span>
                  <span className="text-slate-400 line-through text-[10px] font-mono">0m base</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Across {simulationResult.impact_summary.total_impacted_flights} scheduled movements
                </p>
              </div>

              {/* Metric 3: Ground Holds vs Diversions */}
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Flow Interventions</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl sm:text-2xl font-bold font-mono text-slate-900">
                    {simulationResult.impact_summary.ground_delayed_departures_count}G / {simulationResult.impact_summary.diverted_flights_count}D
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  {simulationResult.impact_summary.holding_arrivals_count} airborne holding stacks
                </p>
              </div>

              {/* Metric 4: Recovery Mitigation */}
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Tactical Mitigation</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl sm:text-2xl font-bold font-mono text-emerald-700">
                    -{totalMitigatedMinutes}m
                  </span>
                  <span className="text-slate-500 text-[10px] font-mono">mitigated</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  {appliedProposalIds.length} of {simulationResult.recovery_proposals.length} tactical proposals activated
                </p>
              </div>
            </div>
          </div>

          {/* 2. Generated Conflicts Section */}
          {simulationResult.conflicts_generated && simulationResult.conflicts_generated.length > 0 && (
            <div className="bg-white border border-rose-200 border-l-4 border-l-rose-600 rounded-lg p-4 sm:p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Secondary Spatial/Temporal Conflicts Flagged by Simulator
                </h3>
              </div>
              <div className="space-y-2">
                {simulationResult.conflicts_generated.map((conf) => (
                  <div
                    key={conf.id}
                    className="p-3 rounded-md bg-rose-50/50 border border-rose-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900">{conf.resource_id}</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 uppercase">
                          {conf.severity} SEVERITY
                        </span>
                        <span className="text-slate-500 font-mono text-[11px]">
                          {conf.overlap_start.slice(11, 16)} – {conf.overlap_end.slice(11, 16)} UTC
                        </span>
                      </div>
                      <p className="text-slate-700 mt-1 leading-relaxed">{conf.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. Affected Flights List */}
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Plane className="w-4 h-4 text-slate-700 -rotate-45" />
                  Directly Affected Flight Movements
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Flights requiring runway reassignment, holding stacks, or ground delay intervention
                </p>
              </div>
              <span className="px-2.5 py-1 rounded text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                {simulationResult.affected_flights.length} Impacted Flights
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {simulationResult.affected_flights.map((flight) => (
                <div key={flight.flight_id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-slate-50/60 transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold font-mono text-slate-900 text-sm">{flight.flight_id}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 uppercase">
                        {flight.action_required.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-slate-600">
                      {flight.original_runway && (
                        <span>
                          Runway:{' '}
                          <span className="font-mono text-rose-700 line-through mr-1 font-semibold">
                            {flight.original_runway}
                          </span>
                          →{' '}
                          <span className="font-mono text-emerald-700 font-bold">
                            {flight.assigned_alternate_runway}
                          </span>
                        </span>
                      )}
                      {flight.holding_time_minutes && (
                        <span>
                          Holding: <strong className="font-mono text-amber-700">+{flight.holding_time_minutes}m</strong>
                        </span>
                      )}
                      {flight.fuel_status && (
                        <span className="flex items-center gap-1 font-mono text-slate-600">
                          <Fuel className="w-3 h-3 text-slate-400" />
                          Fuel: {flight.fuel_status}
                        </span>
                      )}
                    </div>
                  </div>

                  {flight.projected_delay_minutes ? (
                    <div className="text-right">
                      <span className="text-sm font-bold font-mono text-amber-700">
                        +{flight.projected_delay_minutes}m
                      </span>
                      <span className="text-[10px] text-slate-500 block">Projected Delay</span>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          {/* 4. Proposed Recovery Schedule & Tactical Actions */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Tactical Schedule Recovery Proposals
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Automated conflict resolution strategies designed to minimize downstream delay cascade
                </p>
              </div>
              <span className="text-xs text-emerald-800 font-bold font-mono bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded">
                {totalMitigatedMinutes > 0 ? `-${totalMitigatedMinutes}m Total Mitigation Active` : 'Review Proposals'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {simulationResult.recovery_proposals.map((proposal) => {
                const isApplied = appliedProposalIds.includes(proposal.proposal_id);
                return (
                  <div
                    key={proposal.proposal_id}
                    className={`p-4 rounded-lg border transition-all text-xs space-y-3 ${
                      isApplied
                        ? 'bg-emerald-50/50 border-emerald-300'
                        : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-bold text-slate-900 block text-sm">{proposal.title}</span>
                        <span className="font-mono text-[10px] text-slate-500 font-semibold uppercase">
                          Strategy: {proposal.action_type}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 shrink-0">
                        -{proposal.estimated_delay_mitigation_minutes}m DELAY
                      </span>
                    </div>

                    <p className="text-slate-600 text-xs leading-relaxed">
                      {proposal.description}
                    </p>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] text-slate-500 font-mono">
                        ID: {proposal.proposal_id}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleToggleProposal(proposal.proposal_id)}
                        className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors shadow-xs ${
                          isApplied
                            ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                            : 'bg-slate-900 hover:bg-slate-800 text-white'
                        }`}
                      >
                        {isApplied ? '✓ Strategy Accepted' : 'Simulate Strategy Acceptance'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
