import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
} from 'react-native';
import { Power, PowerOff } from 'lucide-react-native';
import { colors } from '../theme/colors';

export interface ControlButtonProps {
  label: string;
  actionType: 'ON' | 'OFF';
  capability: string;
  disabled?: boolean;
  loading?: boolean;
  onPress: () => void;
}

export function ControlButton({
  label,
  actionType,
  capability,
  disabled = false,
  loading = false,
  onPress,
}: ControlButtonProps) {
  const isON = actionType === 'ON';

  return (
    <TouchableOpacity
      style={[
        styles.button,
        isON ? styles.onButton : styles.offButton,
        disabled && styles.disabledButton,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={isON ? colors.textInverse : colors.textSecondary}
        />
      ) : (
        <View style={styles.contentRow}>
          {isON ? (
            <Power size={15} color={disabled ? colors.textMuted : colors.textInverse} />
          ) : (
            <PowerOff size={15} color={disabled ? colors.textMuted : colors.textSecondary} />
          )}
          <Text
            style={[
              styles.buttonText,
              isON ? styles.onButtonText : styles.offButtonText,
              disabled && styles.disabledText,
            ]}
          >
            {label}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  onButton: {
    backgroundColor: colors.primary,
  },
  offButton: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  disabledButton: {
    backgroundColor: colors.borderLight,
    borderColor: colors.borderLight,
    opacity: 0.6,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  buttonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  onButtonText: {
    color: colors.textInverse,
  },
  offButtonText: {
    color: colors.text,
  },
  disabledText: {
    color: colors.textMuted,
  },
});
