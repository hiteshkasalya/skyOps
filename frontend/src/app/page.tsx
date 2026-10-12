'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Header } from '../components/Header';
import { SummaryCards } from '../components/SummaryCards';
import { ActiveConflictsBanner } from '../components/ActiveConflictsBanner';
import { FlightTable } from '../components/FlightTable';
import { FlightDetailModal } from '../components/FlightDetailModal';
import { DataSourceBadge } from '../components/DataSourceBadge';
import { getFlights, getConflicts, getHealth } from '../services/apiClient';
import { Flight, Conflict, DataSourceOrigin, HealthStatus } from '../types/api';
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
} from 'lucide-react';

export default function DashboardPage() {
  const [currentAirport, setCurrentAirport] = useState<string>('DEL');
  const [dataSourceMode, setDataSourceMode] = useState<'auto' | 'mock_only' | 'live_only'>('auto');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'conflicts' | 'disruption' | 'contracts'>('dashboard');

  const [flights, setFlights] = useState<Flight[]>([]);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [health, setHealth] = useState<HealthStatus | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [dataOrigin, setDataOrigin] = useState<DataSourceOrigin>('DEMO_FIXTURE');

  const [selectedFlight, setSelectedFlight] = useState<Flight | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const airportParam = currentAirport === 'ALL' ? undefined : currentAirport;

      const [flightRes, conflictRes, healthRes] = await Promise.all([
        getFlights({ origin: airportParam }, dataSourceMode),
        getConflicts(airportParam, dataSourceMode),
        getHealth(dataSourceMode),
      ]);

      if (flightRes.error) {
        setError(flightRes.error);
      } else {
        setFlights(flightRes.data);
        setDataOrigin(flightRes.meta.source);
      }

      setConflicts(conflictRes.data);
      setHealth(healthRes.data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to retrieve airport telemetry';
      setError(msg);
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navigation & Status Header */}
      <Header
        currentAirport={currentAirport}
        onSelectAirport={setCurrentAirport}
        dataOrigin={dataOrigin}
        dataSourceMode={dataSourceMode}
        onSelectDataMode={setDataSourceMode}
        onRefresh={fetchData}
        isLoading={isLoading}
      />

      {/* Main Container */}
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
            <span>Operational Mode:</span>
            <span className="font-semibold text-slate-300">
              {currentAirport === 'ALL' ? 'Multi-Hub Aggregator' : `${currentAirport} Hub Operations`}
            </span>
          </div>
        </div>

        {/* Tab 1: Operations Dashboard */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* KPI Summary Cards */}
            <SummaryCards flights={flights} conflicts={conflicts} dataOrigin={dataOrigin} />

            {/* Active Resource Conflicts Banner */}
            <ActiveConflictsBanner
              conflicts={conflicts}
              onSelectConflictFlight={handleSelectConflictFlight}
            />

            {/* Flight Operations Table */}
            <FlightTable
              flights={flights}
              isLoading={isLoading}
              error={error}
              onRetry={fetchData}
              onSelectFlight={(flight) => setSelectedFlight(flight)}
              dataOrigin={dataOrigin}
            />
          </div>
        )}

        {/* Tab 2: Conflicts & Bottlenecks View */}
        {activeTab === 'conflicts' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                Airport Spatial & Temporal Conflict Registry
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Spatial-temporal overlaps flagged by the conflict engine where turnaround durations exceed allocated gate occupancy windows or runway separation minimums.
              </p>
            </div>

            <ActiveConflictsBanner
              conflicts={conflicts}
              onSelectConflictFlight={handleSelectConflictFlight}
            />

            <FlightTable
              flights={flights.filter((f) => f.status === 'DELAYED' || f.delay_minutes > 0)}
              isLoading={isLoading}
              error={error}
              onRetry={fetchData}
              onSelectFlight={(flight) => setSelectedFlight(flight)}
              dataOrigin={dataOrigin}
            />
          </div>
        )}

        {/* Tab 3: Disruption Simulator Preview */}
        {activeTab === 'disruption' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white">Runway Closure & Tactical Recovery Simulator</h2>
                    <p className="text-xs text-slate-400">
                      Evaluates operational impact when airport runways close due to disabled aircraft or maintenance (POST /api/v1/simulations/runway-closure).
                    </p>
                  </div>
                </div>
                <DataSourceBadge source="SIMULATED" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-800 text-xs">
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-400 block text-[10px] uppercase">Simulated Incident</span>
                  <span className="text-base font-bold text-white mt-1 block">DEL Runway 10/28 FOD Inspection</span>
                  <p className="text-slate-400 mt-1">Duration: 150 minutes (09:00 - 11:30 UTC)</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-400 block text-[10px] uppercase">Projected Capacity Impact</span>
                  <span className="text-base font-bold text-amber-400 mt-1 block">-28.5% Movement Capacity</span>
                  <p className="text-slate-400 mt-1">18 impacted flights • 12 ground delays • 2 diversions</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-400 block text-[10px] uppercase">Tactical Recovery Strategy</span>
                  <span className="text-base font-bold text-emerald-400 mt-1 block">Re-sequence to Runway 09/27</span>
                  <p className="text-slate-400 mt-1">Mitigates ~140 minutes of cumulative passenger delay</p>
                </div>
              </div>
            </div>

            <FlightTable
              flights={flights}
              isLoading={isLoading}
              error={error}
              onRetry={fetchData}
              onSelectFlight={(flight) => setSelectedFlight(flight)}
              dataOrigin={dataOrigin}
            />
          </div>
        )}

        {/* Tab 4: API Contracts View */}
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
                <span className="text-slate-400 font-bold block">Implemented Endpoints</span>
                <div className="space-y-1 text-slate-300">
                  <div className="flex justify-between">
                    <span>GET /api/v1/health</span>
                    <span className="text-emerald-400">Contract Ready</span>
                  </div>
                  <div className="flex justify-between">
                    <span>GET /api/v1/airports</span>
                    <span className="text-emerald-400">Contract Ready</span>
                  </div>
                  <div className="flex justify-between">
                    <span>GET /api/v1/flights</span>
                    <span className="text-emerald-400">Contract Ready</span>
                  </div>
                  <div className="flex justify-between">
                    <span>GET /api/v1/conflicts</span>
                    <span className="text-emerald-400">Contract Ready</span>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
                <span className="text-slate-400 font-bold block">Future Integration Endpoints</span>
                <div className="space-y-1 text-slate-300">
                  <div className="flex justify-between">
                    <span>POST /api/v1/simulations/runway-closure</span>
                    <span className="text-sky-400">In Design</span>
                  </div>
                  <div className="flex justify-between">
                    <span>POST /api/v1/optimization/solve-gates</span>
                    <span className="text-sky-400">In Design</span>
                  </div>
                  <div className="flex justify-between">
                    <span>POST /api/v1/copilot/chat</span>
                    <span className="text-sky-400">In Design</span>
                  </div>
                  <div className="flex justify-between">
                    <span>WS /ws/v1/live-ops</span>
                    <span className="text-sky-400">In Design</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Flight Detail Inspection Modal */}
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
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-slate-400">
              {health?.database || 'Local Data Provider Nominal'}
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
