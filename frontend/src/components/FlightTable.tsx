import React, { useState } from 'react';
import { Search, Filter, AlertCircle, RefreshCw, ChevronRight, Plane, Info } from 'lucide-react';
import { Flight, FlightStatus, DataSourceOrigin } from '../types/api';
import { DataSourceBadge } from './DataSourceBadge';

interface FlightTableProps {
  flights: Flight[];
  isLoading: boolean;
  error?: string | null;
  onRetry: () => void;
  onSelectFlight: (flight: Flight) => void;
  dataOrigin: DataSourceOrigin;
}

export const FlightTable: React.FC<FlightTableProps> = ({
  flights,
  isLoading,
  error,
  onRetry,
  onSelectFlight,
  dataOrigin,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Filter flights based on search and status
  const filteredFlights = flights.filter((flight) => {
    const matchesSearch =
      searchTerm === '' ||
      flight.flight_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      flight.origin.toLowerCase().includes(searchTerm.toLowerCase()) ||
      flight.destination.toLowerCase().includes(searchTerm.toLowerCase()) ||
      flight.assigned_gate.toLowerCase().includes(searchTerm.toLowerCase()) ||
      flight.aircraft_type.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'DELAYED' && (flight.status === 'DELAYED' || flight.delay_minutes > 15)) ||
      (statusFilter === 'ON_TIME' && flight.status === 'ON_TIME') ||
      (statusFilter === 'BOARDING' && flight.status === 'BOARDING') ||
      (statusFilter === 'ARRIVED' && flight.status === 'ARRIVED');

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: FlightStatus, delayMinutes: number) => {
    switch (status) {
      case 'ON_TIME':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-500/30">
            ON TIME
          </span>
        );
      case 'DELAYED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-950/80 text-amber-300 border border-amber-500/30">
            DELAYED +{delayMinutes}m
          </span>
        );
      case 'BOARDING':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-sky-950/80 text-sky-300 border border-sky-500/30 animate-pulse">
            BOARDING
          </span>
        );
      case 'TAXIING':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-950/80 text-blue-300 border border-blue-500/30">
            TAXIING
          </span>
        );
      case 'ARRIVED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
            ARRIVED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
            {status}
          </span>
        );
    }
  };

  const formatTime = (isoString?: string | null) => {
    if (!isoString) return '--:--';
    return isoString.slice(11, 16);
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
      {/* Table Header & Filter Bar */}
      <div className="p-4 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-white tracking-tight">Active Flight Movement Schedule</h2>
            <DataSourceBadge source={dataOrigin} />
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Operational turnaround tracking, gate allocations, and delay propagation status
          </p>
        </div>

        {/* Search & Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search flight, route, gate..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-colors w-48 sm:w-56"
            />
          </div>

          {/* Status Filter Buttons */}
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5 text-xs">
            {['ALL', 'DELAYED', 'ON_TIME', 'BOARDING', 'ARRIVED'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  statusFilter === st
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {st.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content State: Error */}
      {error && (
        <div className="p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="max-w-md mx-auto">
            <h3 className="text-sm font-semibold text-white">Error Connecting to Telemetry Stream</h3>
            <p className="text-xs text-slate-400 mt-1">{error}</p>
          </div>
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry Connection
          </button>
        </div>
      )}

      {/* Content State: Loading Skeleton */}
      {isLoading && !error && (
        <div className="divide-y divide-slate-800/60 animate-pulse">
          <div className="bg-slate-950/40 px-4 py-3 text-xs text-slate-500 font-mono">
            FETCHING LIVE FLIGHT DATA STREAM...
          </div>
          {[...Array(6)].map((_, i) => (
            <div key={i} className="px-4 py-3.5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-800" />
                <div className="space-y-1.5">
                  <div className="w-20 h-3.5 bg-slate-800 rounded" />
                  <div className="w-14 h-2.5 bg-slate-800/60 rounded" />
                </div>
              </div>
              <div className="w-28 h-3.5 bg-slate-800 rounded hidden sm:block" />
              <div className="w-20 h-3.5 bg-slate-800 rounded" />
              <div className="w-16 h-3.5 bg-slate-800 rounded" />
            </div>
          ))}
        </div>
      )}

      {/* Content State: Empty Results */}
      {!isLoading && !error && filteredFlights.length === 0 && (
        <div className="p-10 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
            <Plane className="w-6 h-6 -rotate-45" />
          </div>
          <h3 className="text-sm font-semibold text-white">No Flights Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            No active flights match your current search criteria ({searchTerm ? `"${searchTerm}"` : 'selected filters'}).
          </p>
          {(searchTerm || statusFilter !== 'ALL') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('ALL');
              }}
              className="text-xs text-sky-400 hover:text-sky-300 font-medium underline"
            >
              Reset Search & Filters
            </button>
          )}
        </div>
      )}

      {/* Content State: Table Loaded */}
      {!isLoading && !error && filteredFlights.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Flight / Airline</th>
                <th className="py-3 px-4">Route</th>
                <th className="py-3 px-4">Sched (UTC)</th>
                <th className="py-3 px-4">Est / Act</th>
                <th className="py-3 px-4">Gate & Runway</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {filteredFlights.map((flight) => (
                <tr
                  key={flight.id}
                  onClick={() => onSelectFlight(flight)}
                  className="hover:bg-slate-800/40 transition-colors cursor-pointer group"
                >
                  {/* Flight & Airline */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-md bg-slate-800 text-sky-400 flex items-center justify-center font-bold text-xs shrink-0">
                        <Plane className="w-3.5 h-3.5 -rotate-45" />
                      </div>
                      <div>
                        <span className="font-bold text-white group-hover:text-sky-400 transition-colors">
                          {flight.flight_number}
                        </span>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {flight.aircraft_type} • {flight.registration}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Route */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1.5 font-bold font-mono">
                      <span className="text-white">{flight.origin}</span>
                      <span className="text-slate-500">→</span>
                      <span className="text-white">{flight.destination}</span>
                    </div>
                    <span className="text-[10px] text-slate-400">Terminal {flight.terminal}</span>
                  </td>

                  {/* Scheduled Times */}
                  <td className="py-3.5 px-4 font-mono text-slate-300">
                    <div>Dep: {formatTime(flight.scheduled_departure)}</div>
                    <div className="text-slate-500 text-[10px]">Arr: {formatTime(flight.scheduled_arrival)}</div>
                  </td>

                  {/* Est / Act Times */}
                  <td className="py-3.5 px-4 font-mono">
                    <div className={flight.delay_minutes > 0 ? 'text-amber-400 font-semibold' : 'text-slate-300'}>
                      Dep: {formatTime(flight.estimated_departure)}
                    </div>
                    {flight.delay_minutes > 0 ? (
                      <div className="text-amber-400/80 text-[10px]">+{flight.delay_minutes}m</div>
                    ) : (
                      <div className="text-emerald-400 text-[10px]">On Time</div>
                    )}
                  </td>

                  {/* Gate & Runway */}
                  <td className="py-3.5 px-4">
                    <div className="font-mono text-white font-medium">Gate {flight.assigned_gate}</div>
                    <div className="text-[10px] text-slate-400 font-mono">Rwy {flight.assigned_runway}</div>
                  </td>

                  {/* Status Badge */}
                  <td className="py-3.5 px-4">
                    {getStatusBadge(flight.status, flight.delay_minutes)}
                    {flight.delay_reason && (
                      <div className="text-[10px] text-slate-400 mt-1 max-w-[140px] truncate" title={flight.delay_reason}>
                        {flight.delay_reason.replace(/_/g, ' ')}
                      </div>
                    )}
                  </td>

                  {/* Inspect Action */}
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectFlight(flight);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors text-xs font-medium"
                      aria-label={`Inspect flight ${flight.flight_number}`}
                    >
                      <span>Details</span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer Info */}
      <div className="px-4 py-2.5 bg-slate-950/80 border-t border-slate-800 text-[11px] text-slate-400 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
        <div className="flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-slate-500" />
          <span>Showing {filteredFlights.length} of {flights.length} active movements</span>
        </div>
        <div className="text-slate-500 font-mono">
          FastAPI Contract Specification /api/v1/flights
        </div>
      </div>
    </div>
  );
};
