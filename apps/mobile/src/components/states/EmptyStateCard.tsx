import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  type ViewStyle,
} from 'react-native';
import { Router } from 'lucide-react-native';

export interface EmptyStateCardProps {
  icon?: React.ReactNode;
  title: string;
  subtitle: string;
  buttonText?: string;
  badgeText?: string;
  onPress?: () => void;
  style?: ViewStyle;
  fullWidth?: boolean;
}

export function EmptyStateCard({
  icon,
  title,
  subtitle,
  buttonText,
  badgeText,
  onPress,
  style,
  fullWidth = false,
}: EmptyStateCardProps) {
  return (
    <View style={[styles.card, fullWidth && styles.cardFullWidth, style]}>
      {/* Icon Circle */}
      <View style={styles.iconCircle}>
        {icon || <Router size={22} color="#516600" />}
      </View>

      {/* Text Info */}
      <View style={styles.textCol}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle} numberOfLines={2}>
          {subtitle}
        </Text>
      </View>

      {/* Button Action or Badge */}
      {buttonText && onPress ? (
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={onPress}
          activeOpacity={0.8}
        >
          <Text style={styles.actionBtnText}>{buttonText}</Text>
        </TouchableOpacity>
      ) : badgeText ? (
        <View style={styles.badgePill}>
          <Text style={styles.badgePillText}>{badgeText}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 14,
    shadowColor: '#1e2a1e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 2,
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 180,
    flex: 1,
  },
  cardFullWidth: {
    width: '100%',
    flex: undefined,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f3f4f2',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  textCol: {
    alignItems: 'center',
    gap: 4,
    marginVertical: 8,
    paddingHorizontal: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#191c1b',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 12,
    color: '#757965',
    textAlign: 'center',
    lineHeight: 16,
  },
  actionBtn: {
    width: '100%',
    backgroundColor: '#c6e85a',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#516600',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 1,
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#161e00',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  badgePill: {
    width: '100%',
    backgroundColor: '#dbe9ae',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#161e00',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});
