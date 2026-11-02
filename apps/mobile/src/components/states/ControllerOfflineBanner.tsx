import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { AlertTriangle, RotateCw } from 'lucide-react-native';

export interface ControllerOfflineBannerProps {
  nodeId?: string;
  lastSeenText?: string;
  isRetrying?: boolean;
  onRetry?: () => void;
}

export function ControllerOfflineBanner({
  nodeId = 'NODE #LORA-841',
  lastSeenText = 'Last telemetry seen 2 hours ago. Automated valve schedules are held in safe-mode until sync reconnects.',
  isRetrying = false,
  onRetry,
}: ControllerOfflineBannerProps) {
  return (
    <View style={styles.cardContainer}>
      <View style={styles.bannerBox}>
        <View style={styles.iconCircle}>
          <AlertTriangle size={18} color="#516600" />
        </View>

        <View style={styles.contentCol}>
          <Text style={styles.title}>Controller Disconnected</Text>
          <Text style={styles.description}>{lastSeenText}</Text>

          <View style={styles.bottomRow}>
            <Text style={styles.nodeTag}>{nodeId}</Text>

            {onRetry && (
              <TouchableOpacity
                style={styles.retryBtn}
                onPress={onRetry}
                disabled={isRetrying}
                activeOpacity={0.8}
                accessibilityLabel="Retry controller sync"
              >
                {isRetrying ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <RotateCw size={13} color="#ffffff" />
                    <Text style={styles.retryBtnText}>RETRY NOW</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 8,
    shadowColor: '#1e2a1e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 2,
    marginVertical: 6,
  },
  bannerBox: {
    backgroundColor: 'rgba(219, 233, 174, 0.45)', // tertiary-fixed/40
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  contentCol: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#191c1b',
    letterSpacing: -0.2,
  },
  description: {
    fontSize: 12,
    color: '#454937',
    lineHeight: 17,
    marginTop: 3,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 4,
  },
  nodeTag: {
    fontSize: 11,
    fontWeight: '700',
    color: '#556253',
    letterSpacing: 0.5,
  },
  retryBtn: {
    backgroundColor: '#191c1b',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 1,
  },
  retryBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#f9faf8',
    letterSpacing: 0.5,
  },
});
