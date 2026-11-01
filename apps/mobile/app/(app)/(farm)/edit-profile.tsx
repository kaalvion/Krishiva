import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import {
  ArrowLeft,
  User,
  Camera,
  Edit2,
  Lock,
  Mail,
  CheckCircle2,
  MapPin,
  Clock,
  AlertTriangle,
  ChevronRight,
  Trash2,
  ArrowUpRight,
  Check,
  Plus,
  ShieldCheck,
  Sprout,
  Tractor,
} from 'lucide-react-native';
import { updateProfile } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../../../src/services/firebase';
import { useAuth } from '../../../src/hooks/useAuth';
import { useActiveFarm } from '../../../src/context/FarmContext';
import { updateFarm, deleteFarm } from '../../../src/services/api';

const DEFAULT_AVATAR =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDjXedTvXQfPh2lt3Xzw64oELToFFAa23EDtt0GjZH6Z_Z5FqSgiuKXp-fwMzfkOD-ARBsenrFtm1ghy3G02Gztd6eGArn0v2mss8m2vl8wkELrMkzCbKmHKJzrPu4Xv0ZlZu05BBAwrwV40CPSpTzNL4kLlewiXLKu6INNBln0jI4C9xyTpZ2dqkDXxE0YdA5PhhQS4LY_pHcU6mZVQBtSauU-JQkMOBTI8adqJ7M';

const SATELLITE_THUMB =
  'https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=600';

type AreaUnit = 'Acres' | 'Hectares' | 'Guntha';

