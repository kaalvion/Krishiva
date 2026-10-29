import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Farm } from '../types';

interface FarmContextType {
  activeFarm: Farm | null;
  setActiveFarm: (farm: Farm | null) => void;
}

const ACTIVE_FARM_STORAGE_KEY = '@krishiva_active_farm';

const FarmContext = createContext<FarmContextType | undefined>(undefined);

export const FarmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeFarm, setActiveFarmState] = useState<Farm | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(ACTIVE_FARM_STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as Farm;
          setActiveFarmState((prev) => (prev === null ? parsed : prev));
        } catch {
          // Ignore parse errors
        }
      }
    });
  }, []);

  const setActiveFarm = useCallback((farm: Farm | null) => {
    setActiveFarmState(farm);
    if (farm) {
      AsyncStorage.setItem(ACTIVE_FARM_STORAGE_KEY, JSON.stringify(farm)).catch(() => {});
    } else {
      AsyncStorage.removeItem(ACTIVE_FARM_STORAGE_KEY).catch(() => {});
    }
  }, []);

  return (
    <FarmContext.Provider value={{ activeFarm, setActiveFarm }}>
      {children}
    </FarmContext.Provider>
  );
};

export function useActiveFarm(): FarmContextType {
  const context = useContext(FarmContext);
  if (!context) {
    throw new Error('useActiveFarm must be used within a FarmProvider');
  }
  return context;
}
