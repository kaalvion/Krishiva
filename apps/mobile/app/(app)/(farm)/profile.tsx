import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ImageBackground,
  Alert,
} from 'react-native';
import Svg, { Ellipse, Path } from 'react-native-svg';
import { useRouter } from 'expo-router';
import {
  Pencil,
  MapPin,
  Check,
  Radio,
  ArrowUpRight,
  Signal,
  Battery,
  Clock,
  Bell,
  Volume2,
  Sprout,
  Cpu,
  Globe,
  HelpCircle,
  Layers,
  LogOut,
  ChevronRight,
  Tractor,
} from 'lucide-react-native';
import { useAuth } from '../../../src/hooks/useAuth';
import { useActiveFarm } from '../../../src/context/FarmContext';
import { useLanguage, type SupportedLanguage } from '../../../src/context/LanguageContext';
import { useLiveDevices } from '../../../src/hooks/live';

const AVATAR_URL =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBudAsx-fMdlTroMHBzC-IahIc0ayJ-_XgnmDoDOK-9uqXmLJ2B3lx13aoa3JDClrXfPRis4Uefju47JLygN8P41xEBUYczYdSk3h1ZmYqs1AOXQc0jqByXJ32katyT2eU5QmKJFOtbXjsDIMkI8Nvi65KVAALxibqnCEcufGJ9r7XvINUEw3otAq4BWKIVAzyDMPaXMRmJ3vX1aVLczfgyVeLHKedKu-_jDpSOdFk';

