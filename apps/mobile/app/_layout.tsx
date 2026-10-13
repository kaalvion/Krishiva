import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AlertTriangle } from 'lucide-react-native';
import { AuthProvider } from '../src/hooks/useAuth';
import { FarmProvider } from '../src/context/FarmContext';
import { getMissingEnvVars } from '../src/config/env';
import { colors } from '../src/theme/colors';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 30,
    },
  },
});

export default function RootLayout() {
  const missingEnvVars = getMissingEnvVars();

  if (missingEnvVars.length > 0) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.missingEnvContainer}>
          <StatusBar style="dark" />
          <ScrollView contentContainerStyle={styles.missingEnvContent}>
            <View style={styles.missingEnvIconCircle}>
              <AlertTriangle size={40} color={colors.warning} />
            </View>
            <Text style={styles.missingEnvTitle}>Configuration Required</Text>
            <Text style={styles.missingEnvSubtitle}>
              Krishiva requires configuration variables to connect to Firebase and the backend.
              Please add the following variables to{' '}
              <Text style={styles.boldText}>apps/mobile/.env</Text>:
            </Text>
            <View style={styles.missingEnvList}>
              {missingEnvVars.map((varName) => (
                <View key={varName} style={styles.missingEnvItem}>
                  <Text style={styles.missingEnvBullet}>•</Text>
                  <Text style={styles.missingEnvVarName}>{varName}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.missingEnvHelp}>
              You can copy <Text style={styles.boldText}>apps/mobile/.env.example</Text> to get started.
            </Text>
          </ScrollView>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <FarmProvider>
            <StatusBar style="dark" />
            <Stack screenOptions={{ headerShown: false }} />
          </FarmProvider>
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  missingEnvContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  missingEnvContent: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100%',
  },
  missingEnvIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFF3E0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  missingEnvTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 10,
    textAlign: 'center',
  },
  missingEnvSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  missingEnvList: {
    width: '100%',
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 20,
  },
  missingEnvItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  missingEnvBullet: {
    fontSize: 18,
    color: colors.warning,
    marginRight: 8,
  },
  missingEnvVarName: {
    fontSize: 13,
    color: colors.text,
    fontFamily: 'monospace',
    fontWeight: '600',
  },
  missingEnvHelp: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
  },
  boldText: {
    fontWeight: '700',
    color: colors.text,
  },
});
