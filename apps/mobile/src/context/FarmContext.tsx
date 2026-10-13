import React, { createContext, useContext, useState } from 'react';
import type { Farm } from '../types';

interface FarmContextType {
  activeFarm: Farm | null;
  setActiveFarm: (farm: Farm | null) => void;
}

const FarmContext = createContext<FarmContextType | undefined>(undefined);

export const FarmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeFarm, setActiveFarm] = useState<Farm | null>(null);

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
