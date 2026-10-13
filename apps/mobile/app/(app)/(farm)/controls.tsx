import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Sliders } from 'lucide-react-native';
import { colors } from '../../../src/theme/colors';

export default function ControlsScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Sliders size={44} color={colors.primary} />
      </View>
      <Text style={styles.title}>Actuator Controls</Text>
      <Text style={styles.badge}>Phase 5B • Coming Soon</Text>
      <Text style={styles.description}>
        Remote pump switching, motorized valve controls, and siren triggers via the MQTT pipeline will be accessible here.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: colors.background,
  },
  iconCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  badge: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryDark,
    backgroundColor: colors.primarySurface,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 16,
  },
  description: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 300,
  },
});
