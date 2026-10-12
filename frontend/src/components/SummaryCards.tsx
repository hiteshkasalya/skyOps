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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Total Flights */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm hover:border-slate-700 transition-colors">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Total Tracked Flights</span>
          <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400">
            <Plane className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-white">{totalFlights}</span>
          <span className="text-xs text-slate-400">scheduled / active</span>
        </div>
        <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
          <span className="text-slate-400">Hub movements</span>
          <DataSourceBadge source={dataOrigin} />
        </div>
      </div>

      {/* 2. Delayed Flights */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm hover:border-slate-700 transition-colors">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Delayed Flights</span>
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
            <Clock className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-amber-400">{delayedCount}</span>
          <span className="text-xs text-amber-300/80">
            {avgDelay > 0 ? `Avg +${avgDelay}m delay` : 'No major delays'}
          </span>
        </div>
        <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
          <span className="text-slate-400">{delayedCount > 0 ? 'Requires turnaround pacing' : 'Flow nominal'}</span>
          <DataSourceBadge source={dataOrigin} />
        </div>
      </div>

      {/* 3. On-Time Performance (OTP) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm hover:border-slate-700 transition-colors">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium uppercase tracking-wider text-slate-400">On-Time Performance</span>
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-emerald-400">{onTimePercentage}%</span>
          <span className="text-xs text-slate-400">{onTimeCount} of {totalFlights} on-time</span>
        </div>
        <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden mr-2">
            <div
              className={`h-full rounded-full ${onTimePercentage >= 80 ? 'bg-emerald-500' : 'bg-amber-500'}`}
              style={{ width: `${onTimePercentage}%` }}
            />
          </div>
          <span className="text-slate-400 text-[10px] whitespace-nowrap">Target: 85%</span>
        </div>
      </div>

      {/* 4. Active Conflicts */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm hover:border-slate-700 transition-colors">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Active Conflicts</span>
          <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400">
            <AlertTriangle className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className={`text-2xl font-bold tracking-tight ${conflicts.length > 0 ? 'text-rose-400' : 'text-slate-300'}`}>
            {conflicts.length}
          </span>
          <span className="text-xs text-rose-300/80">
            {highSeverityConflicts > 0 ? `${highSeverityConflicts} high severity` : '0 critical'}
          </span>
        </div>
        <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
          <span className="text-slate-400">Gate & Runway safety</span>
          <span className="text-xs font-medium text-rose-400">
            {conflicts.length > 0 ? 'Action required' : 'Clear'}
          </span>
        </div>
      </div>
    </div>
  );
};
