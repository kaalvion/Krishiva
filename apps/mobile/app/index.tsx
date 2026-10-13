import React from 'react';
import { Redirect } from 'expo-router';
import { useAuth } from '../src/hooks/useAuth';
import { LoadingView } from '../src/components/LoadingView';

export default function Index() {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingView label="Starting Krishiva..." />;
  }

  if (user) {
    return <Redirect href="/(app)/farms" />;
  }

  return <Redirect href="/(auth)/login" />;
}
