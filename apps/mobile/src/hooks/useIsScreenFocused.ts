import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';

/**
 * Tracks whether the current screen is focused in Expo Router / React Navigation.
 * Useful for pausing TanStack Query polling intervals when leaving the screen.
 */
export function useIsScreenFocused(): boolean {
  const [isFocused, setIsFocused] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setIsFocused(true);
      return () => {
        setIsFocused(false);
      };
    }, [])
  );

  return isFocused;
}
