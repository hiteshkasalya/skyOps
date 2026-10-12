import React from 'react';
import { X, Plane, Clock, MapPin, Users, Fuel, Utensils, Luggage, Sparkles, AlertCircle, Archive, CheckCircle2 } from 'lucide-react';
import { Flight, MilestoneStatus } from '../types/api';

interface FlightDetailModalProps {
  flight: Flight | null;
  onClose: () => void;
}

const MilestoneBadge: React.FC<{ label: string; status?: MilestoneStatus }> = ({ label, status = 'PENDING' }) => {
  let color = 'bg-slate-800 text-slate-400 border-slate-700';
  if (status === 'COMPLETED') color = 'bg-emerald-950/80 text-emerald-300 border-emerald-500/30';
  if (status === 'IN_PROGRESS') color = 'bg-sky-950/80 text-sky-300 border-sky-500/30 animate-pulse';
  if (status === 'DELAYED') color = 'bg-rose-950/80 text-rose-300 border-rose-500/30';

  return (
    <div className={`flex items-center justify-between p-2 rounded-lg border text-xs ${color}`}>
      <span className="font-medium">{label}</span>
      <span className="font-mono text-[10px] font-semibold">{status.replace('_', ' ')}</span>
    </div>
  );
};

export const FlightDetailModal: React.FC<FlightDetailModalProps> = ({ flight, onClose }) => {
  if (!flight) return null;

  const formatTime = (isoString?: string | null) => {
    if (!isoString) return '--:--';
    return isoString.slice(11, 16) + ' UTC';
  };

  const isHistorical = flight.record_type === 'HISTORICAL';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div
        className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-slate-900/95 backdrop-blur z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center">
              <Plane className="w-5 h-5 -rotate-45" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white">{flight.flight_number}</h3>
                <span className="text-xs text-slate-400 font-mono">({flight.airline})</span>
                {isHistorical ? (
                  <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1">
                    <Archive className="w-3 h-3 text-slate-400" />
                    HISTORICAL ARCHIVE
                  </span>
                ) : (
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                    flight.status === 'DELAYED'
                      ? 'bg-amber-950/80 text-amber-300 border border-amber-500/30'
                      : 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30'
                  }`}>
                    {flight.status}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                {flight.aircraft_type} • Tail / Reg: <span className="font-mono text-slate-300">{flight.registration}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-6">
          {/* Historical Record Notice */}
          {isHistorical && (
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 flex items-start gap-2.5">
              <Archive className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-semibold text-white block">Historical Benchmark Record</span>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  This record originates from the verified IndiGo synthetic benchmark dataset ({flight.data_source}).
                  It represents an archived schedule rotation with recorded completion timestamps, and is <strong>not an active airborne flight</strong>.
                </p>
              </div>
            </div>
          )}

          {/* Route & Times */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4">
            <div className="grid grid-cols-3 items-center text-center">
              <div>
                <span className="text-2xl font-black text-white">{flight.origin}</span>
                <p className="text-xs text-slate-400 mt-0.5">
                  {flight.terminal ? `Terminal ${flight.terminal}` : 'Terminal N/A'}
                </p>
                <p className="text-xs text-sky-400 font-mono mt-1">
                  {flight.assigned_gate ? `Gate ${flight.assigned_gate}` : 'Unassigned'}
                </p>
              </div>

              <div className="flex flex-col items-center">
                <span className="text-xs text-slate-500 font-mono">
                  {flight.assigned_runway ? `Runway ${flight.assigned_runway}` : 'Rwy Unassigned'}
                </span>
                <div className="w-full flex items-center justify-center gap-1 my-1">
                  <div className="h-px bg-slate-700 flex-1" />
                  <Plane className="w-4 h-4 text-sky-400 rotate-90" />
                  <div className="h-px bg-slate-700 flex-1" />
                </div>
                {flight.delay_minutes > 0 ? (
                  <span className="text-xs font-semibold text-amber-400 font-mono">
                    +{flight.delay_minutes}m departure delay
                  </span>
                ) : (
                  <span className="text-xs font-semibold text-emerald-400 font-mono">On Schedule</span>
                )}
              </div>

              <div>
                <span className="text-2xl font-black text-white">{flight.destination}</span>
                <p className="text-xs text-slate-400 mt-0.5">Destination Hub</p>
                <p className="text-xs text-slate-400 font-mono mt-1">Non-Stop</p>
              </div>
            </div>

            {/* Time Breakdown */}
            <div className="mt-4 pt-4 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
              <div className="p-2 rounded bg-slate-900/60">
                <span className="text-slate-400 block text-[10px]">Sched Departure</span>
                <span className="font-mono font-medium text-slate-200">{formatTime(flight.scheduled_departure)}</span>
              </div>
              <div className="p-2 rounded bg-slate-900/60">
                <span className="text-slate-400 block text-[10px]">
                  {flight.actual_departure ? 'Actual Departure' : 'Est Departure'}
                </span>
                <span className="font-mono font-medium text-amber-300">
                  {formatTime(flight.actual_departure || flight.estimated_departure)}
                </span>
              </div>
              <div className="p-2 rounded bg-slate-900/60">
                <span className="text-slate-400 block text-[10px]">Sched Arrival</span>
                <span className="font-mono font-medium text-slate-200">{formatTime(flight.scheduled_arrival)}</span>
              </div>
              <div className="p-2 rounded bg-slate-900/60">
                <span className="text-slate-400 block text-[10px]">
                  {flight.actual_arrival ? 'Actual Arrival' : 'Est Arrival'}
                </span>
                <span className="font-mono font-medium text-amber-300">
                  {formatTime(flight.actual_arrival || flight.estimated_arrival)}
                </span>
              </div>
            </div>

            {flight.delay_reason && (
              <div className="mt-3 p-2.5 rounded-lg bg-amber-950/40 border border-amber-500/20 flex items-center gap-2 text-xs text-amber-300">
                <Clock className="w-4 h-4 shrink-0" />
                <span>
                  Recorded delay cause: <strong className="font-mono">{flight.delay_reason}</strong>
                </span>
              </div>
            )}
          </div>

          {/* Turnaround Milestones */}
          {flight.turnaround && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                Turnaround Milestones & Pacing
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <MilestoneBadge label="1. Deboarding" status={flight.turnaround.deboarding_status} />
                <MilestoneBadge label="2. Cleaning" status={flight.turnaround.cleaning_status} />
                <MilestoneBadge label="3. Fueling" status={flight.turnaround.fueling_status} />
                <MilestoneBadge label="4. Catering" status={flight.turnaround.catering_status} />
                <MilestoneBadge label="5. Baggage Loading" status={flight.turnaround.baggage_loading_status} />
                <MilestoneBadge label="6. Pax Boarding" status={flight.turnaround.boarding_status} />
              </div>
            </div>
          )}

          {/* Passenger Connection Risk */}
          {flight.passengers && (
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-sky-400" />
                Passenger & Inbound Connection Impact
              </h4>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-lg font-bold text-white">{flight.passengers.total}</span>
                  <p className="text-[10px] text-slate-400">Total Booked Pax</p>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-lg font-bold text-sky-400">{flight.passengers.connecting_passengers}</span>
                  <p className="text-[10px] text-slate-400">Connecting Flights</p>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                  <span className={`text-lg font-bold ${flight.passengers.tight_connections_at_risk > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {flight.passengers.tight_connections_at_risk}
                  </span>
                  <p className="text-[10px] text-slate-400">Tight Connections at Risk</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
          <span>
            Record ID: <span className="font-mono text-slate-300">{flight.id}</span>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
