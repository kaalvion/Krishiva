import React, { useState } from 'react';
import { type HeatmapCell } from '../types';
import { Modal } from './Modal';
import { StatusBadge } from './StatusBadge';
import { Droplet, Thermometer, Wind, Radio, MapPin, Clock } from 'lucide-react';

interface FieldHeatmapProps {
  cells: HeatmapCell[];
  onCellClick?: (cell: HeatmapCell) => void;
  loading?: boolean;
}

export function getMoistureColor(val: number | null | undefined): {
  bg: string;
  fill: string;
  stroke: string;
  text: string;
  label: string;
} {
  if (val === null || val === undefined) {
    return {
      bg: 'bg-slate-100',
      fill: '#94a3b8',
      stroke: '#64748b',
      text: 'text-slate-500',
      label: 'No Data',
    };
  }
  if (val <= 15) {
    return {
      bg: 'bg-red-500',
      fill: '#ef4444',
      stroke: '#b91c1c',
      text: 'text-red-700',
      label: 'Critical Low (≤15%)',
    };
  }
  if (val <= 25) {
    return {
      bg: 'bg-orange-500',
      fill: '#f97316',
      stroke: '#c2410c',
      text: 'text-orange-700',
      label: 'Low (16-25%)',
    };
  }
  if (val <= 60) {
    return {
      bg: 'bg-emerald-600',
      fill: '#16a34a',
      stroke: '#15803d',
      text: 'text-emerald-700',
      label: 'Optimal (26-60%)',
    };
  }
  return {
    bg: 'bg-blue-600',
    fill: '#2563eb',
    stroke: '#1d4ed8',
    text: 'text-blue-700',
    label: 'High (>60%)',
  };
}

