import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AlertCircle, RefreshCw } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { Button } from './Button';
import { env } from '../config/env';

interface ErrorViewProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retrying?: boolean;
}

export const ErrorView: React.FC<ErrorViewProps> = ({
  title = 'Unable to Connect',
  message = 'Could not load data from the server. Please verify the backend is running.',
  onRetry,
  retrying = false,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <AlertCircle size={36} color={colors.error} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>

      {onRetry ? (
        <Button
          title="Retry Connection"
          variant="primary"
          loading={retrying}
          onPress={onRetry}
          icon={<RefreshCw size={18} color={colors.textInverse} />}
          style={styles.retryButton}
        />
      ) : null}

      {__DEV__ && env.apiUrl ? (
        <Text style={styles.debugText}>API Endpoint: {env.apiUrl}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: colors.background,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.errorSurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    maxWidth: 320,
  },
  retryButton: {
    width: '100%',
    maxWidth: 240,
  },
  debugText: {
    marginTop: 24,
    fontSize: 11,
    color: colors.textMuted,
    fontFamily: 'monospace',
    textAlign: 'center',
  },
});
