import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Pressable,
  Dimensions,
} from 'react-native';
import Svg, { Rect, Text as SvgText, G } from 'react-native-svg';
import {
  Droplets,
  Thermometer,
  CloudRain,
  Clock,
  Cpu,
  X,
  MapPin,
} from 'lucide-react-native';
import { Badge } from './Badge';
import { colors } from '../theme/colors';
import type { HeatmapCell } from '../types';

export interface FieldHeatmapProps {
  cells: HeatmapCell[];
}

export function getMoistureColor(soilMoisture: number | null | undefined): string {
  if (soilMoisture === null || soilMoisture === undefined) {
    return '#9E9E9E'; // Grey for no data
  }
  if (soilMoisture <= 15) return '#D32F2F'; // Red Critical
  if (soilMoisture <= 25) return '#F57C00'; // Orange Low
  if (soilMoisture <= 60) return '#2E7D32'; // Green Good
  return '#1976D2'; // Blue Wet (>60)
}

export function getMoistureStatus(soilMoisture: number | null | undefined): {
  label: string;
  color: string;
} {
  if (soilMoisture === null || soilMoisture === undefined) {
    return { label: 'No Data', color: colors.textMuted };
  }
  if (soilMoisture <= 15) return { label: 'Critical Dry', color: '#D32F2F' };
  if (soilMoisture <= 25) return { label: 'Low Moisture', color: '#F57C00' };
  if (soilMoisture <= 60) return { label: 'Good Moisture', color: '#2E7D32' };
  return { label: 'Wet / Saturated', color: '#1976D2' };
}

