import React from 'react';
import { Redirect, Stack } from 'expo-router';
import { useAuth } from '../../src/hooks/useAuth';
import { LoadingView } from '../../src/components/LoadingView';
import { colors } from '../../src/theme/colors';

export const unstable_settings = {
  initialRouteName: 'farms',
};

export default function AppLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingView label="Authenticating session..." />;
  }

  if (!user) {
    return <Redirect href="/(auth)/onboarding" />;
  }

  return (
    <Stack
      initialRouteName="farms"
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.card,
        },
        headerTintColor: colors.primaryDark,
        headerTitleStyle: {
          fontWeight: '700',
        },
        contentStyle: {
          backgroundColor: colors.background,
        },
      }}
    >
      <Stack.Screen
        name="farms"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="create-farm"
        options={{
          title: 'Add New Farm',
          headerBackTitle: 'Farms',
        }}
      />
      <Stack.Screen
        name="scan-device"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="confirm-device"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="name-relays"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="(farm)"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
}
