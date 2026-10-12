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
      <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-3.5 flex items-center justify-between text-xs text-emerald-300">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>All detected resource conflicts have been mitigated or simulated resolved.</span>
        </div>
        <button
          onClick={() => setResolvedIds([])}
          className="underline text-emerald-400 hover:text-emerald-300"
        >
          Reset Simulation
        </button>
      </div>
    );
  }

  return (
    <div className="bg-rose-950/30 border border-rose-500/30 rounded-xl overflow-hidden shadow-sm">
      <div
        className="px-4 py-3 flex items-center justify-between cursor-pointer bg-rose-950/40 hover:bg-rose-950/60 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-rose-200">
                {activeList.length} Operational Resource {activeList.length === 1 ? 'Conflict' : 'Conflicts'} Detected
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                HIGH PRIORITY
              </span>
            </div>
            <p className="text-xs text-rose-300/80 hidden sm:block">
              Algorithmic collision flagged between scheduled turnaround times and resource allocation
            </p>
          </div>
        </div>
        <button
          className="text-rose-400 hover:text-rose-300 p-1"
          aria-label={isExpanded ? 'Collapse conflicts banner' : 'Expand conflicts banner'}
        >
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {isExpanded && (
        <div className="p-4 space-y-3 border-t border-rose-900/40 divide-y divide-rose-900/20">
          {activeList.map((conflict) => (
            <div key={conflict.id} className="pt-3 first:pt-0 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white px-2 py-0.5 rounded bg-slate-900 border border-slate-700">
                    {conflict.resource_id}
                  </span>
                  <span className="text-xs font-semibold text-rose-300">
                    {conflict.type.replace(/_/g, ' ')}
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Overlap: {conflict.overlap_start.slice(11, 16)} - {conflict.overlap_end.slice(11, 16)} UTC
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {conflict.description}
                </p>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span>Impacted flights:</span>
                  {conflict.conflicting_flight_ids.map((fid) => (
                    <button
                      key={fid}
                      onClick={() => onSelectConflictFlight && onSelectConflictFlight(fid)}
                      className="font-mono text-sky-400 hover:text-sky-300 underline text-xs"
                    >
                      {fid}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleSimulateResolve(conflict.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium transition-colors shadow-sm"
                  title="Simulate applying OR-Tools optimization proposal"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-300" />
                  Simulate Recovery Proposal
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
