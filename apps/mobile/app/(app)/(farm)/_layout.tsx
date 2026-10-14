import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import {
  LayoutDashboard,
  LineChart,
  Sliders,
  Calendar,
  Bell,
  ArrowLeft,
} from 'lucide-react-native';
import { useActiveFarm } from '../../../src/context/FarmContext';
import { useUnacknowledgedAlerts } from '../../../src/hooks/useAlerts';
import { colors } from '../../../src/theme/colors';

export default function FarmTabsLayout() {
  const router = useRouter();
  const { activeFarm } = useActiveFarm();
  const { unacknowledgedCount } = useUnacknowledgedAlerts(activeFarm?.id);

  const badgeValue =
    unacknowledgedCount > 0 ? (unacknowledgedCount > 9 ? '9+' : unacknowledgedCount) : undefined;

  const handleBackToFarms = () => {
    router.replace('/(app)/farms');
  };

  return (
    <Tabs
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.card,
        },
        headerTintColor: colors.primaryDark,
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 18,
        },
        headerLeft: () => (
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBackToFarms}
            accessibilityLabel="Back to Farms"
          >
            <ArrowLeft size={22} color={colors.primaryDark} />
          </TouchableOpacity>
        ),
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.borderLight,
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          headerTitle: activeFarm?.name ?? 'Farm Dashboard',
          tabBarIcon: ({ color, size }) => <LayoutDashboard size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: 'Analytics',
          headerTitle: 'Analytics',
          tabBarIcon: ({ color, size }) => <LineChart size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="controls"
        options={{
          title: 'Controls',
          headerTitle: 'Actuator Controls',
          tabBarIcon: ({ color, size }) => <Sliders size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          title: 'Schedule',
          headerTitle: 'Irrigation Schedules',
          tabBarIcon: ({ color, size }) => <Calendar size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          title: 'Alerts',
          headerTitle: 'Alerts & Incidents',
          tabBarBadge: badgeValue,
          tabBarBadgeStyle: {
            backgroundColor: colors.error,
            fontSize: 10,
            fontWeight: '700',
          },
          tabBarIcon: ({ color, size }) => <Bell size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="schedule-edit"
        options={{
          href: null,
          title: 'Schedule',
          headerTitle: 'Schedule Details',
          tabBarStyle: { display: 'none' },
          headerLeft: () => (
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              accessibilityLabel="Back to Schedules"
            >
              <ArrowLeft size={22} color={colors.primaryDark} />
            </TouchableOpacity>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  backButton: {
    marginLeft: 16,
    padding: 6,
    borderRadius: 8,
  },
});
