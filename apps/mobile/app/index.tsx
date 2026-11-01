import React, { useEffect } from 'react';
import { Redirect } from 'expo-router';
import { useAuth } from '../src/hooks/useAuth';

export default function Index() {
  const { loading, signOut } = useAuth();

  useEffect(() => {
    // Clear any existing active session so the user directly experiences the Onboarding screen
    signOut().catch(() => {});
  }, [signOut]);

  if (loading) {
    return null;
  }

  return <Redirect href="/(auth)/onboarding" />;
}
