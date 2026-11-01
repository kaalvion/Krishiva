import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Pressable,
  ScrollView,
  Platform,
  Vibration,
  Dimensions,
} from 'react-native';
import { Clock, Sun, Sunrise, Sunset, Moon } from 'lucide-react-native';

export interface TimePickerModalProps {
  visible: boolean;
  initialTime?: Date;
  onClose: () => void;
  onConfirm: (time: Date) => void;
}

const PRESETS = [
  { label: '6:00 AM', hours: 6, minutes: 0 },
  { label: '8:00 AM', hours: 8, minutes: 0 },
  { label: '12:00 PM', hours: 12, minutes: 0 },
  { label: '4:00 PM', hours: 16, minutes: 0 },
  { label: '6:00 PM', hours: 18, minutes: 0 },
  { label: '8:00 PM', hours: 20, minutes: 0 },
];

const HOURS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

const ITEM_HEIGHT = 38;

export function TimePickerModal({
  visible,
  initialTime,
  onClose,
  onConfirm,
}: TimePickerModalProps) {
  const [selectedHours, setSelectedHours] = useState<number>(6); // 1-12
  const [selectedMinutes, setSelectedMinutes] = useState<number>(0); // 0-59
  const [isPM, setIsPM] = useState<boolean>(false);

  const hoursScrollRef = useRef<ScrollView>(null);
  const minutesScrollRef = useRef<ScrollView>(null);

  // Initialize from initialTime
  useEffect(() => {
    if (visible) {
      const d = initialTime ? new Date(initialTime) : new Date();
      let h24 = d.getHours();
      const m = d.getMinutes();
      const pm = h24 >= 12;
      let h12 = h24 % 12;
      if (h12 === 0) h12 = 12;

      setSelectedHours(h12);
      // Round to nearest 5 for clean picker UX
      const roundedM = Math.round(m / 5) * 5 % 60;
      setSelectedMinutes(roundedM);
      setIsPM(pm);

      // Scroll to position after render
      setTimeout(() => {
        const hIdx = HOURS.indexOf(h12);
        if (hIdx !== -1 && hoursScrollRef.current) {
          hoursScrollRef.current.scrollTo({ y: hIdx * ITEM_HEIGHT, animated: false });
        }
        const mIdx = MINUTES.indexOf(roundedM);
        if (mIdx !== -1 && minutesScrollRef.current) {
          minutesScrollRef.current.scrollTo({ y: mIdx * ITEM_HEIGHT, animated: false });
        }
      }, 50);
    }
  }, [visible, initialTime]);

  // Derived 24h string & 12h display
  const { time12h, time24h, slotLabel, SlotIcon } = useMemo(() => {
    let h24 = selectedHours % 12;
    if (isPM) h24 += 12;
    const h24Str = String(h24).padStart(2, '0');
    const mStr = String(selectedMinutes).padStart(2, '0');
    const ampm = isPM ? 'PM' : 'AM';
    const display12 = `${selectedHours}:${mStr} ${ampm}`;

    let label = 'Custom slot';
    let Icon = Clock;
    if (h24 >= 5 && h24 <= 7) {
      label = 'Sunrise slot';
      Icon = Sunrise;
    } else if (h24 >= 8 && h24 <= 11) {
      label = 'Morning slot';
      Icon = Sun;
    } else if (h24 >= 12 && h24 <= 15) {
      label = 'Afternoon slot';
      Icon = Sun;
    } else if (h24 >= 16 && h24 <= 18) {
      label = 'Golden hour slot';
      Icon = Sunset;
    } else if (h24 >= 19 && h24 <= 21) {
      label = 'Evening slot';
      Icon = Moon;
    } else {
      label = 'Night cycle slot';
      Icon = Moon;
    }

    return {
      time12h: display12,
      time24h: `${h24Str}:${mStr}`,
      slotLabel: label,
      SlotIcon: Icon,
    };
  }, [selectedHours, selectedMinutes, isPM]);

  // Done button handler
  const handleDone = () => {
    let h24 = selectedHours % 12;
    if (isPM) h24 += 12;

    const result = initialTime ? new Date(initialTime) : new Date();
    result.setHours(h24, selectedMinutes, 0, 0);

    if (Platform.OS !== 'web') Vibration.vibrate(25);
    onConfirm(result);
    onClose();
  };

  // Preset click handler
  const handleSelectPreset = (h24: number, m: number) => {
    if (Platform.OS !== 'web') Vibration.vibrate(20);
    const pm = h24 >= 12;
    let h12 = h24 % 12;
    if (h12 === 0) h12 = 12;

    setSelectedHours(h12);
    setSelectedMinutes(m);
    setIsPM(pm);

    const hIdx = HOURS.indexOf(h12);
    if (hIdx !== -1 && hoursScrollRef.current) {
      hoursScrollRef.current.scrollTo({ y: hIdx * ITEM_HEIGHT, animated: true });
    }
    const mIdx = MINUTES.indexOf(m);
    if (mIdx !== -1 && minutesScrollRef.current) {
      minutesScrollRef.current.scrollTo({ y: mIdx * ITEM_HEIGHT, animated: true });
    }
  };

  // Scroll handlers
  const handleHoursScrollEnd = (e: any) => {
    const y = e.nativeEvent.contentOffset.y;
    const index = Math.round(y / ITEM_HEIGHT);
    const clamped = Math.max(0, Math.min(HOURS.length - 1, index));
    setSelectedHours(HOURS[clamped]);
    hoursScrollRef.current?.scrollTo({ y: clamped * ITEM_HEIGHT, animated: true });
  };

  const handleMinutesScrollEnd = (e: any) => {
    const y = e.nativeEvent.contentOffset.y;
    const index = Math.round(y / ITEM_HEIGHT);
    const clamped = Math.max(0, Math.min(MINUTES.length - 1, index));
    setSelectedMinutes(MINUTES[clamped]);
    minutesScrollRef.current?.scrollTo({ y: clamped * ITEM_HEIGHT, animated: true });
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <Pressable style={styles.backdropPressArea} onPress={onClose} />

        <View style={styles.bottomSheetContainer}>
          {/* Grab Handle */}
          <View style={styles.grabHandle} />

          {/* Header Row */}
          <View style={styles.headerRow}>
            <Text style={styles.headerTitle}>Select Time</Text>
            <TouchableOpacity
              style={styles.doneBtn}
              onPress={handleDone}
              activeOpacity={0.8}
            >
              <Text style={styles.doneBtnText}>Done</Text>
            </TouchableOpacity>
          </View>

          {/* Preview Banner */}
          <View style={styles.previewBanner}>
            <View style={styles.previewLeft}>
              <View style={styles.previewClockCircle}>
                <Clock size={20} color="#C6E85A" />
              </View>
              <View style={styles.previewTimeTextRow}>
                <Text style={styles.previewTimeMain}>{time12h}</Text>
                <Text style={styles.previewTime24}>({time24h})</Text>
              </View>
            </View>

            <View style={styles.slotPill}>
              <SlotIcon size={14} color="#1E2A1E" />
              <Text style={styles.slotPillText}>{slotLabel}</Text>
            </View>
          </View>

          {/* 3-Column Time Wheel Picker */}
          <View style={styles.wheelContainer}>
            {/* Center Highlight Band */}
            <View pointerEvents="none" style={styles.highlightBand} />

            {/* Column 1: Hours */}
            <View style={styles.columnWrapper}>
              <ScrollView
                ref={hoursScrollRef}
                showsVerticalScrollIndicator={false}
                snapToInterval={ITEM_HEIGHT}
                decelerationRate="fast"
                onMomentumScrollEnd={handleHoursScrollEnd}
                contentContainerStyle={styles.wheelScrollContent}
              >
                {HOURS.map((h) => {
                  const isSelected = selectedHours === h;
                  return (
                    <TouchableOpacity
                      key={h}
                      style={styles.wheelItem}
                      onPress={() => {
                        setSelectedHours(h);
                        const idx = HOURS.indexOf(h);
                        hoursScrollRef.current?.scrollTo({ y: idx * ITEM_HEIGHT, animated: true });
                      }}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.wheelItemText,
                          isSelected ? styles.wheelTextSelected : styles.wheelTextUnselected,
                        ]}
                      >
                        {String(h).padStart(2, '0')}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Colon Divider */}
            <View style={styles.colonDivider}>
              <Text style={styles.colonText}>:</Text>
            </View>

            {/* Column 2: Minutes */}
            <View style={styles.columnWrapper}>
              <ScrollView
                ref={minutesScrollRef}
                showsVerticalScrollIndicator={false}
                snapToInterval={ITEM_HEIGHT}
                decelerationRate="fast"
                onMomentumScrollEnd={handleMinutesScrollEnd}
                contentContainerStyle={styles.wheelScrollContent}
              >
                {MINUTES.map((m) => {
                  const isSelected = selectedMinutes === m;
                  return (
                    <TouchableOpacity
                      key={m}
                      style={styles.wheelItem}
                      onPress={() => {
                        setSelectedMinutes(m);
                        const idx = MINUTES.indexOf(m);
                        minutesScrollRef.current?.scrollTo({ y: idx * ITEM_HEIGHT, animated: true });
                      }}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.wheelItemText,
                          isSelected ? styles.wheelTextSelected : styles.wheelTextUnselected,
                        ]}
                      >
                        {String(m).padStart(2, '0')}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Column 3: AM / PM */}
            <View style={styles.ampmColumn}>
              <TouchableOpacity
                style={[styles.ampmItem, !isPM && styles.ampmItemSelected]}
                onPress={() => {
                  setIsPM(false);
                  if (Platform.OS !== 'web') Vibration.vibrate(15);
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.ampmText, !isPM ? styles.ampmTextSelected : styles.ampmTextUnselected]}>
                  AM
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.ampmItem, isPM && styles.ampmItemSelected]}
                onPress={() => {
                  setIsPM(true);
                  if (Platform.OS !== 'web') Vibration.vibrate(15);
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.ampmText, isPM ? styles.ampmTextSelected : styles.ampmTextUnselected]}>
                  PM
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Quick Presets */}
          <View style={styles.presetsSection}>
            <Text style={styles.presetsHeader}>QUICK PRESETS</Text>
            <View style={styles.presetsGrid}>
              {PRESETS.map((preset) => {
                let h24 = selectedHours % 12;
                if (isPM) h24 += 12;
                const isSelected = h24 === preset.hours && selectedMinutes === preset.minutes;

                return (
                  <TouchableOpacity
                    key={preset.label}
                    style={[
                      styles.presetPill,
                      isSelected ? styles.presetPillActive : styles.presetPillInactive,
                    ]}
                    onPress={() => handleSelectPreset(preset.hours, preset.minutes)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.presetPillText,
                        isSelected ? styles.presetPillTextActive : styles.presetPillTextInactive,
                      ]}
                    >
                      {preset.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Bottom Home Indicator */}
          <View style={styles.homeIndicator} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  backdropPressArea: {
    flex: 1,
  },
  bottomSheetContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 24 : 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 8,
  },
  grabHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D9DAD8',
    alignSelf: 'center',
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C2826',
    letterSpacing: -0.2,
  },
  doneBtn: {
    backgroundColor: '#C6E85A',
    paddingHorizontal: 18,
    paddingVertical: 7,
    borderRadius: 20,
    shadowColor: '#1e2a1e',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 1,
  },
  doneBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E2A1E',
  },

  // Preview Banner
  previewBanner: {
    backgroundColor: '#E6F4B8',
    borderWidth: 1,
    borderColor: 'rgba(198, 232, 90, 0.4)',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  previewLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  previewClockCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1E2A1E',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 1,
  },
  previewTimeTextRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  previewTimeMain: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1C2826',
    letterSpacing: -0.4,
  },
  previewTime24: {
    fontSize: 12,
    fontWeight: '600',
    color: '#5F7161',
  },
  slotPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(30, 42, 30, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  slotPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E2A1E',
  },

  // 3-Column Wheel Container
  wheelContainer: {
    position: 'relative',
    height: ITEM_HEIGHT * 4.2, // ~160px
    backgroundColor: '#F9FAF8',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  highlightBand: {
    position: 'absolute',
    top: '50%',
    marginTop: -ITEM_HEIGHT / 2,
    left: 12,
    right: 12,
    height: ITEM_HEIGHT,
    backgroundColor: 'rgba(198, 232, 90, 0.25)',
    borderTopWidth: 1.5,
    borderBottomWidth: 1.5,
    borderColor: '#C6E85A',
    borderRadius: 12,
  },
  columnWrapper: {
    width: 64,
    height: '100%',
  },
  wheelScrollContent: {
    paddingVertical: ITEM_HEIGHT * 1.6,
  },
  wheelItem: {
    height: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wheelItemText: {
    fontSize: 16,
    fontWeight: '500',
  },
  wheelTextSelected: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1E2A1E',
  },
  wheelTextUnselected: {
    fontSize: 15,
    fontWeight: '500',
    color: '#9AA59A',
  },
  colonDivider: {
    paddingBottom: 4,
  },
  colonText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1E2A1E',
  },
  ampmColumn: {
    width: 60,
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ampmItem: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
  },
  ampmItemSelected: {
    backgroundColor: 'rgba(198, 232, 90, 0.3)',
  },
  ampmText: {
    fontSize: 16,
  },
  ampmTextSelected: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E2A1E',
  },
  ampmTextUnselected: {
    fontSize: 14,
    fontWeight: '500',
    color: '#9AA59A',
  },

  // Quick Presets
  presetsSection: {
    marginBottom: 12,
  },
  presetsHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#5F7161',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetPill: {
    width: '31%',
    paddingVertical: 7,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetPillActive: {
    backgroundColor: '#C6E85A',
    borderWidth: 1.5,
    borderColor: '#1E2A1E',
  },
  presetPillInactive: {
    backgroundColor: '#F3F4F2',
  },
  presetPillText: {
    fontSize: 12,
  },
  presetPillTextActive: {
    fontWeight: '700',
    color: '#1E2A1E',
  },
  presetPillTextInactive: {
    fontWeight: '500',
    color: '#1C2826',
  },
  homeIndicator: {
    width: 120,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    alignSelf: 'center',
    marginTop: 8,
  },
});
