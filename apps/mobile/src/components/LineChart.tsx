import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import Svg, {
  Line,
  Polyline,
  Polygon,
  Circle,
  Text as SvgText,
} from 'react-native-svg';
import { AlertCircle, RotateCcw } from 'lucide-react-native';
import { colors } from '../theme/colors';

export interface ChartDataPoint {
  x: number; // Timestamp in milliseconds
  y: number; // Telemetry reading value
  recordedAt: string;
}

export interface LineChartProps {
  data: ChartDataPoint[];
  metricLabel: string;
  metricUnit: string;
  lineColor?: string;
  isLoading?: boolean;
  isError?: boolean;
  errorMessage?: string;
  onRetry?: () => void;
}

export function LineChart({
  data,
  metricLabel,
  metricUnit,
  lineColor = colors.primary,
  isLoading = false,
  isError = false,
  errorMessage,
  onRetry,
}: LineChartProps) {
  const screenWidth = Dimensions.get('window').width;
  const svgWidth = Math.max(screenWidth - 48, 280);
  const svgHeight = 210;

  const paddingLeft = 46;
  const paddingRight = 18;
  const paddingTop = 16;
  const paddingBottom = 30;

  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = svgHeight - paddingTop - paddingBottom;

  // Downsample to max 300 points if needed
  const points = useMemo(() => {
    if (data.length <= 300) return data;
    const step = data.length / 300;
    const sampled: ChartDataPoint[] = [];
    for (let i = 0; i < 300; i++) {
      const idx = Math.min(Math.floor(i * step), data.length - 1);
      sampled.push(data[idx]);
    }
    return sampled;
  }, [data]);

  // Statistics: Min, Max, Avg
  const stats = useMemo(() => {
    if (points.length === 0) return null;
    const values = points.map((p) => p.y);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const sum = values.reduce((acc, v) => acc + v, 0);
    const avg = sum / values.length;
    return { min, max, avg };
  }, [points]);

  // Calculations for axes & scales
  const chartScales = useMemo(() => {
    if (points.length === 0 || !stats) return null;

    let minY = stats.min;
    let maxY = stats.max;

    if (minY === maxY) {
      minY -= 5;
      maxY += 5;
    } else {
      // Add a 10% margin above and below
      const range = maxY - minY;
      minY = Math.max(0, Math.floor(minY - range * 0.1));
      maxY = Math.ceil(maxY + range * 0.1);
    }

    const minX = points[0].x;
    const maxX = points[points.length - 1].x;
    const timeSpan = Math.max(maxX - minX, 1);

    // Coordinate mapping
    const coords = points.map((p) => {
      const px = paddingLeft + ((p.x - minX) / timeSpan) * chartWidth;
      const py = paddingTop + (1 - (p.y - minY) / (maxY - minY)) * chartHeight;
      return { x: px, y: py };
    });

    // SVG polyline points string
    const polylineStr = coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');

    // Fill polygon points string (closed at bottom)
    const polygonStr = `${coords[0].x.toFixed(1)},${(paddingTop + chartHeight).toFixed(1)} ${polylineStr} ${coords[coords.length - 1].x.toFixed(1)},${(paddingTop + chartHeight).toFixed(1)}`;

    // Y ticks (3 horizontal gridlines)
    const yTicks = [
      {
        value: maxY,
        y: paddingTop,
      },
      {
        value: Number(((minY + maxY) / 2).toFixed(1)),
        y: paddingTop + chartHeight / 2,
      },
      {
        value: minY,
        y: paddingTop + chartHeight,
      },
    ];

    // X ticks (Start, Mid, End)
    const xTicks = [
      {
        time: minX,
        x: paddingLeft,
      },
      {
        time: minX + timeSpan / 2,
        x: paddingLeft + chartWidth / 2,
      },
      {
        time: maxX,
        x: paddingLeft + chartWidth,
      },
    ];

    return {
      coords,
      polylineStr,
      polygonStr,
      yTicks,
      xTicks,
      lastPoint: coords[coords.length - 1],
    };
  }, [points, stats, chartWidth, chartHeight]);

  const formatXTime = (timestampMs: number) => {
    try {
      const d = new Date(timestampMs);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.card, styles.centerState]}>
        <ActivityIndicator size="small" color={lineColor} />
        <Text style={styles.stateText}>Loading {metricLabel.toLowerCase()} history...</Text>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={[styles.card, styles.centerState]}>
        <AlertCircle size={24} color={colors.error} />
        <Text style={styles.errorText}>
          {errorMessage || 'Failed to load telemetry history'}
        </Text>
        {onRetry && (
          <TouchableOpacity style={styles.retryBtn} onPress={onRetry}>
            <RotateCcw size={14} color={colors.textInverse} />
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  if (points.length === 0 || !chartScales || !stats) {
    return (
      <View style={[styles.card, styles.centerState]}>
        <Text style={styles.emptyTitle}>No readings in this range</Text>
        <Text style={styles.emptySubtitle}>
          Ensure the hardware node or device simulator is active and publishing data.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Svg width={svgWidth} height={svgHeight}>
        {/* Horizontal grid lines & Y labels */}
        {chartScales.yTicks.map((tick, i) => (
          <React.Fragment key={i}>
            <Line
              x1={paddingLeft}
              y1={tick.y}
              x2={paddingLeft + chartWidth}
              y2={tick.y}
              stroke={colors.borderLight}
              strokeDasharray="4, 4"
              strokeWidth={1}
            />
            <SvgText
              x={paddingLeft - 8}
              y={tick.y + 4}
              fontSize={10}
              fill={colors.textSecondary}
              textAnchor="end"
              fontWeight="500"
            >
              {tick.value}
              {metricUnit}
            </SvgText>
          </React.Fragment>
        ))}

        {/* X Axis bottom line */}
        <Line
          x1={paddingLeft}
          y1={paddingTop + chartHeight}
          x2={paddingLeft + chartWidth}
          y2={paddingTop + chartHeight}
          stroke={colors.border}
          strokeWidth={1}
        />

        {/* Area fill polygon */}
        <Polygon
          points={chartScales.polygonStr}
          fill={lineColor}
          fillOpacity={0.12}
        />

        {/* Polyline */}
        <Polyline
          points={chartScales.polylineStr}
          fill="none"
          stroke={lineColor}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Dot and pulse ring on the last point */}
        {chartScales.lastPoint && (
          <>
            <Circle
              cx={chartScales.lastPoint.x}
              cy={chartScales.lastPoint.y}
              r={9}
              stroke={lineColor}
              strokeWidth={2}
              fill="none"
              opacity={0.4}
            />
            <Circle
              cx={chartScales.lastPoint.x}
              cy={chartScales.lastPoint.y}
              r={5}
              fill={lineColor}
            />
          </>
        )}

        {/* X Axis time labels */}
        {chartScales.xTicks.map((tick, i) => {
          let anchor: 'start' | 'middle' | 'end' = 'middle';
          if (i === 0) anchor = 'start';
          if (i === chartScales.xTicks.length - 1) anchor = 'end';

          return (
            <SvgText
              key={i}
              x={tick.x}
              y={svgHeight - 8}
              fontSize={10}
              fill={colors.textSecondary}
              textAnchor={anchor}
              fontWeight="500"
            >
              {formatXTime(tick.time)}
            </SvgText>
          );
        })}
      </Svg>

      {/* Min / Avg / Max statistics row */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Min</Text>
          <Text style={styles.statValue}>
            {stats.min.toFixed(1)}
            {metricUnit}
          </Text>
        </View>
        <Text style={styles.statDivider}>•</Text>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Avg</Text>
          <Text style={styles.statValue}>
            {stats.avg.toFixed(1)}
            {metricUnit}
          </Text>
        </View>
        <Text style={styles.statDivider}>•</Text>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Max</Text>
          <Text style={styles.statValue}>
            {stats.max.toFixed(1)}
            {metricUnit}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
    elevation: 2,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    alignItems: 'center',
    marginBottom: 16,
  },
  centerState: {
    minHeight: 220,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  stateText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 260,
    lineHeight: 18,
  },
  errorText: {
    fontSize: 13,
    color: colors.error,
    marginTop: 8,
    marginBottom: 12,
    textAlign: 'center',
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    gap: 6,
  },
  retryBtnText: {
    color: colors.textInverse,
    fontSize: 12,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    paddingTop: 12,
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    gap: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '700',
  },
  statDivider: {
    fontSize: 14,
    color: colors.border,
  },
});
