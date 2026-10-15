import React, { useState } from 'react';
import { type DeviceHistoryPoint } from '../types';

export type MetricType = 'soilMoisture' | 'temperature' | 'humidity';
export type RangeType = '6h' | '24h' | '7d';

interface LineChartProps {
  data: DeviceHistoryPoint[];
  metric: MetricType;
  range: RangeType;
  onMetricChange: (metric: MetricType) => void;
  onRangeChange: (range: RangeType) => void;
  loading?: boolean;
}

export const LineChart: React.FC<LineChartProps> = ({
  data,
  metric,
  range,
  onMetricChange,
  onRangeChange,
  loading = false,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const metricConfigs: Record<
    MetricType,
    { label: string; unit: string; color: string; stroke: string; fillGradient: string }
  > = {
    soilMoisture: {
      label: 'Soil Moisture',
      unit: '%',
      color: 'text-emerald-700',
      stroke: '#16a34a',
      fillGradient: '#22c55e',
    },
    temperature: {
      label: 'Temperature',
      unit: '°C',
      color: 'text-amber-700',
      stroke: '#d97706',
      fillGradient: '#f59e0b',
    },
    humidity: {
      label: 'Humidity',
      unit: '%',
      color: 'text-sky-700',
      stroke: '#0284c7',
      fillGradient: '#38bdf8',
    },
  };

  const currentConfig = metricConfigs[metric];

  // Extract values
  const validPoints = (data || [])
    .filter((pt) => pt && typeof pt[metric] === 'number' && !isNaN(pt[metric]))
    .sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime());

  const values = validPoints.map((pt) => pt[metric]);

  const minVal = values.length > 0 ? Math.min(...values) : 0;
  const maxVal = values.length > 0 ? Math.max(...values) : 100;
  const avgVal =
    values.length > 0 ? values.reduce((sum, v) => sum + v, 0) / values.length : 0;

  // Chart dimensions
  const svgWidth = 600;
  const svgHeight = 240;
  const paddingX = 45;
  const paddingY = 25;

  const yMin = Math.floor(Math.max(0, minVal - (maxVal - minVal) * 0.1));
  const yMax = Math.ceil(maxVal + (maxVal - minVal) * 0.1 || minVal + 10);
  const yRange = yMax - yMin || 1;

  // Compute SVG coordinates
  const points = validPoints.map((pt, idx) => {
    const x =
      paddingX + (idx / Math.max(validPoints.length - 1, 1)) * (svgWidth - 2 * paddingX);
    const y =
      svgHeight -
      paddingY -
      ((pt[metric] - yMin) / yRange) * (svgHeight - 2 * paddingY);
    return { x, y, pt, val: pt[metric] };
  });

  // Build SVG path
  let pathD = '';
  let areaD = '';

  if (points.length > 0) {
    pathD = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cpX1 = prev.x + (curr.x - prev.x) / 2;
      const cpY1 = prev.y;
      const cpX2 = prev.x + (curr.x - prev.x) / 2;
      const cpY2 = curr.y;
      pathD += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${curr.x} ${curr.y}`;
    }

    const baselineY = svgHeight - paddingY;
    areaD = `${pathD} L ${points[points.length - 1].x} ${baselineY} L ${points[0].x} ${baselineY} Z`;
  }

  // Y-axis ticks (4 ticks)
  const yTicks = [yMin, yMin + yRange * 0.33, yMin + yRange * 0.66, yMax];

  return (
    <div className="w-full bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
      {/* Controls header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        {/* Metric Toggles */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
          {(['soilMoisture', 'temperature', 'humidity'] as MetricType[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => onMetricChange(m)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                metric === m
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {metricConfigs[m].label}
            </button>
          ))}
        </div>

        {/* Range Toggles */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
          {(['6h', '24h', '7d'] as RangeType[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => onRangeChange(r)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                range === r
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {r.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Min / Avg / Max stats bar */}
      <div className="grid grid-cols-3 gap-3 py-3 my-2 border-b border-slate-100 text-center">
        <div>
          <span className="text-xs text-slate-400 font-medium block">Min</span>
          <span className="text-sm font-bold text-slate-800">
            {values.length > 0 ? `${minVal.toFixed(1)}${currentConfig.unit}` : '--'}
          </span>
        </div>
        <div>
          <span className="text-xs text-slate-400 font-medium block">Average</span>
          <span className="text-sm font-bold text-slate-800">
            {values.length > 0 ? `${avgVal.toFixed(1)}${currentConfig.unit}` : '--'}
          </span>
        </div>
        <div>
          <span className="text-xs text-slate-400 font-medium block">Max</span>
          <span className="text-sm font-bold text-slate-800">
            {values.length > 0 ? `${maxVal.toFixed(1)}${currentConfig.unit}` : '--'}
          </span>
        </div>
      </div>

      {/* Hand-drawn SVG Chart */}
      <div className="relative w-full aspect-[2.5/1] max-h-[260px] select-none pt-2">
        {loading ? (
          <div className="w-full h-full flex items-center justify-center bg-slate-50 rounded-xl">
            <div className="w-7 h-7 border-3 border-emerald-600/30 border-t-emerald-600 rounded-full animate-spin" />
          </div>
        ) : points.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center bg-slate-50 rounded-xl text-xs text-slate-400">
            No history recorded in this {range} window.
          </div>
        ) : (
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-full overflow-visible"
          >
            <defs>
              <linearGradient id={`gradient-${metric}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={currentConfig.fillGradient} stopOpacity="0.3" />
                <stop offset="100%" stopColor={currentConfig.fillGradient} stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Grid horizontal lines */}
            {yTicks.map((tick, i) => {
              const y =
                svgHeight -
                paddingY -
                ((tick - yMin) / yRange) * (svgHeight - 2 * paddingY);
              return (
                <g key={i}>
                  <line
                    x1={paddingX}
                    y1={y}
                    x2={svgWidth - paddingX}
                    y2={y}
                    stroke="#f1f5f9"
                    strokeWidth="1.5"
                  />
                  <text
                    x={paddingX - 8}
                    y={y + 3}
                    textAnchor="end"
                    fill="#94a3b8"
                    fontSize="10"
                    fontWeight="500"
                  >
                    {Math.round(tick)}
                    {currentConfig.unit}
                  </text>
                </g>
              );
            })}

            {/* Shaded Area */}
            {areaD && <path d={areaD} fill={`url(#gradient-${metric})`} />}

            {/* Line Path */}
            {pathD && (
              <path
                d={pathD}
                fill="none"
                stroke={currentConfig.stroke}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Points & Interactive Nodes */}
            {points.map((pt, idx) => {
              const isHovered = hoveredIndex === idx;
              return (
                <g
                  key={idx}
                  onMouseEnter={() => setHoveredIndex(idx)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  className="cursor-pointer"
                >
                  {/* Invisible larger hover hit area */}
                  <circle cx={pt.x} cy={pt.y} r={12} fill="transparent" />

                  {/* Dot */}
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={isHovered ? 5.5 : 3}
                    fill="#ffffff"
                    stroke={currentConfig.stroke}
                    strokeWidth={isHovered ? 3 : 2}
                    className="transition-all duration-150"
                  />

                  {/* Tooltip on hover */}
                  {isHovered && (
                    <g pointerEvents="none">
                      <rect
                        x={Math.min(Math.max(pt.x - 55, 10), svgWidth - 120)}
                        y={Math.max(pt.y - 45, 5)}
                        width="110"
                        height="36"
                        rx="6"
                        fill="#0f172a"
                        opacity="0.95"
                      />
                      <text
                        x={Math.min(Math.max(pt.x, 65), svgWidth - 65)}
                        y={Math.max(pt.y - 28, 22)}
                        textAnchor="middle"
                        fill="#ffffff"
                        fontSize="11"
                        fontWeight="bold"
                      >
                        {pt.val.toFixed(1)} {currentConfig.unit}
                      </text>
                      <text
                        x={Math.min(Math.max(pt.x, 65), svgWidth - 65)}
                        y={Math.max(pt.y - 15, 35)}
                        textAnchor="middle"
                        fill="#94a3b8"
                        fontSize="8.5"
                      >
                        {pt.pt?.recordedAt && !isNaN(new Date(pt.pt.recordedAt).getTime())
                          ? new Date(pt.pt.recordedAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '-'}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </svg>
        )}
      </div>
    </div>
  );
};
