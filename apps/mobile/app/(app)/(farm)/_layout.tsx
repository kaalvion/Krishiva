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
  Radio,
  User,
} from 'lucide-react-native';
import { useActiveFarm } from '../../../src/context/FarmContext';
import { useLiveAlerts } from '../../../src/hooks/live';
import { colors } from '../../../src/theme/colors';

export const unstable_settings = {
  initialRouteName: 'dashboard',
};

export default function FarmTabsLayout() {
  const router = useRouter();
  const { activeFarm } = useActiveFarm();
  const { unacknowledgedCount } = useLiveAlerts(activeFarm?.id, false);

  const badgeValue =
    unacknowledgedCount > 0 ? (unacknowledgedCount > 9 ? '9+' : unacknowledgedCount) : undefined;

  const handleBackToFarms = () => {
    router.replace('/(app)/farms');
  };

  return (
    <Tabs
      initialRouteName="dashboard"
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
        tabBarActiveTintColor: colors.primaryDark,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontFamily: 'Manrope_600SemiBold',
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
        name="devices"
        options={{
          title: 'Devices',
          headerTitle: 'Connected Devices',
          tabBarIcon: ({ color, size }) => <Radio size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="controls"
        options={{
          headerShown: false,
          title: 'Controls',
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
        name="reports"
        options={{
          headerShown: false,
          title: 'Reports',
          tabBarIcon: ({ color, size }) => <LineChart size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          headerShown: false,
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
        name="profile"
        options={{
          title: 'Profile',
          headerTitle: 'Profile & Settings',
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          href: null,
          title: 'Analytics',
          headerTitle: 'Analytics',
          tabBarIcon: ({ color, size }) => <LineChart size={size} color={color} />,
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
      <Tabs.Screen
        name="language"
        options={{
          href: null,
          headerShown: false,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="device-details"
        options={{
          href: null,
          headerShown: false,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="draw-field"
        options={{
          href: null,
          headerShown: false,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="edit-profile"
        options={{
          href: null,
          headerShown: false,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="farm-map"
        options={{
          href: null,
          headerShown: false,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="help-support"
        options={{
          href: null,
          headerShown: false,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="new-field"
        options={{
          href: null,
          headerShown: false,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="field-details"
        options={{
          href: null,
          headerShown: false,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="notification-settings"
        options={{
          href: null,
          headerShown: false,
          tabBarStyle: { display: 'none' },
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
