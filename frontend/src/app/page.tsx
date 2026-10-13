'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Header } from '../components/Header';
import { SummaryCards } from '../components/SummaryCards';
import { ActiveConflictsBanner } from '../components/ActiveConflictsBanner';
import { FlightTable } from '../components/FlightTable';
import { FlightDetailModal } from '../components/FlightDetailModal';
import { FlightDefectDiagnosisLedger } from '../components/FlightDefectDiagnosisLedger';
import { DataSourceBadge } from '../components/DataSourceBadge';
import { RunwaySimulationView } from '../components/RunwaySimulationView';
import { getFlights, getConflicts, getHealth, API_BASE_URL } from '../services/apiClient';
import { Flight, Conflict, DataSourceOrigin, HealthStatus, ApiConnectionStatus } from '../types/api';
import {
  LayoutDashboard,
  CalendarDays,
  AlertTriangle,
  GitPullRequest,
  CheckCircle2,
  ExternalLink,
  Shield,
  Layers,
  Sparkles,
  Database,
  Radio,
  Zap,
  Plane,
} from 'lucide-react';

export default function DashboardPage() {
  const [currentAirport, setCurrentAirport] = useState<string>('DEL');
  const [dataSourceMode, setDataSourceMode] = useState<'auto' | 'mock_only' | 'live_only'>('auto');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'conflicts' | 'disruption' | 'diagnosis' | 'contracts'>('dashboard');

  const [flights, setFlights] = useState<Flight[]>([]);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [health, setHealth] = useState<HealthStatus | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [connectionStatus, setConnectionStatus] = useState<ApiConnectionStatus>('OFFLINE_BENCHMARK');
  const [apiErrorMessage, setApiErrorMessage] = useState<string | undefined>();
  const [endpointUrl, setEndpointUrl] = useState<string>(`${API_BASE_URL}/flights`);

  const [selectedFlight, setSelectedFlight] = useState<Flight | null>(null);
  const [modalInitialTab, setModalInitialTab] = useState<'details' | 'diagnosis'>('details');
  const [selectedDiagnosisFlightId, setSelectedDiagnosisFlightId] = useState<string>('');

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const airportParam = currentAirport === 'ALL' ? undefined : currentAirport;
      const clientMode = dataSourceMode === 'mock_only' ? 'benchmark_only' : dataSourceMode;

      const [flightRes, conflictRes, healthRes] = await Promise.all([
        getFlights({ origin: airportParam }, clientMode),
        getConflicts(airportParam),
        getHealth(),
      ]);

      setFlights(flightRes.data);
      setConnectionStatus(flightRes.status);
      setEndpointUrl(flightRes.endpointUrl);
      setApiErrorMessage(flightRes.errorMessage);

      setConflicts(conflictRes);
      setHealth(healthRes);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Telemetry synchronization failed';
      setApiErrorMessage(msg);
      setConnectionStatus('NETWORK_ERROR');
    } finally {
      setIsLoading(false);
    }
  }, [currentAirport, dataSourceMode]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSelectFlight = (flight: Flight, initialTab: 'details' | 'diagnosis' = 'details') => {
    setSelectedFlight(flight);
    setModalInitialTab(initialTab);
  };

  const handleSelectConflictFlight = (flightId: string) => {
    const target = flights.find((f) => f.id === flightId);
    if (target) {
      setSelectedFlight(target);
      setModalInitialTab('diagnosis');
    }
  };

  const currentDiagnosisFlight =
    flights.find((f) => f.id === selectedDiagnosisFlightId) ||
    flights.find((f) => f.flight_number === '6E 204') ||
    flights[0] ||
    null;

  const currentDataOrigin: DataSourceOrigin =
    connectionStatus === 'CONNECTED_LIVE' ? 'LIVE' : 'HISTORICAL';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col antialiased">
      {/* Top Header */}
      <Header
        currentAirport={currentAirport}
        onSelectAirport={setCurrentAirport}
        dataOrigin={currentDataOrigin}
        dataSourceMode={dataSourceMode}
        onSelectDataMode={setDataSourceMode}
        onRefresh={fetchData}
        isLoading={isLoading}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6 space-y-5">
        {/* Navigation Tabs Bar */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
          <nav className="flex space-x-1.5" aria-label="Dashboard sections">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                activeTab === 'dashboard'
                  ? 'bg-white text-slate-900 border border-slate-200 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-slate-600" />
              Operations Overview
            </button>
            <button
              onClick={() => setActiveTab('conflicts')}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                activeTab === 'conflicts'
                  ? 'bg-white text-slate-900 border border-slate-200 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              Resource Conflicts
              {conflicts.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-rose-600 text-white text-[10px] flex items-center justify-center font-bold">
                  {conflicts.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('disruption')}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                activeTab === 'disruption'
                  ? 'bg-white text-slate-900 border border-slate-200 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-sky-800" />
              Disruption Simulator
            </button>
            <button
              onClick={() => setActiveTab('diagnosis')}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                activeTab === 'diagnosis'
                  ? 'bg-white text-slate-900 border border-slate-200 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              Defect & Recovery Ledger
            </button>
            <button
              onClick={() => setActiveTab('contracts')}
              className={`hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                activeTab === 'contracts'
                  ? 'bg-white text-slate-900 border border-slate-200 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-slate-600" />
              API Schema & Data
            </button>
          </nav>

          <div className="hidden lg:flex items-center gap-2 text-xs text-slate-500">
            <span>Operational Hub:</span>
            <span className="font-semibold text-slate-800 font-mono">
              {currentAirport === 'ALL' ? 'Multi-Hub Aggregator' : `${currentAirport} Station Dispatch`}
            </span>
          </div>
        </div>

        {/* Tab 1: Operations Dashboard */}
        {activeTab === 'dashboard' && (
          <div className="space-y-5">
            {/* KPI Cards Strip */}
            <SummaryCards flights={flights} conflicts={conflicts} dataOrigin={currentDataOrigin} />

            {/* Active Conflicts Alert Banner */}
            <ActiveConflictsBanner
              conflicts={conflicts}
              onSelectConflictFlight={handleSelectConflictFlight}
            />

            {/* Connected Flight Table */}
            <FlightTable
              flights={flights}
              isLoading={isLoading}
              connectionStatus={connectionStatus}
              errorMessage={apiErrorMessage}
              endpointUrl={endpointUrl}
              onRetry={fetchData}
              onSelectFlight={handleSelectFlight}
            />
          </div>
        )}

        {/* Tab 2: Conflicts View */}
        {activeTab === 'conflicts' && (
          <div className="space-y-5">
            <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                Airport Spatial & Temporal Conflict Registry
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Resource overlaps flagged when flight turnaround milestones breach assigned gate occupancy intervals or runway separation buffers.
              </p>
            </div>

            <ActiveConflictsBanner
              conflicts={conflicts}
              onSelectConflictFlight={handleSelectConflictFlight}
            />

            <FlightTable
              flights={flights.filter((f) => f.status === 'DELAYED' || f.delay_minutes > 0)}
              isLoading={isLoading}
              connectionStatus={connectionStatus}
              errorMessage={apiErrorMessage}
              endpointUrl={endpointUrl}
              onRetry={fetchData}
              onSelectFlight={handleSelectFlight}
            />
          </div>
        )}

        {/* Tab 3: Disruption Simulator */}
        {activeTab === 'disruption' && (
          <RunwaySimulationView
            defaultAirport={currentAirport}
            dataSourceMode={dataSourceMode}
          />
        )}

        {/* Tab 4: Defect Diagnosis & Recovery Ledger */}
        {activeTab === 'diagnosis' && (
          <div className="space-y-5">
            {/* Presentation Header Card */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-sky-950 text-white rounded-xl p-5 shadow-md border border-slate-700/80">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-400 text-slate-950 uppercase tracking-wider">
                      Teacher Presentation Mode
                    </span>
                    <span className="text-xs text-sky-200 font-mono">
                      Root Cause Isolation • Cascading Failure Projection • Tactical Schedule Auto-Fix
                    </span>
                  </div>
                  <h2 className="text-lg font-bold mt-1 text-white flex items-center gap-2">
                    <Zap className="w-5 h-5 text-amber-400 fill-amber-400" />
                    Automated Flight Defect Diagnosis & Recovery Ledger
                  </h2>
                  <p className="text-xs text-slate-300 mt-0.5 max-w-3xl leading-relaxed">
                    Select any flight to isolate operational defects (inbound delays, gate double-bookings, turnaround compression), 
                    project downstream failure consequences before they cascade across the airport, and execute an automated tactical recovery with a side-by-side Before vs After audit ledger.
                  </p>
                </div>
              </div>

              {/* Quick Select Buttons */}
              <div className="mt-4 pt-3 border-t border-slate-700/80 flex flex-wrap items-center gap-2">
                <span className="text-xs text-slate-400 font-medium">Quick Demo Profiles:</span>
                <button
                  onClick={() => {
                    const f = flights.find((x) => x.flight_number === '6E 204');
                    if (f) setSelectedDiagnosisFlightId(f.id);
                  }}
                  className={`px-2.5 py-1 rounded text-xs font-semibold font-mono transition-colors border ${
                    (currentDiagnosisFlight?.flight_number === '6E 204')
                      ? 'bg-amber-400 text-slate-950 border-amber-400'
                      : 'bg-slate-800/90 hover:bg-slate-700 text-amber-200 border-amber-500/40'
                  }`}
                >
                  ⚡ 6E 204 (Inbound Delay + Gate 42 Conflict + Turnaround Deficit)
                </button>
                <button
                  onClick={() => {
                    const f = flights.find((x) => x.flight_number === '6E 801');
                    if (f) setSelectedDiagnosisFlightId(f.id);
                  }}
                  className={`px-2.5 py-1 rounded text-xs font-semibold font-mono transition-colors border ${
                    (currentDiagnosisFlight?.flight_number === '6E 801')
                      ? 'bg-amber-400 text-slate-950 border-amber-400'
                      : 'bg-slate-800/90 hover:bg-slate-700 text-sky-200 border-sky-500/40'
                  }`}
                >
                  6E 801 (Gate 12 Spatial Contention)
                </button>
                <button
                  onClick={() => {
                    const f = flights.find((x) => x.flight_number === '6E 722');
                    if (f) setSelectedDiagnosisFlightId(f.id);
                  }}
                  className={`px-2.5 py-1 rounded text-xs font-semibold font-mono transition-colors border ${
                    (currentDiagnosisFlight?.flight_number === '6E 722')
                      ? 'bg-emerald-400 text-slate-950 border-emerald-400'
                      : 'bg-slate-800/90 hover:bg-slate-700 text-emerald-200 border-emerald-500/40'
                  }`}
                >
                  6E 722 (Nominal On-Time Control)
                </button>

                {/* Dropdown for All Flights */}
                <div className="ml-auto flex items-center gap-1.5">
                  <label htmlFor="flightSelect" className="text-xs text-slate-400">All Flights:</label>
                  <select
                    id="flightSelect"
                    value={currentDiagnosisFlight?.id || ''}
                    onChange={(e) => setSelectedDiagnosisFlightId(e.target.value)}
                    className="bg-slate-800 text-white border border-slate-700 text-xs rounded px-2.5 py-1 font-mono focus:outline-hidden focus:border-sky-400"
                  >
                    {flights.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.flight_number} ({f.origin}→{f.destination}) {f.delay_minutes > 0 ? `[+${f.delay_minutes}m]` : '[ON-TIME]'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Diagnosis Component */}
            {currentDiagnosisFlight ? (
              <FlightDefectDiagnosisLedger flight={currentDiagnosisFlight} />
            ) : (
              <div className="bg-white border border-slate-200 rounded-lg p-8 text-center text-slate-500">
                <Plane className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                <p className="text-sm font-semibold text-slate-700">No flight selected</p>
                <p className="text-xs text-slate-500 mt-1">Please pick a flight from the list above to view diagnosis.</p>
              </div>
            )}
          </div>
        )}

        {/* Tab 5: API Contracts */}
        {activeTab === 'contracts' && (
          <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-sky-800" />
                  Backend API Contract Conformance (docs/api.md)
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Authoritative schema contracts shared with Developer 1 (Backend).
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-sky-900 px-2 py-0.5 rounded bg-sky-50 border border-sky-200">
                v1.0 REST + WS
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                <span className="text-slate-700 font-bold block uppercase tracking-wider text-[11px]">
                  Documented Endpoints (docs/api.md)
                </span>
                <div className="space-y-1.5 text-slate-800">
                  <div className="flex justify-between">
                    <span>GET /api/v1/flights</span>
                    <span className="text-emerald-700 font-semibold">Active Client</span>
                  </div>
                  <div className="flex justify-between">
                    <span>GET /api/v1/health</span>
                    <span className="text-emerald-700 font-semibold">Schema Aligned</span>
                  </div>
                  <div className="flex justify-between">
                    <span>GET /api/v1/conflicts</span>
                    <span className="text-emerald-700 font-semibold">Schema Aligned</span>
                  </div>
                  <div className="flex justify-between">
                    <span>GET /api/v1/airports</span>
                    <span className="text-emerald-700 font-semibold">Schema Aligned</span>
                  </div>
                  <div className="flex justify-between">
                    <span>POST /api/v1/simulations/runway-closure</span>
                    <span className="text-emerald-700 font-semibold">Simulation Ready</span>
                  </div>
                  <div className="flex justify-between">
                    <span>GET /api/v1/flights/:id/diagnosis</span>
                    <span className="text-emerald-700 font-semibold">Active Client</span>
                  </div>
                  <div className="flex justify-between">
                    <span>POST /api/v1/flights/:id/simulate-issue</span>
                    <span className="text-emerald-700 font-semibold">Active Client</span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                <span className="text-slate-700 font-bold block uppercase tracking-wider text-[11px]">
                  Dataset & Telemetry Provenance
                </span>
                <div className="space-y-1.5 text-slate-800">
                  <div className="flex justify-between">
                    <span>Dataset Origin</span>
                    <span className="text-slate-700 font-semibold">IndiGo Synthetic Benchmark</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Data Models</span>
                    <span className="text-slate-700 font-semibold">Pydantic Flight / Conflict</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Record Type Filter</span>
                    <span className="text-slate-700 font-semibold">HISTORICAL vs LIVE</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Airborne Assumption</span>
                    <span className="text-emerald-700 font-semibold">Disabled for Historical</span>
                  </div>
                  <div className="flex justify-between">
                    <span>CORS Origin</span>
                    <span className="text-slate-700 font-semibold">http://localhost:3000</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Flight Detail Modal */}
      <FlightDetailModal
        flight={selectedFlight}
        initialTab={modalInitialTab}
        onClose={() => setSelectedFlight(null)}
      />

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-3.5 text-xs text-slate-500 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">SkyOps Platform</span>
            <span>•</span>
            <span>Frontend & UI (Developer 2)</span>
            <span>•</span>
            <span>IndiGo Hub Telemetry Console</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                connectionStatus === 'CONNECTED_LIVE' ? 'bg-emerald-600' : 'bg-amber-500'
              }`}
            />
            <span className="text-slate-600 font-medium">
              {connectionStatus === 'CONNECTED_LIVE'
                ? 'FastAPI Live Telemetry Connected'
                : 'Benchmark Dataset Active (FastAPI Server Standby)'}
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