const FIELD_IMAGE_URL =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuABaUEHDMjmeFyV78De_7So_8zm3A0ybQILgZDmlcG86GYlPprfpHxTc324MMbynW6yWxSDu8dixEek_fy5xoByTYUaLdJhJQ53n4g8c2pYH-ngFIOx10Ne6gJ3Vrg20UG3tFWIcvZBaF3EzeN_jgtoa03aLzSP-oCj7q_aM3LPuUoENHUD6V3JhsZWKhAfLwbBj4i6K-TlFgazYKOQamDwMBLNpzQnNIfCMMTh5wQ';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { activeFarm } = useActiveFarm();
  const { language, changeLanguage } = useLanguage();
  const { devices } = useLiveDevices(activeFarm?.id);

  // Alert preferences toggle state
  const [pushNotif, setPushNotif] = useState(true);
  const [alertSound, setAlertSound] = useState(true);

  const farmerName =
    user?.displayName ||
    (user?.email ? user.email.split('@')[0] : 'Rameshwar Patil');

  const farmName = activeFarm?.name || 'Green Valley Farms';
  const cropInfo = activeFarm?.cropType || 'Sugarcane & Polyhouse';
  const acreage = activeFarm?.areaAcres ? activeFarm.areaAcres.toString() : '18.5';
  const timezone = activeFarm?.timezone || 'Asia/Kolkata (IST)';

  const handleLanguageSelect = () => {
    Alert.alert(
      'Select Language / भाषा निवडा / भाषा चुनें',
      'Choose your preferred display language:',
      [
        {
          text: 'English',
          onPress: () => changeLanguage('en'),
        },
        {
          text: 'हिंदी (Hindi)',
          onPress: () => changeLanguage('hi'),
        },
        {
          text: 'मराठी (Marathi)',
          onPress: () => changeLanguage('mr'),
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out of Krishiva?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut();
            router.replace('/(auth)/onboarding');
          } catch (e: any) {
            Alert.alert('Logout Error', e?.message || 'Could not log out');
          }
        },
      },
    ]);
  };

  const getLanguageLabel = () => {
    switch (language) {
      case 'hi':
        return 'हिन्दी (Hindi)';
      case 'mr':
        return 'मराठी (Marathi)';
      case 'ta':
        return 'தமிழ் (Tamil)';
      case 'te':
        return 'తెలుగు (Telugu)';
      case 'pa':
        return 'ਪੰਜਾਬੀ (Punjabi)';
      case 'bn':
        return 'বাংলা (Bengali)';
      default:
        return 'English';
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Screen Header Banner */}
        <View style={styles.headerBanner}>
          <View style={styles.headerTitleCol}>
            <Text style={styles.screenTitle}>PROFILE</Text>
            <View style={styles.syncRow}>
              <View style={styles.pulseDot} />
              <Text style={styles.syncText}>
                ACCOUNT & FARM SETTINGS • SYNCED
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.editButton}
            onPress={() => router.push('/(app)/(farm)/edit-profile')}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Edit Profile"
          >
            <Pencil size={15} color="#516600" />
            <Text style={styles.editText}>Edit</Text>
          </TouchableOpacity>
        </View>

        {/* Profile Hero Card */}
        <View style={styles.heroCard}>
          {/* Subtle Topographic SVG Watermark */}
          <View style={styles.watermarkContainer}>
            <Svg width="180" height="180" viewBox="0 0 200 200" fill="none">
              <Ellipse
                cx="100"
                cy="100"
                rx="80"
                ry="70"
                stroke="#c5c9b1"
                strokeWidth="1.2"
                opacity="0.3"
              />
              <Ellipse
                cx="95"
                cy="105"
                rx="60"
                ry="50"
                stroke="#c5c9b1"
                strokeWidth="1.2"
                opacity="0.3"
              />
              <Ellipse
                cx="105"
                cy="95"
                rx="40"
                ry="32"
                stroke="#c5c9b1"
                strokeWidth="1.2"
                opacity="0.3"
              />
              <Ellipse
                cx="100"
                cy="100"
                rx="22"
                ry="16"
                stroke="#c5c9b1"
                strokeWidth="1.2"
                opacity="0.3"
              />
              <Path
                d="M10 100 Q60 40 100 100 T190 100"
                stroke="#c5c9b1"
                strokeWidth="1.2"
                opacity="0.3"
              />
              <Path
                d="M15 130 Q70 80 120 120 T185 130"
                stroke="#c5c9b1"
                strokeWidth="1.2"
                opacity="0.3"
              />
            </Svg>
          </View>

          {/* Farmer Identity Row */}
          <View style={styles.identityRow}>
            {/* Avatar with Gradient border */}
            <View style={styles.avatarWrapper}>
              <View style={styles.avatarBorderRing}>
                <Image
                  source={{ uri: AVATAR_URL }}
                  style={styles.avatarImage}
                  resizeMode="cover"
                />
              </View>
              <View style={styles.verifiedBadge}>
                <Check size={12} color="#ffffff" strokeWidth={3} />
              </View>
            </View>

            {/* Details */}
            <View style={styles.identityDetails}>
              <View style={styles.nameBadgeRow}>
                <Text style={styles.farmerName} numberOfLines={1}>
                  {farmerName}
                </Text>
                <View style={styles.ownerBadge}>
                  <Text style={styles.ownerBadgeText}>Active Owner</Text>
                </View>
              </View>

              <Text style={styles.farmCropText} numberOfLines={1}>
                {farmName} • {cropInfo}
              </Text>

              <View style={styles.locationRow}>
                <MapPin size={14} color="#516600" />
                <Text style={styles.locationText} numberOfLines={1}>
                  Nashik District, MH, India (Plot #12A)
                </Text>
              </View>
            </View>
          </View>

          {/* Quick Telemetry Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>
                {devices.length > 0 ? devices.length : 4}
              </Text>
              <Text style={styles.statLabel}>Devices Active</Text>
            </View>

            <View style={styles.statBox}>
              <Text style={styles.statValue}>{acreage}</Text>
              <Text style={styles.statLabel}>Total Acres</Text>
            </View>

            <View style={styles.statBox}>
              <View style={styles.onlineStatRow}>
                <Radio size={14} color="#516600" />
                <Text style={styles.statValueOnline}>Online</Text>
              </View>
              <Text style={styles.statLabel}>LoRa & 4G Hub</Text>
            </View>
          </View>
        </View>

        {/* Compact Controller Status Card */}
        <View style={styles.card}>
          <View style={styles.controllerHeaderRow}>
            <View style={styles.controllerIndicator}>
              <View style={styles.indicatorOuter}>
                <View style={styles.indicatorInner} />
              </View>
              <Text style={styles.sectionHeaderSmall}>
                CONTROLLER CONNECTION HEALTH
              </Text>
            </View>

            <TouchableOpacity
              style={styles.diagnosticsPill}
              onPress={() =>
                Alert.alert(
                  'Diagnostics',
                  'GSM Master Hub Telemetry: Signal -76 dBm, Battery 94% Solar, Ping 1m ago.'
                )
              }
              activeOpacity={0.8}
            >
              <Text style={styles.diagnosticsText}>Diagnostics</Text>
              <ArrowUpRight size={13} color="#3c4d00" />
            </TouchableOpacity>
          </View>

          {/* Inner Hub Box */}
          <View style={styles.innerHubBox}>
            <View style={styles.hubLeft}>
              <View style={styles.hubIconCircle}>
                <Radio size={20} color="#516600" />
              </View>
              <View style={styles.hubInfo}>
                <Text style={styles.hubTitle}>GSM Master Hub</Text>
                <Text style={styles.hubMac}>MAC: F0:24:F9:0D:B7:48</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.hubArrowButton}
              onPress={() => router.push('/(app)/(farm)/devices' as any)}
              activeOpacity={0.8}
            >
              <ArrowUpRight size={18} color="#ffffff" />
            </TouchableOpacity>
          </View>

          {/* Controller Telemetry Badges */}
          <View style={styles.controllerBadgesRow}>
            <View style={styles.badgeCol}>
              <Signal size={14} color="#516600" />
              <Text style={styles.badgeColText}>-76 dBm</Text>
            </View>
            <View style={styles.badgeCol}>
              <Battery size={14} color="#516600" />
              <Text style={styles.badgeColText}>94% Solar</Text>
            </View>
            <View style={styles.badgeCol}>
              <Clock size={14} color="#516600" />
              <Text style={styles.badgeColText}>Ping 1m ago</Text>
            </View>
          </View>
        </View>

        {/* Alert Preferences Section */}
        <View style={styles.sectionGroup}>
          <Text style={styles.sectionTitle}>ALERT PREFERENCES</Text>
          <View style={styles.card}>
            {/* Toggle Row 1: Push Notifications */}
            <View style={styles.toggleRow}>
              <View style={styles.toggleLeft}>
                <View style={styles.toggleIconCircle}>
                  <Bell size={18} color="#516600" />
                </View>
                <View style={styles.toggleTextCol}>
                  <Text style={styles.toggleTitle}>Push Notifications</Text>
                  <Text style={styles.toggleSubtitle}>
                    Real-time alerts for pump, leaks & valves
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={[
                  styles.switchTrack,
                  pushNotif ? styles.switchTrackOn : styles.switchTrackOff,
                ]}
                onPress={() => setPushNotif((prev) => !prev)}
                activeOpacity={0.85}
              >
                <View
                  style={[
                    styles.switchThumb,
                    pushNotif ? styles.switchThumbOn : styles.switchThumbOff,
                  ]}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.divider} />

            {/* Toggle Row 2: Alert Sound */}
            <View style={styles.toggleRow}>
              <View style={styles.toggleLeft}>
                <View style={styles.toggleIconCircle}>
                  <Volume2 size={18} color="#516600" />
                </View>
                <View style={styles.toggleTextCol}>
                  <Text style={styles.toggleTitle}>Alert Sound</Text>
                  <Text style={styles.toggleSubtitle}>
                    Loud audible chime for critical pump faults
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={[
                  styles.switchTrack,
                  alertSound ? styles.switchTrackOn : styles.switchTrackOff,
                ]}
                onPress={() => setAlertSound((prev) => !prev)}
                activeOpacity={0.85}
              >
                <View
                  style={[
                    styles.switchThumb,
                    alertSound ? styles.switchThumbOn : styles.switchThumbOff,
                  ]}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Farm Configuration Section */}
        <View style={styles.sectionGroup}>
          <Text style={styles.sectionTitle}>FARM CONFIGURATION</Text>
          <View style={styles.configCard}>
            {/* Item 0: Switch / Add Farm */}
            <TouchableOpacity
              style={styles.configRow}
              onPress={() => router.push('/(app)/farms')}
              activeOpacity={0.7}
            >
              <View style={styles.configLeft}>
                <View style={styles.configIconCircle}>
                  <Tractor size={18} color="#516600" />
                </View>
                <View style={styles.configTextCol}>
                  <Text style={styles.configTitle}>My Farms & Switch</Text>
                  <Text style={styles.configSubtitle}>
                    View all farms or set up a new farm
                  </Text>
                </View>
              </View>
              <View style={styles.configRightBadgeRow}>
                <View style={styles.configPill}>
                  <Text style={styles.configPillText}>+ Add Farm</Text>
                </View>
                <ChevronRight size={18} color="#757965" />
              </View>
            </TouchableOpacity>

            <View style={styles.divider} />

            {/* Item 1: Farm Details */}
            <TouchableOpacity
              style={styles.configRow}
              onPress={() =>
                Alert.alert(
                  'Farm Details',
                  `Name: ${farmName}\nCrop: ${cropInfo}\nArea: ${acreage} Acres\nTimezone: ${timezone}`
                )
              }
              activeOpacity={0.7}
            >
              <View style={styles.configLeft}>
                <View style={styles.configIconCircle}>
                  <Sprout size={18} color="#516600" />
                </View>
                <View style={styles.configTextCol}>
                  <Text style={styles.configTitle}>Farm Details</Text>
                  <Text style={styles.configSubtitle}>
                    Soil type, acreage, crop sectors
                  </Text>
                </View>
              </View>
              <ChevronRight size={18} color="#757965" />
            </TouchableOpacity>

            <View style={styles.divider} />

            {/* Item 2: Timezone */}
            <TouchableOpacity
              style={styles.configRow}
              onPress={() => Alert.alert('Timezone', timezone)}
              activeOpacity={0.7}
            >
              <View style={styles.configLeft}>
                <View style={styles.configIconCircle}>
                  <Clock size={18} color="#516600" />
                </View>
                <Text style={styles.configTitle}>Timezone</Text>
              </View>
              <View style={styles.configRightBadgeRow}>
                <View style={styles.configPill}>
                  <Text style={styles.configPillText}>{timezone}</Text>
                </View>
                <ChevronRight size={18} color="#757965" />
              </View>
            </TouchableOpacity>

            <View style={styles.divider} />

            {/* Item 3: Connected Devices */}
            <TouchableOpacity
              style={styles.configRow}
              onPress={() => router.push('/(app)/(farm)/devices' as any)}
              activeOpacity={0.7}
            >
              <View style={styles.configLeft}>
                <View style={styles.configIconCircle}>
                  <Cpu size={18} color="#516600" />
                </View>
                <Text style={styles.configTitle}>Connected Devices</Text>
              </View>
              <View style={styles.configRightBadgeRow}>
                <View style={styles.pairedPill}>
                  <Text style={styles.pairedPillText}>
                    {devices.length > 0 ? `${devices.length} Paired Nodes` : '3 Paired Nodes'}
                  </Text>
                </View>
                <ChevronRight size={18} color="#757965" />
              </View>
            </TouchableOpacity>

            <View style={styles.divider} />

            {/* Item 4: Language (Hooked to LanguageContext) */}
            <TouchableOpacity
              style={styles.configRow}
              onPress={() => router.push('/(app)/(farm)/language')}
              activeOpacity={0.7}
            >
              <View style={styles.configLeft}>
                <View style={styles.configIconCircle}>
                  <Globe size={18} color="#516600" />
                </View>
                <Text style={styles.configTitle}>Language</Text>
              </View>
              <View style={styles.configRightBadgeRow}>
                <View style={styles.configPill}>
                  <Text style={styles.configPillText}>{getLanguageLabel()}</Text>
                </View>
                <ChevronRight size={18} color="#757965" />
              </View>
            </TouchableOpacity>

            <View style={styles.divider} />

            {/* Item 5: Help & Support */}
            <TouchableOpacity
              style={styles.configRow}
              onPress={() =>
                Alert.alert(
                  'Help & Support',
                  'Kisan Helpline: 1800-180-1551\nSupport Email: support@krishiva.io\nLoRa Mesh Setup Guide available in docs.'
                )
              }
              activeOpacity={0.7}
            >
              <View style={styles.configLeft}>
                <View style={styles.configIconCircle}>
                  <HelpCircle size={18} color="#516600" />
                </View>
                <View style={styles.configTextCol}>
                  <Text style={styles.configTitle}>Help & Support</Text>
                  <Text style={styles.configSubtitle}>
                    Kisan helpline, LoRa setup, FAQs
                  </Text>
                </View>
              </View>
              <ChevronRight size={18} color="#757965" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Visual Field & Crops Snapshot Preview Card */}
        <View style={styles.fieldSnapshotCard}>
          <ImageBackground
            source={{ uri: FIELD_IMAGE_URL }}
            style={styles.fieldImageBackground}
            resizeMode="cover"
          >
            <View style={styles.fieldScrim}>
              <View style={styles.fieldInfoRow}>
                <View style={styles.fieldTextCol}>
                  <Text style={styles.fieldTitle}>Field Imagery & Boundary</Text>
                  <Text style={styles.fieldSubtitle}>
                    Plot #12A Polyhouse • Multispectral NDVI Active
                  </Text>
                </View>

                <View style={styles.satelliteIconCircle}>
                  <Layers size={18} color="#161e00" />
                </View>
              </View>
            </View>
          </ImageBackground>
        </View>

        {/* Logout & App Version Section */}
        <View style={styles.footerSection}>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Log Out"
          >
            <LogOut size={18} color="#ba1a1a" />
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>

          <View style={styles.versionCol}>
            <Text style={styles.versionText}>Krishiva App v2.4.1 (Build 108)</Text>
            <Text style={styles.taglineText}>
              DESIGNED FOR INDIAN AGRICULTURE
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9faf8',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 40,
  },
  headerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    marginBottom: 12,
  },
  headerTitleCol: {
    flex: 1,
  },
  screenTitle: {
    fontSize: 24,
    fontFamily: 'Manrope_300Light',
    color: '#191c1b',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  syncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#C6E85A',
  },
  syncText: {
    fontSize: 10,
    fontFamily: 'Manrope_700Bold',
    color: '#556253',
    letterSpacing: 0.8,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f3f4f2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 99,
  },
  editText: {
    fontSize: 12,
    fontFamily: 'Manrope_600SemiBold',
    color: '#454937',
  },
  heroCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    shadowColor: '#1E2A1E',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 24,
    elevation: 3,
    overflow: 'hidden',
    position: 'relative',
  },
  watermarkContainer: {
    position: 'absolute',
    right: -20,
    top: -20,
    opacity: 0.35,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    zIndex: 1,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatarBorderRing: {
    width: 76,
    height: 76,
    borderRadius: 38,
    padding: 3,
    backgroundColor: '#C6E85A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 35,
    backgroundColor: '#e7e8e6',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#516600',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  identityDetails: {
    flex: 1,
    minWidth: 0,
    paddingTop: 2,
  },
  nameBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  farmerName: {
    fontSize: 17,
    fontFamily: 'Manrope_600SemiBold',
    color: '#191c1b',
  },
  ownerBadge: {
    backgroundColor: '#d3e1a6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 99,
  },
  ownerBadgeText: {
    fontSize: 10,
    fontFamily: 'Manrope_700Bold',
    color: '#404b1f',
  },
  farmCropText: {
    fontSize: 12,
    fontFamily: 'Manrope_400Regular',
    color: '#556253',
    marginTop: 3,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  locationText: {
    fontSize: 11,
    fontFamily: 'Manrope_400Regular',
    color: '#556253',
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
    zIndex: 1,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#f3f4f2',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 16,
    fontFamily: 'Manrope_600SemiBold',
    color: '#191c1b',
  },
  onlineStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statValueOnline: {
    fontSize: 14,
    fontFamily: 'Manrope_600SemiBold',
    color: '#191c1b',
  },
  statLabel: {
    fontSize: 10,
    fontFamily: 'Manrope_400Regular',
    color: '#556253',
    marginTop: 2,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    shadowColor: '#1E2A1E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 2,
  },
  controllerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  controllerIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  indicatorOuter: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#C6E85A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicatorInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#516600',
  },
  sectionHeaderSmall: {
    fontSize: 11,
    fontFamily: 'Manrope_600SemiBold',
    color: '#556253',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  diagnosticsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(198, 232, 90, 0.35)',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 99,
  },
  diagnosticsText: {
    fontSize: 10,
    fontFamily: 'Manrope_700Bold',
    color: '#3c4d00',
  },
  innerHubBox: {
    backgroundColor: '#f3f4f2',
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  hubLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  hubIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  hubInfo: {
    flex: 1,
  },
  hubTitle: {
    fontSize: 14,
    fontFamily: 'Manrope_600SemiBold',
    color: '#191c1b',
  },
  hubMac: {
    fontSize: 11,
    fontFamily: 'Courier',
    color: '#757965',
    marginTop: 1,
  },
  hubArrowButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#1E2A1E',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 1,
  },
  controllerBadgesRow: {
    flexDirection: 'row',
    gap: 8,
  },
  badgeCol: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: 'rgba(216, 231, 212, 0.4)',
    paddingVertical: 7,
    borderRadius: 8,
  },
  badgeColText: {
    fontSize: 11,
    fontFamily: 'Manrope_600SemiBold',
    color: '#5b6859',
  },
  sectionGroup: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'Manrope_600SemiBold',
    color: '#556253',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 10,
  },
  toggleIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(216, 231, 212, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleTextCol: {
    flex: 1,
  },
  toggleTitle: {
    fontSize: 14,
    fontFamily: 'Manrope_600SemiBold',
    color: '#191c1b',
  },
  toggleSubtitle: {
    fontSize: 11,
    fontFamily: 'Manrope_400Regular',
    color: '#556253',
    marginTop: 2,
  },
  switchTrack: {
    width: 48,
    height: 28,
    borderRadius: 14,
    padding: 2,
    justifyContent: 'center',
  },
  switchTrackOn: {
    backgroundColor: '#C6E85A',
    alignItems: 'flex-end',
  },
  switchTrackOff: {
    backgroundColor: '#e2e3e1',
    alignItems: 'flex-start',
  },
  switchThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  switchThumbOn: {
    backgroundColor: '#1E2A1E',
  },
  switchThumbOff: {
    backgroundColor: '#ffffff',
  },
  divider: {
    height: 1,
    backgroundColor: '#edeeec',
    marginVertical: 10,
  },
  configCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    shadowColor: '#1E2A1E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 2,
  },
  configRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    minHeight: 48,
  },
  configLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 8,
  },
  configIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#f3f4f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  configTextCol: {
    flex: 1,
  },
  configTitle: {
    fontSize: 14,
    fontFamily: 'Manrope_600SemiBold',
    color: '#191c1b',
  },
  configSubtitle: {
    fontSize: 11,
    fontFamily: 'Manrope_400Regular',
    color: '#556253',
    marginTop: 2,
  },
  configRightBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  configPill: {
    backgroundColor: '#f3f4f2',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 99,
  },
  configPillText: {
    fontSize: 11,
    fontFamily: 'Manrope_500Medium',
    color: '#454937',
  },
  pairedPill: {
    backgroundColor: '#d3e1a6',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 99,
  },
  pairedPillText: {
    fontSize: 11,
    fontFamily: 'Manrope_600SemiBold',
    color: '#404b1f',
  },
  fieldSnapshotCard: {
    height: 140,
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#1E2A1E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  fieldImageBackground: {
    width: '100%',
    height: '100%',
    justifyContent: 'flex-end',
  },
  fieldScrim: {
    backgroundColor: 'rgba(22, 30, 22, 0.72)',
    padding: 14,
  },
  fieldInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fieldTextCol: {
    flex: 1,
    marginRight: 8,
  },
  fieldTitle: {
    fontSize: 14,
    fontFamily: 'Manrope_600SemiBold',
    color: '#ffffff',
  },
  fieldSubtitle: {
    fontSize: 11,
    fontFamily: 'Manrope_400Regular',
    color: '#dbe9ae',
    marginTop: 2,
  },
  satelliteIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#C6E85A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerSection: {
    alignItems: 'center',
    gap: 16,
    paddingTop: 4,
  },
  logoutButton: {
    width: '100%',
    height: 48,
    borderRadius: 99,
    backgroundColor: '#ffdad6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  logoutText: {
    fontSize: 14,
    fontFamily: 'Manrope_600SemiBold',
    color: '#ba1a1a',
  },
  versionCol: {
    alignItems: 'center',
  },
  versionText: {
    fontSize: 12,
    fontFamily: 'Manrope_400Regular',
    color: '#757965',
  },
  taglineText: {
    fontSize: 10,
    fontFamily: 'Manrope_700Bold',
    color: '#556253',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: 2,
  },
});

