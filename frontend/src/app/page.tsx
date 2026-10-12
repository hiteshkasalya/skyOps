'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Header } from '../components/Header';
import { SummaryCards } from '../components/SummaryCards';
import { ActiveConflictsBanner } from '../components/ActiveConflictsBanner';
import { FlightTable } from '../components/FlightTable';
import { FlightDetailModal } from '../components/FlightDetailModal';
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
} from 'lucide-react';

export default function DashboardPage() {
  const [currentAirport, setCurrentAirport] = useState<string>('DEL');
  const [dataSourceMode, setDataSourceMode] = useState<'auto' | 'mock_only' | 'live_only'>('auto');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'conflicts' | 'disruption' | 'contracts'>('dashboard');

  const [flights, setFlights] = useState<Flight[]>([]);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [health, setHealth] = useState<HealthStatus | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [connectionStatus, setConnectionStatus] = useState<ApiConnectionStatus>('OFFLINE_BENCHMARK');
  const [apiErrorMessage, setApiErrorMessage] = useState<string | undefined>();
  const [endpointUrl, setEndpointUrl] = useState<string>(`${API_BASE_URL}/flights`);

  const [selectedFlight, setSelectedFlight] = useState<Flight | null>(null);

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

  const handleSelectConflictFlight = (flightId: string) => {
    const target = flights.find((f) => f.id === flightId);
    if (target) {
      setSelectedFlight(target);
    }
  };

  const currentDataOrigin: DataSourceOrigin =
    connectionStatus === 'CONNECTED_LIVE' ? 'LIVE' : 'HISTORICAL';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
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
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <nav className="flex space-x-2" aria-label="Dashboard sections">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'dashboard'
                  ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              Operations Dashboard
            </button>
            <button
              onClick={() => setActiveTab('conflicts')}
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'conflicts'
                  ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Conflicts & Bottlenecks
              {conflicts.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center font-bold">
                  {conflicts.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('disruption')}
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'disruption'
                  ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Disruption Simulator
            </button>
            <button
              onClick={() => setActiveTab('contracts')}
              className={`hidden sm:inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'contracts'
                  ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              API Contracts
            </button>
          </nav>

          <div className="hidden lg:flex items-center gap-2 text-xs text-slate-400">
            <span>Operational Hub:</span>
            <span className="font-semibold text-slate-300">
              {currentAirport === 'ALL' ? 'Multi-Hub Aggregator' : `${currentAirport} Hub Operations`}
            </span>
          </div>
        </div>

        {/* Tab 1: Operations Dashboard */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* KPI Cards */}
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
              onSelectFlight={(flight) => setSelectedFlight(flight)}
            />
          </div>
        )}

        {/* Tab 2: Conflicts View */}
        {activeTab === 'conflicts' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                Airport Spatial & Temporal Conflict Registry
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Resource overlaps flagged when turnaround milestones breach assigned gate occupancy windows or runway separation limits.
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
              onSelectFlight={(flight) => setSelectedFlight(flight)}
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

        {/* Tab 4: API Contracts */}
        {activeTab === 'contracts' && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Shield className="w-4 h-4 text-sky-400" />
                  Backend API Contract Conformance (docs/api.md)
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Authoritative schema contracts shared with Developer 1 (Backend).
                </p>
              </div>
              <span className="text-xs font-mono text-sky-400 px-2 py-1 rounded bg-sky-500/10 border border-sky-500/20">
                v1.0 REST + WS
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
              <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
                <span className="text-slate-400 font-bold block">Documented Endpoints (docs/api.md)</span>
                <div className="space-y-1 text-slate-300">
                  <div className="flex justify-between">
                    <span>GET /api/v1/flights</span>
                    <span className="text-emerald-400">Connected Client Ready</span>
                  </div>
                  <div className="flex justify-between">
                    <span>GET /api/v1/health</span>
                    <span className="text-emerald-400">Schema Aligned</span>
                  </div>
                  <div className="flex justify-between">
                    <span>GET /api/v1/conflicts</span>
                    <span className="text-emerald-400">Schema Aligned</span>
                  </div>
                  <div className="flex justify-between">
                    <span>GET /api/v1/airports</span>
                    <span className="text-emerald-400">Schema Aligned</span>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
                <span className="text-slate-400 font-bold block">Dataset & Schema Provenance</span>
                <div className="space-y-1 text-slate-300">
                  <div className="flex justify-between">
                    <span>Dataset File</span>
                    <span className="text-sky-300">backend/data/synthetic_...csv</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pydantic Models</span>
                    <span className="text-sky-300">backend/app/schemas/flight.py</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Record Types</span>
                    <span className="text-amber-300">HISTORICAL vs LIVE_TRACKING</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Airborne Assumption</span>
                    <span className="text-emerald-400">Disabled on Historical</span>
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
        onClose={() => setSelectedFlight(null)}
      />

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950/80 py-4 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span>SkyOps Platform</span>
            <span>•</span>
            <span>Frontend & UI (Developer 2)</span>
            <span>•</span>
            <span className="text-slate-400">IndiGo Hub Telemetry Demo</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                connectionStatus === 'CONNECTED_LIVE' ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
            />
            <span className="text-slate-400">
              {connectionStatus === 'CONNECTED_LIVE'
                ? 'FastAPI Live Telemetry Connected'
                : 'Benchmark Dataset Active (FastAPI Server Offline)'}
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
