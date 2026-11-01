import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  type TouchableOpacityProps,
  type StyleProp,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { colors } from '../theme/colors';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  loading = false,
  variant = 'primary',
  style,
  textStyle,
  disabled,
  icon,
  ...props
}) => {
  const isOutline = variant === 'outline';
  const isSecondary = variant === 'secondary';
  const isDanger = variant === 'danger';

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      disabled={disabled || loading}
      style={[
        styles.base,
        isSecondary && styles.secondary,
        isOutline && styles.outline,
        isDanger && styles.danger,
        (disabled || loading) && styles.disabled,
        style,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={isOutline ? colors.primaryDark : '#1E2A1E'}
        />
      ) : (
        <>
          {icon}
          <Text
            style={[
              styles.text,
              isOutline && styles.textOutline,
              isSecondary && styles.textSecondary,
              isDanger && styles.textDanger,
              icon ? styles.textWithIcon : undefined,
              textStyle,
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    height: 52,
    backgroundColor: '#C6E85A',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    shadowColor: '#1E2A1E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  secondary: {
    backgroundColor: colors.surfaceContainer,
    elevation: 0,
    shadowOpacity: 0,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#C6E85A',
    elevation: 0,
    shadowOpacity: 0,
  },
  danger: {
    backgroundColor: colors.error,
  },
  disabled: {
    opacity: 0.6,
  },
  text: {
    color: '#1E2A1E',
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  textOutline: {
    color: colors.primaryDark,
  },
  textSecondary: {
    color: colors.primaryDark,
  },
  textDanger: {
    color: '#ffffff',
  },
  textWithIcon: {
    marginLeft: 8,
  },
});
