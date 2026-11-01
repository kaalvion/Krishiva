import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ImageBackground,
  Image,
  Linking,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import {
  ArrowLeft,
  ArrowUpRight,
  Search,
  Mic,
  Play,
  Phone,
  MessageCircle,
  Radio,
  WifiOff,
  Droplets,
  RotateCcw,
  Droplet,
  Sprout,
  ChevronDown,
  ChevronUp,
  Zap,
  Signal,
  User,
  Headphones,
} from 'lucide-react-native';

const DIAGNOSTIC_BG_URL =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCQPVvP5JN5Q66iXd9d7aoes3wdV3PMVniI-UiciGP0D1MK5EdQ-OP4CxvDyld8ERzLNPueW108PXkzFmurcBOti07EJpJ1M7s0UUsUDbitfUUn2JCuuy83Fcd0vhpRl0G8zmqnMFprIxHOTvKMU0hM81_zwZsdOsjo3TGYZcK1xM6vmNewV1NY0UhTvw7tvukHeHJvaM8tPYcTlHOezOcg9dD9F2aBeEh3dajjvtE';

const AGRONOMIST_AVATAR =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCgrb2CETAAhYRbDOJmYJbVP6k-3MvaaVWe2Vj_HQz6R2tnunVgpMF_Id8UE2JNSdyEim9lsOfstPNseK7trCyYPPmMzJlLqal6pBPyvnil6E6RijnfBbgeqDUuTsCb9VNEa0BZ6Y4bt5VibBsJzioBiXvugYwm9DNecL2RevCw8iMWl7kLWTfLbgPxDSbYrfQjSloITjU-bxItr7iLKH7ceyRPYW8nJrHsfejX4uc';