export default function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { activeFarm, setActiveFarm } = useActiveFarm();

  // Personal details state
  const [displayName, setDisplayName] = useState(
    user?.displayName || 'Ramesh Patil'
  );
  const [email, setEmail] = useState(user?.email || 'farmer@krishiva.com');
  const [phone, setPhone] = useState(
    (user as any)?.phoneNumber || '+91 98765 43210'
  );

  // Farm topology state
  const [farmName, setFarmName] = useState(
    activeFarm?.name || 'Patil Green Acres, Nashik'
  );
  const [areaValue, setAreaValue] = useState(
    activeFarm?.areaAcres ? String(activeFarm.areaAcres) : '12.5'
  );
  const [areaUnit, setAreaUnit] = useState<AreaUnit>('Acres');

  // Crops in rotation chips
  const [selectedCrops, setSelectedCrops] = useState<string[]>([
    '🍇 Grapes',
    '🧅 Onions',
    '🍅 Tomatoes',
    '🌽 Sweet Corn',
  ]);

  const AVAILABLE_CROPS = [
    '🍇 Grapes',
    '🧅 Onions',
    '🍅 Tomatoes',
    '🌽 Sweet Corn',
    'Cotton',
    'Sugarcane',
    'Wheat',
    'Soybean',
  ];

  // Danger zone state
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Save changes state
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const toastAnim = useRef(new Animated.Value(-60)).current;

  // Sync when activeFarm changes
  useEffect(() => {
    if (activeFarm) {
      setFarmName(activeFarm.name);
      setAreaValue(String(activeFarm.areaAcres || 12.5));
    }
    if (user?.displayName) {
      setDisplayName(user.displayName);
    }
  }, [activeFarm, user]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    Animated.sequence([
      Animated.timing(toastAnim, {
        toValue: 20,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.delay(2000),
      Animated.timing(toastAnim, {
        toValue: -60,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => setToastMessage(null));
  };

  const toggleCrop = (crop: string) => {
    if (selectedCrops.includes(crop)) {
      setSelectedCrops(selectedCrops.filter((c) => c !== crop));
    } else {
      setSelectedCrops([...selectedCrops, crop]);
    }
  };

  const handleAddCustomCrop = () => {
    Alert.prompt
      ? Alert.prompt('Add Crop', 'Enter the name of crop in rotation:', [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Add',
            onPress: (val?: string) => {
              if (val && val.trim()) {
                setSelectedCrops([...selectedCrops, val.trim()]);
              }
            },
          },
        ])
      : Alert.alert('Add Crop', 'Custom crop selection');
  };

  const handleSaveChanges = async () => {
    try {
      setIsSaving(true);

      // 1. Update Firebase Auth user display name
      if (auth.currentUser && displayName.trim()) {
        await updateProfile(auth.currentUser, {
          displayName: displayName.trim(),
        });
      }

      // 2. Update Firestore user doc
      if (user?.uid) {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          await updateDoc(userDocRef, {
            displayName: displayName.trim(),
            email: email.trim(),
            updatedAt: new Date().toISOString(),
          });
        } catch {
          // non-blocking
        }
      }

      // 3. Update farm metadata in backend / Firestore
      if (activeFarm?.id) {
        const numericArea = parseFloat(areaValue) || activeFarm.areaAcres || 12.5;
        const updated = await updateFarm(activeFarm.id, {
          name: farmName.trim(),
          areaAcres: numericArea,
          crops: selectedCrops,
        });

        // Sync with activeFarm context
        if (setActiveFarm) {
          setActiveFarm({
            ...activeFarm,
            name: farmName.trim(),
            areaAcres: numericArea,
          });
        }
      }

      showToast('SAVED & SYNCED ✓');
      setTimeout(() => {
        router.back();
      }, 900);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not save profile';
      Alert.alert('Error', msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleWipeFarmProfile = async () => {
    if (deleteConfirmText.trim() !== 'DELETE MY FARM') {
      Alert.alert(
        'Validation Failed',
        'Please type "DELETE MY FARM" in all caps to confirm deletion.'
      );
      return;
    }

    if (!activeFarm?.id) {
      Alert.alert('Error', 'No active farm to delete.');
      return;
    }

    try {
      setIsDeleting(true);
      await deleteFarm(activeFarm.id);
      Alert.alert(
        'Farm Profile Purged',
        'Your farm and connected telemetry devices have been deleted.',
        [
          {
            text: 'OK',
            onPress: async () => {
              await signOut();
              router.replace('/(auth)/onboarding');
            },
          },
        ]
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to purge farm';
      Alert.alert('Error', msg);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* 1. TOP APP BAR */}
      <View style={styles.topAppBar}>
        <View style={styles.topAppLeft}>
          <TouchableOpacity
            style={styles.backButton}
            activeOpacity={0.8}
            onPress={() => router.back()}
            accessibilityLabel="Go back"
          >
            <ArrowLeft size={22} color="#191c1b" />
          </TouchableOpacity>
          <Text style={styles.topAppTitle}>EDIT PROFILE</Text>
        </View>

        <View style={styles.topAppRight}>
          <View style={styles.profileAvatar}>
            <User size={16} color="#ffffff" />
          </View>
        </View>
      </View>

      {/* Floating Animated Toast */}
      {toastMessage && (
        <Animated.View
          style={[
            styles.toastContainer,
            { transform: [{ translateY: toastAnim }] },
          ]}
        >
          <View style={styles.toastCard}>
            <CheckCircle2 size={18} color="#c6e85a" />
            <Text style={styles.toastText}>{toastMessage}</Text>
          </View>
        </Animated.View>
      )}

      {/* 2. SCROLLABLE BODY */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 90 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Subtle Ambient SVG Topographic Contours */}
        <Svg
          style={StyleSheet.absoluteFill}
          viewBox="0 0 400 900"
          fill="none"
          pointerEvents="none"
        >
          <Path
            d="M-50 120 C 60 80, 180 180, 450 110"
            stroke="#c5c9b1"
            strokeWidth={1.2}
            opacity={0.3}
          />
          <Path
            d="M-50 170 C 80 140, 220 230, 450 160"
            stroke="#c5c9b1"
            strokeWidth={1.2}
            opacity={0.25}
          />
          <Path
            d="M-30 380 C 120 320, 250 430, 430 350"
            stroke="#c5c9b1"
            strokeWidth={1.2}
            opacity={0.25}
          />
          <Path
            d="M-40 430 C 140 370, 270 480, 440 400"
            stroke="#c5c9b1"
            strokeWidth={1.2}
            opacity={0.2}
          />
        </Svg>

        {/* Top Avatar Section */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarWrap}>
            <Image
              source={{ uri: DEFAULT_AVATAR }}
              style={styles.avatarImage}
            />
            <TouchableOpacity
              style={styles.cameraBadgeBtn}
              activeOpacity={0.8}
              onPress={() =>
                Alert.alert(
                  'Change Photo',
                  'Image picker coming soon in next release.'
                )
              }
            >
              <Camera size={16} color="#161e00" />
            </TouchableOpacity>
          </View>

          <Text style={styles.farmerName}>{displayName}</Text>
          <Text style={styles.avatarSubtitle}>Tap avatar to update photo</Text>
        </View>

        {/* 1. PERSONAL DETAILS CARD */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardHeaderTitle}>PERSONAL DETAILS</Text>
            <View style={styles.kycBadge}>
              <ShieldCheck size={13} color="#556253" />
              <Text style={styles.kycBadgeText}>KYC Active</Text>
            </View>
          </View>

          {/* Display Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Display Name</Text>
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.textInput}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Ramesh Patil"
                placeholderTextColor="#757965"
              />
              <Edit2 size={18} color="#556253" style={styles.inputRightIcon} />
            </View>
          </View>

          {/* Primary Contact (Read-Only) */}
          <View style={styles.inputGroup}>
            <View style={styles.labelRowWithMeta}>
              <Text style={styles.inputLabel}>Primary Contact</Text>
              <View style={styles.simLinkedBadge}>
                <Lock size={12} color="#556253" />
                <Text style={styles.simLinkedText}>SIM Linked</Text>
              </View>
            </View>
            <View style={styles.readOnlyInputRow}>
              <Text style={styles.readOnlyInputText}>{phone}</Text>
              <View style={styles.verifiedBadge}>
                <CheckCircle2 size={13} color="#161e00" />
                <Text style={styles.verifiedBadgeText}>Verified</Text>
              </View>
            </View>
          </View>

          {/* Email Address */}
          <View style={styles.inputGroup}>
            <View style={styles.labelRowWithMeta}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <Text style={styles.optionalText}>(Optional)</Text>
            </View>
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.textInput}
                value={email}
                onChangeText={setEmail}
                placeholder="farmer@example.com"
                placeholderTextColor="#757965"
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <Mail size={18} color="#556253" style={styles.inputRightIcon} />
            </View>
          </View>
        </View>

        {/* 2. FARM TOPOLOGY CARD */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardHeaderTitle}>FARM TOPOLOGY & ASSETS</Text>
            <Text style={styles.zoneTagText}>
              Zone ID #{activeFarm?.id ? activeFarm.id.slice(0, 4) : '402'}
            </Text>
          </View>

          {/* Farm Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Farm Name</Text>
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.textInput}
                value={farmName}
                onChangeText={setFarmName}
                placeholder="Patil Green Acres, Nashik"
                placeholderTextColor="#757965"
              />
              <Tractor size={18} color="#556253" style={styles.inputRightIcon} />
            </View>
          </View>

          {/* Farm Location & Boundary */}
          <View style={styles.inputGroup}>
            <View style={styles.labelRowWithMeta}>
              <Text style={styles.inputLabel}>Farm Location & Boundary</Text>
              <TouchableOpacity
                style={styles.movePinRow}
                onPress={() => router.push('/(app)/(farm)/draw-field')}
              >
                <Text style={styles.movePinText}>Move pin</Text>
                <MapPin size={14} color="#516600" />
              </TouchableOpacity>
            </View>

            {/* Satellite Map Thumbnail */}
            <TouchableOpacity
              style={styles.mapThumbContainer}
              activeOpacity={0.9}
              onPress={() => router.push('/(app)/(farm)/draw-field')}
            >
              <Image
                source={{ uri: SATELLITE_THUMB }}
                style={styles.mapThumbImage}
              />
              <View style={styles.mapThumbOverlay}>
                <View style={styles.mapThumbTopRow}>
                  <View style={styles.mapLocationChip}>
                    <View style={styles.pulseDot} />
                    <Text style={styles.mapLocationChipText}>
                      Nashik Sector 4, MH
                    </Text>
                  </View>
                  <View style={styles.mapExpandBtn}>
                    <ArrowUpRight size={14} color="#ffffff" />
                  </View>
                </View>

                {/* Central Pin */}
                <View style={styles.centerPinWrap}>
                  <View style={styles.centerPinCircle}>
                    <MapPin size={16} color="#161e00" />
                  </View>
                </View>

                {/* Bottom Coordinates Bar */}
                <View style={styles.mapThumbBottomRow}>
                  <Text style={styles.mapCoordinatesText}>
                    Lat 19.9975° N, 73.7898° E
                  </Text>
                  <Text style={styles.mapPrecisionText}>Precision ±1.2m</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>

          {/* Cultivated Area with Unit Selector */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Cultivated Area</Text>
            <View style={styles.areaRow}>
              <TextInput
                style={styles.areaInput}
                value={areaValue}
                onChangeText={setAreaValue}
                keyboardType="decimal-pad"
              />

              <View style={styles.unitSelector}>
                {(['Acres', 'Hectares', 'Guntha'] as AreaUnit[]).map((u) => (
                  <TouchableOpacity
                    key={u}
                    style={[
                      styles.unitBtn,
                      areaUnit === u && styles.unitBtnActive,
                    ]}
                    onPress={() => setAreaUnit(u)}
                  >
                    <Text
                      style={[
                        styles.unitBtnText,
                        areaUnit === u && styles.unitBtnTextActive,
                      ]}
                    >
                      {u}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Crops in Rotation */}
          <View style={styles.inputGroup}>
            <View style={styles.labelRowWithMeta}>
              <Text style={styles.inputLabel}>Crops in Rotation</Text>
              <Text style={styles.cropsSelectedCount}>
                {selectedCrops.length} Selected
              </Text>
            </View>

            <View style={styles.cropsChipsWrap}>
              {AVAILABLE_CROPS.map((crop) => {
                const isSelected = selectedCrops.includes(crop);
                return (
                  <TouchableOpacity
                    key={crop}
                    style={[
                      styles.cropChip,
                      isSelected && styles.cropChipActive,
                    ]}
                    activeOpacity={0.8}
                    onPress={() => toggleCrop(crop)}
                  >
                    <Text
                      style={[
                        styles.cropChipText,
                        isSelected && styles.cropChipTextActive,
                      ]}
                    >
                      {isSelected ? crop : `+ ${crop}`}
                    </Text>
                    {isSelected && <Check size={14} color="#161e00" />}
                  </TouchableOpacity>
                );
              })}

              <TouchableOpacity
                style={styles.addCropChip}
                activeOpacity={0.8}
                onPress={handleAddCustomCrop}
              >
                <Plus size={14} color="#516600" />
                <Text style={styles.addCropChipText}>Add crop</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Telemetry Clock & Timezone */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Telemetry Clock & Timezone</Text>
            <View style={styles.timezoneRow}>
              <View style={styles.timezoneLeft}>
                <Clock size={18} color="#556253" />
                <Text style={styles.timezoneText}>Asia/Kolkata (IST +5:30)</Text>
              </View>
              <Lock size={16} color="#757965" />
            </View>
          </View>
        </View>

        {/* 3. DANGER ZONE CARD */}
        <View style={styles.dangerCard}>
          <View style={styles.dangerHeaderRow}>
            <View style={styles.dangerIconCircle}>
              <AlertTriangle size={18} color="#ffffff" />
            </View>
            <View>
              <Text style={styles.dangerTitle}>DANGER ZONE</Text>
              <Text style={styles.dangerSubtitle}>
                Critical farm governance & ownership actions
              </Text>
            </View>
          </View>

          {/* Row 1: Transfer Ownership */}
          <TouchableOpacity
            style={styles.transferRow}
            activeOpacity={0.8}
            onPress={() =>
              Alert.alert(
                'Transfer Farm Ownership',
                'Enter the agronomist or farmer phone number to transfer ownership.'
              )
            }
          >
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={styles.transferTitle}>Transfer Farm Ownership</Text>
              <Text style={styles.transferSubtitle}>
                Delegate master telemetry hub to another agronomist or phone
              </Text>
            </View>
            <ChevronRight size={20} color="#556253" />
          </TouchableOpacity>

          {/* Row 2: Wipe Farm Profile */}
          <View style={styles.wipeCard}>
            <View style={styles.wipeHeaderRow}>
              <View style={styles.wipeTitleLeft}>
                <Trash2 size={18} color="#ba1a1a" />
                <Text style={styles.wipeTitleText}>Wipe Farm Profile</Text>
              </View>
              <View style={styles.irreversibleBadge}>
                <Text style={styles.irreversibleBadgeText}>Irreversible</Text>
              </View>
            </View>

            <Text style={styles.wipeInstructions}>
              To delete profile, type{' '}
              <Text style={styles.wipeKeyword}>DELETE MY FARM</Text> below. All
              valve automations, soil moisture telemetry, and device pairings
              will be purged permanently.
            </Text>

            <TextInput
              style={styles.wipeInput}
              value={deleteConfirmText}
              onChangeText={setDeleteConfirmText}
              placeholder="Type 'DELETE MY FARM'"
              placeholderTextColor="#757965"
              autoCapitalize="characters"
            />

            <TouchableOpacity
              style={[
                styles.confirmDeletionBtn,
                deleteConfirmText.trim() === 'DELETE MY FARM' &&
                  styles.confirmDeletionBtnActive,
              ]}
              disabled={
                deleteConfirmText.trim() !== 'DELETE MY FARM' || isDeleting
              }
              onPress={handleWipeFarmProfile}
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Trash2
                    size={16}
                    color={
                      deleteConfirmText.trim() === 'DELETE MY FARM'
                        ? '#ffffff'
                        : '#757965'
                    }
                  />
                  <Text
                    style={[
                      styles.confirmDeletionBtnText,
                      deleteConfirmText.trim() === 'DELETE MY FARM' &&
                        styles.confirmDeletionBtnTextActive,
                    ]}
                  >
                    Confirm Deletion
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* 4. STICKY BOTTOM ACTION BAR */}
      <View
        style={[
          styles.bottomActionBar,
          { paddingBottom: insets.bottom > 0 ? insets.bottom : 16 },
        ]}
      >
        <TouchableOpacity
          style={styles.cancelBtn}
          activeOpacity={0.8}
          onPress={() => router.back()}
        >
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.saveChangesBtn}
          activeOpacity={0.9}
          onPress={handleSaveChanges}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#161e00" />
          ) : (
            <>
              <Text style={styles.saveChangesBtnText}>SAVE CHANGES</Text>
              <View style={styles.saveArrowCircle}>
                <ArrowUpRight size={20} color="#c6e85a" strokeWidth={2.5} />
              </View>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f9faf8',
  },
  topAppBar: {
    height: 56,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f9faf8',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  topAppLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topAppTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 16,
    letterSpacing: 1.2,
    color: '#191c1b',
  },
  topAppRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#516600',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toastContainer: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    zIndex: 999,
    alignItems: 'center',
  },
  toastCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#2e3130',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  toastText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 13,
    color: '#f0f1ef',
  },

  /* Scrollable Content */
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 16,
  },

  /* Avatar Section */
  avatarSection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  avatarWrap: {
    position: 'relative',
    width: 96,
    height: 96,
    borderRadius: 48,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  avatarImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#e7e8e6',
  },
  cameraBadgeBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#c6e85a',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  farmerName: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 19,
    color: '#191c1b',
    marginTop: 10,
  },
  avatarSubtitle: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    color: '#556253',
    marginTop: 2,
  },

  /* Card Styles */
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    padding: 18,
    shadowColor: '#1e2a1e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
    gap: 14,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 2,
  },
  cardHeaderTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
    letterSpacing: 1,
    color: '#556253',
    textTransform: 'uppercase',
  },
  kycBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#d8e7d4',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  kycBadgeText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
    color: '#3d4a3c',
  },
  zoneTagText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    color: '#757965',
  },

  /* Inputs */
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
    color: '#454937',
  },
  labelRowWithMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  simLinkedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  simLinkedText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 11,
    color: '#556253',
  },
  optionalText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 11,
    color: '#757965',
  },
  inputWrap: {
    position: 'relative',
    justifyContent: 'center',
  },
  textInput: {
    height: 48,
    backgroundColor: '#f3f4f2',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingRight: 42,
    fontFamily: 'Manrope_500Medium',
    fontSize: 14,
    color: '#191c1b',
  },
  inputRightIcon: {
    position: 'absolute',
    right: 14,
  },
  readOnlyInputRow: {
    height: 48,
    backgroundColor: 'rgba(231, 232, 230, 0.6)',
    borderRadius: 14,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  readOnlyInputText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
    color: '#191c1b',
    letterSpacing: 0.5,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#c6e85a',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  verifiedBadgeText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10,
    color: '#161e00',
  },

  /* Map Thumbnail */
  movePinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  movePinText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 12,
    color: '#516600',
  },
  mapThumbContainer: {
    width: '100%',
    height: 140,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#e7e8e6',
  },
  mapThumbImage: {
    width: '100%',
    height: '100%',
  },
  mapThumbOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(25, 28, 27, 0.25)',
    padding: 10,
    justifyContent: 'space-between',
  },
  mapThumbTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mapLocationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(25, 28, 27, 0.75)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 14,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#c6e85a',
  },
  mapLocationChipText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    color: '#ffffff',
  },
  mapExpandBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(25, 28, 27, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerPinWrap: {
    alignSelf: 'center',
  },
  centerPinCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#c6e85a',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  mapThumbBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mapCoordinatesText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    color: '#ffffff',
  },
  mapPrecisionText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.85)',
  },

  /* Area Row */
  areaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  areaInput: {
    flex: 1,
    height: 46,
    backgroundColor: '#f3f4f2',
    borderRadius: 14,
    paddingHorizontal: 14,
    fontFamily: 'Manrope_700Bold',
    fontSize: 17,
    color: '#191c1b',
  },
  unitSelector: {
    flexDirection: 'row',
    backgroundColor: '#edeeec',
    borderRadius: 20,
    padding: 3,
  },
  unitBtn: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 16,
  },
  unitBtnActive: {
    backgroundColor: '#c6e85a',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  unitBtnText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    color: '#556253',
  },
  unitBtnTextActive: {
    fontFamily: 'Manrope_700Bold',
    color: '#161e00',
  },

  /* Crops Chips */
  cropsSelectedCount: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    color: '#556253',
  },
  cropsChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  cropChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#edeeec',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  cropChipActive: {
    backgroundColor: '#c6e85a',
  },
  cropChipText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
    color: '#556253',
  },
  cropChipTextActive: {
    fontFamily: 'Manrope_700Bold',
    color: '#161e00',
  },
  addCropChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#d8e7d4',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addCropChipText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 12,
    color: '#516600',
  },

  /* Timezone */
  timezoneRow: {
    height: 48,
    backgroundColor: '#f3f4f2',
    borderRadius: 14,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timezoneLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timezoneText: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 13,
    color: '#191c1b',
  },

  /* Danger Card */
  dangerCard: {
    backgroundColor: 'rgba(255, 218, 214, 0.45)',
    borderRadius: 22,
    padding: 16,
    gap: 12,
  },
  dangerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dangerIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ba1a1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 12,
    letterSpacing: 0.8,
    color: '#ba1a1a',
  },
  dangerSubtitle: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 11,
    color: '#93000a',
  },
  transferRow: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  transferTitle: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
    color: '#191c1b',
  },
  transferSubtitle: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 11,
    color: '#556253',
    marginTop: 2,
  },
  wipeCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: 16,
    padding: 14,
    gap: 10,
  },
  wipeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  wipeTitleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  wipeTitleText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 13,
    color: '#ba1a1a',
  },
  irreversibleBadge: {
    backgroundColor: '#ffdad6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  irreversibleBadgeText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10,
    color: '#93000a',
  },
  wipeInstructions: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    color: '#454937',
    lineHeight: 18,
  },
  wipeKeyword: {
    fontFamily: 'Manrope_700Bold',
    color: '#ba1a1a',
  },
  wipeInput: {
    height: 44,
    backgroundColor: '#f3f4f2',
    borderRadius: 12,
    paddingHorizontal: 12,
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
    color: '#ba1a1a',
  },
  confirmDeletionBtn: {
    height: 44,
    borderRadius: 12,
    backgroundColor: '#e7e8e6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    opacity: 0.6,
  },
  confirmDeletionBtnActive: {
    backgroundColor: '#ba1a1a',
    opacity: 1,
  },
  confirmDeletionBtnText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 13,
    color: '#757965',
  },
  confirmDeletionBtnTextActive: {
    color: '#ffffff',
  },

  /* Bottom Action Bar */
  bottomActionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(249, 250, 248, 0.95)',
    paddingHorizontal: 16,
    paddingTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  cancelBtn: {
    height: 52,
    paddingHorizontal: 20,
    borderRadius: 26,
    backgroundColor: '#edeeec',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
    color: '#191c1b',
  },
  saveChangesBtn: {
    flex: 1,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#c6e85a',
    paddingLeft: 22,
    paddingRight: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#516600',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
    elevation: 3,
  },
  saveChangesBtnText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 13,
    letterSpacing: 1.1,
    color: '#161e00',
  },
  saveArrowCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#131e13',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
