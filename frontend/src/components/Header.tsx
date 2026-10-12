'use client';

import React, { useState, useEffect } from 'react';
import { Plane, Radio, RefreshCw, Clock, Building2, ShieldCheck, AlertCircle } from 'lucide-react';
import { DataSourceBadge } from './DataSourceBadge';
import { DataSourceOrigin } from '../types/api';

interface HeaderProps {
  currentAirport: string;
  onSelectAirport: (code: string) => void;
  dataOrigin: DataSourceOrigin;
  dataSourceMode: 'auto' | 'mock_only' | 'live_only';
  onSelectDataMode: (mode: 'auto' | 'mock_only' | 'live_only') => void;
  onRefresh: () => void;
  isLoading: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentAirport,
  onSelectAirport,
  dataOrigin,
  dataSourceMode,
  onSelectDataMode,
  onRefresh,
  isLoading,
}) => {
  const [utcTime, setUtcTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setUtcTime(now.toUTCString().slice(17, 25) + ' UTC');
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="border-b border-slate-200 bg-white sticky top-0 z-40 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between py-3 gap-3">
          {/* Brand & Hub Title */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-sky-800 flex items-center justify-center text-white shadow-sm shrink-0">
              <Plane className="w-5 h-5 -rotate-45" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-lg font-bold tracking-tight text-slate-900">SkyOps</span>
                <span className="text-[11px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                  Operations Console
                </span>
                <DataSourceBadge source={dataOrigin} />
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                Airport Operations & Tactical Disruption Management Platform
              </p>
            </div>
          </div>

          {/* Controls: Hub Selector, Mode, Clock, Refresh */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Airport Hub Selector */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 text-xs">
              <Building2 className="w-3.5 h-3.5 text-slate-500" />
              <label htmlFor="airport-select" className="text-slate-500 font-medium sr-only">
                Airport Hub
              </label>
              <select
                id="airport-select"
                value={currentAirport}
                onChange={(e) => onSelectAirport(e.target.value)}
                className="bg-transparent text-slate-800 font-semibold focus:outline-none cursor-pointer"
              >
                <option value="DEL">DEL — Indira Gandhi Intl (Delhi)</option>
                <option value="BOM">BOM — Chhatrapati Shivaji (Mumbai)</option>
                <option value="BLR">BLR — Kempegowda Intl (Bengaluru)</option>
                <option value="ALL">ALL — Multi-Hub Network</option>
              </select>
            </div>

            {/* Mode Switcher */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 text-xs">
              <Radio className="w-3.5 h-3.5 text-sky-700" />
              <label htmlFor="data-mode-select" className="text-slate-500 sr-only">
                Data Mode
              </label>
              <select
                id="data-mode-select"
                value={dataSourceMode}
                onChange={(e) => onSelectDataMode(e.target.value as 'auto' | 'mock_only' | 'live_only')}
                className="bg-transparent text-slate-700 font-medium focus:outline-none cursor-pointer"
                title="Select data connection mode"
              >
                <option value="auto">Auto (API + Contract Fallback)</option>
                <option value="mock_only">Benchmark Fixture Only</option>
                <option value="live_only">Strict Live API (/api/v1)</option>
              </select>
            </div>

            {/* UTC Clock */}
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-slate-100 border border-slate-200 text-xs font-mono font-medium text-slate-800">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>{utcTime || '00:00:00 UTC'}</span>
            </div>

            {/* Refresh Button */}
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="p-1.5 rounded-md bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 hover:text-slate-900 transition-colors disabled:opacity-50 shadow-sm"
              title="Refresh telemetry stream"
              aria-label="Refresh telemetry stream"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-sky-600' : ''}`} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
