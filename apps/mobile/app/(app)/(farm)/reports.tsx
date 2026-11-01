import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Share,
  Alert,
  Platform,
  Animated,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Svg, { Circle, Path, G, Rect } from 'react-native-svg';
import {
  Sprout,
  Bell,
  User,
  MapPin,
  Share2,
  ChevronDown,
  Droplets,
  Gauge,
  CalendarCheck,
  Zap,
  CheckCircle2,
  Bolt,
  ShieldCheck,
  Tractor,
  Wheat,
  Trees,
  FileText,
  Table,
  ArrowUpRight,
  Clock,
  Check,
  RotateCcw,
} from 'lucide-react-native';

import { useActiveFarm } from '../../../src/context/FarmContext';
import {
  useLiveDevices,
  useLiveSchedules,
  useRecentCommands,
  useLiveAlerts,
} from '../../../src/hooks/live';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../../src/services/firebase';

const AERIAL_DRONE_IMG =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCRxVjpUPDjrjRphUKkskwCrLlRr29OBkMAkXqVbp0W4mmU3a00_5MA5N8g2FmiBmAyAuiLusZU_3T98gUOtujaPzj-5uqeuUoV4dfS3c2cBYTxnfw49V0aA06Pu4RlxwiIjiyEuYHDcdn_rdzmU1gBL2rKlR2QfIzmKYrSUavSX_c86430LGJlipxwKC6e71MIpvtGeAmqQAVU99xiSvFYzLH6Z7ejo7qIM_8P8ys';

const GREENHOUSE_IMG =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDZEC6rxTPpzQaQfTieSkI5F-XNqOQsuEpkoJcrrembImgvQm69J2uVufqvlBavH9HpDBUOh7pQFKRlHNQTGXsH4nGtdK-4kSG-agH-iey5R4jclrX83sMJLklyVjGt17T0K5ZMDDWPqVIfZagMiYSDFaMtmgGubVHTPmtyg1MIGB2SE1vm7FmMGd2mu4zZ0EtLSovAjprNXfkUy6cibzuawSi3w-VqS8VrKmUmJCU';

type ViewMode = 'active' | 'export' | 'empty';
type Timeframe = 'week' | 'month' | 'season';

