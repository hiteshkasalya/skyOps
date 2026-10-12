import React from 'react';
import { Plane, Clock, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Flight, Conflict, DataSourceOrigin } from '../types/api';
import { DataSourceBadge } from './DataSourceBadge';

interface SummaryCardsProps {
  flights: Flight[];
  conflicts: Conflict[];
  dataOrigin: DataSourceOrigin;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({ flights, conflicts, dataOrigin }) => {
  const totalFlights = flights.length;
  const delayedFlightsList = flights.filter(f => f.status === 'DELAYED' || f.delay_minutes > 15);
  const delayedCount = delayedFlightsList.length;

  const totalDelayMinutes = delayedFlightsList.reduce((acc, f) => acc + f.delay_minutes, 0);
  const avgDelay = delayedCount > 0 ? Math.round(totalDelayMinutes / delayedCount) : 0;

  const onTimeCount = flights.filter(f => f.status === 'ON_TIME' || (f.status !== 'DELAYED' && f.delay_minutes <= 15)).length;
  const onTimePercentage = totalFlights > 0 ? Math.round((onTimeCount / totalFlights) * 100) : 100;

  const highSeverityConflicts = conflicts.filter(c => c.severity === 'HIGH').length;

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
        {/* 1. Total Flights */}
        <div className="p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Total Flight Movements
            </span>
            <Plane className="w-4 h-4 text-slate-400" />
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-slate-900">
              {totalFlights}
            </span>
            <span className="text-xs text-slate-500">tracked rotations</span>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Operational schedule</span>
            <span className="font-medium text-slate-700">{flights.length > 0 ? 'Active' : 'Standby'}</span>
          </div>
        </div>

        {/* 2. Delayed Flights */}
        <div className="p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Delayed Departures
            </span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-amber-600">
              {delayedCount}
            </span>
            <span className="text-xs font-semibold text-amber-700 font-mono">
              {avgDelay > 0 ? `Avg +${avgDelay}m` : 'Nominal'}
            </span>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Threshold: &gt;15 mins</span>
            <span className={`font-semibold ${delayedCount > 0 ? 'text-amber-700' : 'text-slate-600'}`}>
              {delayedCount > 0 ? `${delayedCount} flights impacted` : 'Zero delay'}
            </span>
          </div>
        </div>

        {/* 3. On-Time Performance (OTP) */}
        <div className="p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              On-Time Performance (OTP)
            </span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-emerald-700">
              {onTimePercentage}%
            </span>
            <span className="text-xs text-slate-500">
              {onTimeCount} of {totalFlights} on-schedule
            </span>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center gap-2">
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full rounded-full ${onTimePercentage >= 80 ? 'bg-emerald-600' : 'bg-amber-500'}`}
                style={{ width: `${onTimePercentage}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-500 font-mono shrink-0">Target: 85%</span>
          </div>
        </div>

        {/* 4. Active Conflicts */}
        <div className="p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Active Resource Bottlenecks
            </span>
            <AlertTriangle className={`w-4 h-4 ${conflicts.length > 0 ? 'text-rose-600' : 'text-slate-400'}`} />
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span
              className={`text-2xl sm:text-3xl font-bold font-mono tracking-tight ${
                conflicts.length > 0 ? 'text-rose-600' : 'text-slate-800'
              }`}
            >
              {conflicts.length}
            </span>
            <span className="text-xs text-slate-500">
              {highSeverityConflicts > 0 ? `${highSeverityConflicts} critical overlap` : 'Zero collision'}
            </span>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Gate & Runway safety</span>
            <span className={`font-semibold ${conflicts.length > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
              {conflicts.length > 0 ? 'Resolution required' : 'Nominal flow'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
