import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { RotateCw, Clock, Timer } from 'lucide-react-native';

export interface OfflineQueueItem {
  id: string;
  label: string;
  type?: 'schedule' | 'command' | string;
}

export interface OfflineQueueCardProps {
  onRetry?: () => void;
  errorMessage?: string;
  description?: string;
  queueItems?: OfflineQueueItem[];
}

export function OfflineQueueCard({
  onRetry,
  errorMessage = "Couldn't load your farm",
  description = 'Gateway timed out. Check your local mesh router or cellular antenna connection.',
  queueItems = [
    { id: '1', label: 'Turn ON Valve 2 (Canal Line)' },
    { id: '2', label: 'Set Timer: North Drip 45m' },
  ],
}: OfflineQueueCardProps) {
  return (
    <View style={styles.cardContainer}>
      {/* Wilted Leaf Soil SVG Artwork */}
      <View style={styles.svgContainer}>
        <Svg width={80} height={80} viewBox="0 0 80 80">
          <Circle cx={40} cy={40} r={36} fill="#F3F4F2" />
          {/* Soil Ridge */}
          <Path
            d="M18 56C24 53 32 55 40 54C48 53 58 57 62 56"
            stroke="#C5C9B1"
            strokeWidth={2}
            strokeLinecap="round"
          />
          {/* Wilted Stem */}
          <Path
            d="M40 54V38C40 32 35 24 24 25"
            stroke="#757965"
            strokeWidth={2.5}
            strokeLinecap="round"
          />
          {/* Leaves */}
          <Path
            d="M40 44C44 41 52 41 56 46C56 50 49 52 40 44Z"
            fill="#D8E7D4"
            stroke="#757965"
            strokeWidth={1.5}
          />
          <Path
            d="M24 25C22 30 26 36 33 35C35 30 31 25 24 25Z"
            fill="#D3E1A6"
            stroke="#516600"
            strokeWidth={1.5}
          />
          {/* Disconnected Red Cross Beacon */}
          <Circle cx={58} cy={26} r={3} fill="#BA1A1A" />
          <Path
            d="M54 20L62 32M62 20L54 32"
            stroke="#BA1A1A"
            strokeWidth={1.5}
            strokeLinecap="round"
          />
        </Svg>
      </View>

      <Text style={styles.title}>{errorMessage}</Text>
      <Text style={styles.description}>{description}</Text>

      {onRetry && (
        <TouchableOpacity
          style={styles.retryBtn}
          onPress={onRetry}
          activeOpacity={0.8}
        >
          <RotateCw size={16} color="#161e00" />
          <Text style={styles.retryBtnText}>TRY AGAIN</Text>
        </TouchableOpacity>
      )}

      {/* Offline Queue Tray */}
      <View style={styles.queueTray}>
        <View style={styles.queueHeader}>
          <View style={styles.offlineBadge}>
            <View style={styles.offlineDot} />
            <Text style={styles.offlineBadgeText}>YOU'RE OFFLINE</Text>
          </View>
          <Text style={styles.heldText}>{queueItems.length} TASKS HELD</Text>
        </View>

        <View style={styles.queueBox}>
          {queueItems.map((item, idx) => (
            <View key={item.id || idx} style={styles.queueItemRow}>
              <View style={styles.queueItemLeft}>
                {idx === 0 ? (
                  <Clock size={15} color="#556253" />
                ) : (
                  <Timer size={15} color="#556253" />
                )}
                <Text style={styles.queueItemLabel} numberOfLines={1}>
                  {item.label}
                </Text>
              </View>
              <View style={styles.queuedBadge}>
                <Text style={styles.queuedBadgeText}>QUEUED</Text>
              </View>
            </View>
          ))}

          <Text style={styles.queueFooterNote}>
            Actions will automatically dispatch once gateway handshakes.
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#1e2a1e',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 18,
    elevation: 2,
    marginVertical: 6,
  },
  svgContainer: {
    width: 80,
    height: 80,
    marginVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#191c1b',
    marginTop: 6,
    textAlign: 'center',
  },
  description: {
    fontSize: 12,
    color: '#556253',
    textAlign: 'center',
    lineHeight: 17,
    marginTop: 4,
    marginBottom: 16,
    maxWidth: 290,
  },
  retryBtn: {
    backgroundColor: '#c6e85a',
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#516600',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  retryBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#161e00',
    letterSpacing: 0.5,
  },
  queueTray: {
    width: '100%',
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f2',
    gap: 8,
  },
  queueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  offlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#dbe9ae',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  offlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#516600',
  },
  offlineBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#161e00',
    letterSpacing: 0.4,
  },
  heldText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#757965',
    letterSpacing: 0.5,
  },
  queueBox: {
    backgroundColor: '#f3f4f2',
    borderRadius: 16,
    padding: 12,
    gap: 10,
  },
  queueItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  queueItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    marginRight: 8,
  },
  queueItemLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#191c1b',
    flex: 1,
  },
  queuedBadge: {
    backgroundColor: '#e7e8e6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  queuedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#556253',
    letterSpacing: 0.4,
  },
  queueFooterNote: {
    fontSize: 11,
    color: '#757965',
    textAlign: 'center',
    marginTop: 2,
  },
});
