import React from 'react';
import { X, Plane, Clock, MapPin, Users, Fuel, Utensils, Luggage, Sparkles, AlertCircle, Archive, CheckCircle2 } from 'lucide-react';
import { Flight, MilestoneStatus } from '../types/api';

interface FlightDetailModalProps {
  flight: Flight | null;
  onClose: () => void;
}

const MilestoneBadge: React.FC<{ label: string; status?: MilestoneStatus }> = ({ label, status = 'PENDING' }) => {
  let color = 'bg-slate-50 text-slate-600 border-slate-200';
  if (status === 'COMPLETED') color = 'bg-emerald-50 text-emerald-800 border-emerald-200';
  if (status === 'IN_PROGRESS') color = 'bg-sky-50 text-sky-800 border-sky-200';
  if (status === 'DELAYED') color = 'bg-rose-50 text-rose-800 border-rose-200';

  return (
    <div className={`flex items-center justify-between p-2 rounded-md border text-xs ${color}`}>
      <span className="font-semibold">{label}</span>
      <span className="font-mono text-[10px] font-bold uppercase">{status.replace('_', ' ')}</span>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div
        className="bg-white border border-slate-200 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl relative text-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-sky-800 text-white flex items-center justify-center shrink-0">
              <Plane className="w-5 h-5 -rotate-45" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-bold font-mono text-slate-900">{flight.flight_number}</h3>
                <span className="text-xs text-slate-500 font-medium">({flight.airline})</span>
                {isHistorical ? (
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1">
                    <Archive className="w-3 h-3 text-slate-500" />
                    HISTORICAL ROTATION
                  </span>
                ) : (
                  <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                    flight.status === 'DELAYED'
                      ? 'bg-amber-50 text-amber-800 border border-amber-200'
                      : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  }`}>
                    {flight.status}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {flight.aircraft_type} • Tail / Reg: <span className="font-mono font-semibold text-slate-700">{flight.registration}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5">
          {/* Historical Record Notice */}
          {isHistorical && (
            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 flex items-start gap-2.5">
              <Archive className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-bold text-slate-900 block">Verified Historical Dataset Record</span>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  This flight is sourced from the benchmark IndiGo operational dataset ({flight.data_source}).
                  It represents a completed historical flight rotation with verified departure/arrival times, and is <strong>not currently airborne</strong>.
                </p>
              </div>
            </div>
          )}

          {/* Route & Times */}
          <div className="bg-slate-50/70 border border-slate-200 rounded-lg p-4">
            <div className="grid grid-cols-3 items-center text-center">
              <div>
                <span className="text-2xl font-black font-mono text-slate-900">{flight.origin}</span>
                <p className="text-xs text-slate-500 mt-0.5">
                  {flight.terminal ? `Terminal ${flight.terminal}` : 'Main Terminal'}
                </p>
                <p className="text-xs text-sky-800 font-mono font-bold mt-1">
                  {flight.assigned_gate ? `Gate ${flight.assigned_gate}` : 'Unassigned'}
                </p>
              </div>

              <div className="flex flex-col items-center">
                <span className="text-[11px] text-slate-500 font-mono">
                  {flight.assigned_runway ? `Runway ${flight.assigned_runway}` : 'Rwy Unassigned'}
                </span>
                <div className="w-full flex items-center justify-center gap-1 my-1">
                  <div className="h-px bg-slate-300 flex-1" />
                  <Plane className="w-3.5 h-3.5 text-slate-500 rotate-90" />
                  <div className="h-px bg-slate-300 flex-1" />
                </div>
                {flight.delay_minutes > 0 ? (
                  <span className="text-xs font-bold text-amber-700 font-mono">
                    +{flight.delay_minutes}m departure delay
                  </span>
                ) : (
                  <span className="text-xs font-semibold text-emerald-700 font-mono">On Schedule</span>
                )}
              </div>

              <div>
                <span className="text-2xl font-black font-mono text-slate-900">{flight.destination}</span>
                <p className="text-xs text-slate-500 mt-0.5">Destination Hub</p>
                <p className="text-xs text-slate-500 font-mono mt-1">Non-Stop</p>
              </div>
            </div>

            {/* Time Breakdown */}
            <div className="mt-4 pt-3.5 border-t border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
              <div className="p-2 rounded bg-white border border-slate-200">
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">Sched Departure</span>
                <span className="font-mono font-semibold text-slate-800">{formatTime(flight.scheduled_departure)}</span>
              </div>
              <div className="p-2 rounded bg-white border border-slate-200">
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">
                  {flight.actual_departure ? 'Actual Departure' : 'Est Departure'}
                </span>
                <span className="font-mono font-semibold text-amber-700">
                  {formatTime(flight.actual_departure || flight.estimated_departure)}
                </span>
              </div>
              <div className="p-2 rounded bg-white border border-slate-200">
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">Sched Arrival</span>
                <span className="font-mono font-semibold text-slate-800">{formatTime(flight.scheduled_arrival)}</span>
              </div>
              <div className="p-2 rounded bg-white border border-slate-200">
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">
                  {flight.actual_arrival ? 'Actual Arrival' : 'Est Arrival'}
                </span>
                <span className="font-mono font-semibold text-amber-700">
                  {formatTime(flight.actual_arrival || flight.estimated_arrival)}
                </span>
              </div>
            </div>

            {flight.delay_reason && (
              <div className="mt-3 p-2.5 rounded bg-amber-50 border border-amber-200 flex items-center gap-2 text-xs text-amber-900">
                <Clock className="w-4 h-4 shrink-0 text-amber-600" />
                <span>
                  Recorded delay cause: <strong className="font-mono">{flight.delay_reason}</strong>
                </span>
              </div>
            )}
          </div>

          {/* Turnaround Milestones */}
          {flight.turnaround && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2.5 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-sky-700" />
                Turnaround Milestones & Ramp Pacing
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
            <div className="bg-slate-50/70 border border-slate-200 rounded-lg p-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-sky-700" />
                Passenger & Inbound Connection Impact
              </h4>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-2.5 rounded bg-white border border-slate-200">
                  <span className="text-xl font-bold font-mono text-slate-900">{flight.passengers.total}</span>
                  <p className="text-[11px] text-slate-500 mt-0.5">Total Booked Pax</p>
                </div>
                <div className="p-2.5 rounded bg-white border border-slate-200">
                  <span className="text-xl font-bold font-mono text-sky-800">{flight.passengers.connecting_passengers}</span>
                  <p className="text-[11px] text-slate-500 mt-0.5">Connecting Flights</p>
                </div>
                <div className="p-2.5 rounded bg-white border border-slate-200">
                  <span className={`text-xl font-bold font-mono ${flight.passengers.tight_connections_at_risk > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                    {flight.passengers.tight_connections_at_risk}
                  </span>
                  <p className="text-[11px] text-slate-500 mt-0.5">Tight Connections Risk</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>
            Record ID: <span className="font-mono text-slate-700 font-semibold">{flight.id}</span>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-white font-semibold transition-colors shadow-sm"
          >
            Close Sheet
          </button>
        </div>
      </div>
    </div>
  );
};
