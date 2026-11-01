import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  Crosshair,
  Tractor,
  Home,
  Building2,
  MapPin,
  Flag,
  Clock,
  Plus,
  Minus,
  Sprout,
  Sparkles,
  User,
  ChevronDown,
} from 'lucide-react-native';
import * as Location from 'expo-location';
import { useCreateFarm } from '../../src/hooks/useFarms';
import { useServerStatus } from '../../src/context/ServerStatusContext';
import { colors } from '../../src/theme/colors';

type AreaUnit = 'Acres' | 'Hectares' | 'Bigha';

export default function CreateFarmScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { serverOnline } = useServerStatus();
  const createFarmMutation = useCreateFarm();

  // Form State
  const [farmName, setFarmName] = useState('Patil Green Acres');
  const [selectedUnit, setSelectedUnit] = useState<AreaUnit>('Acres');
  const [acresValue, setAcresValue] = useState<number>(3.5);
  const [displayAreaText, setDisplayAreaText] = useState('3.5');

  // Manual Address Fields
  const [village, setVillage] = useState('Dindori');
  const [taluka, setTaluka] = useState('Dindori Taluka');
  const [district, setDistrict] = useState('Nashik');
  const [stateName, setStateName] = useState('Maharashtra');

  // Geotargeting Coordinates
  const [latitude, setLatitude] = useState(20.0110);
  const [longitude, setLongitude] = useState(73.7900);
  const [isLocating, setIsLocating] = useState(false);
  const [gpsActive, setGpsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync display text when unit or acresValue changes
  useEffect(() => {
    if (selectedUnit === 'Acres') {
      setDisplayAreaText(acresValue.toFixed(1).replace(/\.0$/, ''));
    } else if (selectedUnit === 'Hectares') {
      const ha = acresValue * 0.4047;
      setDisplayAreaText(ha.toFixed(1).replace(/\.0$/, ''));
    } else if (selectedUnit === 'Bigha') {
      const bg = acresValue * 1.6;
      setDisplayAreaText(bg.toFixed(1).replace(/\.0$/, ''));
    }
  }, [selectedUnit, acresValue]);

  // Stepper Handlers
  const handleDecrement = () => {
    let deltaAcres = 0.5;
    if (selectedUnit === 'Hectares') deltaAcres = 0.5 / 0.4047;
    if (selectedUnit === 'Bigha') deltaAcres = 0.5 / 1.6;

    setAcresValue((prev) => Math.max(0.5, parseFloat((prev - deltaAcres).toFixed(2))));
  };

  const handleIncrement = () => {
    let deltaAcres = 0.5;
    if (selectedUnit === 'Hectares') deltaAcres = 0.5 / 0.4047;
    if (selectedUnit === 'Bigha') deltaAcres = 0.5 / 1.6;

    setAcresValue((prev) => parseFloat((prev + deltaAcres).toFixed(2)));
  };

  // Direct Text Input for Area
  const handleAreaTextChange = (text: string) => {
    setDisplayAreaText(text);
    const parsed = parseFloat(text);
    if (!isNaN(parsed) && parsed > 0) {
      if (selectedUnit === 'Acres') {
        setAcresValue(parsed);
      } else if (selectedUnit === 'Hectares') {
        setAcresValue(parsed / 0.4047);
      } else if (selectedUnit === 'Bigha') {
        setAcresValue(parsed / 1.6);
      }
    }
  };

  // Unit Selector Handler
  const handleSelectUnit = (unit: AreaUnit) => {
    setSelectedUnit(unit);
  };

  // Assisted GPS Location Handler
  const handleGetLocation = async () => {
    setIsLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Location Permission',
          'GPS permission was denied. Defaulting to detected regional centroid (Nashik, Maharashtra).'
        );
        setIsLocating(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setLatitude(loc.coords.latitude);
      setLongitude(loc.coords.longitude);
      setGpsActive(true);

      // Attempt reverse geocoding to fill address hierarchy
      try {
        const geoResults = await Location.reverseGeocodeAsync({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });

        if (geoResults && geoResults.length > 0) {
          const place = geoResults[0];
          if (place.subregion || place.district) {
            setDistrict(place.subregion || place.district || 'Nashik');
          }
          if (place.city || place.name) {
            setTaluka(place.city || place.name || 'Dindori Taluka');
          }
          if (place.region) {
            setStateName(place.region || 'Maharashtra');
          }
          if (place.street || place.name) {
            setVillage(place.street || place.name || 'Dindori');
          }
        }
      } catch {
        // Fallback silently if reverse geocoding is unavailable offline
      }

      Alert.alert(
        'GPS Locked',
        `Coordinates acquired: ${loc.coords.latitude.toFixed(4)}° N, ${loc.coords.longitude.toFixed(4)}° E`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not acquire GPS fix.';
      Alert.alert('GPS Notice', msg);
    } finally {
      setIsLocating(false);
    }
  };

  // Submit & Continue to Step 2
  const handleContinue = async () => {
    if (!farmName.trim()) {
      Alert.alert('Required Field', 'Please provide a name for your farm.');
      return;
    }

    if (!serverOnline) {
      Alert.alert('Server Offline', 'Backend server is currently offline. Please wait for connectivity.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createFarmMutation.mutateAsync({
        name: farmName.trim(),
        cropType: 'Wheat',
        areaAcres: Math.max(0.1, parseFloat(acresValue.toFixed(2))),
        location: {
          lat: latitude,
          lng: longitude,
        },
        timezone: 'Asia/Kolkata',
      });

      const farmId = result?.farmId;
      if (farmId) {
        router.push({
          pathname: '/(app)/(farm)/draw-field',
          params: { farmId },
        });
      } else {
        router.push('/(app)/(farm)/draw-field');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not create farm.';
      Alert.alert('Farm Setup Error', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Approx square footage calculated from acres
  const approxSqFt = Math.round(acresValue * 43560).toLocaleString();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* 1. TOP HEADER */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}
            accessibilityLabel="Go back"
          >
            <ArrowLeft size={20} color="#191c1b" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Farm</Text>
        </View>

        <View style={styles.profileAvatar}>
          <User size={18} color="#ffffff" />
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.avoidingContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 120 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* 2. PROGRESS BAR & SKIP */}
          <View style={styles.progressRow}>
            <TouchableOpacity
              style={styles.backCircleBtn}
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <ArrowLeft size={18} color="#191c1b" />
            </TouchableOpacity>

            <View style={styles.progressCenter}>
              <View style={styles.progressBarTrack}>
                <View style={[styles.progressSegment, styles.progressSegmentActive]} />
                <View style={[styles.progressSegment, styles.progressSegmentInactive]} />
              </View>
              <Text style={styles.progressLabel}>STEP 1 OF 2</Text>
            </View>

            <TouchableOpacity
              style={styles.skipBtn}
              onPress={() => router.push('/(app)/(farm)/draw-field')}
              activeOpacity={0.7}
            >
              <Text style={styles.skipBtnText}>Skip</Text>
            </TouchableOpacity>
          </View>

          {/* 3. HERO HEADER SECTION */}
          <View style={styles.heroSection}>
            <View style={styles.heroBadge}>
              <Sparkles size={13} color="#131e13" />
              <Text style={styles.heroBadgeText}>INITIAL SETUP</Text>
            </View>

            <Text style={styles.heroTitle}>SET UP YOUR FARM</Text>
            <Text style={styles.heroSubtitle}>
              Tell us about your land topography and acreage to personalize telemetry & crop advisory.
            </Text>
          </View>

          {/* 4. SECTION 1: FARM NAME INPUT */}
          <View style={styles.sectionBlock}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionLabel}>Farm Name</Text>
              <Text style={styles.requiredTag}>Required</Text>
            </View>

            <View style={styles.cardContainer}>
              <View style={styles.inputContainer}>
                <View style={styles.inputIconCircle}>
                  <Tractor size={20} color="#516600" />
                </View>

                <TextInput
                  style={styles.farmNameInput}
                  placeholder="e.g. Patil Green Acres"
                  placeholderTextColor="#757965"
                  value={farmName}
                  onChangeText={setFarmName}
                  autoCapitalize="words"
                />

                {farmName.trim().length > 0 && (
                  <View style={styles.inputCheckIcon}>
                    <CheckCircle2 size={18} color="#516600" />
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* 5. SECTION 2: LOCATION & REGION */}
          <View style={styles.sectionBlock}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionLabel}>Location & Region</Text>
              <Text style={styles.tagSecondary}>Geotargeting</Text>
            </View>

            {/* Live GPS Quick Tap Button */}
            <TouchableOpacity
              style={styles.gpsButton}
              activeOpacity={0.85}
              onPress={handleGetLocation}
              disabled={isLocating}
            >
              <View style={styles.gpsButtonLeft}>
                <View style={styles.gpsIconCircle}>
                  {isLocating ? (
                    <ActivityIndicator size="small" color="#516600" />
                  ) : (
                    <Crosshair size={18} color="#516600" />
                  )}
                </View>
                <Text style={styles.gpsButtonText}>
                  {isLocating ? 'Acquiring Satellite GPS...' : 'Use my current location'}
                </Text>
              </View>

              <View style={styles.gpsStatusBadge}>
                <View style={[styles.pulseDot, gpsActive && styles.pulseDotActive]} />
                <Text style={styles.gpsStatusBadgeText}>
                  {gpsActive ? 'GPS ACTIVE' : 'STANDBY'}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR ENTER MANUALLY</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Manual Hierarchy Card Stack */}
            <View style={styles.cardContainer}>
              {/* Village */}
              <View style={styles.addressRow}>
                <View style={styles.addressRowLeft}>
                  <View style={styles.addressIconCircle}>
                    <Home size={18} color="#556253" />
                  </View>
                  <View style={styles.addressTextStack}>
                    <Text style={styles.addressFieldLabel}>VILLAGE / GRAM</Text>
                    <TextInput
                      style={styles.addressInput}
                      value={village}
                      onChangeText={setVillage}
                      placeholder="Village Name"
                      placeholderTextColor="#757965"
                    />
                  </View>
                </View>
                <ChevronDown size={18} color="#757965" />
              </View>

              {/* Taluka */}
              <View style={styles.addressRow}>
                <View style={styles.addressRowLeft}>
                  <View style={styles.addressIconCircle}>
                    <Building2 size={18} color="#556253" />
                  </View>
                  <View style={styles.addressTextStack}>
                    <Text style={styles.addressFieldLabel}>TALUKA / SUB-DISTRICT</Text>
                    <TextInput
                      style={styles.addressInput}
                      value={taluka}
                      onChangeText={setTaluka}
                      placeholder="Taluka"
                      placeholderTextColor="#757965"
                    />
                  </View>
                </View>
                <ChevronDown size={18} color="#757965" />
              </View>

              {/* District */}
              <View style={styles.addressRow}>
                <View style={styles.addressRowLeft}>
                  <View style={styles.addressIconCircle}>
                    <MapPin size={18} color="#556253" />
                  </View>
                  <View style={styles.addressTextStack}>
                    <Text style={styles.addressFieldLabel}>DISTRICT</Text>
                    <TextInput
                      style={styles.addressInput}
                      value={district}
                      onChangeText={setDistrict}
                      placeholder="District"
                      placeholderTextColor="#757965"
                    />
                  </View>
                </View>
                <ChevronDown size={18} color="#757965" />
              </View>

              {/* State */}
              <View style={[styles.addressRow, styles.addressRowLast]}>
                <View style={styles.addressRowLeft}>
                  <View style={styles.addressIconCircle}>
                    <Flag size={18} color="#556253" />
                  </View>
                  <View style={styles.addressTextStack}>
                    <Text style={styles.addressFieldLabel}>STATE</Text>
                    <TextInput
                      style={styles.addressInput}
                      value={stateName}
                      onChangeText={setStateName}
                      placeholder="State"
                      placeholderTextColor="#757965"
                    />
                  </View>
                </View>
                <ChevronDown size={18} color="#757965" />
              </View>
            </View>
          </View>

          {/* 6. SECTION 3: TOTAL LAND AREA */}
          <View style={styles.sectionBlock}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionLabel}>Total Land Area</Text>
              <Text style={styles.tagSecondary}>Acreage</Text>
            </View>

            <View style={styles.cardContainer}>
              {/* Numeric Display & Steppers */}
              <View style={styles.areaNumericContainer}>
                <View style={styles.areaInputGroup}>
                  <TextInput
                    style={styles.areaLargeInput}
                    value={displayAreaText}
                    onChangeText={handleAreaTextChange}
                    keyboardType="numeric"
                    selectTextOnFocus
                  />
                  <Text style={styles.areaUnitSuffix}>{selectedUnit}</Text>
                </View>

                <View style={styles.stepperGroup}>
                  <TouchableOpacity
                    style={styles.stepperBtn}
                    onPress={handleDecrement}
                    activeOpacity={0.7}
                    accessibilityLabel="Decrease acreage"
                  >
                    <Minus size={18} color="#191c1b" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.stepperBtn}
                    onPress={handleIncrement}
                    activeOpacity={0.7}
                    accessibilityLabel="Increase acreage"
                  >
                    <Plus size={18} color="#191c1b" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Unit Segmented Controller */}
              <View style={styles.segmentedControl}>
                {(['Acres', 'Hectares', 'Bigha'] as AreaUnit[]).map((unit) => {
                  const isActive = selectedUnit === unit;
                  return (
                    <TouchableOpacity
                      key={unit}
                      style={[
                        styles.segmentBtn,
                        isActive && styles.segmentBtnActive,
                      ]}
                      onPress={() => handleSelectUnit(unit)}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.segmentBtnText,
                          isActive && styles.segmentBtnTextActive,
                        ]}
                      >
                        {unit}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Micro NDVI Acreage Insight */}
              <View style={styles.microInsightRow}>
                <Sprout size={15} color="#516600" />
                <Text style={styles.microInsightText}>
                  Approx. {approxSqFt} sq. ft. ready for satellite NDVI mapping
                </Text>
              </View>
            </View>
          </View>

          {/* 7. SECTION 4: REGIONAL TIMEZONE */}
          <View style={styles.cardContainer}>
            <View style={styles.timezoneRow}>
              <View style={styles.timezoneLeft}>
                <View style={styles.timezoneIconCircle}>
                  <Clock size={20} color="#131e13" />
                </View>
                <View>
                  <Text style={styles.timezoneFieldLabel}>Regional Timezone</Text>
                  <Text style={styles.timezoneValue}>Asia/Kolkata (IST)</Text>
                </View>
              </View>

              <View style={styles.autoDetectedBadge}>
                <View style={styles.autoDetectedDot} />
                <Text style={styles.autoDetectedText}>AUTO-DETECTED</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* 8. STICKY BOTTOM NAVIGATION BAR */}
      <View
        style={[
          styles.stickyFooter,
          { paddingBottom: Math.max(insets.bottom, 16) },
        ]}
      >
        <TouchableOpacity
          style={styles.continueBtn}
          onPress={handleContinue}
          activeOpacity={0.88}
          disabled={isSubmitting}
        >
          <Text style={styles.continueBtnText}>
            {isSubmitting ? 'INITIALIZING FARM...' : 'CONTINUE TO STEP 2'}
          </Text>
          <View style={styles.arrowCircleCap}>
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <ArrowUpRight size={22} color="#ffffff" />
            )}
          </View>
        </TouchableOpacity>

        <Text style={styles.footerNote}>
          You can fine-tune boundary geofencing at Step 2
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f9faf8',
  },
  avoidingContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },

  // 1. TOP HEADER
  header: {
    height: 54,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(249, 250, 248, 0.88)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 18,
    color: '#191c1b',
    letterSpacing: -0.3,
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
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },

  // 2. PROGRESS ROW
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    marginBottom: 8,
  },
  backCircleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f2',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  progressCenter: {
    alignItems: 'center',
    gap: 6,
    width: 170,
  },
  progressBarTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    width: '100%',
  },
  progressSegment: {
    flex: 1,
    height: 5,
    borderRadius: 2.5,
  },
  progressSegmentActive: {
    backgroundColor: '#c6e85a',
    shadowColor: '#516600',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  progressSegmentInactive: {
    backgroundColor: '#e2e3e1',
  },
  progressLabel: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10,
    color: '#556253',
    letterSpacing: 1.2,
  },
  skipBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  skipBtnText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
    color: '#556253',
  },

  // 3. HERO SECTION
  heroSection: {
    paddingVertical: 12,
    marginBottom: 16,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#d8e7d4',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  heroBadgeText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 10,
    color: '#131e13',
    letterSpacing: 0.8,
  },
  heroTitle: {
    fontFamily: 'Manrope_300Light',
    fontSize: 26,
    color: '#191c1b',
    letterSpacing: 2.5,
    marginBottom: 6,
  },
  heroSubtitle: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    color: '#556253',
    lineHeight: 19,
  },

  // SECTIONS & LABELS
  sectionBlock: {
    marginBottom: 18,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  sectionLabel: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 14,
    color: '#191c1b',
  },
  requiredTag: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
    color: '#556253',
  },
  tagSecondary: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
    color: '#556253',
  },

  // CARD CONTAINERS
  cardContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    padding: 12,
    shadowColor: '#1e2a1e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },

  // FARM NAME INPUT
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f2',
    borderRadius: 14,
    height: 54,
    paddingHorizontal: 12,
    gap: 12,
  },
  inputIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  farmNameInput: {
    flex: 1,
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 15,
    color: '#191c1b',
    padding: 0,
  },
  inputCheckIcon: {
    padding: 4,
  },

  // GPS BUTTON
  gpsButton: {
    minHeight: 52,
    backgroundColor: '#dbe9ae',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#516600',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 1,
    marginBottom: 12,
  },
  gpsButtonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  gpsIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gpsButtonText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 14,
    color: '#161e00',
    letterSpacing: -0.2,
  },
  gpsStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  pulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#757965',
  },
  pulseDotActive: {
    backgroundColor: '#516600',
  },
  gpsStatusBadgeText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 9.5,
    color: '#516600',
    letterSpacing: 0.8,
  },

  // MANUAL DIVIDER
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 6,
    marginBottom: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e2e3e1',
  },
  dividerText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10,
    color: '#556253',
    letterSpacing: 1.1,
  },

  // ADDRESS ROWS
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f3f4f2',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  addressRowLast: {
    marginBottom: 0,
  },
  addressRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  addressIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  addressTextStack: {
    flex: 1,
  },
  addressFieldLabel: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 9.5,
    color: '#556253',
    letterSpacing: 0.8,
  },
  addressInput: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
    color: '#191c1b',
    padding: 0,
    marginTop: 2,
  },

  // TOTAL LAND AREA
  areaNumericContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f3f4f2',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 12,
  },
  areaInputGroup: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  areaLargeInput: {
    fontFamily: 'Manrope_300Light',
    fontSize: 34,
    color: '#191c1b',
    padding: 0,
    minWidth: 70,
  },
  areaUnitSuffix: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 16,
    color: '#556253',
  },
  stepperGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepperBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },

  // SEGMENTED CONTROLLER
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#edeeec',
    borderRadius: 24,
    padding: 4,
    gap: 4,
    marginBottom: 10,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentBtnActive: {
    backgroundColor: '#c6e85a',
    shadowColor: '#516600',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 1,
  },
  segmentBtnText: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 13,
    color: '#556253',
  },
  segmentBtnTextActive: {
    fontFamily: 'Manrope_700Bold',
    color: '#161e00',
  },
  microInsightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 4,
    paddingHorizontal: 4,
  },
  microInsightText: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 11.5,
    color: '#556253',
    flex: 1,
  },

  // REGIONAL TIMEZONE
  timezoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  timezoneLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timezoneIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#d8e7d4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timezoneFieldLabel: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 11,
    color: '#556253',
  },
  timezoneValue: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 14,
    color: '#191c1b',
    marginTop: 1,
  },
  autoDetectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#dbe9ae',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
  },
  autoDetectedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#516600',
  },
  autoDetectedText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 9.5,
    color: '#161e00',
    letterSpacing: 0.8,
  },

  // STICKY FOOTER
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
  continueBtn: {
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
    marginBottom: 8,
  },
  continueBtnText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 14,
    color: '#161e00',
    letterSpacing: 1.5,
  },
  arrowCircleCap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1e2a1e',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  footerNote: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
    color: '#556253',
    textAlign: 'center',
    paddingBottom: 4,
  },
});
