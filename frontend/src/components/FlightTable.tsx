import React, { useState } from 'react';
import {
  Search,
  Filter,
  AlertCircle,
  RefreshCw,
  ChevronRight,
  Plane,
  Info,
  Archive,
  ChevronLeft,
  Radio,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { Flight, FlightStatus, ApiConnectionStatus } from '../types/api';

interface FlightTableProps {
  flights: Flight[];
  isLoading: boolean;
  connectionStatus: ApiConnectionStatus;
  errorMessage?: string;
  endpointUrl: string;
  onRetry: () => void;
  onSelectFlight: (flight: Flight) => void;
}

const PAGE_SIZE = 8;

export const FlightTable: React.FC<FlightTableProps> = ({
  flights,
  isLoading,
  connectionStatus,
  errorMessage,
  endpointUrl,
  onRetry,
  onSelectFlight,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [recordTypeFilter, setRecordTypeFilter] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);

  // Filter flights based on search, status, and record_type
  const filteredFlights = flights.filter((flight) => {
    const matchesSearch =
      searchTerm === '' ||
      flight.flight_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      flight.origin.toLowerCase().includes(searchTerm.toLowerCase()) ||
      flight.destination.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (flight.assigned_gate && flight.assigned_gate.toLowerCase().includes(searchTerm.toLowerCase())) ||
      flight.aircraft_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      flight.registration.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'DELAYED' && (flight.status === 'DELAYED' || flight.delay_minutes > 15)) ||
      (statusFilter === 'ON_TIME' && flight.status === 'ON_TIME') ||
      (statusFilter === 'ARRIVED' && (flight.status === 'ARRIVED' || flight.actual_arrival !== null));

    const matchesRecordType =
      recordTypeFilter === 'ALL' || flight.record_type === recordTypeFilter;

    return matchesSearch && matchesStatus && matchesRecordType;
  });

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredFlights.length / PAGE_SIZE));
  const paginatedFlights = filteredFlights.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const formatTime = (isoString?: string | null) => {
    if (!isoString) return '--:--';
    return isoString.slice(11, 16);
  };

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return '';
    return isoString.slice(0, 10);
  };

  const getStatusBadge = (flight: Flight) => {
    if (flight.record_type === 'HISTORICAL') {
      if (flight.delay_minutes > 0) {
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-950/80 text-amber-300 border border-amber-500/30">
            COMPLETED (+{flight.delay_minutes}m)
          </span>
        );
      }
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
          COMPLETED (ON TIME)
        </span>
      );
    }

    switch (flight.status) {
      case 'ON_TIME':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-500/30">
            ON TIME
          </span>
        );
      case 'DELAYED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-950/80 text-amber-300 border border-amber-500/30">
            DELAYED +{flight.delay_minutes}m
          </span>
        );
      case 'BOARDING':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-sky-950/80 text-sky-300 border border-sky-500/30 animate-pulse">
            BOARDING
          </span>
        );
      case 'TAXIING':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-950/80 text-blue-300 border border-blue-500/30">
            TAXIING
          </span>
        );
      case 'ARRIVED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
            ARRIVED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
            {flight.status}
          </span>
        );
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
      {/* Top Telemetry Status Header */}
      <div className="px-4 py-3 bg-slate-950/90 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          {connectionStatus === 'CONNECTED_LIVE' ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-500/30">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              LIVE TELEMETRY CONNECTED
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
              <Archive className="w-3.5 h-3.5 text-slate-400" />
              HISTORICAL BENCHMARK DATASET
            </span>
          )}
          <span className="text-xs text-slate-400 font-mono hidden sm:inline">
            Endpoint: <code className="text-slate-300">{endpointUrl}</code>
          </span>
        </div>

        {connectionStatus !== 'CONNECTED_LIVE' && (
          <div className="text-xs text-amber-300/90 bg-amber-950/30 border border-amber-500/20 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 shrink-0 text-amber-400" />
            <span>Historical benchmark records. Flights are archived rotations, not currently airborne.</span>
          </div>
        )}
      </div>

      {/* Network Error / Fallback Alert */}
      {errorMessage && connectionStatus !== 'CONNECTED_LIVE' && (
        <div className="px-4 py-2.5 bg-slate-950 border-b border-slate-800/80 text-xs text-slate-400 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 truncate">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="truncate">{errorMessage}</span>
          </div>
          <button
            onClick={onRetry}
            className="text-xs text-sky-400 hover:text-sky-300 font-medium whitespace-nowrap underline"
          >
            Retry Live Connection
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="p-4 border-b border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search flight #, route, gate, tail #..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
          />
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5 text-xs">
            {['ALL', 'ON_TIME', 'DELAYED', 'ARRIVED'].map((st) => (
              <button
                key={st}
                onClick={() => {
                  setStatusFilter(st);
                  setCurrentPage(1);
                }}
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

          {/* Record Type Filter */}
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5 text-xs">
            {[
              { id: 'ALL', label: 'All Records' },
              { id: 'HISTORICAL', label: 'Historical Only' },
              { id: 'LIVE_TRACKING', label: 'Live Only' },
            ].map((rt) => (
              <button
                key={rt.id}
                onClick={() => {
                  setRecordTypeFilter(rt.id);
                  setCurrentPage(1);
                }}
                className={`px-2 py-1 rounded-md font-medium transition-colors ${
                  recordTypeFilter === rt.id
                    ? 'bg-slate-800 text-sky-400 border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {rt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="divide-y divide-slate-800/60 animate-pulse">
          <div className="bg-slate-950/40 px-4 py-3 text-xs text-slate-500 font-mono">
            CONNECTING TO GET /api/v1/flights TELEMETRY...
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

      {/* Empty Results */}
      {!isLoading && filteredFlights.length === 0 && (
        <div className="p-10 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
            <Plane className="w-6 h-6 -rotate-45" />
          </div>
          <h3 className="text-sm font-semibold text-white">No Matching Flights Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            No flight records matched your query {searchTerm ? `"${searchTerm}"` : 'with the active filters'}.
          </p>
          <button
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('ALL');
              setRecordTypeFilter('ALL');
              setCurrentPage(1);
            }}
            className="text-xs text-sky-400 hover:text-sky-300 font-medium underline"
          >
            Clear All Filters
          </button>
        </div>
      )}

      {/* Table Data Loaded */}
      {!isLoading && filteredFlights.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Flight / Airline</th>
                <th className="py-3 px-4">Route</th>
                <th className="py-3 px-4">Tail # / Aircraft</th>
                <th className="py-3 px-4">Scheduled (UTC)</th>
                <th className="py-3 px-4">Actual / Est</th>
                <th className="py-3 px-4">Gate & Terminal</th>
                <th className="py-3 px-4">Status & Provenance</th>
                <th className="py-3 px-4 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {paginatedFlights.map((flight) => (
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
                        <div className="text-[10px] text-slate-400">
                          {flight.airline}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Route */}
                  <td className="py-3.5 px-4 font-mono">
                    <div className="flex items-center gap-1.5 font-bold">
                      <span className="text-white">{flight.origin}</span>
                      <span className="text-slate-500">→</span>
                      <span className="text-white">{flight.destination}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-sans">
                      Date: {formatDate(flight.scheduled_departure)}
                    </span>
                  </td>

                  {/* Tail & Aircraft */}
                  <td className="py-3.5 px-4">
                    <div className="font-mono text-slate-200 font-semibold">{flight.registration}</div>
                    <div className="text-[10px] text-slate-400">{flight.aircraft_type}</div>
                  </td>

                  {/* Scheduled Times */}
                  <td className="py-3.5 px-4 font-mono text-slate-300">
                    <div>Dep: {formatTime(flight.scheduled_departure)}</div>
                    <div className="text-slate-500 text-[10px]">Arr: {formatTime(flight.scheduled_arrival)}</div>
                  </td>

                  {/* Actual / Est Times */}
                  <td className="py-3.5 px-4 font-mono">
                    {flight.actual_departure ? (
                      <div className="text-slate-200">
                        <div>Dep: {formatTime(flight.actual_departure)}</div>
                        <div className="text-slate-400 text-[10px]">Arr: {formatTime(flight.actual_arrival)}</div>
                      </div>
                    ) : (
                      <div className="text-slate-400">
                        <div>Est Dep: {formatTime(flight.estimated_departure)}</div>
                        <div className="text-[10px]">Est Arr: {formatTime(flight.estimated_arrival)}</div>
                      </div>
                    )}
                  </td>

                  {/* Gate & Terminal */}
                  <td className="py-3.5 px-4">
                    <div className="font-mono text-white font-medium">
                      {flight.assigned_gate ? `Gate ${flight.assigned_gate}` : 'Unassigned'}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {flight.terminal ? `Terminal ${flight.terminal}` : 'Main'}
                    </div>
                  </td>

                  {/* Status & Provenance */}
                  <td className="py-3.5 px-4">
                    <div className="space-y-1">
                      {getStatusBadge(flight)}
                      <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
                        {flight.record_type === 'HISTORICAL' ? (
                          <span className="text-slate-400" title="Archived dataset record">
                            HISTORICAL
                          </span>
                        ) : (
                          <span className="text-emerald-400" title="Live telemetry packet">
                            LIVE
                          </span>
                        )}
                        <span>•</span>
                        <span className="text-slate-500 truncate max-w-[80px]" title={flight.data_source}>
                          {flight.data_source}
                        </span>
                      </div>
                    </div>
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

      {/* Pagination & Footer Controls */}
      <div className="px-4 py-3 bg-slate-950/80 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <span>
            Showing {filteredFlights.length > 0 ? (currentPage - 1) * PAGE_SIZE + 1 : 0} to{' '}
            {Math.min(currentPage * PAGE_SIZE, filteredFlights.length)} of {filteredFlights.length} flight records
          </span>
          <span>•</span>
          <span className="font-mono text-slate-500">Page {currentPage} of {totalPages}</span>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1 rounded bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed"
              title="Previous Page"
              aria-label="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 font-mono text-slate-300">{currentPage}</span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1 rounded bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed"
              title="Next Page"
              aria-label="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
