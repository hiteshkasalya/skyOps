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
    <header className="border-b border-slate-800 bg-slate-950/90 backdrop-blur sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between py-3.5 gap-3">
          {/* Brand & Hub Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-blue-700 flex items-center justify-center shadow-lg shadow-sky-500/20 text-white">
              <Plane className="w-5 h-5 -rotate-45" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-tight text-white">SkyOps</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                  OPS HUB v1.0
                </span>
                <DataSourceBadge source={dataOrigin} />
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                AI-Powered Real-Time Airport Operations & Disruption Management
              </p>
            </div>
          </div>

          {/* Controls: Hub Selector, Mode, Clock, Refresh */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-4">
            {/* Airport Hub Selector */}
            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <label htmlFor="airport-select" className="text-slate-400 font-medium sr-only">
                Airport Hub
              </label>
              <select
                id="airport-select"
                value={currentAirport}
                onChange={(e) => onSelectAirport(e.target.value)}
                className="bg-transparent text-slate-200 font-semibold focus:outline-none cursor-pointer"
              >
                <option value="DEL" className="bg-slate-900 text-white">DEL - Indira Gandhi Intl</option>
                <option value="BOM" className="bg-slate-900 text-white">BOM - Chhatrapati Shivaji</option>
                <option value="BLR" className="bg-slate-900 text-white">BLR - Kempegowda Intl</option>
                <option value="ALL" className="bg-slate-900 text-white">All Hubs (Multi-Airport)</option>
              </select>
            </div>

            {/* Mode Switcher */}
            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs">
              <Radio className="w-3.5 h-3.5 text-sky-400" />
              <label htmlFor="data-mode-select" className="text-slate-400 sr-only">
                Data Mode
              </label>
              <select
                id="data-mode-select"
                value={dataSourceMode}
                onChange={(e) => onSelectDataMode(e.target.value as 'auto' | 'mock_only' | 'live_only')}
                className="bg-transparent text-slate-300 font-medium focus:outline-none cursor-pointer"
                title="Select data connection mode"
              >
                <option value="auto" className="bg-slate-900 text-white">Auto (API + Fixture Fallback)</option>
                <option value="mock_only" className="bg-slate-900 text-white">Demo Fixtures Only</option>
                <option value="live_only" className="bg-slate-900 text-white">Live API Only (/api/v1)</option>
              </select>
            </div>

            {/* Clock */}
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900/60 border border-slate-800/60 text-xs font-mono text-slate-300">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>{utcTime || '00:00:00 UTC'}</span>
            </div>

            {/* Refresh Button */}
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors disabled:opacity-50"
              title="Refresh telemetry"
              aria-label="Refresh telemetry"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-sky-400' : ''}`} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
