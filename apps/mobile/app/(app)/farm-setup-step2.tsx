import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  HelpCircle,
  Calendar,
  CalendarDays,
  Info,
  Sprout,
  Plus,
  X,
  User,
  Router as RouterIcon,
  Tractor,
} from 'lucide-react-native';
import { updateFarm } from '../../src/services/api';
import { useServerStatus } from '../../src/context/ServerStatusContext';

interface CropItem {
  id: string;
  name: string;
  svgPath: string;
}

const PRESET_CROPS: CropItem[] = [
  {
    id: 'tomato',
    name: 'Tomato',
    svgPath:
      'M12 4.5c.6-.7 1.5-1.2 2.5-1.3-.2.8-.7 1.5-1.3 2 1-.2 2.1 0 2.8.6-.8.5-1.8.6-2.7.4.5.6 1.2 1.1 2 1.3-1 .2-2-.1-2.8-.8-.1.7-.5 1.3-1 1.7-.2-1-.7-1.8-1.5-2.4 1 0 1.8-.7 2-1.5zM12 7c4.1 0 7.5 3 7.5 7.2 0 4.1-3.4 6.8-7.5 6.8s-7.5-2.7-7.5-6.8C4.5 10 7.9 7 12 7zm-2.8 4.2c-.3 0-.6.2-.7.5-.4 1.4-.2 2.8.5 4 .2.3.6.4.9.2.3-.2.4-.6.2-.9-.5-1-.7-2.1-.4-3.1.1-.4-.2-.7-.5-.7z',
  },
  {
    id: 'grapes',
    name: 'Grapes',
    svgPath:
      'M11 2.5a.75.75 0 011.5 0v1.6c1.8.2 3.5 1 4.5 2.2a.75.75 0 01-1.1 1c-.8-.9-2.1-1.5-3.4-1.6V8a2.5 2.5 0 11-1 0V5.7C9.9 5.8 8.6 6.4 7.8 7.3a.75.75 0 11-1.1-1c1-1.2 2.7-2 4.5-2.2V2.5zM8.5 9.5a2 2 0 100 4 2 2 0 000-4zm7 0a2 2 0 100 4 2 2 0 000-4zm-3.5 2a2 2 0 100 4 2 2 0 000-4zm-3.5 4a2 2 0 100 4 2 2 0 000-4zm7 0a2 2 0 100 4 2 2 0 000-4zm-3.5 2a2 2 0 100 4 2 2 0 000-4z',
  },
  {
    id: 'paddy',
    name: 'Paddy',
    svgPath:
      'M5.5 19.5c.3-2.5 1.5-4.8 3.5-6.5l.6-.5c.8-.7 1.8-1.2 2.9-1.5V6.8a1.5 1.5 0 112 0v4.2c1.1.3 2.1.8 2.9 1.5l.6.5c2 1.7 3.2 4 3.5 6.5H5.5zm8-11.7a.5.5 0 00-1 0v1.5a.5.5 0 001 0V7.8zm2.4 4.8c-.7-.5-1.5-.9-2.4-1.1v2.1c.9.2 1.7.6 2.4 1.1l.6.5c.9.8 1.6 1.8 2 2.9h1.7c-.5-2.2-1.7-4.1-3.7-5.5l-.6-.5zm-7.8 0c-2 1.4-3.2 3.3-3.7 5.5h1.7c.4-1.1 1.1-2.1 2-2.9l.6-.5c.7-.5 1.5-.9 2.4-1.1v-2.1c-.9.2-1.7.6-2.4 1.1l-.6.5z',
  },
  {
    id: 'maize',
    name: 'Maize',
    svgPath:
      'M12 2C9.5 2 7.5 4.5 7.5 8c0 2.2.8 4.2 2 5.5V19c0 1.1.9 2 2 2h1c1.1 0 2-.9 2-2v-5.5c1.2-1.3 2-3.3 2-5.5 0-3.5-2-6-4.5-6zm-.5 3.5h1v2h-1v-2zm-1.5 3h1v2h-1v-2zm3 0h1v2h-1v-2zm-3 3h1v2h-1v-2zm3 0h1v2h-1v-2zm-1.5 3h1v2h-1v-2z',
  },
  {
    id: 'chilli',
    name: 'Chilli',
    svgPath:
      'M14.5 3c-.3 0-.6.2-.8.5l-.8 1.4c-.4-.1-.8-.2-1.3-.2-.5 0-.9.1-1.3.3l-.8-1.5c-.2-.3-.5-.5-.8-.5-.5 0-.9.4-.9.9 0 .2.1.4.2.6l.8 1.4C7.6 6.8 7 8.3 7 10c0 4.5 3.5 8.7 7 10.9.4.3.9.1 1.1-.3.1-.2.1-.4 0-.6-1.5-2.2-2.1-4.7-2.1-7 0-.5.4-1 1-1h.2c1.2 0 2.3-.6 3-1.6.4-.6.6-1.3.6-2.1 0-1.8-1.5-3.3-3.3-3.3z',
  },
  {
    id: 'cotton',
    name: 'Cotton',
    svgPath:
      'M12 3a4 4 0 00-3.6 2.3A4 4 0 004.5 9a4 4 0 00.9 4.3 4 4 0 002.3 3.6c.3 1.2 1.2 2.1 2.3 2.6V21h4v-1.5c1.1-.5 2-1.4 2.3-2.6a4 4 0 002.3-3.6 4 4 0 00.9-4.3 4 4 0 00-3.9-3.7A4 4 0 0012 3zm0 2.5a2.5 2.5 0 012.3 1.6l.3.8.8.2a2.5 2.5 0 011.6 2.3c0 .8-.4 1.6-1 2.1l-.6.5.1.8c.1.9-.3 1.8-1 2.3l-.7.5v.8a2.5 2.5 0 01-1.8 2.4V16h-4v3.5a2.5 2.5 0 01-1.8-2.4v-.8l-.7-.5c-.7-.5-1.1-1.4-1-2.3l.1-.8-.6-.5a2.5 2.5 0 01-1-2.1c0-1 .6-1.9 1.6-2.3l.8-.2.3-.8A2.5 2.5 0 0112 5.5z',
  },
  {
    id: 'sugarcane',
    name: 'Sugarcane',
    svgPath:
      'M10 2.5a1.5 1.5 0 00-1.5 1.5v3.2c-1.3.4-2.2 1.6-2.2 3v3.1c-1.3.4-2.2 1.6-2.2 3V20a1.5 1.5 0 001.5 1.5h12a1.5 1.5 0 001.5-1.5v-3.7c0-1.4-.9-2.6-2.2-3v-3.1c0-1.4-.9-2.6-2.2-3V4A1.5 1.5 0 0014 2.5h-4zm0 2h4v2.5h-4V4.5zm-1.5 4.5h7v3h-7V9zm-1.5 5h10v3H7v-3z',
  },
  {
    id: 'onion',
    name: 'Onion',
    svgPath:
      'M12 2.5a.75.75 0 01.75.75c0 1.2.6 2.3 1.5 3 .6.5 1.1 1.2 1.4 2 .3.7.3 1.5.1 2.2a6 6 0 01-1.7 8.2c-1.2.8-2.6 1.3-4.05 1.35C8.5 20 7.1 19.5 6 18.7a6 6 0 01-1.7-8.2c.2-.7.6-1.5 1.1-2.2.9-.7 1.5-1.8 1.5-3A.75.75 0 017.65 4.5c.3-.4.7-.8 1.1-1.1a.75.75 0 01.9-.1c.7.4 1.5.7 2.35.7.75 0 1.5-.3 2.2-.7a.75.75 0 01.9.1c.4.3.8.7 1.1 1.1.2.2.1.5-.1.7-.8.5-1.4 1.3-1.7 2.2-.3 1-.2 2.1.3 3 .8 1.4.9 3.1.2 4.6-.7 1.4-2 2.4-3.5 2.6-1.5-.2-2.8-1.2-3.5-2.6-.7-1.5-.6-3.2.2-4.6.5-.9.6-2 .3-3-.3-.9-.9-1.7-1.7-2.2z',
  },
  {
    id: 'other',
    name: 'Other',
    svgPath: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14h-2v-3H8v-2h3V8h2v3h3v2h-3v3z',
  },
];

