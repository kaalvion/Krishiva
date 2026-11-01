import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import {
  ArrowLeft,
  ArrowUpRight,
  Volume2,
  Play,
  Square,
  Check,
  CheckCircle2,
  User,
  Languages,
} from 'lucide-react-native';
import { useLanguage, type SupportedLanguage } from '../../../src/context/LanguageContext';

interface LanguageOption {
  code: SupportedLanguage;
  script: string;
  nativeName: string;
  englishName: string;
  previewQuote: string;
  previewDesc: string;
  previewBadge: string;
}

const LANGUAGES: LanguageOption[] = [
  {
    code: 'en',
    script: 'EN',
    nativeName: 'English',
    englishName: 'English',
    previewQuote: 'This app will be in your language',
    previewDesc: 'All alerts, voice updates, and automated pump controls will be in English.',
    previewBadge: 'VOICE ASSIST ENABLED',
  },
  {
    code: 'hi',
    script: 'हि',
    nativeName: 'हिन्दी',
    englishName: 'Hindi',
    previewQuote: 'यह ऐप आपकी भाषा में काम करेगा',
    previewDesc: 'सभी सूचनाएं, वॉयस अलर्ट और स्वचालित पंप नियंत्रण हिन्दी में उपलब्ध होंगे।',
    previewBadge: 'ऑडियो सहायता सक्रिय',
  },
  {
    code: 'mr',
    script: 'म',
    nativeName: 'मराठी',
    englishName: 'Marathi',
    previewQuote: 'हे अॅप तुमच्या भाषेत असेल',
    previewDesc: 'सर्व सूचना, व्हॉइस अ‍ॅलर्ट आणि स्वयंचलित पंप नियंत्रणे मराठीत उपलब्ध असतील.',
    previewBadge: 'ऑडिओ सहाय्य उपलब्ध',
  },
  {
    code: 'ta',
    script: 'த',
    nativeName: 'தமிழ்',
    englishName: 'Tamil',
    previewQuote: 'இந்த செயலி உங்கள் மொழியில் இயங்கும்',
    previewDesc: 'அனைத்து எச்சரிக்கைகளும், குரல் வழிகாட்டுதலும் தமிழில் கிடைக்கும்.',
    previewBadge: 'குரல் உதவி உள்ளது',
  },
  {
    code: 'te',
    script: 'తె',
    nativeName: 'తెలుగు',
    englishName: 'Telugu',
    previewQuote: 'ఈ యాప్ మీ భాషలో పనిచేస్తుంది',
    previewDesc: 'అన్ని హెచ్చరికలు మరియు ఆటోమేటెడ్ పంప్ కంట్రోల్స్ తెలుగులో అందుబాటులో ఉంటాయి.',
    previewBadge: 'వాయిస్ సహాయం సిద్ధంగా ఉంది',
  },
  {
    code: 'pa',
    script: 'ਪੰ',
    nativeName: 'ਪੰਜਾਬੀ',
    englishName: 'Punjabi',
    previewQuote: 'ਇਹ ਐਪ ਤੁਹਾਡੀ ਭਾਸ਼ਾ ਵਿੱਚ ਹੋਵੇਗਾ',
    previewDesc: 'ਸਾਰੇ ਅਲਰਟ, ਵੌਇਸ ਅੱਪਡੇਟ ਅਤੇ ਆਟੋਮੇਟਿਡ ਪੰਪ ਕੰਟਰੋਲ ਪੰਜਾਬੀ ਵਿੱਚ ਹੋਣਗੇ।',
    previewBadge: 'ਆਵਾਜ਼ ਸਹਾਇਤਾ ਉਪਲਬਧ',
  },
  {
    code: 'bn',
    script: 'বা',
    nativeName: 'বাংলা',
    englishName: 'Bengali',
    previewQuote: 'এই অ্যাপটি আপনার ভাষায় থাকবে',
    previewDesc: 'সমস্ত সতর্কতা, ভয়েস আপডেট এবং স্বয়ংক্রিয় পাম্প নিয়ন্ত্রণ বাংলায় থাকবে।',
    previewBadge: 'ভয়েস সহায়তা সক্রিয়',
  },
];

