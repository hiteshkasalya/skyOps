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
          className={`inline-flex items-center gap-1.5 font-semibold rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 ${sizeClasses} ${className}`}
          title="Direct live telemetry feed from FastAPI backend /api/v1"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
          LIVE TELEMETRY
        </span>
      );
    case 'DEMO_FIXTURE':
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-semibold rounded-md bg-sky-50 text-sky-800 border border-sky-200 ${sizeClasses} ${className}`}
          title="Verified contract fixture matching docs/api.md specifications (Backend server offline)"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-sky-600" />
          DEMO FIXTURE
        </span>
      );
    case 'SIMULATED':
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-semibold rounded-md bg-amber-50 text-amber-800 border border-amber-200 ${sizeClasses} ${className}`}
          title="Simulated projection produced by disruption recovery or ML engine"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
          SIMULATED
        </span>
      );
    case 'HISTORICAL':
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-semibold rounded-md bg-slate-100 text-slate-700 border border-slate-200 ${sizeClasses} ${className}`}
          title="Historical baseline operational schedule"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
          HISTORICAL
        </span>
      );
  }
};
