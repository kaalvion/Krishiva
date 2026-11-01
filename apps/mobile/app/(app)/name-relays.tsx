import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Path } from 'react-native-svg';
import {
  ArrowLeft,
  User,
  Droplets,
  Sliders,
  Lightbulb,
  Volume2,
  Pencil,
  ArrowUpRight,
} from 'lucide-react-native';

interface RelayFormState {
  r1: string;
  r2: string;
  r3: string;
  r4: string;
}

export default function NameRelaysScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ deviceId?: string; farmId?: string }>();

  const deviceId = params.deviceId || 'KR-GSM-9042';

  // Relay Names state
  const [relayNames, setRelayNames] = useState<RelayFormState>({
    r1: 'Main Pump',
    r2: 'Drip Valve',
    r3: 'Field Lights',
    r4: 'Siren',
  });

  const [saving, setSaving] = useState(false);

  // Update a single relay name
  const updateRelayName = (key: keyof RelayFormState, value: string) => {
    setRelayNames((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // Save to AsyncStorage and proceed
  const handleSaveAndContinue = async () => {
    setSaving(true);
    try {
      const storageKey = `@relay_names_${deviceId}`;
      await AsyncStorage.setItem(storageKey, JSON.stringify(relayNames));

      router.push({
        pathname: '/(app)/setup-complete',
        params: {
          deviceId,
          farmId: params.farmId || '',
        },
      });
    } catch {
      Alert.alert('Error', 'Could not save relay configuration locally.');
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    router.replace('/(app)/(farm)/devices');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#f9faf8" />

      {/* Topographic Subtle Contour Background Lines */}
      <View style={styles.topographicBg} pointerEvents="none">
        <Svg width="100%" height="100%" viewBox="0 0 390 1200" fill="none">
          <Path
            d="M-50 80 C 80 120, 220 40, 440 90"
            stroke="#c5c9b1"
            strokeWidth="0.8"
            strokeDasharray="3 3"
            opacity="0.35"
          />
          <Path
            d="M-30 210 C 110 260, 280 170, 430 240"
            stroke="#c5c9b1"
            strokeWidth="0.75"
            opacity="0.25"
          />
          <Path
            d="M-60 380 C 70 330, 200 420, 450 360"
            stroke="#c5c9b1"
            strokeWidth="0.8"
            opacity="0.35"
          />
          <Path
            d="M-20 540 C 130 590, 260 500, 420 560"
            stroke="#c5c9b1"
            strokeWidth="0.75"
            strokeDasharray="2 4"
            opacity="0.25"
          />
          <Path
            d="M-40 730 C 90 690, 240 780, 440 710"
            stroke="#c5c9b1"
            strokeWidth="0.8"
            opacity="0.35"
          />
          <Path
            d="M-50 920 C 100 970, 290 890, 430 960"
            stroke="#c5c9b1"
            strokeWidth="0.75"
            opacity="0.25"
          />
          <Path
            d="M-30 1100 C 120 1060, 250 1140, 450 1080"
            stroke="#c5c9b1"
            strokeWidth="0.8"
            strokeDasharray="4 4"
            opacity="0.35"
          />
        </Svg>
      </View>

      {/* Screen Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            accessibilityLabel="Go back"
            activeOpacity={0.7}
          >
            <ArrowLeft size={22} color="#191c1b" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Scan Device Qr</Text>
        </View>

        <View style={styles.profileBadge}>
          <User size={18} color="#ffffff" />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Step Indicator & Header Metadata */}
        <View style={styles.stepSection}>
          <View style={styles.stepHeaderRow}>
            <Text style={styles.stepTagText}>STEP 3 OF 4 • CONFIGURE RELAY OUTPUTS</Text>
            {/* 4-Dot Progress Gauge (3 of 4 active) */}
            <View style={styles.stepGauge}>
              <View style={styles.stepPillActive} />
              <View style={styles.stepPillActive} />
              <View style={styles.stepPillActive} />
              <View style={styles.stepDotInactive} />
            </View>
          </View>

          {/* Headline & Explainer */}
          <View style={styles.titleGroup}>
            <Text style={styles.displayHeadline}>NAME YOUR OUTPUTS</Text>
            <Text style={styles.subtext}>
              Customize names to match what is connected to each terminal switch. You can change
              these anytime in device settings.
            </Text>
          </View>

          {/* Telemetry Status Tag */}
          <View style={styles.telemetryTag}>
            <View style={styles.statusDot} />
            <Text style={styles.telemetryTagText}>4 SWITCH RELAYS DETECTED</Text>
          </View>
        </View>

        {/* Output Relays Bento Cards */}
        <View style={styles.relaysContainer}>
          {/* RELAY 1: Heavy Duty Pump */}
          <View style={styles.relayCard}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.tagPill}>
                <View style={styles.tagDot} />
                <Text style={styles.tagText}>Relay 1 (25A High Load)</Text>
              </View>
              <Text style={styles.terminalText}>Terminal T1-T2</Text>
            </View>

            <View style={styles.inputRow}>
              <View style={styles.iconCircle}>
                <Droplets size={22} color="#586435" />
              </View>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.textInput}
                  value={relayNames.r1}
                  onChangeText={(val) => updateRelayName('r1', val)}
                  placeholder="e.g. Borewell Pump"
                  placeholderTextColor="#757965"
                />
                <Pencil size={18} color="#757965" />
              </View>
            </View>

            {/* Suggestion Chips */}
            <View style={styles.chipsRow}>
              {['Borewell Pump', 'Submersible', 'Sprinkler Pump', 'Well 1'].map((suggestion) => (
                <TouchableOpacity
                  key={suggestion}
                  style={styles.chipButton}
                  onPress={() => updateRelayName('r1', suggestion)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.chipText}>+ {suggestion}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* RELAY 2: Valve Control */}
          <View style={styles.relayCard}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.tagPill}>
                <View style={styles.tagDot} />
                <Text style={styles.tagText}>Relay 2 (Valve Control)</Text>
              </View>
              <Text style={styles.terminalText}>Terminal T3-T4</Text>
            </View>

            <View style={styles.inputRow}>
              <View style={styles.iconCircle}>
                <Sliders size={22} color="#3d4a3c" />
              </View>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.textInput}
                  value={relayNames.r2}
                  onChangeText={(val) => updateRelayName('r2', val)}
                  placeholder="e.g. North Valve"
                  placeholderTextColor="#757965"
                />
                <Pencil size={18} color="#757965" />
              </View>
            </View>

            {/* Suggestion Chips */}
            <View style={styles.chipsRow}>
              {['North Valve', 'Polyhouse Drip', 'Zone A Valve', 'Fertilizer Venturi'].map(
                (suggestion) => (
                  <TouchableOpacity
                    key={suggestion}
                    style={styles.chipButton}
                    onPress={() => updateRelayName('r2', suggestion)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.chipText}>+ {suggestion}</Text>
                  </TouchableOpacity>
                )
              )}
            </View>
          </View>

          {/* RELAY 3: Auxiliary Switch */}
          <View style={styles.relayCard}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.tagPill}>
                <View style={styles.tagDot} />
                <Text style={styles.tagText}>Relay 3 (Auxiliary Switch)</Text>
              </View>
              <Text style={styles.terminalText}>Terminal T5-T6</Text>
            </View>

            <View style={styles.inputRow}>
              <View style={styles.iconCircle}>
                <Lightbulb size={22} color="#576334" />
              </View>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.textInput}
                  value={relayNames.r3}
                  onChangeText={(val) => updateRelayName('r3', val)}
                  placeholder="e.g. Yard Floodlight"
                  placeholderTextColor="#757965"
                />
                <Pencil size={18} color="#757965" />
              </View>
            </View>

            {/* Suggestion Chips */}
            <View style={styles.chipsRow}>
              {['Yard Floodlight', 'Fence Light', 'Gate Lamp', 'Insect Trap UV'].map(
                (suggestion) => (
                  <TouchableOpacity
                    key={suggestion}
                    style={styles.chipButton}
                    onPress={() => updateRelayName('r3', suggestion)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.chipText}>+ {suggestion}</Text>
                  </TouchableOpacity>
                )
              )}
            </View>
          </View>

          {/* RELAY 4: Alarm / Siren */}
          <View style={styles.relayCard}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.tagPill}>
                <View style={styles.tagDot} />
                <Text style={styles.tagText}>Relay 4 (Alarm / Siren)</Text>
              </View>
              <Text style={styles.terminalText}>Terminal T7-T8</Text>
            </View>

            <View style={styles.inputRow}>
              <View style={styles.iconCircle}>
                <Volume2 size={22} color="#3d4a3c" />
              </View>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.textInput}
                  value={relayNames.r4}
                  onChangeText={(val) => updateRelayName('r4', val)}
                  placeholder="e.g. Wild Animal Siren"
                  placeholderTextColor="#757965"
                />
                <Pencil size={18} color="#757965" />
              </View>
            </View>

            {/* Suggestion Chips */}
            <View style={styles.chipsRow}>
              {['Wild Animal Siren', 'Security Buzzer', 'Night Alarm', 'Horn'].map(
                (suggestion) => (
                  <TouchableOpacity
                    key={suggestion}
                    style={styles.chipButton}
                    onPress={() => updateRelayName('r4', suggestion)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.chipText}>+ {suggestion}</Text>
                  </TouchableOpacity>
                )
              )}
            </View>
          </View>
        </View>

        {/* Pro Tip Card */}
        <View style={styles.proTipCard}>
          <View style={styles.proTipIconCircle}>
            <Lightbulb size={18} color="#516600" />
          </View>
          <View style={styles.proTipTextColumn}>
            <Text style={styles.proTipTitle}>Pro Tip</Text>
            <Text style={styles.proTipBody}>
              Naming your relays clearly helps when automating schedules and receiving voice alerts
              via WhatsApp or SMS.
            </Text>
          </View>
        </View>

        {/* Clearance for sticky footer */}
        <View style={styles.footerBuffer} />
      </ScrollView>

      {/* Sticky Bottom Actions Section */}
      <View style={styles.stickyFooter}>
        <View style={styles.footerContent}>
          {/* Primary Pill Action: CONTINUE TO STEP 4 */}
          <TouchableOpacity
            style={styles.primaryActionButton}
            onPress={handleSaveAndContinue}
            disabled={saving}
            activeOpacity={0.88}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#1E2A1E" style={styles.spinner} />
            ) : (
              <>
                <Text style={styles.primaryActionText}>CONTINUE TO STEP 4</Text>
                <View style={styles.actionArrowCircle}>
                  <ArrowUpRight size={20} color="#ffffff" strokeWidth={2.4} />
                </View>
              </>
            )}
          </TouchableOpacity>

          {/* Secondary Action: Skip naming for now */}
          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkip}
            activeOpacity={0.7}
          >
            <Text style={styles.skipButtonText}>Skip naming for now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f9faf8',
  },
  topographicBg: {
    ...StyleSheet.absoluteFill,
  },
  header: {
    height: 56,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(249, 250, 248, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.04)',
    zIndex: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Manrope_600SemiBold',
    color: '#191c1b',
  },
  profileBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#516600',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  stepSection: {
    marginBottom: 16,
  },
  stepHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  stepTagText: {
    fontSize: 11,
    fontFamily: 'Manrope_700Bold',
    color: '#454937',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  stepGauge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  stepPillActive: {
    width: 14,
    height: 6,
    borderRadius: 99,
    backgroundColor: '#C6E85A',
  },
  stepDotInactive: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#e2e3e1',
  },
  titleGroup: {
    marginTop: 4,
  },
  displayHeadline: {
    fontSize: 27,
    fontFamily: 'Manrope_300Light',
    color: '#191c1b',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  subtext: {
    fontSize: 13.5,
    fontFamily: 'Manrope_400Regular',
    color: '#556253',
    lineHeight: 20,
    marginTop: 4,
  },
  telemetryTag: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 99,
    backgroundColor: 'rgba(211, 225, 166, 0.6)',
    marginTop: 10,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#516600',
  },
  telemetryTagText: {
    fontSize: 10.5,
    fontFamily: 'Manrope_700Bold',
    color: '#586435',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  relaysContainer: {
    gap: 12,
    marginBottom: 16,
  },
  relayCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 16,
    shadowColor: '#1E2A1E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.03)',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  tagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f3f4f2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
  },
  tagDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#C6E85A',
  },
  tagText: {
    fontSize: 11,
    fontFamily: 'Manrope_700Bold',
    color: '#556253',
    textTransform: 'uppercase',
  },
  terminalText: {
    fontSize: 11,
    fontFamily: 'Manrope_600SemiBold',
    color: '#757965',
    textTransform: 'uppercase',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#d8e7d4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputWrapper: {
    flex: 1,
    height: 48,
    borderRadius: 99,
    backgroundColor: '#f3f4f2',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    justifyContent: 'space-between',
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Manrope_600SemiBold',
    color: '#191c1b',
    paddingVertical: 0,
    marginRight: 8,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingTop: 2,
  },
  chipButton: {
    backgroundColor: '#f3f4f2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 99,
  },
  chipText: {
    fontSize: 11.5,
    fontFamily: 'Manrope_500Medium',
    color: '#556253',
  },
  proTipCard: {
    backgroundColor: '#f3f4f2',
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 20,
  },
  proTipIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  proTipTextColumn: {
    flex: 1,
  },
  proTipTitle: {
    fontSize: 13,
    fontFamily: 'Manrope_700Bold',
    color: '#191c1b',
  },
  proTipBody: {
    fontSize: 12,
    fontFamily: 'Manrope_400Regular',
    color: '#556253',
    lineHeight: 18,
    marginTop: 2,
  },
  footerBuffer: {
    height: 110,
  },
  stickyFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(249, 250, 248, 0.94)',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
  },
  footerContent: {
    maxWidth: 440,
    alignSelf: 'center',
    width: '100%',
    alignItems: 'center',
    gap: 6,
  },
  primaryActionButton: {
    width: '100%',
    height: 56,
    borderRadius: 99,
    backgroundColor: '#C6E85A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 24,
    paddingRight: 8,
    shadowColor: '#C6E85A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 3,
  },
  primaryActionText: {
    fontSize: 14.5,
    fontFamily: 'Manrope_700Bold',
    color: '#1E2A1E',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  actionArrowCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#1E2A1E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinner: {
    flex: 1,
  },
  skipButton: {
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  skipButtonText: {
    fontSize: 13,
    fontFamily: 'Manrope_500Medium',
    color: '#556253',
  },
});
