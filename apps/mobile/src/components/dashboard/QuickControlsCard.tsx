import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Droplets, Sliders, Sun, Volume2 } from 'lucide-react-native';

interface ControlDevice {
  id: string;
  name: string;
  icon: 'pump' | 'valve' | 'light' | 'siren';
  activeSubtitle: string;
  inactiveSubtitle: string;
  isActive: boolean;
}

interface QuickControlsCardProps {
  onToggleDevice?: (deviceId: string, newState: boolean) => void;
}

const INITIAL_DEVICES: ControlDevice[] = [
  {
    id: 'pump-1',
    name: 'Borewell Pump',
    icon: 'pump',
    activeSubtitle: 'Active • 1h 12m',
    inactiveSubtitle: 'Off • Standby',
    isActive: true,
  },
  {
    id: 'valve-1',
    name: 'Drip Valve North',
    icon: 'valve',
    activeSubtitle: 'Active • Open',
    inactiveSubtitle: 'Off • Standby',
    isActive: false,
  },
  {
    id: 'light-1',
    name: 'Perimeter Light',
    icon: 'light',
    activeSubtitle: 'Active • Lit',
    inactiveSubtitle: 'Auto 7:00 PM',
    isActive: false,
  },
  {
    id: 'siren-1',
    name: 'Pest Deterrent',
    icon: 'siren',
    activeSubtitle: 'Active • Armed',
    inactiveSubtitle: 'Arm Ready',
    isActive: false,
  },
];

export const QuickControlsCard: React.FC<QuickControlsCardProps> = ({
  onToggleDevice,
}) => {
  const [devices, setDevices] = useState<ControlDevice[]>(INITIAL_DEVICES);

  const handleToggle = (id: string) => {
    setDevices((prev) =>
      prev.map((dev) => {
        if (dev.id === id) {
          const newState = !dev.isActive;
          onToggleDevice?.(id, newState);
          return { ...dev, isActive: newState };
        }
        return dev;
      })
    );
  };

  const renderIcon = (type: ControlDevice['icon'], active: boolean) => {
    const color = active ? '#C6E85A' : '#556253';
    switch (type) {
      case 'pump':
        return <Droplets size={20} color={color} />;
      case 'valve':
        return <Sliders size={20} color={color} />;
      case 'light':
        return <Sun size={20} color={color} />;
      case 'siren':
        return <Volume2 size={20} color={color} />;
    }
  };

  const connectedCount = devices.length;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>QUICK CONTROLS</Text>
        <View style={styles.badgeRow}>
          <View style={styles.badgeDot} />
          <Text style={styles.badgeText}>{connectedCount} Devices Connected</Text>
        </View>
      </View>

      {/* 2x2 Grid */}
      <View style={styles.grid}>
        {devices.map((device) => {
          const active = device.isActive;

          return (
            <TouchableOpacity
              key={device.id}
              style={[
                styles.tile,
                active ? styles.tileActive : styles.tileInactive,
              ]}
              onPress={() => handleToggle(device.id)}
              activeOpacity={0.85}
            >
              {/* Top Row: Icon + Toggle Switch */}
              <View style={styles.tileTopRow}>
                <View
                  style={[
                    styles.iconCircle,
                    active ? styles.iconCircleActive : styles.iconCircleInactive,
                  ]}
                >
                  {renderIcon(device.icon, active)}
                </View>

                {/* Custom Toggle Switch Pill */}
                <View
                  style={[
                    styles.switchPill,
                    active ? styles.switchPillActive : styles.switchPillInactive,
                  ]}
                >
                  <View
                    style={[
                      styles.switchThumb,
                      active ? styles.switchThumbActive : styles.switchThumbInactive,
                    ]}
                  />
                </View>
              </View>

              {/* Bottom Row: Name + Subtitle */}
              <View style={styles.tileBottom}>
                <Text
                  style={[
                    styles.deviceName,
                    active ? styles.deviceNameActive : styles.deviceNameInactive,
                  ]}
                  numberOfLines={1}
                >
                  {device.name}
                </Text>
                <Text
                  style={[
                    styles.deviceSubtitle,
                    active ? styles.deviceSubtitleActive : styles.deviceSubtitleInactive,
                  ]}
                  numberOfLines={1}
                >
                  {active ? device.activeSubtitle : device.inactiveSubtitle}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: 'Manrope_600SemiBold',
    color: '#556253',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#e2e3e1',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#516600',
  },
  badgeText: {
    fontSize: 10,
    fontFamily: 'Manrope_600SemiBold',
    color: '#454937',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  tile: {
    width: '48%',
    minHeight: 126,
    borderRadius: 20,
    padding: 14,
    justifyContent: 'space-between',
  },
  tileActive: {
    backgroundColor: '#C6E85A',
    shadowColor: '#C6E85A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    elevation: 4,
  },
  tileInactive: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    shadowColor: '#1E2A1E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 2,
  },
  tileTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleActive: {
    backgroundColor: '#161e00',
  },
  iconCircleInactive: {
    backgroundColor: '#edeeec',
  },
  switchPill: {
    width: 48,
    height: 24,
    borderRadius: 12,
    paddingHorizontal: 2,
    justifyContent: 'center',
  },
  switchPillActive: {
    backgroundColor: '#161e00',
    alignItems: 'flex-end',
  },
  switchPillInactive: {
    backgroundColor: '#e2e3e1',
    alignItems: 'flex-start',
  },
  switchThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  switchThumbActive: {
    backgroundColor: '#C6E85A',
  },
  switchThumbInactive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 1,
  },
  tileBottom: {
    marginTop: 8,
  },
  deviceName: {
    fontSize: 14,
    fontFamily: 'Manrope_700Bold',
    lineHeight: 18,
  },
  deviceNameActive: {
    color: '#161e00',
  },
  deviceNameInactive: {
    color: '#191c1b',
  },
  deviceSubtitle: {
    fontSize: 12,
    fontFamily: 'Manrope_500Medium',
    marginTop: 2,
  },
  deviceSubtitleActive: {
    color: 'rgba(22, 30, 0, 0.8)',
  },
  deviceSubtitleInactive: {
    color: '#556253',
  },
});

