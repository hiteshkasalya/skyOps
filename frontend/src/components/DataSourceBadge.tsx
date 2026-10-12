import React from 'react';
import { DataSourceOrigin } from '../types/api';

interface DataSourceBadgeProps {
  source: DataSourceOrigin;
  className?: string;
  size?: 'sm' | 'md';
}

export const DataSourceBadge: React.FC<DataSourceBadgeProps> = ({ source, className = '', size = 'sm' }) => {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs font-semibold';

  switch (source) {
    case 'LIVE':
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 ${sizeClasses} ${className}`}
          title="Direct live telemetry feed from FastAPI backend /api/v1"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          LIVE TELEMETRY
        </span>
      );
    case 'DEMO_FIXTURE':
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-sky-950/80 text-sky-300 border border-sky-500/30 ${sizeClasses} ${className}`}
          title="Verified contract fixture matching docs/api.md specifications (Backend server offline)"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
          DEMO FIXTURE
        </span>
      );
    case 'SIMULATED':
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-amber-950/80 text-amber-300 border border-amber-500/30 ${sizeClasses} ${className}`}
          title="Simulated projection produced by disruption recovery or ML engine"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          SIMULATED
        </span>
      );
    case 'HISTORICAL':
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-slate-800 text-slate-300 border border-slate-700 ${sizeClasses} ${className}`}
          title="Historical baseline operational schedule"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
          HISTORICAL
        </span>
      );
  }
};
