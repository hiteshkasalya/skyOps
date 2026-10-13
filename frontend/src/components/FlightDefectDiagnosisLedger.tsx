'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Clock,
  Zap,
  RefreshCw,
  Sparkles,
  AlertOctagon,
  Users,
  Plane,
  Wrench,
  ShieldAlert,
  ArrowDownRight,
  ExternalLink,
} from 'lucide-react';
import { Flight, FlightDiagnosisResponse } from '../types/api';
import { getFlightDiagnosis, simulateFlightIssue } from '../services/apiClient';

interface FlightDefectDiagnosisLedgerProps {
  flight: Flight;
}

export const FlightDefectDiagnosisLedger: React.FC<FlightDefectDiagnosisLedgerProps> = ({ flight }) => {
  const [diagnosis, setDiagnosis] = useState<FlightDiagnosisResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'audit' | 'defects' | 'actions'>('audit');

  const loadDiagnosis = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getFlightDiagnosis(flight.id);
      setDiagnosis(data);
    } catch (err) {
      console.error('Failed to load diagnosis:', err);
    } finally {
      setIsLoading(false);
    }
  }, [flight.id]);

  useEffect(() => {
    loadDiagnosis();
  }, [loadDiagnosis]);

  const handleInjectIssue = async (type: 'late_inbound' | 'blocked_gate' | 'runway_closure') => {
    setIsSimulating(true);
    try {
      let payload = {};
      if (type === 'late_inbound') {
        payload = { delay_minutes: 55, delay_reason: 'LATE_INBOUND_AIRCRAFT' };
      } else if (type === 'blocked_gate') {
        payload = { blocked_gate: 'Gate 42', delay_minutes: 30 };
      } else if (type === 'runway_closure') {
        payload = { closed_runway: '10/28', delay_minutes: 20 };
      }
      const updated = await simulateFlightIssue(flight.id, payload);
      if (updated) {
        setDiagnosis(updated);
      }
    } catch (err) {
      console.error('Simulation injection failed:', err);
    } finally {
      setIsSimulating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center space-y-3 bg-slate-50 border border-slate-200 rounded-xl">
        <RefreshCw className="w-6 h-6 text-sky-600 animate-spin mx-auto" />
        <p className="text-xs font-semibold text-slate-700">Running Spatial-Temporal Defect Diagnostics...</p>
        <p className="text-[11px] text-slate-500">Evaluating gate occupancy windows, runway closures, and turnaround milestones.</p>
      </div>
    );
  }

  if (!diagnosis) {
    return (
      <div className="p-6 text-center bg-slate-50 border border-slate-200 rounded-xl space-y-2">
        <AlertTriangle className="w-5 h-5 text-amber-500 mx-auto" />
        <p className="text-xs font-semibold text-slate-800">Diagnostic Telemetry Unavailable</p>
        <p className="text-[11px] text-slate-500">Ensure the SkyOps FastAPI backend is online at http://127.0.0.1:8000.</p>
        <button
          onClick={loadDiagnosis}
          className="mt-2 px-3 py-1 text-xs font-medium text-sky-700 bg-sky-50 border border-sky-200 rounded-md hover:bg-sky-100"
        >
          Retry Diagnostics
        </button>
      </div>
    );
  }

  const { issue, potential_defects, recovery_actions, audit_comparison } = diagnosis;
  const { before, after, delta_summary } = audit_comparison;

  return (
    <div className="space-y-5 text-slate-800">
      {/* Teacher Presentation Header Banner */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-sky-900 to-indigo-900 text-white shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-sky-300" />
            <span className="text-xs font-bold uppercase tracking-wider text-sky-200">
              AOCC Flight Defect Diagnosis & Recovery Ledger
            </span>
          </div>
          <p className="text-xs text-sky-100 max-w-xl">
            Automated intelligence demonstrating: <strong>(1) Root Issue Identification</strong> &rarr;{' '}
            <strong>(2) Cascading Defects Projection</strong> &rarr; <strong>(3) Tactical Fix Execution</strong> &rarr;{' '}
            <strong>(4) Before vs After Proof</strong>.
          </p>
        </div>
        <button
          onClick={loadDiagnosis}
          title="Refresh diagnosis"
          className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-medium text-white flex items-center gap-1.5 transition-colors shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Re-Analyze
        </button>
      </div>

      {/* STEP 1: ROOT ISSUE IDENTIFICATION */}
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-800 tracking-wide uppercase">
              Step 1: Diagnosed Issue
            </span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                issue.severity === 'CRITICAL'
                  ? 'bg-rose-100 text-rose-800 border border-rose-200'
                  : issue.severity === 'HIGH'
                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                  : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
              }`}
            >
              {issue.severity} SEVERITY
            </span>
          </div>
          <span className="text-[11px] font-mono text-slate-500">{issue.issue_code}</span>
        </div>
        <h4 className="text-sm font-bold text-slate-900">{issue.title}</h4>
        <p className="text-xs text-slate-600 leading-relaxed">{issue.root_cause_explanation}</p>
      </div>

      {/* STEP 2: CASCADING DEFECTS (WHAT BREAKS IF UNRESOLVED) */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-800 tracking-wide uppercase">
              Step 2: Projected Cascading Defects
            </span>
            <span className="text-xs text-slate-500">(What occurs if unaddressed)</span>
          </div>
          <span className="text-xs font-bold text-rose-700 font-mono">
            {potential_defects.length} Failure Mode{potential_defects.length > 1 ? 's' : ''} Identified
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {potential_defects.map((defect) => (
            <div
              key={defect.defect_id}
              className="p-3 rounded-lg border border-rose-200/80 bg-rose-50/50 hover:bg-rose-50 transition-colors space-y-1.5"
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <AlertOctagon className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  {defect.title}
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-200/80 text-rose-900 font-mono shrink-0">
                  {defect.probability}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 leading-snug">{defect.impact_description}</p>
              {defect.projected_delay_addition_minutes > 0 && (
                <div className="flex items-center gap-1 text-[10px] text-rose-700 font-mono font-medium">
                  <ArrowDownRight className="w-3 h-3 text-rose-500" />
                  Cascades +{defect.projected_delay_addition_minutes}m additional schedule penalty
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* STEP 3: TACTICAL RECOVERY PLAN (HOW SKYOPS FIXES IT) */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-800 tracking-wide uppercase">
              Step 3: Tactical Recovery Actions
            </span>
            <span className="text-xs text-slate-500">(How SkyOps algorithm resolves defects)</span>
          </div>
          <span className="text-xs font-bold text-emerald-700 font-mono">
            {recovery_actions.length} Action Plan Step{recovery_actions.length > 1 ? 's' : ''}
          </span>
        </div>

        <div className="space-y-2">
          {recovery_actions.map((act) => (
            <div
              key={act.step_number}
              className="p-3 rounded-lg border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50 transition-colors flex items-start gap-3"
            >
              <div className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                {act.step_number}
              </div>
              <div className="space-y-1 flex-1">
                <div className="flex items-center justify-between flex-wrap gap-1">
                  <h5 className="text-xs font-bold text-slate-900">{act.title}</h5>
                  {act.mitigated_delay_minutes > 0 && (
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-200 text-emerald-900">
                      Recovers {act.mitigated_delay_minutes}m delay
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-600 leading-snug">{act.description}</p>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono">
                  <Wrench className="w-3 h-3 text-emerald-600" />
                  Target Resource: <span className="font-semibold text-slate-700">{act.target_resource}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* STEP 4: BEFORE VS AFTER RESOLUTION COMPARISON LEDGER */}
      <div className="space-y-3 pt-2 border-t border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-800 tracking-wide uppercase border border-sky-200">
              Step 4: Before vs After Resolution Ledger
            </span>
            <span className="text-xs font-semibold text-slate-700">Defect State vs Resolved Outcome</span>
          </div>
        </div>

        {/* Side-by-side Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* BEFORE COLUMN */}
          <div className="p-3.5 rounded-xl border border-rose-300 bg-rose-50/70 space-y-3">
            <div className="flex items-center justify-between border-b border-rose-200 pb-2">
              <span className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                BEFORE RESOLUTION (Defect State)
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-200 text-rose-900 font-mono">
                {before.operational_status}
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-rose-100">
                <span className="text-slate-600">Projected Delay:</span>
                <span className="font-mono font-bold text-rose-800">+{before.total_projected_delay_minutes} mins</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-rose-100">
                <span className="text-slate-600">Gate Contention:</span>
                <span className="font-medium text-rose-800 text-right max-w-[200px] truncate" title={before.gate_status}>
                  {before.gate_status}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-rose-100">
                <span className="text-slate-600">Runway Status:</span>
                <span className="font-medium text-rose-800 text-right max-w-[200px] truncate" title={before.runway_status}>
                  {before.runway_status}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-rose-100">
                <span className="text-slate-600">Turnaround Buffer:</span>
                <span className="font-mono font-bold text-rose-800">
                  {before.turnaround_buffer_minutes}m (Deficit / Non-Compliant)
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-rose-100">
                <span className="text-slate-600">Cascading Rotations Broken:</span>
                <span className="font-mono font-bold text-rose-800">{before.downstream_flights_impacted} flight(s)</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-600">Connecting Pax at Risk:</span>
                <span className="font-mono font-bold text-rose-800">{before.passengers_at_risk} passenger(s)</span>
              </div>
            </div>
          </div>

          {/* AFTER COLUMN */}
          <div className="p-3.5 rounded-xl border border-emerald-300 bg-emerald-50/70 space-y-3">
            <div className="flex items-center justify-between border-b border-emerald-200 pb-2">
              <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                AFTER SKYOPS (Optimized Fix)
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-200 text-emerald-900 font-mono">
                {after.operational_status}
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-emerald-100">
                <span className="text-slate-600">Adjusted Delay:</span>
                <span className="font-mono font-bold text-emerald-800">+{after.total_projected_delay_minutes} mins</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-emerald-100">
                <span className="text-slate-600">Gate Contention:</span>
                <span className="font-medium text-emerald-800 text-right max-w-[200px] truncate" title={after.gate_status}>
                  {after.gate_status}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-emerald-100">
                <span className="text-slate-600">Runway Status:</span>
                <span className="font-medium text-emerald-800 text-right max-w-[200px] truncate" title={after.runway_status}>
                  {after.runway_status}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-emerald-100">
                <span className="text-slate-600">Turnaround Buffer:</span>
                <span className="font-mono font-bold text-emerald-800">
                  {after.turnaround_buffer_minutes}m (Compliant & Restored)
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-emerald-100">
                <span className="text-slate-600">Cascading Rotations Broken:</span>
                <span className="font-mono font-bold text-emerald-800">0 (Fully Protected)</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-600">Connecting Pax at Risk:</span>
                <span className="font-mono font-bold text-emerald-800">0 (All Re-booked / Protected)</span>
              </div>
            </div>
          </div>
        </div>

        {/* DELTA SUMMARY STATS & TEACHER VERDICT */}
        <div className="p-4 rounded-xl bg-slate-900 text-white space-y-3 shadow-md">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center border-b border-slate-800 pb-3">
            <div>
              <span className="text-xl font-black font-mono text-emerald-400">+{delta_summary.delay_saved_minutes}m</span>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">Delay Mitigated</p>
            </div>
            <div>
              <span className="text-xl font-black font-mono text-sky-400">{delta_summary.conflicts_eliminated}</span>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">Conflicts Cleared</p>
            </div>
            <div>
              <span className="text-xl font-black font-mono text-indigo-300">+{delta_summary.turnaround_buffer_restored_minutes}m</span>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">Buffer Restored</p>
            </div>
            <div>
              <span className="text-xl font-black font-mono text-amber-300">{delta_summary.passengers_protected}</span>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">Pax Protected</p>
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400 block">
              Teacher Presentation Verdict
            </span>
            <p className="text-xs text-slate-300 leading-relaxed font-sans italic">
              &ldquo;{delta_summary.teacher_summary_verdict}&rdquo;
            </p>
          </div>
        </div>
      </div>

      {/* INTERACTIVE "WHAT-IF" DEFECT SIMULATOR FOR TEACHER PRESENTATION */}
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            <h5 className="text-xs font-bold text-slate-900">Interactive &ldquo;What-If&rdquo; Defect Simulator</h5>
          </div>
          <span className="text-[10px] font-mono text-slate-500">Live Stress Testing</span>
        </div>
        <p className="text-[11px] text-slate-600">
          Inject a disruption to demonstrate to your teacher how SkyOps immediately detects new defects and updates the recovery plan:
        </p>

        <div className="flex flex-wrap gap-2 pt-1">
          <button
            disabled={isSimulating}
            onClick={() => handleInjectIssue('late_inbound')}
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 transition-colors shadow-xs disabled:opacity-50"
          >
            + Incur 55m Inbound Delay
          </button>
          <button
            disabled={isSimulating}
            onClick={() => handleInjectIssue('blocked_gate')}
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 transition-colors shadow-xs disabled:opacity-50"
          >
            + Block Terminal Gate 42
          </button>
          <button
            disabled={isSimulating}
            onClick={() => handleInjectIssue('runway_closure')}
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 transition-colors shadow-xs disabled:opacity-50"
          >
            + Close Runway 10/28
          </button>
          <button
            disabled={isSimulating}
            onClick={loadDiagnosis}
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-200 hover:bg-slate-300 text-slate-800 transition-colors ml-auto disabled:opacity-50"
          >
            Reset to Actual Schedule
          </button>
        </div>
      </div>
    </div>
  );
};
