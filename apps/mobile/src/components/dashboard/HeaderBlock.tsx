import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Bell } from 'lucide-react-native';
import { useLanguage, type SupportedLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../hooks/useAuth';
import { colors } from '../../theme/colors';

interface HeaderBlockProps {
  farmName?: string;
  hasUnreadAlerts?: boolean;
}

const AVATAR_URL =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDQ63FMOA9S_n5EasH3SBr3elRLBYksOIanFHe3xvz_H5_ibLcQf5SFxZ571B27nRwVP6kkY8fffSVGUUvgLbDQCDSiGgT9K_TIB8P7EmkAzlWxdQyA9TNtA1zyMsGs3mNAjenbkezKhd0X0rejSh4mSAly6372knSBYtB57xJc_Oj-cEMsL2mO6LuhC6qfDlGpwu9iv3s1i4iKgWrx7xuU074O0DZMlA1AxPhNkBk';

export const HeaderBlock: React.FC<HeaderBlockProps> = ({ hasUnreadAlerts = true }) => {
  const router = useRouter();
  const { user } = useAuth();
  const { language, changeLanguage } = useLanguage();

  const userName =
    user?.displayName?.split(' ')[0] ||
    user?.email?.split('@')[0]?.toUpperCase() ||
    'RAJESH';

  return (
    <View style={styles.container}>
      {/* 1. Header Row matching Stitch HTML */}
      <View style={styles.headerRow}>
        <View style={styles.titleColumn}>
          {/* Top Brand Pill */}
          <View style={styles.brandRow}>
            <View style={styles.pulseDot} />
            <Text style={styles.brandText}>KRISHIVA PRECISION HUB</Text>
          </View>
          {/* Main Greeting */}
          <Text style={styles.welcomeTitle} numberOfLines={2}>
            WELCOME BACK,{'\n'}{userName}
          </Text>
        </View>

        {/* Action Buttons: Bell & Avatar */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.iconCircleButton}
            onPress={() => router.push('/(app)/(farm)/alerts')}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="View Alerts"
          >
            <Bell size={20} color="#191c1b" />
            {hasUnreadAlerts && <View style={styles.alertDot} />}
          </TouchableOpacity>

          <View style={styles.avatarWrapper}>
            <Image
              source={{ uri: AVATAR_URL }}
              style={styles.avatarImage}
            />
            <View style={styles.onlineBadge}>
              <View style={styles.onlineInnerDot} />
            </View>
          </View>
        </View>
      </View>

      {/* Language Switcher bar */}
      <View style={styles.langPillsRow}>
        {(['en', 'hi', 'mr'] as const).map((lang: SupportedLanguage) => {
          const isSelected = language === lang;
          const label = lang === 'en' ? 'ENGLISH' : lang === 'hi' ? 'हिंदी' : 'मराठी';
          return (
            <TouchableOpacity
              key={lang}
              style={[styles.langPill, isSelected && styles.langPillActive]}
              onPress={() => changeLanguage(lang)}
              activeOpacity={0.7}
            >
              <Text style={[styles.langPillText, isSelected && styles.langPillTextActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: 8,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  titleColumn: {
    flex: 1,
    paddingRight: 8,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#C6E85A',
  },
  brandText: {
    fontSize: 11,
    fontFamily: 'Manrope_700Bold',
    color: '#556253',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  welcomeTitle: {
    fontFamily: 'Manrope_300Light',
    fontSize: 26,
    color: '#191c1b',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    lineHeight: 32,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 2,
  },
  iconCircleButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1E2A1E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f3f4f2',
    position: 'relative',
  },
  alertDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ba1a1a',
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  avatarWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    padding: 2,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1E2A1E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    position: 'relative',
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EDF0EB',
  },
  onlineBadge: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 13,
    height: 13,
    borderRadius: 6.5,
    backgroundColor: '#C6E85A',
    borderWidth: 2,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  onlineInnerDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#1E2A1E',
  },
  langPillsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 2,
  },
  langPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 99,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#EDF0EB',
  },
  langPillActive: {
    backgroundColor: '#C6E85A',
    borderColor: '#C6E85A',
  },
  langPillText: {
    fontSize: 11,
    fontFamily: 'Manrope_600SemiBold',
    color: '#556253',
  },
  langPillTextActive: {
    color: '#1E2A1E',
    fontFamily: 'Manrope_700Bold',
  },
});
