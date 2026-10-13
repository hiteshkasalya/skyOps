'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Brain,
  CloudRain,
  Wind,
  Gauge,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  RefreshCw,
  Compass,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { Flight, DelayPredictionResponse } from '../types/api';
import { predictFlightDelay, getFlightDelayPrediction } from '../services/apiClient';

interface DelayPredictionViewProps {
  flights: Flight[];
  selectedFlight?: Flight | null;
}

export const DelayPredictionView: React.FC<DelayPredictionViewProps> = ({
  flights,
  selectedFlight,
}) => {
  const [activeFlightId, setActiveFlightId] = useState<string>(
    selectedFlight?.id || flights[0]?.id || ''
  );
  const activeFlight = flights.find((f) => f.id === activeFlightId) || flights[0];

  const [weatherCondition, setWeatherCondition] = useState<string>('FOG');
  const [visibilityMeters, setVisibilityMeters] = useState<number>(350);
  const [windSpeedKnots, setWindSpeedKnots] = useState<number>(14);
  const [congestionLevel, setCongestionLevel] = useState<string>('HIGH');

  const [prediction, setPrediction] = useState<DelayPredictionResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const runPrediction = useCallback(async () => {
    if (!activeFlight) return;
    setIsLoading(true);
    try {
      const data = await predictFlightDelay({
        flight_number: activeFlight.flight_number,
        origin: activeFlight.origin,
        destination: activeFlight.destination,
        scheduled_departure: activeFlight.scheduled_departure,
        aircraft_type: activeFlight.aircraft_type,
        weather_condition: weatherCondition,
        visibility_meters: visibilityMeters,
        wind_speed_knots: windSpeedKnots,
        congestion_level: congestionLevel,
        upstream_delay_minutes: activeFlight.delay_minutes || 0,
      });
      if (data) {
        setPrediction(data);
      }
    } catch (err) {
      console.error('Failed to run ML prediction:', err);
    } finally {
      setIsLoading(false);
    }
  }, [activeFlight, weatherCondition, visibilityMeters, windSpeedKnots, congestionLevel]);

  useEffect(() => {
    runPrediction();
  }, [runPrediction]);

  if (!activeFlight) return null;

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-violet-100 text-violet-900 uppercase">
              Explainable AI (XAI)
            </span>
            <span className="text-xs text-slate-500 font-mono">
              Gradient-Boosted Ensemble • METAR Atmospheric Scoring • Feature Attribution
            </span>
          </div>
          <h2 className="text-base font-bold text-slate-900 mt-0.5 flex items-center gap-2">
            <Brain className="w-4 h-4 text-violet-700" />
            Machine Learning Flight Delay Prediction & What-If Studio
          </h2>
          <p className="text-xs text-slate-500">
            Predict flight delay probabilities, duration confidence intervals, and inspect mathematical feature attributions (SHAP weights) across weather and hub congestion vectors.
          </p>
        </div>

        {/* Flight Picker */}
        <div className="flex items-center gap-2 shrink-0">
          <label htmlFor="predictFlightSelect" className="text-xs text-slate-500 font-medium">Select Flight:</label>
          <select
            id="predictFlightSelect"
            value={activeFlight.id}
            onChange={(e) => setActiveFlightId(e.target.value)}
            className="bg-slate-50 text-slate-800 border border-slate-300 text-xs rounded-lg px-2.5 py-1.5 font-mono font-semibold focus:outline-hidden focus:border-violet-500"
          >
            {flights.map((f) => (
              <option key={f.id} value={f.id}>
                {f.flight_number} ({f.origin}→{f.destination})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* What-If Feature Vector Interactive Sliders */}
      <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Weather Condition */}
        <div className="space-y-1">
          <span className="text-[11px] font-bold text-slate-600 block uppercase">METAR Weather Profile</span>
          <select
            value={weatherCondition}
            onChange={(e) => setWeatherCondition(e.target.value)}
            className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs font-mono font-semibold"
          >
            <option value="CLEAR">CLEAR / CAVOK</option>
            <option value="FOG">LOW VISIBILITY FOG (CAT-III)</option>
            <option value="THUNDERSTORM">THUNDERSTORM (TSRA)</option>
            <option value="MONSOON_RAIN">HEAVY MONSOON RAIN</option>
          </select>
        </div>

        {/* Visibility */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] font-bold text-slate-600 uppercase">
            <span>Runway Visibility (RVR)</span>
            <span className="font-mono text-violet-700">{visibilityMeters}m</span>
          </div>
          <input
            type="range"
            min="100"
            max="8000"
            step="100"
            value={visibilityMeters}
            onChange={(e) => setVisibilityMeters(parseInt(e.target.value))}
            className="w-full accent-violet-600 cursor-pointer"
          />
        </div>

        {/* Wind Speed */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] font-bold text-slate-600 uppercase">
            <span>Crosswind Velocity</span>
            <span className="font-mono text-violet-700">{windSpeedKnots} kts</span>
          </div>
          <input
            type="range"
            min="0"
            max="45"
            step="1"
            value={windSpeedKnots}
            onChange={(e) => setWindSpeedKnots(parseInt(e.target.value))}
            className="w-full accent-violet-600 cursor-pointer"
          />
        </div>

        {/* Congestion Level */}
        <div className="space-y-1">
          <span className="text-[11px] font-bold text-slate-600 block uppercase">Hub Demand Congestion</span>
          <select
            value={congestionLevel}
            onChange={(e) => setCongestionLevel(e.target.value)}
            className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs font-mono font-semibold"
          >
            <option value="LOW">LOW (Off-Peak)</option>
            <option value="NORMAL">NORMAL (Moderate Flow)</option>
            <option value="HIGH">HIGH (Peak Morning Rush)</option>
            <option value="CRITICAL">CRITICAL (Airspace Holding Stack)</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500">
          <RefreshCw className="w-6 h-6 mx-auto animate-spin text-violet-600 mb-2" />
          <p className="text-xs font-semibold">Running gradient-boosted delay inference...</p>
        </div>
      ) : prediction ? (
        <div className="space-y-4">
          {/* Risk Prediction Dashboard Strip */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Probability Card */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <span className="text-[10px] font-bold uppercase text-slate-500">Delay Risk Probability</span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold font-mono text-violet-900">
                  {(prediction.delay_probability * 100).toFixed(1)}%
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                  prediction.risk_level === 'CRITICAL'
                    ? 'bg-rose-50 text-rose-800 border-rose-300'
                    : prediction.risk_level === 'ELEVATED'
                    ? 'bg-amber-50 text-amber-800 border-amber-300'
                    : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                }`}>
                  {prediction.risk_level} RISK
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Calibrated logistic boundary for departure delay &gt; 15m.
              </p>
            </div>

            {/* Expected Delay & Confidence Interval */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <span className="text-[10px] font-bold uppercase text-slate-500">Predicted Delay Duration</span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold font-mono text-slate-900">
                  +{prediction.predicted_delay_minutes}m
                </span>
                <span className="text-xs font-mono text-slate-500">expected</span>
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-[11px] font-mono text-slate-500">
                <span>95% Bounds:</span>
                <span className="font-semibold text-slate-700">
                  [{prediction.confidence_interval.p10_optimistic_minutes}m to{' '}
                  {prediction.confidence_interval.p90_conservative_minutes}m]
                </span>
              </div>
            </div>

            {/* Model Metadata */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-500">Inference Model</span>
              <h4 className="text-xs font-bold text-slate-900 font-mono mt-1">
                {prediction.ml_model_metadata?.model_type || 'GradientBoostedEnsemble + HeuristicCalibrator'}
              </h4>
              <p className="text-[11px] text-slate-500 leading-tight">
                Trained on verified ADS-B rotation timestamps and Indian Meteorological Department (IMD) METAR records.
              </p>
            </div>
          </div>

          {/* Explainable AI (XAI) Feature Attribution Breakdown */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-violet-600" />
                Explainable AI (SHAP) Feature Attribution Breakdown
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Exact mathematical contribution of each operational factor driving the predicted delay.
              </p>
            </div>

            <div className="space-y-3">
              {prediction.top_feature_attributions.map((feat, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900">{feat.feature_name}</span>
                      <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                        {feat.value}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 font-mono">
                      <span className="text-violet-800 font-bold">+{feat.contribution_minutes}m</span>
                      <span className="text-[10px] text-slate-500">({feat.percentage_weight}%)</span>
                    </div>
                  </div>

                  {/* Weight Progress Bar */}
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${Math.min(100, feat.percentage_weight)}%` }}
                      className="bg-violet-600 h-full rounded-full transition-all duration-500"
                    />
                  </div>

                  <p className="text-[11px] text-slate-500">{feat.description}</p>
                </div>
              ))}
            </div>

            {/* Tactical Recommendation Box */}
            <div className="mt-4 p-3.5 rounded-lg bg-violet-50 border border-violet-200 flex items-start gap-2 text-xs text-violet-950">
              <CheckCircle2 className="w-4 h-4 text-violet-700 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">AOCC Tactical Dispatch Recommendation</span>
                <p className="text-violet-900 mt-0.5">{prediction.operational_recommendation}</p>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