export default function ReportsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ farmId?: string }>();
  const { activeFarm } = useActiveFarm();

  const farmId = activeFarm?.id || params.farmId;

  // View Mode
  const [viewMode, setViewMode] = useState<ViewMode>('active');
  const [timeframe, setTimeframe] = useState<Timeframe>('week');
  const [selectedField, setSelectedField] = useState<string>('All Fields');

  // Live Firestore hooks
  const { devices } = useLiveDevices(farmId);
  const { schedules } = useLiveSchedules(farmId);
  const { commands } = useRecentCommands(farmId, devices);
  const { unacknowledgedCount } = useLiveAlerts(farmId, false);

  // Live AI water report
  const [waterReport, setWaterReport] = useState<any>(null);

  useEffect(() => {
    if (!farmId) return;
    try {
      const reportRef = doc(db, 'farms', farmId, 'ai', 'water_report');
      const unsub = onSnapshot(reportRef, (snapshot) => {
        if (snapshot.exists()) {
          setWaterReport(snapshot.data());
        }
      });
      return () => unsub();
    } catch {
      // Ignore if doc does not exist
    }
  }, [farmId]);

  // Derived metrics from commands or defaults
  const totalPumpMinutes = useMemo(() => {
    if (waterReport?.totalPumpSeconds) {
      return Math.round(waterReport.totalPumpSeconds / 60);
    }
    const pumpCmds = commands.filter(
      (c) => c.action === 'PUMP_ON' || c.action.includes('PUMP')
    );
    const mins = pumpCmds.reduce((acc, c) => acc + (c.durationSeconds ? c.durationSeconds / 60 : 15), 0);
    return mins > 0 ? mins : 260; // default 4h 20m = 260 min
  }, [commands, waterReport]);

  const waterConsumedL = useMemo(() => {
    if (waterReport?.actualLitres) return waterReport.actualLitres.toLocaleString();
    return (totalPumpMinutes * 48).toLocaleString(); // ~12,400 L
  }, [waterReport, totalPumpMinutes]);

  const powerSavedRupees = useMemo(() => {
    return Math.round(totalPumpMinutes * 4.75).toLocaleString(); // ~ ₹1,240
  }, [totalPumpMinutes]);

  // Export PDF Handler
  const handleExportPDF = async () => {
    const reportText = `KRISHIVA PRECISION AGRICULTURE REPORT
Farm: ${activeFarm?.name || 'Patil Green Acres'}
Date: 12 Nov – 18 Nov 2026
Water Consumed: ${waterConsumedL} Litres (↓15% vs prev)
Pump Runtime: ${Math.floor(totalPumpMinutes / 60)}h ${totalPumpMinutes % 60}m
Schedule Health: 94% Success (32/34 runs)
Power Saved: ₹${powerSavedRupees} (Solar off-peak sync)
Field Compliance: 88%

Generated automatically by Krishiva IoT Telemetry Suite.`;

    try {
      await Share.share({
        title: 'Krishiva Farm Water & Electrical Audit (PDF)',
        message: reportText,
      });
    } catch (err: any) {
      Alert.alert('Export Notice', 'PDF report summary ready to share.');
    }
  };

  // Export CSV Handler
  const handleExportCSV = async () => {
    const csvHeader = 'Timestamp,Field,Action,RuntimeSeconds,WaterLitres,Status\n';
    const csvRows = [
      '2026-11-18 10:42,North Field,PUMP_ON,900,2100,acknowledged',
      '2026-11-18 06:00,South Wheat,VALVE_ON,1200,1900,acknowledged',
      '2026-11-17 18:00,Polyhouse B,MIST_ON,600,1200,acknowledged',
      '2026-11-16 11:15,North Field,PUMP_ON,1800,2400,acknowledged',
    ].join('\n');

    try {
      await Share.share({
        title: 'Krishiva_Raw_Telemetry_Audit.csv',
        message: csvHeader + csvRows,
      });
    } catch {
      Alert.alert('CSV Ready', 'Telemetry CSV export copied to clipboard.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* 1. TOP APP BAR */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerLogoCircle}>
            <Sprout size={20} color="#526700" />
          </View>
          <Text style={styles.headerTitle}>Reports</Text>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => router.push('/(app)/(farm)/alerts')}
            activeOpacity={0.7}
            accessibilityLabel="Notifications"
          >
            <Bell size={20} color="#191c1b" />
            {unacknowledgedCount > 0 && <View style={styles.notifDot} />}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.profileAvatar}
            onPress={() => router.push('/(app)/(farm)/profile')}
            activeOpacity={0.8}
            accessibilityLabel="Profile"
          >
            <User size={16} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom + 24, 40) }]}
        showsVerticalScrollIndicator={false}
      >
        {/* 2. MODE SELECTOR SEGMENTED CONTROLLER */}
        <View style={styles.modeControllerContainer}>
          <TouchableOpacity
            style={[styles.modeTab, viewMode === 'active' && styles.modeTabActive]}
            onPress={() => setViewMode('active')}
            activeOpacity={0.8}
          >
            <Text style={[styles.modeTabText, viewMode === 'active' && styles.modeTabTextActive]}>
              Active Reports
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modeTab, viewMode === 'export' && styles.modeTabActive]}
            onPress={() => setViewMode('export')}
            activeOpacity={0.8}
          >
            <Text style={[styles.modeTabText, viewMode === 'export' && styles.modeTabTextActive]}>
              Export Sheet
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modeTab, viewMode === 'empty' && styles.modeTabActive]}
            onPress={() => setViewMode('empty')}
            activeOpacity={0.8}
          >
            <Text style={[styles.modeTabText, viewMode === 'empty' && styles.modeTabTextActive]}>
              Empty State
            </Text>
          </TouchableOpacity>
        </View>

        {/* ============================================================== */}
        {/* VIEW 1: ACTIVE REPORTS (DEFAULT) */}
        {/* ============================================================== */}
        {viewMode === 'active' && (
          <View style={styles.viewContent}>
            {/* Sub-header & Scope */}
            <View style={styles.subHeaderSection}>
              <View style={styles.subHeaderTopRow}>
                <View>
                  <Text style={styles.subHeaderTag}>KRISHIVA TELEMETRY</Text>
                  <Text style={styles.subHeaderTitle}>Farm Water & Electrical Audit</Text>
                </View>
                <View style={styles.syncBadge}>
                  <View style={styles.syncDot} />
                  <Text style={styles.syncText}>Sync: 14m ago</Text>
                </View>
              </View>

              {/* Timeframe Segmented Track */}
              <View style={styles.timeframeTrack}>
                {(['week', 'month', 'season'] as Timeframe[]).map((tf) => {
                  const isActive = timeframe === tf;
                  return (
                    <TouchableOpacity
                      key={tf}
                      style={[styles.timeframeBtn, isActive && styles.timeframeBtnActive]}
                      onPress={() => setTimeframe(tf)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.timeframeText, isActive && styles.timeframeTextActive]}>
                        {tf.charAt(0).toUpperCase() + tf.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Filter & Export Row */}
              <View style={styles.filterExportRow}>
                <TouchableOpacity
                  style={styles.fieldFilterBtn}
                  onPress={() => {
                    const fields = ['All Fields', 'North Field', 'South Wheat', 'Polyhouse B'];
                    const nextIdx = (fields.indexOf(selectedField) + 1) % fields.length;
                    setSelectedField(fields[nextIdx]);
                  }}
                  activeOpacity={0.8}
                >
                  <MapPin size={16} color="#516600" />
                  <Text style={styles.fieldFilterText}>{selectedField}</Text>
                  <ChevronDown size={16} color="#556253" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.exportActionBtn}
                  onPress={() => setViewMode('export')}
                  activeOpacity={0.8}
                >
                  <Share2 size={16} color="#556253" />
                  <Text style={styles.exportActionText}>Export</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 4. 2x2 KPI TELEMETRY BENTO */}
            <View style={styles.kpiGrid}>
              {/* KPI 1: Water Consumed */}
              <View style={styles.kpiCard}>
                <View style={styles.kpiCardHeader}>
                  <View style={[styles.kpiIconCircle, { backgroundColor: '#d8e7d4' }]}>
                    <Droplets size={18} color="#131e13" />
                  </View>
                  <View style={styles.kpiPillLime}>
                    <Text style={styles.kpiPillLimeText}>↓ 15%</Text>
                  </View>
                </View>
                <View style={styles.kpiCardBody}>
                  <Text style={styles.kpiLabel}>Water Consumed</Text>
                  <Text style={styles.kpiValue}>
                    {waterConsumedL} <Text style={styles.kpiUnit}>L</Text>
                  </Text>
                  <Text style={styles.kpiSub}>vs 14,600 L prev</Text>
                </View>
              </View>

              {/* KPI 2: Pump Runtime */}
              <View style={styles.kpiCard}>
                <View style={styles.kpiCardHeader}>
                  <View style={[styles.kpiIconCircle, { backgroundColor: '#e7e8e6' }]}>
                    <Gauge size={18} color="#191c1b" />
                  </View>
                  <View style={styles.kpiPillGrey}>
                    <Text style={styles.kpiPillGreyText}>Optimal</Text>
                  </View>
                </View>
                <View style={styles.kpiCardBody}>
                  <Text style={styles.kpiLabel}>Pump Runtime</Text>
                  <Text style={styles.kpiValue}>
                    {Math.floor(totalPumpMinutes / 60)}h {totalPumpMinutes % 60}m
                  </Text>
                  <Text style={styles.kpiSub}>Avg 37m / day</Text>
                </View>
              </View>

              {/* KPI 3: Schedule Health */}
              <View style={styles.kpiCard}>
                <View style={styles.kpiCardHeader}>
                  <View style={[styles.kpiIconCircle, { backgroundColor: '#c6e85a' }]}>
                    <CalendarCheck size={18} color="#526700" />
                  </View>
                  <View style={[styles.kpiPillLime, { backgroundColor: '#cef061' }]}>
                    <Text style={styles.kpiPillLimeText}>94%</Text>
                  </View>
                </View>
                <View style={styles.kpiCardBody}>
                  <Text style={styles.kpiLabel}>Schedule Health</Text>
                  <Text style={styles.kpiValue}>
                    32 <Text style={styles.kpiUnit}>/ 34 runs</Text>
                  </Text>
                  <Text style={[styles.kpiSub, { color: '#516600', fontWeight: '600' }]}>
                    2 trips resolved
                  </Text>
                </View>
              </View>

              {/* KPI 4: Power Saved */}
              <View style={styles.kpiCard}>
                <View style={styles.kpiCardHeader}>
                  <View style={[styles.kpiIconCircle, { backgroundColor: '#dbe9ae' }]}>
                    <Zap size={18} color="#161e00" />
                  </View>
                  <View style={styles.kpiPillGrey}>
                    <Text style={[styles.kpiPillGreyText, { color: '#576334', fontWeight: '700' }]}>
                      +18%
                    </Text>
                  </View>
                </View>
                <View style={styles.kpiCardBody}>
                  <Text style={styles.kpiLabel}>Power Saved</Text>
                  <Text style={styles.kpiValue}>₹{powerSavedRupees}</Text>
                  <Text style={styles.kpiSub}>Solar off-peak sync</Text>
                </View>
              </View>
            </View>

            {/* 5. WATER USED PER DAY CHART */}
            <View style={styles.chartCard}>
              <View style={styles.chartHeader}>
                <View>
                  <Text style={styles.chartTitleTag}>WATER USED PER DAY</Text>
                  <Text style={styles.chartTitle}>Weekly Yield: {waterConsumedL} L</Text>
                </View>
                <View style={styles.chartIconCircle}>
                  <Droplets size={16} color="#556253" />
                </View>
              </View>

              {/* Vertical Bar Graph */}
              <View style={styles.barGraphArea}>
                {[
                  { day: 'M', val: '1.8k', pct: 62 },
                  { day: 'T', val: '2.1k', pct: 74 },
                  { day: 'W', val: '1.4k', pct: 48 },
                  { day: 'T', val: '2.4k', pct: 85 },
                  { day: 'F', val: '1.2k', pct: 42 },
                  { day: 'S', val: '1.9k', pct: 68 },
                  { day: 'S', val: '1.6k', pct: 56, isToday: true },
                ].map((item, idx) => (
                  <View key={idx} style={styles.barCol}>
                    <Text style={[styles.barValText, item.isToday && styles.barValToday]}>
                      {item.val}
                    </Text>
                    <View style={styles.barTrack}>
                      <View
                        style={[
                          styles.barFill,
                          { height: `${item.pct}%` },
                          item.isToday ? styles.barFillToday : styles.barFillStandard,
                        ]}
                      />
                    </View>
                    <Text style={[styles.barDayText, item.isToday && styles.barDayToday]}>
                      {item.day}
                    </Text>
                  </View>
                ))}
              </View>

              <View style={styles.chartFooterRow}>
                <Text style={styles.chartFooterLeft}>Target: 1,800 L / day</Text>
                <View style={styles.chartComplianceBadge}>
                  <CheckCircle2 size={13} color="#516600" />
                  <Text style={styles.chartComplianceText}>88% Compliance</Text>
                </View>
              </View>
            </View>

            {/* 6. PUMP RUNTIME PER DAY CHART */}
            <View style={styles.chartCard}>
              <View style={styles.chartHeader}>
                <View>
                  <Text style={styles.chartTitleTag}>PUMP RUNTIME PER DAY</Text>
                  <Text style={styles.chartTitle}>Avg: 37 min / day</Text>
                </View>
                <View style={styles.submersibleBadge}>
                  <Text style={styles.submersibleBadgeText}>Submersible A1</Text>
                </View>
              </View>

              {/* Forest Tint Horizon Bars */}
              <View style={styles.barGraphArea}>
                {[
                  { day: 'M', val: '45m', pct: 75 },
                  { day: 'T', val: '30m', pct: 50 },
                  { day: 'W', val: '50m', pct: 83 },
                  { day: 'T', val: '25m', pct: 42 },
                  { day: 'F', val: '40m', pct: 66 },
                  { day: 'S', val: '35m', pct: 58 },
                  { day: 'S', val: '15m', pct: 25, isToday: true },
                ].map((item, idx) => (
                  <View key={idx} style={styles.barCol}>
                    <Text style={[styles.barValText, item.isToday && styles.barValToday]}>
                      {item.val}
                    </Text>
                    <View style={styles.barTrack}>
                      <View
                        style={[
                          styles.barFill,
                          { height: `${item.pct}%` },
                          styles.barFillDark,
                          item.isToday && styles.barFillDarkToday,
                        ]}
                      >
                        {item.isToday && <View style={styles.barLimeCap} />}
                      </View>
                    </View>
                    <Text style={[styles.barDayText, item.isToday && styles.barDayToday]}>
                      {item.day}
                    </Text>
                  </View>
                ))}
              </View>

              <View style={styles.chartFooterRow}>
                <View style={styles.thermalRow}>
                  <Bolt size={14} color="#516600" />
                  <Text style={styles.chartFooterLeft}>Motor thermal index: 38°C</Text>
                </View>
                <Text style={styles.dutyNormalText}>Duty: Normal</Text>
              </View>
            </View>

            {/* 7. SCHEDULE RELIABILITY DONUT CARD */}
            <View style={styles.chartCard}>
              <View style={styles.chartHeader}>
                <View>
                  <Text style={styles.chartTitleTag}>SCHEDULE RELIABILITY</Text>
                  <Text style={styles.chartTitle}>34 Total Executions</Text>
                </View>
                <View style={styles.verifiedBadgeCircle}>
                  <ShieldCheck size={18} color="#516600" />
                </View>
              </View>

              {/* Donut and Legend Stack */}
              <View style={styles.donutRow}>
                <View style={styles.donutChartContainer}>
                  <Svg width={140} height={140} viewBox="0 0 100 100">
                    <G transform="rotate(-90 50 50)">
                      {/* Background Ring */}
                      <Circle
                        cx="50"
                        cy="50"
                        r="38"
                        stroke="#edeeec"
                        strokeWidth="11"
                        fill="transparent"
                      />
                      {/* Succeeded (82% = ~195.7 dash) */}
                      <Circle
                        cx="50"
                        cy="50"
                        r="38"
                        stroke="#c6e85a"
                        strokeWidth="11"
                        strokeDasharray="195.7 238.7"
                        strokeDashoffset="0"
                        strokeLinecap="round"
                        fill="transparent"
                      />
                      {/* Manual Override (12% = ~28.6 dash) */}
                      <Circle
                        cx="50"
                        cy="50"
                        r="38"
                        stroke="#dbe9ae"
                        strokeWidth="11"
                        strokeDasharray="28.6 238.7"
                        strokeDashoffset="-198"
                        strokeLinecap="round"
                        fill="transparent"
                      />
                      {/* Trips (6% = ~14.3 dash) */}
                      <Circle
                        cx="50"
                        cy="50"
                        r="38"
                        stroke="#ba1a1a"
                        strokeWidth="11"
                        strokeDasharray="14.3 238.7"
                        strokeDashoffset="-229"
                        strokeLinecap="round"
                        fill="transparent"
                      />
                    </G>
                  </Svg>
                  <View style={styles.donutCenterLabel}>
                    <Text style={styles.donutCenterScore}>94%</Text>
                    <Text style={styles.donutCenterSub}>SUCCESS</Text>
                  </View>
                </View>

                {/* Donut Legend */}
                <View style={styles.donutLegendCol}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#c6e85a' }]} />
                    <View>
                      <Text style={styles.legendTitle}>28 Runs</Text>
                      <Text style={styles.legendSub}>Automated</Text>
                    </View>
                  </View>

                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#dbe9ae' }]} />
                    <View>
                      <Text style={styles.legendTitle}>4 Runs</Text>
                      <Text style={styles.legendSub}>Manual Override</Text>
                    </View>
                  </View>

                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#ba1a1a' }]} />
                    <View>
                      <Text style={styles.legendTitle}>2 Trips</Text>
                      <Text style={[styles.legendSub, { color: '#ba1a1a' }]}>Low Pressure</Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>

            {/* 8. FIELD COMPARISON CARD */}
            <View style={styles.chartCard}>
              <View style={styles.chartHeader}>
                <View>
                  <Text style={styles.chartTitleTag}>FIELD COMPARISON</Text>
                  <Text style={styles.chartTitle}>Health Score & Water Allocation</Text>
                </View>
              </View>

              <View style={styles.fieldRowsContainer}>
                {/* Field 1 */}
                <View style={styles.fieldItemCard}>
                  <View style={styles.fieldItemTop}>
                    <View style={styles.fieldItemLeft}>
                      <View style={[styles.fieldIconCircle, { backgroundColor: '#d8e7d4' }]}>
                        <Tractor size={18} color="#5b6859" />
                      </View>
                      <View>
                        <Text style={styles.fieldNameText}>North Field (Tomato)</Text>
                        <Text style={styles.fieldSubText}>Drip Line Sector 1</Text>
                      </View>
                    </View>
                    <View style={styles.fieldItemRight}>
                      <Text style={styles.fieldWaterText}>4,200 L</Text>
                      <Text style={styles.fieldScoreGreen}>Score 87/100</Text>
                    </View>
                  </View>
                  <View style={styles.progressBarTrack}>
                    <View style={[styles.progressBarFill, { width: '87%', backgroundColor: '#c6e85a' }]} />
                  </View>
                </View>

                {/* Field 2 */}
                <View style={styles.fieldItemCard}>
                  <View style={styles.fieldItemTop}>
                    <View style={styles.fieldItemLeft}>
                      <View style={[styles.fieldIconCircle, { backgroundColor: '#dbe9ae' }]}>
                        <Wheat size={18} color="#161e00" />
                      </View>
                      <View>
                        <Text style={styles.fieldNameText}>South Wheat Plot #2</Text>
                        <Text style={styles.fieldSubText}>Sprinkler Grid 4</Text>
                      </View>
                    </View>
                    <View style={styles.fieldItemRight}>
                      <Text style={styles.fieldWaterText}>5,100 L</Text>
                      <Text style={styles.fieldScoreGrey}>Score 79/100</Text>
                    </View>
                  </View>
                  <View style={styles.progressBarTrack}>
                    <View style={[styles.progressBarFill, { width: '79%', backgroundColor: '#556253' }]} />
                  </View>
                </View>

                {/* Field 3 */}
                <View style={styles.fieldItemCard}>
                  <View style={styles.fieldItemTop}>
                    <View style={styles.fieldItemLeft}>
                      <View style={[styles.fieldIconCircle, { backgroundColor: '#c6e85a' }]}>
                        <Trees size={18} color="#526700" />
                      </View>
                      <View>
                        <Text style={styles.fieldNameText}>Polyhouse Greenhouse B</Text>
                        <Text style={styles.fieldSubText}>Mist Aeroponics</Text>
                      </View>
                    </View>
                    <View style={styles.fieldItemRight}>
                      <Text style={styles.fieldWaterText}>3,100 L</Text>
                      <Text style={styles.fieldScoreGreen}>Score 92/100</Text>
                    </View>
                  </View>
                  <View style={styles.progressBarTrack}>
                    <View style={[styles.progressBarFill, { width: '92%', backgroundColor: '#c6e85a' }]} />
                  </View>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* ============================================================== */}
        {/* VIEW 2: EXPORT SHEET VIEW */}
        {/* ============================================================== */}
        {viewMode === 'export' && (
          <View style={styles.exportCard}>
            <View style={styles.sheetHandle} />

            <View style={styles.exportHeaderRow}>
              <View>
                <Text style={styles.exportTag}>KRISHIVA AUDIT EXPORT</Text>
                <Text style={styles.exportTitle}>Export Farm Report</Text>
              </View>
              <View style={styles.exportDatePill}>
                <Text style={styles.exportDateText}>12 Nov – 18 Nov 2026</Text>
              </View>
            </View>

            <Text style={styles.exportDesc}>
              Generate tamper-proof telemetric records formatted for agronomist consultation, water board subsidies, and seasonal cost accounting.
            </Text>

            {/* Aerial Snapshot Mini-card */}
            <View style={styles.exportSnapshotContainer}>
              <Image source={{ uri: AERIAL_DRONE_IMG }} style={styles.exportSnapshotImage} resizeMode="cover" />
              <View style={styles.exportSnapshotOverlay}>
                <Text style={styles.exportSnapshotCaption}>Sector Alpha to Gamma • 3 Zones Active</Text>
              </View>
            </View>

            {/* Action Row 1: PDF Export */}
            <TouchableOpacity style={styles.exportActionRow} onPress={handleExportPDF} activeOpacity={0.8}>
              <View style={styles.exportActionLeft}>
                <View style={[styles.exportActionIconCircle, { backgroundColor: '#ffdad6' }]}>
                  <FileText size={22} color="#ba1a1a" />
                </View>
                <View>
                  <Text style={styles.exportActionTitle}>Share as PDF Report</Text>
                  <Text style={styles.exportActionSub}>Visual graphs, health charts & pump logs</Text>
                </View>
              </View>
              <View style={styles.arrowCircleDark}>
                <ArrowUpRight size={18} color="#ffffff" />
              </View>
            </TouchableOpacity>

            {/* Action Row 2: CSV Export */}
            <TouchableOpacity style={styles.exportActionRow} onPress={handleExportCSV} activeOpacity={0.8}>
              <View style={styles.exportActionLeft}>
                <View style={[styles.exportActionIconCircle, { backgroundColor: '#d8e7d4' }]}>
                  <Table size={22} color="#5b6859" />
                </View>
                <View>
                  <Text style={styles.exportActionTitle}>Export Raw CSV Log</Text>
                  <Text style={styles.exportActionSub}>Hourly soil moisture, pressure & kWh feeds</Text>
                </View>
              </View>
              <View style={styles.arrowCircleDark}>
                <ArrowUpRight size={18} color="#ffffff" />
              </View>
            </TouchableOpacity>

            {/* Dismiss Button */}
            <TouchableOpacity
              style={styles.dismissBtn}
              onPress={() => setViewMode('active')}
              activeOpacity={0.8}
            >
              <Text style={styles.dismissBtnText}>Dismiss & Back to Dashboard</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ============================================================== */}
        {/* VIEW 3: EMPTY STATE VIEW */}
        {/* ============================================================== */}
        {viewMode === 'empty' && (
          <View style={styles.emptyStateCard}>
            <View style={styles.emptyIconBackdrop}>
              <View style={styles.emptyIconCircle}>
                <Clock size={32} color="#526700" />
              </View>
            </View>

            <View style={styles.emptyTextCol}>
              <Text style={styles.emptyTag}>CALIBRATION PHASE</Text>
              <Text style={styles.emptyTitle}>Not enough data yet</Text>
              <Text style={styles.emptyDesc}>
                Krishiva smart reports formulate after <Text style={styles.boldDark}>7 consecutive days</Text> of telemetry tracking. Your IoT nodes have been active for 2 days.
              </Text>
            </View>

            {/* Calibration Progress Card */}
            <View style={styles.emptyProgressCard}>
              <View style={styles.emptyProgressHeader}>
                <Text style={styles.emptyProgressLabel}>Sensor Cycle Baseline</Text>
                <Text style={styles.emptyProgressBadge}>2 of 7 days</Text>
              </View>
              <View style={styles.emptyProgressBarTrack}>
                <View style={[styles.emptyProgressBarFill, { width: '28.5%' }]} />
              </View>
              <View style={styles.emptyProgressFooter}>
                <Check size={15} color="#516600" />
                <Text style={styles.emptyProgressFooterText}>
                  Soil moisture, solar voltage & valve transducers operational
                </Text>
              </View>
            </View>

            {/* Field Photo Thumbnail */}
            <View style={styles.emptyPhotoContainer}>
              <Image source={{ uri: GREENHOUSE_IMG }} style={styles.emptyPhotoImage} resizeMode="cover" />
              <View style={styles.emptyPhotoOverlay}>
                <View style={styles.emptyPhotoBadge}>
                  <Text style={styles.emptyPhotoBadgeText}>Live Baseline Recording: Field A & B</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={styles.demoDataBtn}
              onPress={() => setViewMode('active')}
              activeOpacity={0.8}
            >
              <Text style={styles.demoDataBtnText}>View Demo Telemetry Data</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f9faf8',
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: 'rgba(249, 250, 248, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.03)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerLogoCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#c6e85a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#191c1b',
    letterSpacing: -0.3,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notifDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ba1a1a',
  },
  profileAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#516600',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },

  // Mode Controller
  modeControllerContainer: {
    flexDirection: 'row',
    backgroundColor: '#edeeec',
    padding: 3,
    borderRadius: 24,
    marginBottom: 16,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeTabActive: {
    backgroundColor: '#c6e85a',
    shadowColor: '#1e2a1e',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  modeTabText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#556253',
  },
  modeTabTextActive: {
    color: '#161e00',
    fontWeight: '700',
  },

  viewContent: {
    gap: 16,
  },

  // Sub-header
  subHeaderSection: {
    gap: 10,
    marginBottom: 4,
  },
  subHeaderTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  subHeaderTag: {
    fontSize: 11,
    fontWeight: '700',
    color: '#576334',
    letterSpacing: 0.8,
  },
  subHeaderTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#191c1b',
    marginTop: 2,
  },
  syncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f3f4f2',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  syncDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#516600',
  },
  syncText: {
    fontSize: 12,
    color: '#556253',
  },

  // Timeframe track
  timeframeTrack: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f2',
    padding: 3,
    borderRadius: 22,
  },
  timeframeBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeframeBtnActive: {
    backgroundColor: '#c6e85a',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  timeframeText: {
    fontSize: 13,
    color: '#556253',
    fontWeight: '500',
  },
  timeframeTextActive: {
    color: '#161e00',
    fontWeight: '700',
  },

  // Filter and export row
  filterExportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fieldFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    shadowColor: '#1e2a1e',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  fieldFilterText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#191c1b',
  },
  exportActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    shadowColor: '#1e2a1e',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  exportActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#191c1b',
  },

  // KPI Bento Grid
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  kpiCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 14,
    shadowColor: '#1e2a1e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
    justifyContent: 'space-between',
    minHeight: 128,
  },
  kpiCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  kpiIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiPillLime: {
    backgroundColor: '#c6e85a',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  kpiPillLimeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#161e00',
  },
  kpiPillGrey: {
    backgroundColor: '#f3f4f2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  kpiPillGreyText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#556253',
  },
  kpiCardBody: {
    marginTop: 8,
  },
  kpiLabel: {
    fontSize: 12,
    color: '#556253',
  },
  kpiValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#191c1b',
    marginTop: 2,
    letterSpacing: -0.3,
  },
  kpiUnit: {
    fontSize: 13,
    fontWeight: '400',
    color: '#556253',
  },
  kpiSub: {
    fontSize: 11,
    color: '#556253',
    marginTop: 2,
  },

  // Chart Cards
  chartCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 16,
    shadowColor: '#1e2a1e',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 2,
    gap: 12,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  chartTitleTag: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: '#556253',
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#191c1b',
    marginTop: 2,
  },
  chartIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submersibleBadge: {
    backgroundColor: '#edeeec',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  submersibleBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#191c1b',
  },
  verifiedBadgeCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(198, 232, 90, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Vertical Bar Graphs
  barGraphArea: {
    height: 140,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: '100%',
    gap: 6,
  },
  barValText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#556253',
  },
  barValToday: {
    color: '#191c1b',
    fontWeight: '700',
  },
  barTrack: {
    width: '70%',
    height: 80,
    justifyContent: 'flex-end',
  },
  barFill: {
    width: '100%',
    borderRadius: 12,
  },
  barFillStandard: {
    backgroundColor: 'rgba(178, 211, 72, 0.4)',
  },
  barFillToday: {
    backgroundColor: '#c6e85a',
    shadowColor: '#516600',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  barFillDark: {
    backgroundColor: '#2e3130',
  },
  barFillDarkToday: {
    backgroundColor: '#191c1b',
    position: 'relative',
    overflow: 'hidden',
  },
  barLimeCap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: '#c6e85a',
  },
  barDayText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#556253',
  },
  barDayToday: {
    color: '#516600',
    fontWeight: '700',
  },
  chartFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(243, 244, 242, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  chartFooterLeft: {
    fontSize: 12,
    color: '#556253',
  },
  chartComplianceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  chartComplianceText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#516600',
  },
  thermalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dutyNormalText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#191c1b',
  },

  // Donut Chart
  donutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 6,
  },
  donutChartContainer: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  donutCenterLabel: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutCenterScore: {
    fontSize: 26,
    fontWeight: '800',
    color: '#191c1b',
    lineHeight: 28,
  },
  donutCenterSub: {
    fontSize: 10,
    fontWeight: '700',
    color: '#556253',
    letterSpacing: 0.6,
  },
  donutLegendCol: {
    gap: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#191c1b',
    lineHeight: 16,
  },
  legendSub: {
    fontSize: 11,
    color: '#556253',
  },

  // Field Comparison
  fieldRowsContainer: {
    gap: 10,
  },
  fieldItemCard: {
    backgroundColor: 'rgba(243, 244, 242, 0.6)',
    padding: 12,
    borderRadius: 16,
    gap: 8,
  },
  fieldItemTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fieldItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  fieldIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldNameText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#191c1b',
  },
  fieldSubText: {
    fontSize: 11,
    color: '#556253',
  },
  fieldItemRight: {
    alignItems: 'flex-end',
  },
  fieldWaterText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#191c1b',
  },
  fieldScoreGreen: {
    fontSize: 11,
    fontWeight: '700',
    color: '#516600',
  },
  fieldScoreGrey: {
    fontSize: 11,
    fontWeight: '700',
    color: '#556253',
  },
  progressBarTrack: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    backgroundColor: '#e2e3e1',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },

  // View 2: Export Sheet
  exportCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 18,
    shadowColor: '#1e2a1e',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 3,
    gap: 14,
  },
  sheetHandle: {
    width: 48,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#e2e3e1',
    alignSelf: 'center',
    marginBottom: 6,
  },
  exportHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  exportTag: {
    fontSize: 11,
    fontWeight: '700',
    color: '#516600',
    letterSpacing: 0.6,
  },
  exportTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#191c1b',
    marginTop: 2,
  },
  exportDatePill: {
    backgroundColor: '#edeeec',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  exportDateText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#191c1b',
  },
  exportDesc: {
    fontSize: 13,
    color: '#556253',
    lineHeight: 18,
  },
  exportSnapshotContainer: {
    width: '100%',
    height: 128,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'flex-end',
  },
  exportSnapshotImage: {
    ...StyleSheet.absoluteFill,
  },
  exportSnapshotOverlay: {
    backgroundColor: 'rgba(22, 30, 0, 0.7)',
    padding: 10,
  },
  exportSnapshotCaption: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  exportActionRow: {
    backgroundColor: '#f3f4f2',
    padding: 14,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  exportActionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  exportActionIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exportActionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#191c1b',
  },
  exportActionSub: {
    fontSize: 11,
    color: '#556253',
    marginTop: 2,
  },
  arrowCircleDark: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#191c1b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissBtn: {
    backgroundColor: '#edeeec',
    borderRadius: 20,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  dismissBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#556253',
  },

  // View 3: Empty State
  emptyStateCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#1e2a1e',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 2,
    gap: 16,
  },
  emptyIconBackdrop: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(198, 232, 90, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#c6e85a',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  emptyTextCol: {
    alignItems: 'center',
    gap: 4,
  },
  emptyTag: {
    fontSize: 11,
    fontWeight: '700',
    color: '#576334',
    letterSpacing: 0.8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#191c1b',
  },
  emptyDesc: {
    fontSize: 13,
    color: '#556253',
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 2,
  },
  boldDark: {
    fontWeight: '700',
    color: '#191c1b',
  },
  emptyProgressCard: {
    width: '100%',
    backgroundColor: '#f3f4f2',
    padding: 14,
    borderRadius: 16,
    gap: 8,
  },
  emptyProgressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  emptyProgressLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#191c1b',
  },
  emptyProgressBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#516600',
  },
  emptyProgressBarTrack: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    backgroundColor: '#e2e3e1',
    overflow: 'hidden',
  },
  emptyProgressBarFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: '#c6e85a',
  },
  emptyProgressFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  emptyProgressFooterText: {
    fontSize: 11,
    color: '#556253',
    flex: 1,
  },
  emptyPhotoContainer: {
    width: '100%',
    height: 112,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyPhotoImage: {
    ...StyleSheet.absoluteFill,
  },
  emptyPhotoOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(25, 28, 27, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyPhotoBadge: {
    backgroundColor: 'rgba(249, 250, 248, 0.92)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
  },
  emptyPhotoBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#191c1b',
  },
  demoDataBtn: {
    width: '100%',
    backgroundColor: '#c6e85a',
    borderRadius: 20,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#516600',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  demoDataBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#161e00',
  },
});
