'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  GitFork,
  Clock,
  Plane,
  AlertTriangle,
  ShieldAlert,
  Users,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { Flight, DelayPropagationResponse } from '../types/api';
import { propagateDelay } from '../services/apiClient';

interface RotationCascadeViewProps {
  flights: Flight[];
  selectedFlight?: Flight | null;
  onSelectFlight: (flight: Flight) => void;
}

export const RotationCascadeView: React.FC<RotationCascadeViewProps> = ({
  flights,
  selectedFlight,
  onSelectFlight,
}) => {
  const currentFlight =
    selectedFlight ||
    flights.find((f) => f.flight_number === '6E 204') ||
    flights[0];

  const [inputDelay, setInputDelay] = useState<number>(
    currentFlight?.delay_minutes && currentFlight.delay_minutes > 0 ? currentFlight.delay_minutes : 45
  );
  const [propagation, setPropagation] = useState<DelayPropagationResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const calculateCascade = useCallback(async () => {
    if (!currentFlight) return;
    setIsLoading(true);
    try {
      const data = await propagateDelay({
        flight_id: currentFlight.id,
        initial_delay_minutes: inputDelay,
        cause: currentFlight.delay_reason || 'LATE_INBOUND_AIRCRAFT',
        tail_number: currentFlight.registration || 'VT-IMG',
      });
      if (data) {
        setPropagation(data);
      }
    } catch (err) {
      console.error('Failed to compute rotation cascade:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentFlight, inputDelay]);

  useEffect(() => {
    calculateCascade();
  }, [calculateCascade]);

  if (!currentFlight) return null;

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-100 text-amber-900 uppercase">
              Network Cascade Modeling
            </span>
            <span className="text-xs text-slate-500 font-mono">
              Aircraft Tail Rotation • Crew Duty Clock (DGCA/FAA) • MCT Passenger Flow
            </span>
          </div>
          <h2 className="text-base font-bold text-slate-900 mt-0.5 flex items-center gap-2">
            <GitFork className="w-4 h-4 text-sky-800" />
            Aircraft Rotation Delay Propagation & Crew Duty Monitor
          </h2>
          <p className="text-xs text-slate-500">
            Simulate how upstream flight delay propagates across subsequent daily rotations of tail{' '}
            <strong className="font-mono text-slate-700">{currentFlight.registration}</strong>, 
            monitoring legal crew duty exhaustion and transit passenger misconnections.
          </p>
        </div>

        {/* Delay Slider Control */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex items-center gap-3 shrink-0">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase block">
              Upstream Inbound Delay
            </span>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="range"
                min="0"
                max="240"
                step="5"
                value={inputDelay}
                onChange={(e) => setInputDelay(parseInt(e.target.value))}
                className="w-32 accent-amber-600 cursor-pointer"
              />
              <span className="font-mono font-bold text-xs text-amber-900 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                +{inputDelay} min
              </span>
            </div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500">
          <RefreshCw className="w-6 h-6 mx-auto animate-spin text-sky-800 mb-2" />
          <p className="text-xs font-semibold">Simulating aircraft rotation network graph...</p>
        </div>
      ) : propagation ? (
        <div className="space-y-4">
          {/* Top 3 KPI Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* 1. Cascading Rotation Delay */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="font-semibold uppercase text-[10px]">Total Cascaded Rotation Delay</span>
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-amber-900">
                  +{propagation.cascaded_delay_minutes_total}m
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  across {propagation.total_impacted_flights} downstream legs
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Absorbed buffers reduced raw cascade by {propagation.root_delay_minutes}m.
              </p>
            </div>

            {/* 2. Crew Flight Duty Clock */}
            <div className={`border rounded-xl p-4 shadow-sm ${
              propagation.crew_duty.duty_breached
                ? 'bg-rose-50 border-rose-300 text-rose-950'
                : 'bg-white border-slate-200 text-slate-900'
            }`}>
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold uppercase text-[10px]">
                  Crew Duty Clock ({propagation.crew_duty.crew_pairing_id})
                </span>
                {propagation.crew_duty.duty_breached ? (
                  <ShieldAlert className="w-4 h-4 text-rose-600" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                )}
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className={`text-2xl font-bold font-mono ${
                  propagation.crew_duty.duty_breached ? 'text-rose-700' : 'text-slate-900'
                }`}>
                  {propagation.crew_duty.duty_hours_elapsed}h
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  / {propagation.crew_duty.max_legal_duty_hours}h max legal limit
                </span>
              </div>
              {/* Progress bar */}
              <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  style={{
                    width: `${Math.min(100, (propagation.crew_duty.duty_hours_elapsed / 10.0) * 100)}%`,
                  }}
                  className={`h-full ${
                    propagation.crew_duty.duty_breached ? 'bg-rose-600' : 'bg-emerald-600'
                  }`}
                />
              </div>
              <p className="text-[10px] mt-1 text-slate-500 font-mono">
                {propagation.crew_duty.action_required || 'Flight duty within standard DGCA operating limits.'}
              </p>
            </div>

            {/* 3. Connecting Passengers at Risk */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="font-semibold uppercase text-[10px]">Connecting Passenger Risk (MCT)</span>
                <Users className="w-4 h-4 text-sky-800" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className={`text-2xl font-bold font-mono ${
                  propagation.passenger_impact.missed_connections_count > 0 ? 'text-rose-700' : 'text-emerald-700'
                }`}>
                  {propagation.passenger_impact.missed_connections_count}
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  misconnections / {propagation.passenger_impact.total_connecting_passengers} transit pax
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Est. Rebooking Liability: ₹{propagation.passenger_impact.rebooking_cost_estimate_inr.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Sequential Tail Rotation Flowchart Cards */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <Plane className="w-4 h-4 text-sky-800" />
              Daily Tail Rotation Chain ({propagation.aircraft_tail})
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Root Flight Card */}
              <div className="p-3.5 rounded-lg border border-amber-300 bg-amber-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-200 text-amber-900 uppercase">
                    Root Leg 1
                  </span>
                  <span className="font-mono text-xs font-bold text-amber-800">
                    +{propagation.root_delay_minutes}m Delay
                  </span>
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900 font-mono">{propagation.root_flight_number}</h4>
                  <p className="text-xs text-slate-600 font-medium">
                    {currentFlight.origin} → {currentFlight.destination}
                  </p>
                </div>
                <div className="text-[11px] font-mono text-slate-500 pt-1 border-t border-amber-200">
                  Sched: {currentFlight.scheduled_departure.slice(11, 16)} UTC
                </div>
              </div>

              {/* Downstream Legs */}
              {propagation.downstream_impacts.map((leg, idx) => (
                <div
                  key={leg.flight_id}
                  className={`p-3.5 rounded-lg border space-y-2 ${
                    leg.projected_delay_minutes > 30
                      ? 'border-rose-300 bg-rose-50/40'
                      : 'border-slate-200 bg-slate-50/70'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-200 text-slate-800 uppercase">
                      Downstream Leg {idx + 2}
                    </span>
                    <span className={`font-mono text-xs font-bold ${
                      leg.projected_delay_minutes > 0 ? 'text-rose-700' : 'text-emerald-700'
                    }`}>
                      +{leg.projected_delay_minutes}m Delay
                    </span>
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 font-mono">{leg.flight_number}</h4>
                    <p className="text-xs text-slate-600 font-medium">{leg.route}</p>
                  </div>
                  <div className="text-[11px] font-mono text-slate-500 pt-1 border-t border-slate-200 flex items-center justify-between">
                    <span>Buffer Absorbed: -{leg.absorbed_by_buffer_minutes}m</span>
                    {leg.atc_slot_forfeiture && (
                      <span className="text-[10px] text-rose-700 font-bold">ATC Slot Lost</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Assessment Verdict */}
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-sky-800 shrink-0 mt-0.5" />
              <span>{propagation.executive_assessment}</span>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