export default function LanguageScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { language, changeLanguage } = useLanguage();

  const [selectedCode, setSelectedCode] = useState<SupportedLanguage>(language);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const toastAnim = useRef(new Animated.Value(-60)).current;
  const audioTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync initial language if changed externally
  useEffect(() => {
    setSelectedCode(language);
  }, [language]);

  // Clean up audio playback timer on unmount
  useEffect(() => {
    return () => {
      if (audioTimerRef.current) {
        clearTimeout(audioTimerRef.current);
      }
    };
  }, []);

  const activeLang =
    LANGUAGES.find((l) => l.code === selectedCode) || LANGUAGES[0];

  const handleSelectLanguage = (item: LanguageOption) => {
    setSelectedCode(item.code);
    // If playing audio, restart simulation
    if (isPlayingAudio) {
      if (audioTimerRef.current) clearTimeout(audioTimerRef.current);
      setIsPlayingAudio(false);
    }
  };

  const toggleAudio = () => {
    if (isPlayingAudio) {
      if (audioTimerRef.current) clearTimeout(audioTimerRef.current);
      setIsPlayingAudio(false);
    } else {
      setIsPlayingAudio(true);
      audioTimerRef.current = setTimeout(() => {
        setIsPlayingAudio(false);
      }, 2600);
    }
  };

  const showToast = (message: string) => {
    setToastMessage(message);
    Animated.sequence([
      Animated.timing(toastAnim, {
        toValue: 20,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.delay(1200),
      Animated.timing(toastAnim, {
        toValue: -60,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setToastMessage(null);
    });
  };

  const handleApply = async () => {
    try {
      await changeLanguage(selectedCode);
      showToast(`Language set to ${activeLang.nativeName}`);
      setTimeout(() => {
        router.back();
      }, 800);
    } catch {
      router.back();
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
          <Text style={styles.topAppTitle}>Language Selection</Text>
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

      {/* 2. SCROLLABLE CONTENT */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Topographic Background Curves */}
        <Svg
          style={StyleSheet.absoluteFill}
          viewBox="0 0 390 844"
          fill="none"
          pointerEvents="none"
        >
          <Path
            d="M-60 120C20 110 120 180 220 140C320 100 380 170 450 160"
            stroke="#c5c9b1"
            strokeDasharray="3 3"
            strokeWidth={0.8}
            opacity={0.35}
          />
          <Path
            d="M-40 210C60 190 140 270 260 220C380 170 410 260 460 240"
            stroke="#c5c9b1"
            strokeWidth={0.8}
            opacity={0.3}
          />
          <Path
            d="M-50 340C40 310 110 400 240 330C370 260 400 370 470 350"
            stroke="#c5c9b1"
            strokeDasharray="4 2"
            strokeWidth={0.8}
            opacity={0.3}
          />
          <Path
            d="M-20 490C70 460 160 520 270 470C380 420 410 500 460 480"
            stroke="#c5c9b1"
            strokeWidth={0.8}
            opacity={0.25}
          />
          <Path
            d="M-40 640C50 610 130 690 250 630C370 570 420 660 470 650"
            stroke="#c5c9b1"
            strokeDasharray="3 3"
            strokeWidth={0.8}
            opacity={0.25}
          />
        </Svg>

        {/* Multilingual Telemetry Banner */}
        <View style={styles.infoBanner}>
          <View style={styles.infoIconWrap}>
            <Volume2 size={18} color="#161e00" />
          </View>
          <View style={styles.infoTextCol}>
            <Text style={styles.infoTag}>MULTILINGUAL TELEMETRY</Text>
            <Text style={styles.infoDescription}>
              Select your preferred language for voice alerts, telemetry updates, and farm automation guides.
            </Text>
          </View>
        </View>

        {/* Languages List */}
        <View style={styles.languageList}>
          {LANGUAGES.map((item) => {
            const isSelected = selectedCode === item.code;

            return (
              <TouchableOpacity
                key={item.code}
                style={[
                  styles.langCard,
                  isSelected && styles.langCardSelected,
                ]}
                activeOpacity={0.85}
                onPress={() => handleSelectLanguage(item)}
              >
                <View style={styles.langLeftGroup}>
                  {/* Script Badge */}
                  <View
                    style={[
                      styles.scriptCircle,
                      isSelected && styles.scriptCircleSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.scriptText,
                        isSelected && styles.scriptTextSelected,
                      ]}
                    >
                      {item.script}
                    </Text>
                  </View>

                  {/* Names */}
                  <View style={styles.langNamesCol}>
                    <View style={styles.langTitleRow}>
                      <Text
                        style={[
                          styles.nativeNameText,
                          isSelected && styles.nativeNameTextSelected,
                        ]}
                      >
                        {item.nativeName}
                      </Text>
                      {isSelected && (
                        <View style={styles.selectedPill}>
                          <Text style={styles.selectedPillText}>SELECTED</Text>
                        </View>
                      )}
                    </View>
                    <Text
                      style={[
                        styles.englishNameText,
                        isSelected && styles.englishNameTextSelected,
                      ]}
                    >
                      {item.englishName}
                    </Text>
                  </View>
                </View>

                {/* Right Radio Indicator */}
                <View
                  style={[
                    styles.radioIndicator,
                    isSelected && styles.radioIndicatorSelected,
                  ]}
                >
                  {isSelected ? (
                    <Check size={14} color="#c6e85a" strokeWidth={3} />
                  ) : (
                    <View style={styles.radioDotEmpty} />
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Live Interface Preview Card */}
        <View style={styles.previewCard}>
          <View style={styles.previewHeaderRow}>
            <View style={styles.previewLabelGroup}>
              <Languages size={16} color="#516600" />
              <Text style={styles.previewLabelText}>
                INTERFACE PREVIEW • {activeLang.nativeName}
              </Text>
            </View>

            <View style={styles.previewBadge}>
              <CheckCircle2 size={12} color="#516600" />
              <Text style={styles.previewBadgeText}>{activeLang.previewBadge}</Text>
            </View>
          </View>

          <View style={styles.previewContentCol}>
            <Text style={styles.previewQuoteText}>{activeLang.previewQuote}</Text>
            <Text style={styles.previewDescriptionText}>{activeLang.previewDesc}</Text>
          </View>

          {/* Sample Voice Prompt Row */}
          <View style={styles.voicePromptRow}>
            <View style={styles.voicePromptLeft}>
              <Volume2 size={18} color="#516600" />
              <Text style={styles.voicePromptLabel}>
                {isPlayingAudio ? 'Playing simulated voice...' : 'Sample Voice Prompt'}
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.voicePlayBtn,
                isPlayingAudio && styles.voicePlayBtnActive,
              ]}
              activeOpacity={0.8}
              onPress={toggleAudio}
              accessibilityLabel="Play voice sample"
            >
              {isPlayingAudio ? (
                <Square size={13} color="#ffffff" fill="#ffffff" />
              ) : (
                <Play size={13} color="#191c1b" fill="#191c1b" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* 3. STICKY BOTTOM APPLY BAR */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom > 0 ? insets.bottom : 16 }]}>
        <TouchableOpacity
          style={styles.applyBtn}
          activeOpacity={0.9}
          onPress={handleApply}
        >
          <Text style={styles.applyBtnText}>APPLY LANGUAGE</Text>
          <View style={styles.applyArrowCircle}>
            <ArrowUpRight size={20} color="#c6e85a" strokeWidth={2.5} />
          </View>
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
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 18,
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
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
    color: '#f0f1ef',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 16,
  },

  /* Info Banner */
  infoBanner: {
    backgroundColor: '#f3f4f2',
    borderRadius: 20,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  infoIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#c6e85a',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  infoTextCol: {
    flex: 1,
  },
  infoTag: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
    letterSpacing: 0.8,
    color: '#576334',
    textTransform: 'uppercase',
  },
  infoDescription: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    color: '#556253',
    lineHeight: 18,
    marginTop: 2,
  },

  /* Language List */
  languageList: {
    gap: 10,
  },
  langCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    minHeight: 60,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#1e2a1e',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  langCardSelected: {
    backgroundColor: '#c6e85a',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  langLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  scriptCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#edeeec',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scriptCircleSelected: {
    backgroundColor: '#131e13',
  },
  scriptText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 14,
    color: '#556253',
  },
  scriptTextSelected: {
    color: '#c6e85a',
  },
  langNamesCol: {
    flex: 1,
  },
  langTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nativeNameText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 15,
    color: '#191c1b',
  },
  nativeNameTextSelected: {
    fontFamily: 'Manrope_700Bold',
    color: '#131e13',
  },
  selectedPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  selectedPillText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 9,
    letterSpacing: 0.5,
    color: '#191c1b',
  },
  englishNameText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    color: '#556253',
    marginTop: 1,
  },
  englishNameTextSelected: {
    color: '#3c4d00',
  },
  radioIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#e7e8e6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioIndicatorSelected: {
    backgroundColor: '#131e13',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  radioDotEmpty: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'transparent',
  },

  /* Preview Card */
  previewCard: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    padding: 16,
    shadowColor: '#1e2a1e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    gap: 12,
  },
  previewHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  previewLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  previewLabelText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
    letterSpacing: 0.8,
    color: '#576334',
    textTransform: 'uppercase',
  },
  previewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#d8e7d4',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  previewBadgeText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10,
    color: '#131e13',
  },
  previewContentCol: {
    gap: 4,
  },
  previewQuoteText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 17,
    color: '#191c1b',
    letterSpacing: -0.3,
  },
  previewDescriptionText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    color: '#556253',
    lineHeight: 18,
  },
  voicePromptRow: {
    backgroundColor: '#f3f4f2',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  voicePromptLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  voicePromptLabel: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
    color: '#191c1b',
  },
  voicePlayBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#e2e3e1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  voicePlayBtnActive: {
    backgroundColor: '#516600',
  },

  /* Bottom Bar */
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(249, 250, 248, 0.95)',
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  applyBtn: {
    height: 56,
    borderRadius: 28,
    backgroundColor: '#c6e85a',
    paddingLeft: 24,
    paddingRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#516600',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  applyBtnText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 13,
    letterSpacing: 1.2,
    color: '#131e13',
  },
  applyArrowCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#131e13',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
