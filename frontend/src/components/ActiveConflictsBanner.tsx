import React, { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, ArrowRight, Zap, CheckCircle2 } from 'lucide-react';
import { Conflict } from '../types/api';

interface ActiveConflictsBannerProps {
  conflicts: Conflict[];
  onSelectConflictFlight?: (flightId: string) => void;
}

export const ActiveConflictsBanner: React.FC<ActiveConflictsBannerProps> = ({
  conflicts,
  onSelectConflictFlight,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [resolvedIds, setResolvedIds] = useState<string[]>([]);

  if (conflicts.length === 0) return null;

  const handleSimulateResolve = (conflictId: string) => {
    setResolvedIds(prev => [...prev, conflictId]);
  };

  const activeList = conflicts.filter(c => !resolvedIds.includes(c.id));
  if (activeList.length === 0) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3.5 flex items-center justify-between text-xs text-emerald-800">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-medium">All detected resource bottlenecks have been mitigated or simulated resolved.</span>
        </div>
        <button
          onClick={() => setResolvedIds([])}
          className="underline font-semibold text-emerald-700 hover:text-emerald-900 ml-4 shrink-0"
        >
          Reset Simulation
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white border border-rose-200 border-l-4 border-l-rose-600 rounded-lg shadow-sm overflow-hidden">
      <div
        className="px-4 py-3 flex items-center justify-between cursor-pointer bg-rose-50/50 hover:bg-rose-50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded bg-rose-100 text-rose-700 shrink-0">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-slate-900">
                {activeList.length} Operational Resource {activeList.length === 1 ? 'Collision' : 'Collisions'} Flagged
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 uppercase tracking-wider">
                Critical Priority
              </span>
            </div>
            <p className="text-xs text-slate-600 hidden sm:block mt-0.5">
              Spatial or temporal overlap detected across assigned gate occupancy windows
            </p>
          </div>
        </div>
        <button
          className="text-slate-500 hover:text-slate-700 p-1"
          aria-label={isExpanded ? 'Collapse conflicts banner' : 'Expand conflicts banner'}
        >
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {isExpanded && (
        <div className="p-4 space-y-3 border-t border-rose-100 divide-y divide-slate-100">
          {activeList.map((conflict) => (
            <div key={conflict.id} className="pt-3 first:pt-0 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-mono font-bold text-slate-900 px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
                    {conflict.resource_id}
                  </span>
                  <span className="text-xs font-bold text-rose-800 uppercase tracking-wide">
                    {conflict.type.replace(/_/g, ' ')}
                  </span>
                  <span className="text-xs text-slate-500 font-mono">
                    Overlap: {conflict.overlap_start.slice(11, 16)} – {conflict.overlap_end.slice(11, 16)} UTC
                  </span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">
                  {conflict.description}
                </p>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span>Impacted rotations:</span>
                  {conflict.conflicting_flight_ids.map((fid) => (
                    <button
                      key={fid}
                      onClick={() => onSelectConflictFlight && onSelectConflictFlight(fid)}
                      className="font-mono text-sky-700 hover:text-sky-900 font-semibold underline text-xs"
                      title="Inspect flight turnaround detail"
                    >
                      {fid}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleSimulateResolve(conflict.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors shadow-sm"
                  title="Simulate applying tactical gate re-assignment proposal"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  Simulate Recovery
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
