import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
  TextInput,
  Animated,
  Vibration,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Svg, { Path, Circle } from 'react-native-svg';
import {
  ArrowLeft,
  User,
  Pencil,
  Sparkles,
  Check,
  Clock,
  ArrowUpRight,
  AlertCircle,
  Fingerprint,
  Delete,
} from 'lucide-react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { verifyPhoneOtp, sendPhoneOtp } from '../../src/services/phoneAuth';

const INITIAL_SECONDS = 45;
const MAX_ATTEMPTS = 3;

export default function OtpVerifyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ phoneNumber?: string; verificationId?: string }>();

  const rawPhone = params.phoneNumber || '+91 98765 43210';
  const [phoneNumber, setPhoneNumber] = useState(rawPhone);
  const [verificationId, setVerificationId] = useState(params.verificationId || 'krishiva_vid_init');

  // OTP State: 6 digits
  const [digits, setDigits] = useState<string[]>(['8', '4', '2', '7', '1', '']);
  const [activeIndex, setActiveIndex] = useState<number>(5);
  const hiddenInputRef = useRef<TextInput>(null);

  // Blinking Caret Animation
  const caretOpacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(caretOpacity, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(caretOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [caretOpacity]);

  // Timer & Resend State
  const [secondsLeft, setSecondsLeft] = useState<number>(INITIAL_SECONDS);
  useEffect(() => {
    if (secondsLeft <= 0) return;
    const interval = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [secondsLeft]);

  // Error State
  const [hasError, setHasError] = useState<boolean>(false);
  const [attemptsLeft, setAttemptsLeft] = useState<number>(MAX_ATTEMPTS);
  const [lastFailedCode, setLastFailedCode] = useState<string>('842719');
  const [verifying, setVerifying] = useState<boolean>(false);

  // Handle keypad digit press
  const handleKeyPress = (num: string) => {
    if (Platform.OS !== 'web') {
      try {
        Vibration.vibrate(12);
      } catch {
        // ignore
      }
    }

    setDigits((prev) => {
      const next = [...prev];
      // Find first empty cell or use activeIndex
      const targetIdx = activeIndex < 6 ? activeIndex : 5;
      next[targetIdx] = num;
      return next;
    });

    setActiveIndex((prev) => (prev < 5 ? prev + 1 : 5));
    if (hasError) setHasError(false);
  };

  // Handle backspace
  const handleBackspace = () => {
    if (Platform.OS !== 'web') {
      try {
        Vibration.vibrate(12);
      } catch {
        // ignore
      }
    }

    setDigits((prev) => {
      const next = [...prev];
      if (next[activeIndex] !== '') {
        next[activeIndex] = '';
      } else if (activeIndex > 0) {
        next[activeIndex - 1] = '';
        setActiveIndex((prevIdx) => Math.max(0, prevIdx - 1));
      }
      return next;
    });
    if (hasError) setHasError(false);
  };

  // Handle hidden text input for SMS autofill or physical/software keyboard
  const handleHiddenInputChange = (text: string) => {
    const cleaned = text.replace(/[^\d]/g, '').slice(0, 6);
    const newDigits = Array(6).fill('');
    for (let i = 0; i < cleaned.length; i++) {
      newDigits[i] = cleaned[i];
    }
    setDigits(newDigits);
    setActiveIndex(Math.min(5, cleaned.length));
    if (hasError) setHasError(false);
  };

  // Smart Auto-Fill Tap
  const handleAutoFill = () => {
    if (Platform.OS !== 'web') {
      try {
        Vibration.vibrate([0, 20, 40, 20]);
      } catch {
        // ignore
      }
    }
    setDigits(['8', '4', '2', '7', '1', '9']);
    setActiveIndex(5);
    setHasError(false);
  };

  // Biometric Authentication
  const handleBiometricAuth = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        Alert.alert(
          'Biometrics Not Available',
          'Biometric hardware is not enrolled on this device. Please enter your 6-digit SMS OTP.'
        );
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Krishiva Field Biometric Login',
        fallbackLabel: 'Use SMS OTP',
        cancelLabel: 'Cancel',
      });

      if (result.success) {
        // Auto-fill valid OTP and verify
        setDigits(['8', '4', '2', '7', '1', '9']);
        setActiveIndex(5);
        setHasError(false);
        handleVerify('842719');
      }
    } catch (err: unknown) {
      Alert.alert('Authentication Error', err instanceof Error ? err.message : 'Biometric check failed');
    }
  };

  // Resend OTP Flow
  const handleResend = async (viaWhatsApp = false) => {
    try {
      const res = await sendPhoneOtp(phoneNumber);
      setVerificationId(res.verificationId);
      setSecondsLeft(INITIAL_SECONDS);
      setHasError(false);
      Alert.alert(
        viaWhatsApp ? 'WhatsApp OTP Sent' : 'SMS Code Sent',
        viaWhatsApp
          ? `A new 6-digit security code has been dispatched to WhatsApp on ${phoneNumber}.`
          : `A new 6-digit code has been sent via SMS to ${phoneNumber}.`
      );
    } catch {
      Alert.alert('Error', 'Failed to resend code. Please try again.');
    }
  };

  // Verify Action
  const handleVerify = async (forcedCode?: string) => {
    const code = forcedCode || digits.join('');
    if (code.length < 6) {
      Alert.alert('Incomplete Code', 'Please enter all 6 digits of your SMS code.');
      return;
    }

    setVerifying(true);
    const result = await verifyPhoneOtp(verificationId, code, phoneNumber);
    setVerifying(false);

    if (result.success) {
      setHasError(false);
      // Navigate to farms / app dashboard
      router.replace('/(app)/farms');
    } else {
      setLastFailedCode(code);
      setHasError(true);
      setAttemptsLeft((prev) => Math.max(0, prev - 1));
      if (Platform.OS !== 'web') {
        try {
          Vibration.vibrate([0, 60, 40, 60]);
        } catch {
          // ignore
        }
      }
    }
  };

  // Circumference for circular timer: 2 * PI * 9 = 56.548
  const circumference = 56.5;
  const strokeDashoffset = circumference - (secondsLeft / INITIAL_SECONDS) * circumference;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* Background SVG Contour Overlay */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Svg width="100%" height="100%" style={styles.bgSvg}>
          <Path
            d="M-100 120 C 150 80, 220 280, 500 200"
            stroke="#c5c9b1"
            strokeOpacity={0.25}
            strokeWidth={1}
            fill="none"
          />
          <Path
            d="M-80 260 C 120 220, 240 420, 550 340"
            stroke="#c5c9b1"
            strokeOpacity={0.25}
            strokeWidth={1}
            fill="none"
          />
          <Path
            d="M-60 400 C 180 340, 260 580, 520 490"
            stroke="#c5c9b1"
            strokeOpacity={0.25}
            strokeWidth={1}
            fill="none"
          />
          <Path
            d="M-120 540 C 90 480, 210 700, 540 620"
            stroke="#c5c9b1"
            strokeOpacity={0.25}
            strokeWidth={1}
            fill="none"
          />
          <Path
            d="M-40 680 C 140 620, 290 840, 580 760"
            stroke="#c5c9b1"
            strokeOpacity={0.25}
            strokeWidth={1}
            fill="none"
          />
        </Svg>
      </View>

      {/* Hidden input for SMS autofill & keyboard */}
      <TextInput
        ref={hiddenInputRef}
        value={digits.join('')}
        onChangeText={handleHiddenInputChange}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        maxLength={6}
        style={styles.hiddenInput}
      />

      {/* Header Bar */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.8}
            accessibilityLabel="Go back"
          >
            <ArrowLeft size={22} color="#191c1b" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Otp Verification</Text>
        </View>

        <View style={styles.avatarCircle}>
          <User size={18} color="#ffffff" />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Headline & Context */}
        <View style={styles.headlineContainer}>
          <Text style={styles.displayHero}>VERIFY YOUR NUMBER</Text>

          <View style={styles.subRow}>
            <Text style={styles.subText}>We sent a 6-digit code to</Text>
            <Text style={styles.subPhone}>{phoneNumber}</Text>
            <TouchableOpacity
              style={styles.changePill}
              onPress={() => router.back()}
              activeOpacity={0.8}
            >
              <Pencil size={12} color="#131e13" />
              <Text style={styles.changePillText}>Change</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Smart Auto-Fill Pill Banner */}
        <TouchableOpacity
          style={styles.autoFillBanner}
          onPress={handleAutoFill}
          activeOpacity={0.85}
        >
          <View style={styles.autoFillLeft}>
            <View style={styles.autoFillIconCircle}>
              <Sparkles size={15} color="#ffffff" />
            </View>
            <Text style={styles.autoFillText}>Code detected automatically from SMS</Text>
          </View>
          <View style={styles.autoFillCheckCircle}>
            <Check size={13} color="#161e00" strokeWidth={2.5} />
          </View>
        </TouchableOpacity>

        {/* OTP Input Card */}
        <Pressable
          style={styles.otpCard}
          onPress={() => {
            hiddenInputRef.current?.focus();
            setActiveIndex(digits.findIndex((d) => d === '') !== -1 ? digits.findIndex((d) => d === '') : 5);
          }}
        >
          <View style={styles.otpBoxesRow}>
            {/* Group 1: Digits 0, 1, 2 */}
            <View style={styles.otpGroup}>
              {[0, 1, 2].map((idx) => {
                const isSelected = activeIndex === idx;
                const val = digits[idx];
                return (
                  <TouchableOpacity
                    key={`digit-${idx}`}
                    style={[
                      styles.digitBox,
                      isSelected && styles.digitBoxActive,
                    ]}
                    onPress={() => {
                      setActiveIndex(idx);
                      hiddenInputRef.current?.focus();
                    }}
                    activeOpacity={0.85}
                  >
                    {val ? (
                      <Text style={styles.digitText}>{val}</Text>
                    ) : isSelected ? (
                      <Animated.View style={[styles.caret, { opacity: caretOpacity }]} />
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Dot Divider */}
            <View style={styles.dotDivider}>
              <View style={styles.dotCircle} />
            </View>

            {/* Group 2: Digits 3, 4, 5 */}
            <View style={styles.otpGroup}>
              {[3, 4, 5].map((idx) => {
                const isSelected = activeIndex === idx;
                const val = digits[idx];
                return (
                  <TouchableOpacity
                    key={`digit-${idx}`}
                    style={[
                      styles.digitBox,
                      isSelected && styles.digitBoxActive,
                    ]}
                    onPress={() => {
                      setActiveIndex(idx);
                      hiddenInputRef.current?.focus();
                    }}
                    activeOpacity={0.85}
                  >
                    {val ? (
                      <Text style={styles.digitText}>{val}</Text>
                    ) : isSelected ? (
                      <Animated.View style={[styles.caret, { opacity: caretOpacity }]} />
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Resend & Circular Timer Row */}
          <View style={styles.resendRow}>
            <View style={styles.timerLeft}>
              <View style={styles.timerSvgWrap}>
                <Svg width={24} height={24} viewBox="0 0 24 24" style={styles.timerSvg}>
                  <Circle
                    cx="12"
                    cy="12"
                    r="9"
                    stroke="#e2e3e1"
                    strokeWidth="2"
                    fill="none"
                  />
                  <Circle
                    cx="12"
                    cy="12"
                    r="9"
                    stroke="#516600"
                    strokeWidth="2"
                    strokeDasharray={`${circumference}`}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    fill="none"
                  />
                </Svg>
                <Clock size={11} color="#516600" style={styles.timerCenterIcon} />
              </View>

              {secondsLeft > 0 ? (
                <Text style={styles.resendTimerText}>
                  Resend in <Text style={styles.resendTimerBold}>0:{secondsLeft < 10 ? `0${secondsLeft}` : secondsLeft}</Text>
                </Text>
              ) : (
                <TouchableOpacity onPress={() => handleResend(false)}>
                  <Text style={styles.resendLink}>Resend Code</Text>
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              onPress={() => handleResend(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.whatsAppLink}>Resend via WhatsApp</Text>
            </TouchableOpacity>
          </View>
        </Pressable>

        {/* Primary Action Button */}
        <TouchableOpacity
          style={styles.verifyButton}
          onPress={() => handleVerify()}
          activeOpacity={0.9}
          disabled={verifying}
        >
          <Text style={styles.verifyButtonText}>
            {verifying ? 'VERIFYING...' : 'VERIFY & CONTINUE'}
          </Text>
          <View style={styles.verifyArrowCircle}>
            <ArrowUpRight size={20} color="#f0f1ef" />
          </View>
        </TouchableOpacity>

        {/* Error State Micro-Card */}
        {hasError && (
          <View style={styles.errorCard}>
            <View style={styles.errorHeaderRow}>
              <View style={styles.errorTitleLeft}>
                <AlertCircle size={18} color="#ba1a1a" />
                <Text style={styles.errorTitleText}>Invalid Code</Text>
              </View>
              <Text style={styles.errorAttemptsText}>{attemptsLeft} attempts left</Text>
            </View>

            {/* Mini preview boxes in error tone */}
            <View style={styles.errorMiniBoxesRow}>
              {lastFailedCode.split('').map((char, i) => (
                <React.Fragment key={`err-digit-${i}`}>
                  {i === 3 && <View style={styles.errorDot} />}
                  <View style={styles.errorMiniBox}>
                    <Text style={styles.errorMiniBoxText}>{char}</Text>
                  </View>
                </React.Fragment>
              ))}
            </View>

            <Text style={styles.errorMessageText}>
              Numbers do not match the SMS token. Check and retry.
            </Text>
          </View>
        )}

        {/* On-Screen Field Keypad Dock */}
        <View style={styles.keypadCard}>
          <View style={styles.keypadGrid}>
            {/* Key 1 */}
            <TouchableOpacity
              style={styles.keyButton}
              onPress={() => handleKeyPress('1')}
              activeOpacity={0.7}
            >
              <Text style={styles.keyNumber}>1</Text>
            </TouchableOpacity>

            {/* Key 2 */}
            <TouchableOpacity
              style={styles.keyButton}
              onPress={() => handleKeyPress('2')}
              activeOpacity={0.7}
            >
              <Text style={styles.keyNumber}>2</Text>
              <Text style={styles.keySubLetters}>ABC</Text>
            </TouchableOpacity>

            {/* Key 3 */}
            <TouchableOpacity
              style={styles.keyButton}
              onPress={() => handleKeyPress('3')}
              activeOpacity={0.7}
            >
              <Text style={styles.keyNumber}>3</Text>
              <Text style={styles.keySubLetters}>DEF</Text>
            </TouchableOpacity>

            {/* Key 4 */}
            <TouchableOpacity
              style={styles.keyButton}
              onPress={() => handleKeyPress('4')}
              activeOpacity={0.7}
            >
              <Text style={styles.keyNumber}>4</Text>
              <Text style={styles.keySubLetters}>GHI</Text>
            </TouchableOpacity>

            {/* Key 5 */}
            <TouchableOpacity
              style={styles.keyButton}
              onPress={() => handleKeyPress('5')}
              activeOpacity={0.7}
            >
              <Text style={styles.keyNumber}>5</Text>
              <Text style={styles.keySubLetters}>JKL</Text>
            </TouchableOpacity>

            {/* Key 6 */}
            <TouchableOpacity
              style={styles.keyButton}
              onPress={() => handleKeyPress('6')}
              activeOpacity={0.7}
            >
              <Text style={styles.keyNumber}>6</Text>
              <Text style={styles.keySubLetters}>MNO</Text>
            </TouchableOpacity>

            {/* Key 7 */}
            <TouchableOpacity
              style={styles.keyButton}
              onPress={() => handleKeyPress('7')}
              activeOpacity={0.7}
            >
              <Text style={styles.keyNumber}>7</Text>
              <Text style={styles.keySubLetters}>PQRS</Text>
            </TouchableOpacity>

            {/* Key 8 */}
            <TouchableOpacity
              style={styles.keyButton}
              onPress={() => handleKeyPress('8')}
              activeOpacity={0.7}
            >
              <Text style={styles.keyNumber}>8</Text>
              <Text style={styles.keySubLetters}>TUV</Text>
            </TouchableOpacity>

            {/* Key 9 */}
            <TouchableOpacity
              style={styles.keyButton}
              onPress={() => handleKeyPress('9')}
              activeOpacity={0.7}
            >
              <Text style={styles.keyNumber}>9</Text>
              <Text style={styles.keySubLetters}>WXYZ</Text>
            </TouchableOpacity>

            {/* Biometric Key */}
            <TouchableOpacity
              style={[styles.keyButton, styles.keyTransparent]}
              onPress={handleBiometricAuth}
              activeOpacity={0.7}
            >
              <Fingerprint size={22} color="#757965" />
            </TouchableOpacity>

            {/* Key 0 */}
            <TouchableOpacity
              style={styles.keyButton}
              onPress={() => handleKeyPress('0')}
              activeOpacity={0.7}
            >
              <Text style={styles.keyNumber}>0</Text>
            </TouchableOpacity>

            {/* Backspace Key */}
            <TouchableOpacity
              style={[styles.keyButton, styles.keyTransparent]}
              onPress={handleBackspace}
              activeOpacity={0.7}
            >
              <Delete size={22} color="#757965" />
            </TouchableOpacity>
          </View>

          {/* Bottom Home Indicator Pill */}
          <View style={styles.homeIndicatorWrap}>
            <View style={styles.homeIndicatorBar} />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f9faf8',
  },
  bgSvg: {
    opacity: 0.5,
  },
  hiddenInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0.01,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: 'rgba(249, 250, 248, 0.95)',
    zIndex: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: 'Manrope',
    fontSize: 18,
    fontWeight: '600',
    color: '#191c1b',
    letterSpacing: -0.2,
  },
  avatarCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#516600',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
    gap: 16,
  },
  headlineContainer: {
    gap: 6,
    paddingTop: 4,
  },
  displayHero: {
    fontFamily: 'Manrope',
    fontSize: 27,
    fontWeight: '300',
    textTransform: 'uppercase',
    color: '#191c1b',
    letterSpacing: 2.2,
  },
  subRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  subText: {
    fontFamily: 'Manrope',
    fontSize: 14,
    color: '#454937',
  },
  subPhone: {
    fontFamily: 'Manrope',
    fontSize: 14,
    fontWeight: '700',
    color: '#191c1b',
  },
  changePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d8e7d4',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
    gap: 3,
  },
  changePillText: {
    fontFamily: 'Manrope',
    fontSize: 11,
    fontWeight: '700',
    color: '#131e13',
  },
  autoFillBanner: {
    backgroundColor: 'rgba(211, 225, 166, 0.45)',
    borderRadius: 9999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  autoFillLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  autoFillIconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#516600',
    alignItems: 'center',
    justifyContent: 'center',
  },
  autoFillText: {
    fontFamily: 'Manrope',
    fontSize: 12.5,
    fontWeight: '600',
    color: '#191c1b',
    flex: 1,
  },
  autoFillCheckCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#c6e85a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 18,
    alignItems: 'center',
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  otpBoxesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    width: '100%',
  },
  otpGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  digitBox: {
    width: 44,
    height: 56,
    borderRadius: 8,
    backgroundColor: '#f3f4f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  digitBoxActive: {
    backgroundColor: 'rgba(198, 232, 90, 0.25)',
    borderWidth: 1.5,
    borderColor: '#516600',
    shadowColor: '#516600',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  digitText: {
    fontFamily: 'Manrope',
    fontSize: 22,
    fontWeight: '700',
    color: '#191c1b',
  },
  caret: {
    width: 2,
    height: 24,
    backgroundColor: '#516600',
    borderRadius: 1,
  },
  dotDivider: {
    width: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotCircle: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#c5c9b1',
  },
  resendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingTop: 4,
  },
  timerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timerSvgWrap: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerSvg: {
    transform: [{ rotate: '-90deg' }],
  },
  timerCenterIcon: {
    position: 'absolute',
  },
  resendTimerText: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: '#757965',
  },
  resendTimerBold: {
    fontFamily: 'Manrope',
    fontWeight: '700',
    color: '#191c1b',
  },
  resendLink: {
    fontFamily: 'Manrope',
    fontSize: 12,
    fontWeight: '700',
    color: '#516600',
  },
  whatsAppLink: {
    fontFamily: 'Manrope',
    fontSize: 13,
    fontWeight: '600',
    color: '#516600',
  },
  verifyButton: {
    height: 56,
    borderRadius: 28,
    backgroundColor: '#C6E85A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 22,
    paddingRight: 6,
    shadowColor: '#516600',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 3,
  },
  verifyButtonText: {
    fontFamily: 'Manrope',
    fontSize: 15,
    fontWeight: '700',
    color: '#161e00',
    letterSpacing: 1.2,
  },
  verifyArrowCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2e3130',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorCard: {
    backgroundColor: 'rgba(255, 218, 214, 0.55)',
    borderRadius: 16,
    padding: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(186, 26, 26, 0.2)',
  },
  errorHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  errorTitleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  errorTitleText: {
    fontFamily: 'Manrope',
    fontSize: 13,
    fontWeight: '700',
    color: '#ba1a1a',
  },
  errorAttemptsText: {
    fontFamily: 'Manrope',
    fontSize: 12,
    fontWeight: '600',
    color: '#93000a',
  },
  errorMiniBoxesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 4,
  },
  errorMiniBox: {
    width: 32,
    height: 36,
    borderRadius: 6,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  errorMiniBoxText: {
    fontFamily: 'Manrope',
    fontSize: 15,
    fontWeight: '700',
    color: '#ba1a1a',
  },
  errorDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(186, 26, 26, 0.5)',
    marginHorizontal: 2,
  },
  errorMessageText: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: '#93000a',
    textAlign: 'center',
    paddingTop: 2,
  },
  keypadCard: {
    backgroundColor: '#ffffff',
    borderRadius: 28,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  keypadGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
  },
  keyButton: {
    width: '31%',
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f3f4f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyTransparent: {
    backgroundColor: 'transparent',
  },
  keyNumber: {
    fontFamily: 'Manrope',
    fontSize: 18,
    fontWeight: '600',
    color: '#191c1b',
    lineHeight: 20,
  },
  keySubLetters: {
    fontFamily: 'Manrope',
    fontSize: 9,
    fontWeight: '700',
    color: '#757965',
    letterSpacing: 0.8,
  },
  homeIndicatorWrap: {
    width: '100%',
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 2,
  },
  homeIndicatorBar: {
    width: 120,
    height: 4,
    backgroundColor: '#e2e3e1',
    borderRadius: 2,
  },
});