export const FieldHeatmap: React.FC<FieldHeatmapProps> = ({
  cells,
  onCellClick,
  loading = false,
}) => {
  const [selectedCell, setSelectedCell] = useState<HeatmapCell | null>(null);

  if (loading) {
    return (
      <div className="w-full h-80 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-200">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-3 border-emerald-600/20 border-t-emerald-600 rounded-full animate-spin" />
          <span className="text-xs text-slate-500 font-medium">Generating field heatmap...</span>
        </div>
      </div>
    );
  }

  if (!cells || cells.length === 0) {
    return (
      <div className="w-full h-64 bg-slate-50/50 rounded-2xl flex items-center justify-center border border-dashed border-slate-200">
        <p className="text-sm text-slate-400">No telemetry sensors active to generate heatmap.</p>
      </div>
    );
  }

  const sortedCells = [...cells].sort((a, b) => a.nodeId - b.nodeId);

  // Check if cells have valid lat/lng coordinates
  const hasCoordinates = cells.some(
    (c) => typeof c.lat === 'number' && typeof c.lng === 'number' && c.lat !== 0 && c.lng !== 0
  );

  const width = 640;
  const height = 360;
  const padding = 50;

  // Compute positions
  let positionedCells: Array<{ cell: HeatmapCell; x: number; y: number; r: number }> = [];

  if (hasCoordinates) {
    const lats = cells.map((c) => c.lat || 0).filter((v) => v !== 0);
    const lngs = cells.map((c) => c.lng || 0).filter((v) => v !== 0);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    const latSpan = maxLat - minLat || 0.001;
    const lngSpan = maxLng - minLng || 0.001;

    positionedCells = sortedCells.map((cell) => {
      if (typeof cell.lat === 'number' && typeof cell.lng === 'number' && cell.lat !== 0) {
        const x = padding + ((cell.lng - minLng) / lngSpan) * (width - 2 * padding);
        const y = height - (padding + ((cell.lat - minLat) / latSpan) * (height - 2 * padding));
        return { cell, x, y, r: 28 };
      }
      return { cell, x: width / 2, y: height / 2, r: 28 };
    });
  } else {
    // Evenly spaced grid ordered by nodeId
    const count = sortedCells.length;
    const cols = count <= 2 ? count : Math.ceil(Math.sqrt(count * 1.5));
    const rows = Math.ceil(count / cols);

    const cellWidth = (width - 2 * padding) / Math.max(cols, 1);
    const cellHeight = (height - 2 * padding) / Math.max(rows, 1);

    positionedCells = sortedCells.map((cell, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const x = padding + col * cellWidth + cellWidth / 2;
      const y = padding + row * cellHeight + cellHeight / 2;
      return { cell, x, y, r: Math.min(32, Math.min(cellWidth, cellHeight) / 2.4) };
    });
  }

  const handleCellClick = (cell: HeatmapCell) => {
    setSelectedCell(cell);
    if (onCellClick) onCellClick(cell);
  };

  return (
    <div className="w-full bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-base font-bold text-slate-800">Field Soil Moisture Heatmap</h3>
          <p className="text-xs text-slate-500">
            Real-time multi-zone grid. Click any node cell for instant diagnostics.
          </p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <span>≤15%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
            <span>16-25%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
            <span>26-60%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
            <span>&gt;60%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
            <span>No data</span>
          </div>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="relative w-full aspect-[16/9] max-h-[380px] bg-emerald-950/5 rounded-xl border border-emerald-900/10 overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full select-none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Field background grid pattern */}
            <pattern id="fieldGrid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path
                d="M 40 0 L 0 0 0 40"
                fill="none"
                stroke="rgba(46, 125, 50, 0.08)"
                strokeWidth="1"
              />
            </pattern>
            {/* Subtle glow filters */}
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Grid Background */}
          <rect width="100%" height="100%" fill="url(#fieldGrid)" />

          {/* Connection lines between adjacent nodes */}
          {positionedCells.length > 1 && (
            <g stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.6">
              {positionedCells.map((p, i) => {
                if (i === positionedCells.length - 1) return null;
                const next = positionedCells[i + 1];
                return (
                  <line
                    key={`line-${i}`}
                    x1={p.x}
                    y1={p.y}
                    x2={next.x}
                    y2={next.y}
                  />
                );
              })}
            </g>
          )}

          {/* Moisture Cells */}
          {positionedCells.map(({ cell, x, y, r }) => {
            const color = getMoistureColor(cell.soilMoisture);
            const isOnline = (cell.status ? String(cell.status) : '').toLowerCase() === 'online';

            return (
              <g
                key={cell.deviceId || String(cell.nodeId)}
                className="cursor-pointer transition-transform duration-200 hover:scale-110"
                onClick={() => handleCellClick(cell)}
                style={{ transformOrigin: `${x}px ${y}px` }}
              >
                {/* Moisture dispersion aura */}
                <circle
                  cx={x}
                  cy={y}
                  r={r + 14}
                  fill={color.fill}
                  opacity="0.16"
                />

                {/* Outer ring */}
                <circle
                  cx={x}
                  cy={y}
                  r={r + 3}
                  fill="none"
                  stroke={isOnline ? color.stroke : '#94a3b8'}
                  strokeWidth="2"
                  strokeDasharray={isOnline ? 'none' : '3 3'}
                />

                {/* Inner filled circle */}
                <circle
                  cx={x}
                  cy={y}
                  r={r}
                  fill={color.fill}
                  className="shadow-md"
                />

                {/* Node ID label */}
                <text
                  x={x}
                  y={cell.soilMoisture !== null && cell.soilMoisture !== undefined ? y - 4 : y + 4}
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize={r > 24 ? "12" : "10"}
                  fontWeight="bold"
                  pointerEvents="none"
                >
                  Node #{cell.nodeId}
                </text>

                {/* Moisture % display inside cell */}
                {cell.soilMoisture !== null && cell.soilMoisture !== undefined && (
                  <text
                    x={x}
                    y={y + 11}
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize={r > 24 ? "10" : "8"}
                    fontWeight="600"
                    opacity="0.95"
                    pointerEvents="none"
                  >
                    {Math.round(cell.soilMoisture)}%
                  </text>
                )}

                {/* Subtitle Zone or Name under cell */}
                <text
                  x={x}
                  y={y + r + 16}
                  textAnchor="middle"
                  fill="#334155"
                  fontSize="11"
                  fontWeight="600"
                >
                  {cell.zone || cell.name || `Device ${cell.nodeId}`}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Detail Modal when a cell is clicked */}
      <Modal
        isOpen={!!selectedCell}
        onClose={() => setSelectedCell(null)}
        title={`Node #${selectedCell?.nodeId} Details`}
        description={selectedCell?.name || 'IoT Telemetry Node'}
        maxWidth="sm"
      >
        {selectedCell && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-xs font-semibold text-slate-500 uppercase">Status</span>
              <StatusBadge status={selectedCell.status || 'offline'} />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                <div className="flex justify-center text-blue-600 mb-1">
                  <Droplet className="w-4 h-4" />
                </div>
                <div className="text-xs text-slate-500">Soil Moisture</div>
                <div className="text-lg font-bold text-slate-900 mt-0.5">
                  {selectedCell.soilMoisture !== null && selectedCell.soilMoisture !== undefined
                    ? `${selectedCell.soilMoisture.toFixed(1)}%`
                    : 'N/A'}
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                <div className="flex justify-center text-amber-600 mb-1">
                  <Thermometer className="w-4 h-4" />
                </div>
                <div className="text-xs text-slate-500">Temperature</div>
                <div className="text-lg font-bold text-slate-900 mt-0.5">
                  {selectedCell.temperature !== null && selectedCell.temperature !== undefined
                    ? `${selectedCell.temperature.toFixed(1)}°C`
                    : 'N/A'}
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                <div className="flex justify-center text-sky-600 mb-1">
                  <Wind className="w-4 h-4" />
                </div>
                <div className="text-xs text-slate-500">Humidity</div>
                <div className="text-lg font-bold text-slate-900 mt-0.5">
                  {selectedCell.humidity !== null && selectedCell.humidity !== undefined
                    ? `${selectedCell.humidity.toFixed(1)}%`
                    : 'N/A'}
                </div>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-3.5 space-y-2 border border-slate-200 text-xs text-slate-600">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-500">
                  <MapPin className="w-3.5 h-3.5" /> Zone:
                </span>
                <span className="font-semibold text-slate-800">{selectedCell.zone || 'Default'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-500">
                  <Radio className="w-3.5 h-3.5" /> Device ID:
                </span>
                <span className="font-mono text-slate-700 truncate max-w-[170px]">
                  {selectedCell.deviceId}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-500">
                  <Clock className="w-3.5 h-3.5" /> Recorded At:
                </span>
                <span className="text-slate-800">
                  {selectedCell.recordedAt && !isNaN(new Date(selectedCell.recordedAt).getTime())
                    ? new Date(selectedCell.recordedAt).toLocaleString()
                    : 'No telemetry yet'}
                </span>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
