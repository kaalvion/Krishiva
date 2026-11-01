import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Globe } from 'lucide-react-native';
import { useLanguage, type SupportedLanguage } from '../../context/LanguageContext';
import { colors } from '../../theme/colors';

interface HeaderBlockProps {
  greeting?: string;
  farmName: string;
}

export const HeaderBlock: React.FC<HeaderBlockProps> = ({ greeting, farmName }) => {
  const { language, changeLanguage, t } = useLanguage();

  const welcomeText = greeting || `WELCOME TO ${farmName.toUpperCase()}`;

  return (
    <View style={styles.container}>
      {/* Top Welcome Title */}
      <View style={styles.titleWrapper}>
        <Text style={styles.welcomeText} numberOfLines={2}>
          {welcomeText}
        </Text>
        <Text style={styles.farmSub}>{farmName}</Text>
      </View>

      {/* Language Switcher Bar */}
      <View style={styles.langSelectorRow}>
        <View style={styles.langLabelBlock}>
          <Globe size={15} color={colors.primaryDark} />
          <Text style={styles.langLabelText}>{t('common.language')}:</Text>
        </View>
        <View style={styles.langPills}>
          {(['en', 'hi', 'mr'] as const).map((lang: SupportedLanguage) => {
            const isSelected = language === lang;
            const label = lang === 'en' ? 'EN' : lang === 'hi' ? 'HI' : 'MR';
            const fullLabel = lang === 'en' ? 'EN' : lang === 'hi' ? 'हिंदी' : 'मराठी';
            return (
              <TouchableOpacity
                key={lang}
                style={[styles.langPill, isSelected && styles.langPillActive]}
                onPress={() => changeLanguage(lang)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`Change language to ${fullLabel}`}
              >
                <Text style={[styles.langPillText, isSelected && styles.langPillTextActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  titleWrapper: {
    marginBottom: 14,
  },
  welcomeText: {
    fontFamily: 'Manrope_300Light',
    fontSize: 28,
    color: colors.text,
    letterSpacing: -0.5,
    textTransform: 'uppercase',
    lineHeight: 34,
  },
  farmSub: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 2,
  },
  langSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 99,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.borderLight,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 1,
  },
  langLabelBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  langLabelText: {
    fontSize: 12,
    fontFamily: 'Manrope_600SemiBold',
    color: colors.primaryDark,
  },
  langPills: {
    flexDirection: 'row',
    gap: 6,
  },
  langPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 99,
    backgroundColor: '#f3f4f2',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  langPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  langPillText: {
    fontSize: 12,
    fontFamily: 'Manrope_600SemiBold',
    color: colors.textSecondary,
  },
  langPillTextActive: {
    color: colors.primaryDark,
    fontFamily: 'Manrope_700Bold',
  },
});