export function FieldHeatmap({ cells }: FieldHeatmapProps) {
  const [selectedCell, setSelectedCell] = useState<HeatmapCell | null>(null);

  const screenWidth = Dimensions.get('window').width;
  const svgWidth = Math.max(screenWidth - 48, 280);
  const svgHeight = 220;

  // Determine whether valid coordinates exist with non-zero spread
  const cellsWithCoords = cells.filter(
    (c) => c.lat !== null && c.lng !== null && !isNaN(c.lat) && !isNaN(c.lng)
  );
  const hasSpreadCoords =
    cellsWithCoords.length >= 2 &&
    Math.max(...cellsWithCoords.map((c) => c.lat!)) !==
      Math.min(...cellsWithCoords.map((c) => c.lat!)) &&
    Math.max(...cellsWithCoords.map((c) => c.lng!)) !==
      Math.min(...cellsWithCoords.map((c) => c.lng!));

  // Sort cells by nodeId ascending for orderly grid
  const sortedCells = [...cells].sort((a, b) => a.nodeId - b.nodeId);

  // Compute cell positions
  let cellPositions: Array<{
    cell: HeatmapCell;
    x: number;
    y: number;
    width: number;
    height: number;
  }> = [];

  if (hasSpreadCoords) {
    const minLat = Math.min(...cellsWithCoords.map((c) => c.lat!));
    const maxLat = Math.max(...cellsWithCoords.map((c) => c.lat!));
    const minLng = Math.min(...cellsWithCoords.map((c) => c.lng!));
    const maxLng = Math.max(...cellsWithCoords.map((c) => c.lng!));

    const padding = 20;
    const cWidth = 90;
    const cHeight = 55;
    const usableW = svgWidth - padding * 2 - cWidth;
    const usableH = svgHeight - padding * 2 - cHeight;

    cellPositions = sortedCells.map((cell) => {
      let x = padding;
      let y = padding;
      if (cell.lat !== null && cell.lng !== null) {
        const normX = (cell.lng - minLng) / (maxLng - minLng);
        // Invert Y because latitude goes north (up), while SVG Y goes down
        const normY = 1 - (cell.lat - minLat) / (maxLat - minLat);
        x = padding + normX * usableW;
        y = padding + normY * usableH;
      }
      return { cell, x, y, width: cWidth, height: cHeight };
    });
  } else {
    // Grid layout: 2 columns
    const cols = 2;
    const rows = Math.max(Math.ceil(sortedCells.length / cols), 1);
    const gap = 12;
    const pad = 12;
    const cWidth = (svgWidth - pad * 2 - gap * (cols - 1)) / cols;
    const cHeight = (svgHeight - pad * 2 - gap * (rows - 1)) / rows;

    cellPositions = sortedCells.map((cell, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const x = pad + col * (cWidth + gap);
      const y = pad + row * (cHeight + gap);
      return { cell, x, y, width: cWidth, height: Math.min(cHeight, 75) };
    });
  }

  const formatRecordedTime = (timeStr: string | null) => {
    if (!timeStr) return 'Never';
    try {
      const d = new Date(timeStr);
      return (
        d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) +
        ', ' +
        d.toLocaleDateString([], { month: 'short', day: 'numeric' })
      );
    } catch {
      return timeStr;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>Field Moisture Heatmap</Text>
        <Text style={styles.subtitle}>Tap a cell for telemetry details</Text>
      </View>

      <View style={styles.svgContainer}>
        {cells.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No sensor devices registered</Text>
          </View>
        ) : (
          <Svg width={svgWidth} height={svgHeight}>
            {cellPositions.map(({ cell, x, y, width, height }) => {
              const bg = getMoistureColor(cell.soilMoisture);
              const name = cell.name || `Node #${cell.nodeId}`;
              const displayName = name.length > 13 ? `${name.substring(0, 11)}..` : name;
              const moistureText =
                cell.soilMoisture !== null ? `${Math.round(cell.soilMoisture)}%` : '--%';

              return (
                <G
                  key={cell.deviceId}
                  onPress={() => setSelectedCell(cell)}
                >
                  {/* Background rect */}
                  <Rect
                    x={x}
                    y={y}
                    width={width}
                    height={height}
                    rx={10}
                    ry={10}
                    fill={bg}
                    stroke="#FFFFFF"
                    strokeWidth={2}
                  />

                  {/* Device Name */}
                  <SvgText
                    x={x + width / 2}
                    y={y + height / 2 - 4}
                    fontSize={12}
                    fontWeight="bold"
                    fill="#FFFFFF"
                    textAnchor="middle"
                  >
                    {displayName}
                  </SvgText>

                  {/* Moisture percentage */}
                  <SvgText
                    x={x + width / 2}
                    y={y + height / 2 + 16}
                    fontSize={15}
                    fontWeight="800"
                    fill="#FFFFFF"
                    textAnchor="middle"
                  >
                    {moistureText}
                  </SvgText>
                </G>
              );
            })}
          </Svg>
        )}
      </View>

      {/* Color Scale Legend */}
      <View style={styles.legendContainer}>
        <View style={styles.legendItem}>
          <View style={[styles.legendBox, { backgroundColor: '#D32F2F' }]} />
          <Text style={styles.legendText}>&le;15% Dry</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendBox, { backgroundColor: '#F57C00' }]} />
          <Text style={styles.legendText}>&le;25% Low</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendBox, { backgroundColor: '#2E7D32' }]} />
          <Text style={styles.legendText}>&le;60% Good</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendBox, { backgroundColor: '#1976D2' }]} />
          <Text style={styles.legendText}>&gt;60% Wet</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendBox, { backgroundColor: '#9E9E9E' }]} />
          <Text style={styles.legendText}>No Data</Text>
        </View>
      </View>

      {/* Modal on cell tap */}
      <Modal
        visible={selectedCell !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedCell(null)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setSelectedCell(null)}
        >
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            {selectedCell && (
              <>
                <View style={styles.modalHeader}>
                  <View style={styles.modalHeaderInfo}>
                    <Text style={styles.modalTitle}>
                      {selectedCell.name || `Node #${selectedCell.nodeId}`}
                    </Text>
                    <Text style={styles.modalSubtitle}>
                      Hardware Node #{selectedCell.nodeId}
                      {selectedCell.zone ? ` • Zone: ${selectedCell.zone}` : ''}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => setSelectedCell(null)}
                  >
                    <X size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                <View style={styles.modalStatusRow}>
                  <Badge
                    label={selectedCell.status || 'offline'}
                    variant={selectedCell.status === 'online' ? 'success' : 'neutral'}
                  />
                  <View style={styles.moistureStatusBadge}>
                    <Text
                      style={[
                        styles.moistureStatusText,
                        { color: getMoistureStatus(selectedCell.soilMoisture).color },
                      ]}
                    >
                      {getMoistureStatus(selectedCell.soilMoisture).label}
                    </Text>
                  </View>
                </View>

                <View style={styles.modalDivider} />

                {/* Telemetry metrics grid */}
                <View style={styles.modalMetricsGrid}>
                  <View style={styles.modalMetricItem}>
                    <Droplets size={20} color="#1976D2" />
                    <Text style={styles.modalMetricLabel}>Soil Moisture</Text>
                    <Text style={styles.modalMetricValue}>
                      {selectedCell.soilMoisture !== null
                        ? `${Math.round(selectedCell.soilMoisture)}%`
                        : 'No data'}
                    </Text>
                  </View>

                  <View style={styles.modalMetricItem}>
                    <Thermometer size={20} color="#E65100" />
                    <Text style={styles.modalMetricLabel}>Temperature</Text>
                    <Text style={styles.modalMetricValue}>
                      {selectedCell.temperature !== null
                        ? `${selectedCell.temperature.toFixed(1)}°C`
                        : 'No data'}
                    </Text>
                  </View>

                  <View style={styles.modalMetricItem}>
                    <CloudRain size={20} color="#00897B" />
                    <Text style={styles.modalMetricLabel}>Humidity</Text>
                    <Text style={styles.modalMetricValue}>
                      {selectedCell.humidity !== null
                        ? `${Math.round(selectedCell.humidity)}%`
                        : 'No data'}
                    </Text>
                  </View>
                </View>

                <View style={styles.modalFooterRow}>
                  <Clock size={13} color={colors.textMuted} />
                  <Text style={styles.modalFooterText}>
                    Recorded: {formatRecordedTime(selectedCell.recordedAt)}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.modalDismissBtn}
                  onPress={() => setSelectedCell(null)}
                >
                  <Text style={styles.modalDismissText}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
    elevation: 2,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  titleRow: {
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  svgContainer: {
    backgroundColor: '#F1F8F1',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2EFE2',
  },
  emptyContainer: {
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 6,
    marginBottom: 4,
  },
  legendBox: {
    width: 10,
    height: 10,
    borderRadius: 3,
    marginRight: 4,
  },
  legendText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 360,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  modalHeaderInfo: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  modalSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  closeButton: {
    padding: 4,
  },
  modalStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 8,
  },
  moistureStatusBadge: {
    backgroundColor: colors.borderLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  moistureStatusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  modalDivider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: 14,
  },
  modalMetricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  modalMetricItem: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 10,
    marginHorizontal: 3,
  },
  modalMetricLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 4,
    fontWeight: '500',
  },
  modalMetricValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginTop: 2,
  },
  modalFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 16,
    justifyContent: 'center',
  },
  modalFooterText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  modalDismissBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  modalDismissText: {
    color: colors.textInverse,
    fontWeight: '700',
    fontSize: 14,
  },
});
