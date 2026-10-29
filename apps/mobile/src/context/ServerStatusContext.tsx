import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  AppState,
  type AppStateStatus,
  ActivityIndicator,
} from 'react-native';
import { CloudOff, RotateCw } from 'lucide-react-native';
import { env } from '../config/env';

interface ServerStatusContextType {
  serverOnline: boolean;
  checking: boolean;
  recheck: () => Promise<boolean>;
}

const ServerStatusContext = createContext<ServerStatusContextType | undefined>(undefined);

export const ServerStatusProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [serverOnline, setServerOnline] = useState<boolean>(true);
  const [checking, setChecking] = useState<boolean>(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const checkHealth = useCallback(async (): Promise<boolean> => {
    if (!env.apiUrl) {
      setServerOnline(false);
      return false;
    }

    setChecking(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const cleanUrl = env.apiUrl.replace(/\/+$/, '');
      const res = await fetch(`${cleanUrl}/health`, {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const isOk = res.ok;
      setServerOnline(isOk);
      setChecking(false);
      return isOk;
    } catch {
      clearTimeout(timeoutId);
      setServerOnline(false);
      setChecking(false);
      return false;
    }
  }, []);

  useEffect(() => {
    // Initial health ping
    checkHealth();

    // 30-second polling while app is active
    const interval = setInterval(() => {
      if (appStateRef.current === 'active') {
        checkHealth();
      }
    }, 30000);

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        checkHealth();
      }
      appStateRef.current = nextAppState;
    });

    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [checkHealth]);

  return (
    <ServerStatusContext.Provider
      value={{
        serverOnline,
        checking,
        recheck: checkHealth,
      }}
    >
      {children}
    </ServerStatusContext.Provider>
  );
};

export function useServerStatus(): ServerStatusContextType {
  const ctx = useContext(ServerStatusContext);
  if (!ctx) {
    throw new Error('useServerStatus must be used within a ServerStatusProvider');
  }
  return ctx;
}

/**
 * Slim alert banner displayed when the Fastify control server is unreachable.
 * Indicates that the app is reading live/stored Firestore data directly.
 */
export const ServerStatusBanner: React.FC = () => {
  const { serverOnline, checking, recheck } = useServerStatus();

  if (serverOnline) {
    return null;
  }

  return (
    <View style={styles.bannerContainer}>
      <View style={styles.leftRow}>
        <CloudOff size={16} color="#B71C1C" style={styles.icon} />
        <Text style={styles.bannerText}>Control server offline — showing saved data</Text>
      </View>
      <TouchableOpacity
        onPress={() => recheck()}
        disabled={checking}
        style={styles.retryButton}
        accessibilityRole="button"
        accessibilityLabel="Retry connecting to control server"
      >
        {checking ? (
          <ActivityIndicator size="small" color="#B71C1C" />
        ) : (
          <View style={styles.retryContent}>
            <RotateCw size={13} color="#B71C1C" />
            <Text style={styles.retryText}>Retry</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  bannerContainer: {
    backgroundColor: '#FFEBEE',
    borderBottomWidth: 1,
    borderBottomColor: '#FFCDD2',
    paddingVertical: 8,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 999,
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  icon: {
    marginRight: 8,
  },
  bannerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#B71C1C',
    flexShrink: 1,
  },
  retryButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: '#FFCDD2',
  },
  retryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  retryText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B71C1C',
  },
});

