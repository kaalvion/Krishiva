import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import {
  ArrowLeft,
  User,
  Phone,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  Mail,
} from 'lucide-react-native';
import { sendPhoneOtp } from '../../src/services/phoneAuth';

export default function PhoneEntryScreen() {
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState('98765 43210');
  const [loading, setLoading] = useState(false);

  const handlePhoneChange = (text: string) => {
    // Keep only digits
    const cleaned = text.replace(/[^\d]/g, '').slice(0, 10);
    if (cleaned.length > 5) {
      setPhoneNumber(`${cleaned.slice(0, 5)} ${cleaned.slice(5)}`);
    } else {
      setPhoneNumber(cleaned);
    }
  };

  const handleSendOtp = async () => {
    const rawDigits = phoneNumber.replace(/[^\d]/g, '');
    if (rawDigits.length !== 10) {
      Alert.alert('Invalid Number', 'Please enter a valid 10-digit mobile number.');
      return;
    }

    setLoading(true);
    try {
      const fullPhone = `+91 ${phoneNumber.trim()}`;
      const res = await sendPhoneOtp(fullPhone);

      router.push({
        pathname: '/(auth)/otp-verify',
        params: {
          phoneNumber: res.formattedPhone,
          verificationId: res.verificationId,
        },
      });
    } catch (err: unknown) {
      Alert.alert(
        'Dispatch Error',
        err instanceof Error ? err.message : 'Unable to send SMS code. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* Background SVG Contours */}
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
        </Svg>
      </View>

      {/* Header */}
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
          <Text style={styles.headerTitle}>Phone Sign In</Text>
        </View>

        <View style={styles.avatarCircle}>
          <User size={18} color="#ffffff" />
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flex1}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Headline & Context */}
          <View style={styles.headlineContainer}>
            <Text style={styles.displayHero}>ENTER YOUR NUMBER</Text>
            <Text style={styles.subText}>
              We’ll send an SMS with a 6-digit verification code to log you into your Krishiva farm hub.
            </Text>
          </View>

          {/* Smart Auto-Fill Badge */}
          <View style={styles.smartBadge}>
            <View style={styles.smartBadgeLeft}>
              <View style={styles.smartIconCircle}>
                <ShieldCheck size={15} color="#ffffff" />
              </View>
              <Text style={styles.smartBadgeText}>SMS Auto-Retriever & Biometrics Enabled</Text>
            </View>
            <CheckCircle2 size={16} color="#516600" />
          </View>

          {/* Phone Input Card */}
          <View style={styles.inputCard}>
            <Text style={styles.inputLabel}>MOBILE PHONE NUMBER</Text>

            <View style={styles.inputRow}>
              {/* Country Code Pill */}
              <View style={styles.countryPill}>
                <Text style={styles.countryFlag}>🇮🇳</Text>
                <Text style={styles.countryCode}>+91</Text>
              </View>

              {/* Number Input */}
              <View style={styles.phoneInputWrap}>
                <Phone size={18} color="#757965" style={styles.phoneIcon} />
                <TextInput
                  style={styles.phoneInput}
                  value={phoneNumber}
                  onChangeText={handlePhoneChange}
                  keyboardType="number-pad"
                  placeholder="98765 43210"
                  placeholderTextColor="#a2a690"
                  maxLength={11}
                  autoFocus
                />
              </View>
            </View>

            <Text style={styles.inputHint}>
              Carrier SMS charges may apply. Standard one-time verification.
            </Text>
          </View>

          {/* Primary Action Button */}
          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleSendOtp}
            activeOpacity={0.9}
            disabled={loading}
          >
            <Text style={styles.continueButtonText}>
              {loading ? 'SENDING CODE...' : 'CONTINUE & GET OTP'}
            </Text>
            <View style={styles.continueArrowCircle}>
              <ArrowUpRight size={20} color="#f0f1ef" />
            </View>
          </TouchableOpacity>

          {/* Alternate Login Link */}
          <View style={styles.altLoginRow}>
            <Text style={styles.altLoginText}>Prefer email sign in? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
              <Text style={styles.altLoginLink}>Use Password</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f9faf8',
  },
  flex1: {
    flex: 1,
  },
  bgSvg: {
    opacity: 0.5,
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
    paddingTop: 16,
    paddingBottom: 40,
    gap: 20,
  },
  headlineContainer: {
    gap: 6,
    paddingTop: 8,
  },
  displayHero: {
    fontFamily: 'Manrope',
    fontSize: 27,
    fontWeight: '300',
    textTransform: 'uppercase',
    color: '#191c1b',
    letterSpacing: 2.2,
  },
  subText: {
    fontFamily: 'Manrope',
    fontSize: 14,
    color: '#454937',
    lineHeight: 20,
  },
  smartBadge: {
    backgroundColor: 'rgba(211, 225, 166, 0.45)',
    borderRadius: 9999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  smartBadgeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  smartIconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#516600',
    alignItems: 'center',
    justifyContent: 'center',
  },
  smartBadgeText: {
    fontFamily: 'Manrope',
    fontSize: 12.5,
    fontWeight: '600',
    color: '#191c1b',
  },
  inputCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  inputLabel: {
    fontFamily: 'Manrope',
    fontSize: 11,
    fontWeight: '700',
    color: '#757965',
    letterSpacing: 0.8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  countryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f2',
    paddingHorizontal: 12,
    height: 52,
    borderRadius: 12,
    gap: 6,
  },
  countryFlag: {
    fontSize: 18,
  },
  countryCode: {
    fontFamily: 'Manrope',
    fontSize: 15,
    fontWeight: '700',
    color: '#191c1b',
  },
  phoneInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f2',
    height: 52,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  phoneIcon: {
    marginRight: 8,
  },
  phoneInput: {
    flex: 1,
    fontFamily: 'Manrope',
    fontSize: 17,
    fontWeight: '700',
    color: '#191c1b',
  },
  inputHint: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: '#757965',
    lineHeight: 16,
  },
  continueButton: {
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
  continueButtonText: {
    fontFamily: 'Manrope',
    fontSize: 15,
    fontWeight: '700',
    color: '#161e00',
    letterSpacing: 1.2,
  },
  continueArrowCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2e3130',
    alignItems: 'center',
    justifyContent: 'center',
  },
  altLoginRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
  },
  altLoginText: {
    fontFamily: 'Manrope',
    fontSize: 14,
    color: '#757965',
  },
  altLoginLink: {
    fontFamily: 'Manrope',
    fontSize: 14,
    fontWeight: '700',
    color: '#516600',
  },
});