export default function FarmSetupStep2Screen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { farmId } = useLocalSearchParams<{ farmId?: string }>();
  const { serverOnline } = useServerStatus();

  // Selection states
  const [selectedCrops, setSelectedCrops] = useState<string[]>(['tomato', 'grapes']);
  const [customCrops, setCustomCrops] = useState<string[]>(['Pomegranate (Ruby)']);
  const [customCropInput, setCustomCropInput] = useState('Pomegranate');
  const [isOtherOpen, setIsOtherOpen] = useState(false);

  // Planting Date
  const [plantingDate, setPlantingDate] = useState<Date>(new Date(2026, 9, 15));
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Loading & Modal
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Toggle crop selection
  const handleToggleCrop = (cropId: string) => {
    if (cropId === 'other') {
      setIsOtherOpen((prev) => !prev);
      return;
    }

    setSelectedCrops((prev) => {
      if (prev.includes(cropId)) {
        return prev.filter((id) => id !== cropId);
      } else {
        return [...prev, cropId];
      }
    });
  };

  // Add custom crop tag
  const handleAddCustomCrop = () => {
    const trimmed = customCropInput.trim();
    if (trimmed && !customCrops.includes(trimmed)) {
      setCustomCrops((prev) => [...prev, trimmed]);
      setCustomCropInput('');
    }
  };

  // Remove custom crop tag
  const handleRemoveCustomCrop = (cropName: string) => {
    setCustomCrops((prev) => prev.filter((c) => c !== cropName));
  };

  // Format date helper
  const formatDateDisplay = (d: Date) => {
    const day = d.getDate();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  };

  // Finish Setup handler
  const handleFinishSetup = async () => {
    const allCropNames = [
      ...selectedCrops.map((id) => PRESET_CROPS.find((p) => p.id === id)?.name || id),
      ...customCrops,
    ];

    if (allCropNames.length === 0) {
      Alert.alert('Crop Selection', 'Please select at least one crop to calibrate telemetry presets.');
      return;
    }

    setIsSaving(true);
    try {
      if (farmId) {
        await updateFarm(farmId, {
          cropType: allCropNames.join(', '),
          crops: allCropNames,
          plantingDate: plantingDate.toISOString(),
        });
      }
      setShowSuccessModal(true);
    } catch (err: unknown) {
      // If server error or offline preview, show fallback modal
      if (!serverOnline) {
        setShowSuccessModal(true);
      } else {
        const msg = err instanceof Error ? err.message : 'Could not save crop profile.';
        Alert.alert('Save Notice', `${msg}. Proceeding to finish setup.`, [
          { text: 'OK', onPress: () => setShowSuccessModal(true) },
        ]);
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* 1. TOP HEADER & 2-SEGMENT PROGRESS BAR */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}
            accessibilityLabel="Go back"
          >
            <ArrowLeft size={22} color="#191c1b" />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.headerSubtitle}>KRISHIVA FARM SETUP</Text>
            <Text style={styles.headerTitle}>Farm Setup Step 2</Text>
          </View>

          <View style={styles.profileAvatar}>
            <User size={18} color="#ffffff" />
          </View>
        </View>

        {/* 2/2 Progress Bar: Both Segments Lime Green */}
        <View style={styles.progressBarRow}>
          <View style={[styles.progressSegment, styles.progressSegmentFilled]} />
          <View style={[styles.progressSegment, styles.progressSegmentFilled]} />
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 120 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* 2. STATUS & META BAR */}
        <View style={styles.metaStatusBar}>
          <View style={styles.metaStatusLeft}>
            <View style={styles.pulseDot} />
            <Text style={styles.metaStatusText}>TELEMETRY CALIBRATION</Text>
          </View>

          <TouchableOpacity
            style={styles.helpBtn}
            activeOpacity={0.7}
            onPress={() =>
              Alert.alert(
                'Telemetry Calibration',
                'Selecting your crops customizes automatic irrigation schedules, moisture alert thresholds, and NDVI satellite imagery presets.'
              )
            }
          >
            <HelpCircle size={18} color="#191c1b" />
          </TouchableOpacity>
        </View>

        {/* 3. HERO HEADER SECTION */}
        <View style={styles.heroSection}>
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>STEP 2 • CROP PROFILE</Text>
          </View>

          <Text style={styles.heroTitle}>WHAT ARE YOU GROWING?</Text>
          <Text style={styles.heroSubtitle}>
            Select all that apply for AI irrigation presets, spectral NDVI indexing & soil telemetry.
          </Text>
        </View>

        {/* 4. CROP SELECTION 3x3 GRID */}
        <View style={styles.gridSection}>
          <View style={styles.gridHeaderRow}>
            <Text style={styles.gridHeaderTitle}>CROPS IN CYCLE</Text>
            <View style={styles.cropCounterPill}>
              <Text style={styles.cropCounterText}>
                {selectedCrops.length + (customCrops.length > 0 ? customCrops.length : 0)} SELECTED
              </Text>
            </View>
          </View>

          <View style={styles.cropGrid}>
            {PRESET_CROPS.map((crop) => {
              const isOther = crop.id === 'other';
              const isSelected = isOther ? isOtherOpen : selectedCrops.includes(crop.id);

              return (
                <TouchableOpacity
                  key={crop.id}
                  style={[
                    styles.cropTile,
                    isSelected ? styles.cropTileActive : styles.cropTileInactive,
                  ]}
                  onPress={() => handleToggleCrop(crop.id)}
                  activeOpacity={0.85}
                >
                  {/* Top-Right Corner Checkmark Badge */}
                  {isSelected && (
                    <View style={styles.tileCheckBadge}>
                      <Check size={11} color="#ffffff" strokeWidth={3} />
                    </View>
                  )}

                  {/* Crop Vector Icon */}
                  <View style={styles.tileIconBox}>
                    <Svg width={28} height={28} viewBox="0 0 24 24">
                      <Path
                        d={crop.svgPath}
                        fill={isSelected ? '#161e00' : '#556253'}
                      />
                    </Svg>
                  </View>

                  {/* Crop Label */}
                  <Text
                    style={[
                      styles.tileLabel,
                      isSelected ? styles.tileLabelActive : styles.tileLabelInactive,
                    ]}
                  >
                    {crop.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 5. CUSTOM CROP SPECIFICATION CARD (EXPANDABLE) */}
        {(isOtherOpen || customCrops.length > 0) && (
          <View style={styles.customCropCard}>
            <View style={styles.customHeaderRow}>
              <Text style={styles.customHeaderTag}>CUSTOM CROP SPECIFICATION</Text>
              <TouchableOpacity
                onPress={() => setCustomCropInput('')}
                activeOpacity={0.7}
              >
                <Text style={styles.clearBtnText}>CLEAR</Text>
              </TouchableOpacity>
            </View>

            {/* Custom Input Pill */}
            <View style={styles.customInputPill}>
              <Sprout size={18} color="#556253" />
              <TextInput
                style={styles.customTextInput}
                value={customCropInput}
                onChangeText={setCustomCropInput}
                placeholder="e.g. Pomegranate, Soybean..."
                placeholderTextColor="#757965"
                onSubmitEditing={handleAddCustomCrop}
              />
              <TouchableOpacity
                style={styles.customAddBtn}
                onPress={handleAddCustomCrop}
                activeOpacity={0.8}
              >
                <Plus size={16} color="#161e00" strokeWidth={2.5} />
              </TouchableOpacity>
            </View>

            {/* Custom Crop Tags Row */}
            <View style={styles.tagsContainer}>
              {customCrops.map((c) => (
                <View key={c} style={styles.cropTag}>
                  <Text style={styles.cropTagText}>{c}</Text>
                  <TouchableOpacity
                    onPress={() => handleRemoveCustomCrop(c)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <X size={12} color="#191c1b" strokeWidth={2.5} />
                  </TouchableOpacity>
                </View>
              ))}

              <TouchableOpacity
                style={styles.addMoreBtn}
                onPress={() => setCustomCropInput('')}
                activeOpacity={0.7}
              >
                <Text style={styles.addMoreBtnText}>+ Add another crop</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* 6. PLANTING DATE & SOWING CARD */}
        <View style={styles.dateSection}>
          <Text style={styles.dateSectionTitle}>PLANTING DATE & SOWING</Text>

          <View style={styles.dateCard}>
            <View style={styles.dateRow}>
              <View style={styles.dateLeft}>
                <View style={styles.dateIconCircle}>
                  <Calendar size={22} color="#404b1f" />
                </View>

                <View>
                  <Text style={styles.dateSubLabel}>CURRENT CYCLE SOWING</Text>
                  <Text style={styles.dateMainValue}>
                    {formatDateDisplay(plantingDate)}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.changeDateBtn}
                onPress={() => setShowDatePicker(true)}
                activeOpacity={0.8}
              >
                <Text style={styles.changeDateText}>CHANGE</Text>
                <CalendarDays size={14} color="#191c1b" />
              </TouchableOpacity>
            </View>

            <View style={styles.dateInfoNoteRow}>
              <Info size={16} color="#576334" style={{ marginTop: 1 }} />
              <Text style={styles.dateInfoNoteText}>
                Used to calculate growth stage thresholds, GDD (Growing Degree Days), and prescription variable-rate fertilizer telemetry.
              </Text>
            </View>
          </View>
        </View>

        {/* Native Date Picker */}
        {showDatePicker && (
          <DateTimePicker
            value={plantingDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event: DateTimePickerEvent, selectedDate?: Date) => {
              setShowDatePicker(Platform.OS === 'ios');
              if (selectedDate) {
                setPlantingDate(selectedDate);
              }
            }}
          />
        )}
      </ScrollView>

      {/* 7. STICKY BOTTOM FINISH SETUP BUTTON */}
      <View
        style={[
          styles.stickyFooter,
          { paddingBottom: Math.max(insets.bottom, 16) },
        ]}
      >
        <TouchableOpacity
          style={styles.finishBtn}
          onPress={handleFinishSetup}
          activeOpacity={0.88}
          disabled={isSaving}
        >
          <Text style={styles.finishBtnText}>
            {isSaving ? 'CALIBRATING FARM...' : 'FINISH SETUP'}
          </Text>

          <View style={styles.finishArrowCap}>
            {isSaving ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <ArrowUpRight size={22} color="#ffffff" />
            )}
          </View>
        </TouchableOpacity>
      </View>

      {/* 8. SUCCESS BOTTOM SHEET MODAL */}
      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdropDismiss}
            activeOpacity={1}
            onPress={() => setShowSuccessModal(false)}
          />

          <View style={styles.modalSheet}>
            {/* Sheet Handle */}
            <View style={styles.modalHandle} />

            {/* Hero Visual Icon Disc */}
            <View style={styles.modalHeroDiscContainer}>
              <View style={styles.modalMainDisc}>
                <Tractor size={38} color="#161e00" />
                <View style={styles.modalMiniBadge}>
                  <Sprout size={15} color="#ffffff" />
                </View>
              </View>

              <View style={styles.modalTextStack}>
                <Text style={styles.modalCompleteTag}>SETUP COMPLETE</Text>
                <Text style={styles.modalHeadline}>Farm Created!</Text>
                <Text style={styles.modalDescription}>
                  Now add your first Krishiva sensor controller or gateway to activate automated valve schedules.
                </Text>
              </View>
            </View>

            {/* Controller Quick Summary Badge */}
            <View style={styles.modalControllerCard}>
              <View style={styles.modalControllerLeft}>
                <View style={styles.modalRouterCircle}>
                  <RouterIcon size={20} color="#404b1f" />
                </View>
                <View>
                  <Text style={styles.modalControllerTitle}>Krishiva Core V4</Text>
                  <Text style={styles.modalControllerSubtitle}>
                    Ready for Bluetooth / LoRa link
                  </Text>
                </View>
              </View>

              <View style={styles.modalReadyBadge}>
                <Text style={styles.modalReadyBadgeText}>READY</Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.modalActionGroup}>
              <TouchableOpacity
                style={styles.modalAddDeviceBtn}
                onPress={() => {
                  setShowSuccessModal(false);
                  router.replace('/(app)/scan-device');
                }}
                activeOpacity={0.88}
              >
                <Text style={styles.modalAddDeviceText}>ADD DEVICE</Text>
                <View style={styles.modalArrowCap}>
                  <ArrowUpRight size={20} color="#ffffff" />
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalLaterBtn}
                onPress={() => {
                  setShowSuccessModal(false);
                  router.replace('/(app)/(farm)/dashboard');
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.modalLaterBtnText}>Later, go to dashboard</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f9faf8',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
  },

  // 1. HEADER
  header: {
    backgroundColor: 'rgba(249, 250, 248, 0.92)',
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerSubtitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10,
    color: '#576334',
    letterSpacing: 1.1,
  },
  headerTitle: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 16,
    color: '#191c1b',
    marginTop: 1,
  },
  profileAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#516600',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 2,
  },
  progressBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 4,
  },
  progressSegment: {
    flex: 1,
    height: 6,
    borderRadius: 3,
  },
  progressSegmentFilled: {
    backgroundColor: '#c6e85a',
    shadowColor: '#516600',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },

  // 2. META STATUS BAR
  metaStatusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  metaStatusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#516600',
  },
  metaStatusText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 10,
    color: '#576334',
    letterSpacing: 1.1,
  },
  helpBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#edeeec',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // 3. HERO HEADER
  heroSection: {
    paddingVertical: 6,
    marginBottom: 16,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(211, 225, 166, 0.65)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 14,
    marginBottom: 8,
  },
  heroBadgeText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 10,
    color: '#404b1f',
    letterSpacing: 1.2,
  },
  heroTitle: {
    fontFamily: 'Manrope_300Light',
    fontSize: 26,
    color: '#191c1b',
    letterSpacing: 1.8,
    marginBottom: 6,
  },
  heroSubtitle: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    color: '#556253',
    lineHeight: 19,
  },

  // 4. CROPS GRID
  gridSection: {
    marginBottom: 16,
  },
  gridHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
    marginBottom: 10,
  },
  gridHeaderTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 13.5,
    color: '#191c1b',
    letterSpacing: 0.5,
  },
  cropCounterPill: {
    backgroundColor: '#e7e8e6',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  cropCounterText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10.5,
    color: '#556253',
    letterSpacing: 0.8,
  },
  cropGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  cropTile: {
    width: '31%',
    height: 96,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    position: 'relative',
  },
  cropTileActive: {
    backgroundColor: '#c6e85a',
    shadowColor: '#516600',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  cropTileInactive: {
    backgroundColor: '#ffffff',
    shadowColor: '#1e2a1e',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  tileCheckBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#131e13',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  tileIconBox: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  tileLabel: {
    fontSize: 12.5,
  },
  tileLabelActive: {
    fontFamily: 'Manrope_700Bold',
    color: '#161e00',
  },
  tileLabelInactive: {
    fontFamily: 'Manrope_500Medium',
    color: '#191c1b',
  },

  // 5. CUSTOM CROP CARD
  customCropCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 14,
    shadowColor: '#1e2a1e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
    marginBottom: 16,
  },
  customHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  customHeaderTag: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10.5,
    color: '#576334',
    letterSpacing: 0.8,
  },
  clearBtnText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10.5,
    color: '#556253',
    letterSpacing: 0.8,
  },
  customInputPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f2',
    borderRadius: 24,
    height: 44,
    paddingHorizontal: 14,
    gap: 10,
    marginBottom: 10,
  },
  customTextInput: {
    flex: 1,
    fontFamily: 'Manrope_500Medium',
    fontSize: 13.5,
    color: '#191c1b',
    padding: 0,
  },
  customAddBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#c6e85a',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#516600',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  cropTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#e7e8e6',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  cropTagText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    color: '#191c1b',
  },
  addMoreBtn: {
    paddingVertical: 5,
    paddingHorizontal: 4,
  },
  addMoreBtnText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
    color: '#516600',
  },

  // 6. PLANTING DATE & SOWING
  dateSection: {
    marginBottom: 20,
  },
  dateSectionTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 13.5,
    color: '#191c1b',
    letterSpacing: 0.5,
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  dateCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#1e2a1e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#edeeec',
  },
  dateLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dateIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(211, 225, 166, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateSubLabel: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 9.5,
    color: '#556253',
    letterSpacing: 0.8,
  },
  dateMainValue: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 16,
    color: '#191c1b',
    marginTop: 2,
  },
  changeDateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#e7e8e6',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
  },
  changeDateText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 10,
    color: '#191c1b',
    letterSpacing: 0.8,
  },
  dateInfoNoteRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingTop: 12,
  },
  dateInfoNoteText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 11.5,
    color: '#556253',
    lineHeight: 16,
    flex: 1,
  },

  // 7. STICKY FOOTER
  stickyFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(249, 250, 248, 0.95)',
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0, 0, 0, 0.06)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 8,
  },
  finishBtn: {
    height: 56,
    backgroundColor: '#c6e85a',
    borderRadius: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 24,
    paddingRight: 6,
    shadowColor: '#c6e85a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 4,
    marginBottom: 6,
  },
  finishBtnText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 14,
    color: '#131e13',
    letterSpacing: 1.5,
  },
  finishArrowCap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#131e13',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },

  // 8. SUCCESS MODAL
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(30, 42, 30, 0.65)',
    justifyContent: 'flex-end',
  },
  modalBackdropDismiss: {
    flex: 1,
  },
  modalSheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -12 },
    shadowOpacity: 0.18,
    shadowRadius: 36,
    elevation: 16,
  },
  modalHandle: {
    width: 44,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#e2e3e1',
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalHeroDiscContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  modalMainDisc: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#c6e85a',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    shadowColor: '#516600',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 14,
  },
  modalMiniBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#131e13',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  modalTextStack: {
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  modalCompleteTag: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 10,
    color: '#576334',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  modalHeadline: {
    fontFamily: 'Manrope_300Light',
    fontSize: 24,
    color: '#191c1b',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  modalDescription: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    color: '#556253',
    textAlign: 'center',
    lineHeight: 18,
  },
  modalControllerCard: {
    backgroundColor: '#f3f4f2',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  modalControllerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalRouterCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#d3e1a6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalControllerTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 13,
    color: '#191c1b',
  },
  modalControllerSubtitle: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 11,
    color: '#556253',
    marginTop: 1,
  },
  modalReadyBadge: {
    backgroundColor: 'rgba(198, 232, 90, 0.45)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  modalReadyBadgeText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 9.5,
    color: '#516600',
    letterSpacing: 0.8,
  },
  modalActionGroup: {
    gap: 10,
  },
  modalAddDeviceBtn: {
    height: 54,
    backgroundColor: '#c6e85a',
    borderRadius: 27,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 24,
    paddingRight: 6,
    shadowColor: '#c6e85a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 3,
  },
  modalAddDeviceText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 13.5,
    color: '#131e13',
    letterSpacing: 1.2,
  },
  modalArrowCap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#131e13',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalLaterBtn: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  modalLaterBtnText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13.5,
    color: '#556253',
  },
});