export default function HelpSupportScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFaq, setActiveFaq] = useState<string | null>('offline');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState<boolean>(false);
  const [isRunningCheck, setIsRunningCheck] = useState<boolean>(false);

  // Accordion Toggle
  const toggleAccordion = (id: string) => {
    setActiveFaq((prev) => (prev === id ? null : id));
  };

  // Channel Actions
  const handleOpenSetupGuide = () => {
    router.push('/(app)/scan-device');
  };

  const handleCallSupport = () => {
    Linking.openURL('tel:+911800123456').catch(() => {
      Alert.alert('Phone Call', 'Toll-Free Kisan Support: 1800-123-456 (24/7 Toll-Free)');
    });
  };

  const handleOpenWhatsApp = () => {
    Linking.openURL('https://wa.me/919876543210').catch(() => {
      Alert.alert('WhatsApp Support', 'Official WhatsApp Chat: +91 98765 43210');
    });
  };

  // Network Check Action
  const handleNetworkCheck = () => {
    setIsRunningCheck(true);
    setTimeout(() => {
      setIsRunningCheck(false);
      Alert.alert(
        'Sentinel Diagnostic Check',
        '✓ GSM LTE: 4G Strong (-74 dBm)\n✓ LoRa Mesh: 5/5 Nodes reporting\n✓ Cloud Gateway: Connected (Latency 38ms)\n✓ Relays 1-4: Healthy & Responsive'
      );
    }, 900);
  };

  // Report Issue Action
  const handleReportIssue = () => {
    Alert.alert(
      'Report Technical Issue',
      'Would you like to log an automated diagnostic report and request an agronomist callback?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit Ticket',
          onPress: () => {
            Alert.alert(
              'Ticket Submitted',
              'Ticket #KRISH-4820 logged. Our Maharashtra regional technician will contact your registered phone number shortly.'
            );
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Background Subtle Watermark Lines */}
      <View style={styles.watermarkBg} pointerEvents="none">
        <Svg width="100%" height="100%" viewBox="0 0 390 900" fill="none">
          <Path
            d="M-60 120C40 110 120 180 240 140C360 100 420 220 480 210"
            stroke="#c5c9b1"
            strokeWidth={1.2}
            strokeDasharray="4 4"
            opacity={0.35}
          />
          <Path
            d="M-40 260C80 240 160 320 280 270C400 220 440 360 520 340"
            stroke="#c5c9b1"
            strokeWidth={1.2}
            opacity={0.35}
          />
          <Path
            d="M-70 420C70 400 130 510 270 450C410 390 460 530 530 520"
            stroke="#c5c9b1"
            strokeWidth={1.2}
            strokeDasharray="6 3"
            opacity={0.35}
          />
          <Path
            d="M-50 640C90 600 180 720 310 650C440 580 470 730 540 710"
            stroke="#c5c9b1"
            strokeWidth={1.2}
            opacity={0.35}
          />
        </Svg>
      </View>

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
          <Text style={styles.headerTitle}>HELP & SUPPORT</Text>
        </View>

        <View style={styles.profileAvatar}>
          <User size={18} color="#ffffff" />
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 120 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* 2. HERO TITLE SECTION */}
        <View style={styles.heroSection}>
          <View>
            <Text style={styles.heroDeskTag}>AGRITECH DESK</Text>
            <Text style={styles.heroTitle}>Help & Support</Text>
          </View>

          <TouchableOpacity
            style={styles.supportAgentBtn}
            activeOpacity={0.8}
            onPress={handleCallSupport}
            accessibilityLabel="Support Agent"
          >
            <Headphones size={20} color="#191c1b" />
          </TouchableOpacity>
        </View>

        {/* 3. SEARCH BAR */}
        <View style={styles.searchBar}>
          <Search size={20} color="#556253" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search help topics, error codes..."
            placeholderTextColor="#757965"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <TouchableOpacity
            style={styles.micBtn}
            onPress={() => Alert.alert('Voice Search', 'Listening for agricultural error keywords...')}
            activeOpacity={0.7}
          >
            <Mic size={18} color="#516600" />
          </TouchableOpacity>
        </View>

        {/* 4. QUICK CHANNELS (3 CARDS) */}
        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeaderTitle}>QUICK CHANNELS</Text>
            <Text style={styles.liveTagText}>24/7 LIVE</Text>
          </View>

          <View style={styles.channelsGrid}>
            {/* Card 1: Setup Guide (Active Lime) */}
            <TouchableOpacity
              style={[styles.channelCard, styles.channelCardActive]}
              activeOpacity={0.88}
              onPress={handleOpenSetupGuide}
            >
              <View style={styles.channelTopRow}>
                <View style={styles.playIconCap}>
                  <Play size={15} color="#c6e85a" fill="#c6e85a" />
                </View>
                <View style={styles.timeTagBadge}>
                  <Text style={styles.timeTagText}>2 MIN</Text>
                </View>
              </View>

              <View style={styles.channelBottom}>
                <Text style={styles.channelTitleActive}>Setup Guide</Text>
                <Text style={styles.channelSubtitleActive}>Add a device</Text>
              </View>
            </TouchableOpacity>

            {/* Card 2: Toll-Free (White) */}
            <TouchableOpacity
              style={styles.channelCard}
              activeOpacity={0.88}
              onPress={handleCallSupport}
            >
              <View style={styles.channelTopRow}>
                <View style={styles.channelIconCircle}>
                  <Phone size={15} color="#131e13" />
                </View>
                <View style={styles.pulseDot} />
              </View>

              <View style={styles.channelBottom}>
                <Text style={styles.channelTitle}>Toll-Free</Text>
                <Text style={styles.channelSubtitle}>Call support</Text>
              </View>
            </TouchableOpacity>

            {/* Card 3: WhatsApp (White) */}
            <TouchableOpacity
              style={styles.channelCard}
              activeOpacity={0.88}
              onPress={handleOpenWhatsApp}
            >
              <View style={styles.channelTopRow}>
                <View style={styles.channelIconCircle}>
                  <MessageCircle size={15} color="#131e13" />
                </View>
                <Text style={styles.instantTagText}>INSTANT</Text>
              </View>

              <View style={styles.channelBottom}>
                <Text style={styles.channelTitle}>WhatsApp</Text>
                <Text style={styles.channelSubtitle}>Chat now</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* 5. DIAGNOSTIC HERO BANNER */}
        <TouchableOpacity
          style={styles.diagnosticBannerContainer}
          activeOpacity={0.92}
          onPress={handleNetworkCheck}
        >
          <ImageBackground
            source={{ uri: DIAGNOSTIC_BG_URL }}
            style={styles.diagnosticBgImage}
            imageStyle={{ borderRadius: 20 }}
          >
            <View style={styles.diagnosticScrim}>
              <View style={styles.diagnosticTopBadge}>
                <View style={styles.diagnosticPulseDot} />
                <Text style={styles.diagnosticBadgeText}>NETWORK DIAGNOSTICS</Text>
              </View>

              <View style={styles.diagnosticBottomRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.diagnosticTitle}>Krishiva Sentinel Hub 4G</Text>
                  <Text style={styles.diagnosticSubtitle}>
                    All 3 regional relays operating normally
                  </Text>
                </View>

                {isRunningCheck ? (
                  <ActivityIndicator size="small" color="#c6e85a" />
                ) : (
                  <Radio size={22} color="#c6e85a" />
                )}
              </View>
            </View>
          </ImageBackground>
        </TouchableOpacity>

        {/* 6. COMMON QUESTIONS (FAQ ACCORDION) */}
        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeaderTitle}>COMMON QUESTIONS</Text>
            <Text style={styles.guidesCountText}>5 guides</Text>
          </View>

          {/* FAQ Item 1: Device Offline (Expandable) */}
          <View style={styles.faqCard}>
            <TouchableOpacity
              style={styles.faqHeader}
              onPress={() => toggleAccordion('offline')}
              activeOpacity={0.8}
            >
              <View style={styles.faqHeaderLeft}>
                <View style={styles.offlineIconCircle}>
                  <WifiOff size={16} color="#ba1a1a" />
                </View>
                <Text style={styles.faqTitle}>My device is offline</Text>
              </View>
              {activeFaq === 'offline' ? (
                <ChevronUp size={20} color="#556253" />
              ) : (
                <ChevronDown size={20} color="#556253" />
              )}
            </TouchableOpacity>

            {activeFaq === 'offline' && (
              <View style={styles.faqBody}>
                <Text style={styles.faqIntroText}>
                  Follow this 3-step field checklist to restore your GSM telemetry connection:
                </Text>

                {/* 3-Step Checklist */}
                <View style={styles.stepsContainer}>
                  {/* Step 1 */}
                  <View style={styles.stepItem}>
                    <View style={styles.stepNumberBadge}>
                      <Text style={styles.stepNumberText}>1</Text>
                    </View>
                    <View style={styles.stepContentCol}>
                      <Text style={styles.stepTitle}>Check power & LED indicators</Text>
                      <Text style={styles.stepDesc}>
                        Ensure the main power switch is ON. The green PWR light should stay solid. If the amber STS LED blinks rapidly, power is unstable.
                      </Text>
                    </View>
                    <Zap size={18} color="#516600" style={{ marginTop: 2 }} />
                  </View>

                  {/* Step 2 */}
                  <View style={styles.stepItem}>
                    <View style={styles.stepNumberBadge}>
                      <Text style={styles.stepNumberText}>2</Text>
                    </View>
                    <View style={styles.stepContentCol}>
                      <Text style={styles.stepTitle}>Verify SIM recharge & signal bars</Text>
                      <Text style={styles.stepDesc}>
                        Confirm the micro-SIM has an active SMS/Data pack. Check that the external antenna points straight up with at least 2 cellular bars.
                      </Text>
                    </View>
                    <Signal size={18} color="#556253" style={{ marginTop: 2 }} />
                  </View>

                  {/* Step 3 */}
                  <View style={styles.stepItem}>
                    <View style={styles.stepNumberBadge}>
                      <Text style={styles.stepNumberText}>3</Text>
                    </View>
                    <View style={styles.stepContentCol}>
                      <Text style={styles.stepTitle}>Hold Reset for 5 seconds</Text>
                      <Text style={styles.stepDesc}>
                        Press the waterproof Reset button located on the base until you hear a sustained beep sound, then release. Wait 90 seconds for reconnect.
                      </Text>
                    </View>
                    <RotateCcw size={18} color="#556253" style={{ marginTop: 2 }} />
                  </View>
                </View>

                {/* Micro Feedback Row */}
                <View style={styles.feedbackRow}>
                  <Text style={styles.feedbackQuestion}>Did this solve your problem?</Text>
                  {feedbackSubmitted ? (
                    <Text style={styles.feedbackThanksText}>Thank you for your feedback!</Text>
                  ) : (
                    <View style={styles.feedbackBtnGroup}>
                      <TouchableOpacity
                        style={styles.feedbackBtn}
                        onPress={() => setFeedbackSubmitted(true)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.feedbackBtnText}>YES</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.feedbackBtn}
                        onPress={() => setFeedbackSubmitted(true)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.feedbackBtnText}>NO</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            )}
          </View>

          {/* FAQ Item 2: Pump Won't Turn On */}
          <View style={styles.faqCard}>
            <TouchableOpacity
              style={styles.faqHeader}
              onPress={() => toggleAccordion('pump')}
              activeOpacity={0.8}
            >
              <View style={styles.faqHeaderLeft}>
                <View style={styles.faqIconCircle}>
                  <Droplets size={16} color="#131e13" />
                </View>
                <Text style={styles.faqTitle}>The pump won't turn on</Text>
              </View>
              {activeFaq === 'pump' ? (
                <ChevronUp size={20} color="#556253" />
              ) : (
                <ChevronDown size={20} color="#556253" />
              )}
            </TouchableOpacity>

            {activeFaq === 'pump' && (
              <View style={styles.faqBody}>
                <Text style={styles.faqAnswerText}>
                  Verify that line voltage is above 380V for 3-phase pumps and that the starter contactor coil has not tripped on thermal overload. Krishiva auto-lock engages when phase reversal is detected.
                </Text>
              </View>
            )}
          </View>

          {/* FAQ Item 3: Reset Controller */}
          <View style={styles.faqCard}>
            <TouchableOpacity
              style={styles.faqHeader}
              onPress={() => toggleAccordion('reset')}
              activeOpacity={0.8}
            >
              <View style={styles.faqHeaderLeft}>
                <View style={styles.faqIconCircle}>
                  <RotateCcw size={16} color="#131e13" />
                </View>
                <Text style={styles.faqTitle}>How do I reset my controller?</Text>
              </View>
              {activeFaq === 'reset' ? (
                <ChevronUp size={20} color="#556253" />
              ) : (
                <ChevronDown size={20} color="#556253" />
              )}
            </TouchableOpacity>

            {activeFaq === 'reset' && (
              <View style={styles.faqBody}>
                <Text style={styles.faqAnswerText}>
                  Hold the recessed master switch with the provided styling pin for 12 seconds until all telemetry LEDs cycle red-green-yellow.
                </Text>
              </View>
            )}
          </View>

          {/* FAQ Item 4: Water Usage */}
          <View style={styles.faqCard}>
            <TouchableOpacity
              style={styles.faqHeader}
              onPress={() => toggleAccordion('water')}
              activeOpacity={0.8}
            >
              <View style={styles.faqHeaderLeft}>
                <View style={styles.faqIconCircle}>
                  <Droplet size={16} color="#131e13" />
                </View>
                <Text style={styles.faqTitle}>How is water usage calculated?</Text>
              </View>
              {activeFaq === 'water' ? (
                <ChevronUp size={20} color="#556253" />
              ) : (
                <ChevronDown size={20} color="#556253" />
              )}
            </TouchableOpacity>

            {activeFaq === 'water' && (
              <View style={styles.faqBody}>
                <Text style={styles.faqAnswerText}>
                  Usage combines flow-sensor pulses with pump horsepower ratings, crop evapotranspiration coefficients, and field acreage polygons to calculate kiloliters consumed per irrigation cycle.
                </Text>
              </View>
            )}
          </View>

          {/* FAQ Item 5: Health Score */}
          <View style={styles.faqCard}>
            <TouchableOpacity
              style={styles.faqHeader}
              onPress={() => toggleAccordion('health')}
              activeOpacity={0.8}
            >
              <View style={styles.faqHeaderLeft}>
                <View style={styles.faqIconCircle}>
                  <Sprout size={16} color="#131e13" />
                </View>
                <Text style={styles.faqTitle}>Why is my health score low?</Text>
              </View>
              {activeFaq === 'health' ? (
                <ChevronUp size={20} color="#556253" />
              ) : (
                <ChevronDown size={20} color="#556253" />
              )}
            </TouchableOpacity>

            {activeFaq === 'health' && (
              <View style={styles.faqBody}>
                <Text style={styles.faqAnswerText}>
                  Multispectral NDVI aerial passes reflect root-zone soil saturation or moisture stress. Calibrate your sensor depth in Zone Settings to align with recent rainfall.
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* 7. STILL NEED HELP CARD */}
        <View style={styles.agronomistCard}>
          <View style={styles.agronomistCardInner}>
            <Image
              source={{ uri: AGRONOMIST_AVATAR }}
              style={styles.agronomistAvatar}
            />

            <View style={styles.agronomistTextCol}>
              <View style={styles.agronomistTitleRow}>
                <Text style={styles.agronomistTitle}>Still Need Help?</Text>
                <View style={styles.pulseDot} />
              </View>

              <Text style={styles.agronomistSubtitle}>
                Our agricultural technicians in Maharashtra are available 24/7 in{' '}
                <Text style={{ fontFamily: 'Manrope_700Bold', color: '#191c1b' }}>
                  Marathi, Hindi & English
                </Text>
                .
              </Text>

              <View style={styles.agronomistPillsRow}>
                <View style={styles.waitPill}>
                  <Text style={styles.waitPillText}>AVG WAIT: 45 SEC</Text>
                </View>

                <View style={styles.agentsPill}>
                  <Text style={styles.agentsPillText}>LOCAL FIELD AGENTS</Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* 8. STICKY BOTTOM BAR (REPORT AN ISSUE) */}
      <View
        style={[
          styles.stickyFooter,
          { paddingBottom: Math.max(insets.bottom, 16) },
        ]}
      >
        <TouchableOpacity
          style={styles.reportBtn}
          onPress={handleReportIssue}
          activeOpacity={0.88}
        >
          <Text style={styles.reportBtnText}>REPORT AN ISSUE</Text>
          <View style={styles.reportArrowCap}>
            <ArrowUpRight size={22} color="#ffffff" />
          </View>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f9faf8',
  },
  watermarkBg: {
    ...StyleSheet.absoluteFill,
    opacity: 0.25,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },

  // 1. HEADER
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
    fontFamily: 'Manrope_700Bold',
    fontSize: 16,
    color: '#191c1b',
    letterSpacing: 1.1,
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

  // 2. HERO TITLE SECTION
  heroSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    marginBottom: 8,
  },
  heroDeskTag: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10.5,
    color: '#556253',
    letterSpacing: 1.4,
  },
  heroTitle: {
    fontFamily: 'Manrope_300Light',
    fontSize: 26,
    color: '#191c1b',
    letterSpacing: 1.8,
    marginTop: 2,
  },
  supportAgentBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1e2a1e',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },

  // 3. SEARCH BAR
  searchBar: {
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    shadowColor: '#1e2a1e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
    marginBottom: 20,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Manrope_500Medium',
    fontSize: 13.5,
    color: '#191c1b',
    padding: 0,
  },
  micBtn: {
    padding: 4,
  },

  // 4. QUICK CHANNELS
  sectionBlock: {
    marginBottom: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
    marginBottom: 10,
  },
  sectionHeaderTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 12.5,
    color: '#556253',
    letterSpacing: 0.8,
  },
  liveTagText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 10.5,
    color: '#516600',
    letterSpacing: 0.8,
  },
  channelsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  channelCard: {
    flex: 1,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    padding: 12,
    justifyContent: 'space-between',
    minHeight: 106,
    shadowColor: '#1e2a1e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 14,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  channelCardActive: {
    backgroundColor: '#c6e85a',
    shadowColor: '#516600',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 4,
    borderColor: 'transparent',
  },
  channelTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  playIconCap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#131e13',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeTagBadge: {
    backgroundColor: 'rgba(19, 30, 19, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  timeTagText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 9,
    color: '#131e13',
    letterSpacing: 0.5,
  },
  channelIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#d8e7d4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#516600',
  },
  instantTagText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 9.5,
    color: '#516600',
    letterSpacing: 0.5,
  },
  channelBottom: {
    marginTop: 12,
  },
  channelTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 13,
    color: '#191c1b',
  },
  channelSubtitle: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 11,
    color: '#556253',
    marginTop: 1,
  },
  channelTitleActive: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 13,
    color: '#161e00',
  },
  channelSubtitleActive: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 11,
    color: 'rgba(22, 30, 0, 0.8)',
    marginTop: 1,
  },

  // 5. DIAGNOSTIC HERO BANNER
  diagnosticBannerContainer: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#1e2a1e',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 3,
    marginBottom: 22,
  },
  diagnosticBgImage: {
    width: '100%',
    height: 114,
  },
  diagnosticScrim: {
    flex: 1,
    backgroundColor: 'rgba(25, 28, 27, 0.6)',
    padding: 12,
    justifyContent: 'space-between',
  },
  diagnosticTopBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(46, 49, 48, 0.75)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  diagnosticPulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#cef061',
  },
  diagnosticBadgeText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 9.5,
    color: '#f9faf8',
    letterSpacing: 0.8,
  },
  diagnosticBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  diagnosticTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 14.5,
    color: '#ffffff',
  },
  diagnosticSubtitle: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 11.5,
    color: 'rgba(255, 255, 255, 0.88)',
    marginTop: 1,
  },

  // 6. COMMON QUESTIONS (FAQ ACCORDION)
  guidesCountText: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 11.5,
    color: '#757965',
  },
  faqCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: '#1e2a1e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 14,
    elevation: 1,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
    marginBottom: 10,
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  faqHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  offlineIconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#ffdad6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  faqIconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#d8e7d4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  faqTitle: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
    color: '#191c1b',
    flex: 1,
  },
  faqBody: {
    paddingTop: 12,
  },
  faqIntroText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    color: '#556253',
    lineHeight: 18,
    marginBottom: 10,
  },
  faqAnswerText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12.5,
    color: '#556253',
    lineHeight: 18,
  },
  stepsContainer: {
    gap: 8,
    marginBottom: 12,
  },
  stepItem: {
    backgroundColor: '#f3f4f2',
    borderRadius: 14,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  stepNumberBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#c6e85a',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  stepNumberText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 11,
    color: '#161e00',
  },
  stepContentCol: {
    flex: 1,
  },
  stepTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 12,
    color: '#191c1b',
  },
  stepDesc: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 11,
    color: '#556253',
    lineHeight: 16,
    marginTop: 2,
  },
  feedbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f3f4f2',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 4,
  },
  feedbackQuestion: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 11,
    color: '#556253',
  },
  feedbackBtnGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  feedbackBtn: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  feedbackBtnText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 9.5,
    color: '#191c1b',
    letterSpacing: 0.5,
  },
  feedbackThanksText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
    color: '#516600',
  },

  // 7. STILL NEED HELP CARD
  agronomistCard: {
    backgroundColor: '#edeeec',
    borderRadius: 20,
    padding: 14,
    marginBottom: 20,
  },
  agronomistCardInner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  agronomistAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#d8e7d4',
  },
  agronomistTextCol: {
    flex: 1,
  },
  agronomistTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  agronomistTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 14,
    color: '#191c1b',
  },
  agronomistSubtitle: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 11.5,
    color: '#556253',
    lineHeight: 16,
  },
  agronomistPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  waitPill: {
    backgroundColor: '#e2e3e1',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  waitPillText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 9.5,
    color: '#454937',
    letterSpacing: 0.5,
  },
  agentsPill: {
    backgroundColor: '#c6e85a',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  agentsPillText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 9.5,
    color: '#161e00',
    letterSpacing: 0.5,
  },

  // 8. STICKY FOOTER
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
  reportBtn: {
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
  reportBtnText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 14,
    color: '#161e00',
    letterSpacing: 1.5,
  },
  reportArrowCap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#161e00',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
});
