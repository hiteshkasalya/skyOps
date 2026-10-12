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
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            COMPLETED (+{flight.delay_minutes}m)
          </span>
        );
      }
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
          COMPLETED (ON TIME)
        </span>
      );
    }

    switch (flight.status) {
      case 'ON_TIME':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            ON TIME
          </span>
        );
      case 'DELAYED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            DELAYED +{flight.delay_minutes}m
          </span>
        );
      case 'BOARDING':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-sky-50 text-sky-800 border border-sky-200">
            BOARDING
          </span>
        );
      case 'TAXIING':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-800 border border-blue-200">
            TAXIING
          </span>
        );
      case 'ARRIVED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            ARRIVED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            {flight.status}
          </span>
        );
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
      {/* Top Telemetry Status Header */}
      <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          {connectionStatus === 'CONNECTED_LIVE' ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
              LIVE TELEMETRY STREAM CONNECTED
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
              <Archive className="w-3.5 h-3.5 text-slate-500" />
              HISTORICAL BENCHMARK ROTATIONS
            </span>
          )}
          <span className="text-xs text-slate-500 font-mono hidden sm:inline">
            Endpoint: <code className="text-slate-700 font-semibold">{endpointUrl}</code>
          </span>
        </div>

        {connectionStatus !== 'CONNECTED_LIVE' && (
          <div className="text-xs text-slate-600 bg-white border border-slate-200 px-2.5 py-1 rounded flex items-center gap-1.5 shadow-2xs">
            <Info className="w-3.5 h-3.5 shrink-0 text-slate-400" />
            <span>Archived IndiGo schedule rotations. Completed flights with recorded timestamps.</span>
          </div>
        )}
      </div>

      {/* Network Error / Fallback Alert */}
      {errorMessage && connectionStatus !== 'CONNECTED_LIVE' && (
        <div className="px-4 py-2.5 bg-amber-50/70 border-b border-amber-200 text-xs text-amber-900 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 truncate">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="truncate">{errorMessage}</span>
          </div>
          <button
            onClick={onRetry}
            className="text-xs text-sky-800 hover:text-sky-950 font-semibold whitespace-nowrap underline ml-2"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="p-3.5 sm:p-4 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white">
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
            className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-md text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sky-600 focus:ring-1 focus:ring-sky-600 transition-colors"
          />
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <div className="flex items-center bg-slate-100 rounded-md p-0.5 text-xs">
            {['ALL', 'ON_TIME', 'DELAYED', 'ARRIVED'].map((st) => (
              <button
                key={st}
                onClick={() => {
                  setStatusFilter(st);
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                  statusFilter === st
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st.replace('_', ' ')}
              </button>
            ))}
          </div>

          {/* Record Type Filter */}
          <div className="flex items-center bg-slate-100 rounded-md p-0.5 text-xs">
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
                className={`px-2 py-1 rounded font-medium transition-colors ${
                  recordTypeFilter === rt.id
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
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
        <div className="divide-y divide-slate-100 animate-pulse bg-white">
          <div className="bg-slate-50 px-4 py-2 text-xs text-slate-400 font-mono">
            POLLING /api/v1/flights TELEMETRY...
          </div>
          {[...Array(6)].map((_, i) => (
            <div key={i} className="px-4 py-3.5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded bg-slate-200" />
                <div className="space-y-1.5">
                  <div className="w-20 h-3.5 bg-slate-200 rounded" />
                  <div className="w-14 h-2.5 bg-slate-100 rounded" />
                </div>
              </div>
              <div className="w-28 h-3.5 bg-slate-200 rounded hidden sm:block" />
              <div className="w-20 h-3.5 bg-slate-200 rounded" />
              <div className="w-16 h-3.5 bg-slate-200 rounded" />
            </div>
          ))}
        </div>
      )}

      {/* Empty Results */}
      {!isLoading && filteredFlights.length === 0 && (
        <div className="p-12 text-center space-y-3 bg-white">
          <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Plane className="w-5 h-5 -rotate-45" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">No Matching Flight Records</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            No flight movements matched your query {searchTerm ? `"${searchTerm}"` : 'with the current active filters'}.
          </p>
          <button
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('ALL');
              setRecordTypeFilter('ALL');
              setCurrentPage(1);
            }}
            className="text-xs text-sky-800 hover:text-sky-950 font-semibold underline"
          >
            Clear Active Filters
          </button>
        </div>
      )}

      {/* Table Data Loaded */}
      {!isLoading && filteredFlights.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-2.5 px-4">Flight / Airline</th>
                <th className="py-2.5 px-4">Route</th>
                <th className="py-2.5 px-4">Aircraft & Reg</th>
                <th className="py-2.5 px-4">Scheduled (UTC)</th>
                <th className="py-2.5 px-4">Actual / Estimated</th>
                <th className="py-2.5 px-4">Gate & Terminal</th>
                <th className="py-2.5 px-4">Status & Provenance</th>
                <th className="py-2.5 px-4 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {paginatedFlights.map((flight) => (
                <tr
                  key={flight.id}
                  onClick={() => onSelectFlight(flight)}
                  className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                >
                  {/* Flight & Airline */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                        <Plane className="w-3 h-3 -rotate-45" />
                      </div>
                      <div>
                        <span className="font-bold font-mono text-slate-900 group-hover:text-sky-800 transition-colors">
                          {flight.flight_number}
                        </span>
                        <div className="text-[11px] text-slate-500">
                          {flight.airline}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Route */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5 font-bold font-mono text-slate-900 text-xs">
                      <span>{flight.origin}</span>
                      <span className="text-slate-400">→</span>
                      <span>{flight.destination}</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {formatDate(flight.scheduled_departure)}
                    </span>
                  </td>

                  {/* Tail & Aircraft */}
                  <td className="py-3 px-4">
                    <div className="font-mono text-slate-800 font-semibold">{flight.registration}</div>
                    <div className="text-[11px] text-slate-500">{flight.aircraft_type}</div>
                  </td>

                  {/* Scheduled Times */}
                  <td className="py-3 px-4 font-mono text-slate-700">
                    <div>Dep: {formatTime(flight.scheduled_departure)}</div>
                    <div className="text-slate-400 text-[10px]">Arr: {formatTime(flight.scheduled_arrival)}</div>
                  </td>

                  {/* Actual / Est Times */}
                  <td className="py-3 px-4 font-mono">
                    {flight.actual_departure ? (
                      <div className="text-slate-800 font-medium">
                        <div>Dep: {formatTime(flight.actual_departure)}</div>
                        <div className="text-slate-500 text-[10px]">Arr: {formatTime(flight.actual_arrival)}</div>
                      </div>
                    ) : (
                      <div className="text-slate-600">
                        <div>Est Dep: {formatTime(flight.estimated_departure)}</div>
                        <div className="text-[10px] text-slate-400">Est Arr: {formatTime(flight.estimated_arrival)}</div>
                      </div>
                    )}
                  </td>

                  {/* Gate & Terminal */}
                  <td className="py-3 px-4">
                    <div className="font-mono text-slate-900 font-semibold">
                      {flight.assigned_gate ? `Gate ${flight.assigned_gate}` : 'Unassigned'}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {flight.terminal ? `Terminal ${flight.terminal}` : 'Main'}
                    </div>
                  </td>

                  {/* Status & Provenance */}
                  <td className="py-3 px-4">
                    <div className="space-y-1">
                      {getStatusBadge(flight)}
                      <div className="flex items-center gap-1 text-[10px] text-slate-500 font-mono">
                        {flight.record_type === 'HISTORICAL' ? (
                          <span className="text-slate-500" title="Archived dataset rotation">
                            HISTORICAL
                          </span>
                        ) : (
                          <span className="text-emerald-700 font-bold" title="Live telemetry packet">
                            LIVE
                          </span>
                        )}
                        <span>•</span>
                        <span className="text-slate-400 truncate max-w-[80px]" title={flight.data_source}>
                          {flight.data_source}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Inspect Action */}
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectFlight(flight);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-900 transition-colors text-xs font-semibold shadow-2xs"
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
      <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <span>
            Showing {filteredFlights.length > 0 ? (currentPage - 1) * PAGE_SIZE + 1 : 0} to{' '}
            {Math.min(currentPage * PAGE_SIZE, filteredFlights.length)} of {filteredFlights.length} records
          </span>
          <span>•</span>
          <span className="font-mono text-slate-500">Page {currentPage} of {totalPages}</span>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1 rounded bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
              title="Previous Page"
              aria-label="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 font-mono text-slate-800 font-semibold">{currentPage}</span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1 rounded bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
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
