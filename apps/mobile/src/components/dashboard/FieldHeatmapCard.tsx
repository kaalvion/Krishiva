import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Layers, ArrowUpRight } from 'lucide-react-native';
import { FieldHeatmap } from '../FieldHeatmap';
import { colors } from '../../theme/colors';
import type { HeatmapCell } from '../../types';

interface FieldHeatmapCardProps {
  cells: HeatmapCell[];
}

export const FieldHeatmapCard: React.FC<FieldHeatmapCardProps> = ({ cells }) => {
  const router = useRouter();

  return (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.headerRow}
        activeOpacity={0.8}
        onPress={() => router.push('/(app)/(farm)/farm-map')}
      >
        <View style={styles.titleRow}>
          <View style={styles.iconCircle}>
            <Layers size={16} color={colors.primaryDark} />
          </View>
          <Text style={styles.cardTitle}>Precision Field Grid</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Text style={styles.cellsCount}>{cells.length} Zones</Text>
          <ArrowUpRight size={14} color={colors.primaryDark} />
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.mapContainer}
        activeOpacity={0.9}
        onPress={() => router.push('/(app)/(farm)/farm-map')}
      >
        <FieldHeatmap cells={cells} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
    shadowColor: '#1E2A1E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 24,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 15,
    fontFamily: 'Manrope_700Bold',
    color: colors.primaryDark,
  },
  cellsCount: {
    fontSize: 11,
    fontFamily: 'Manrope_600SemiBold',
    color: colors.textSecondary,
    backgroundColor: '#f3f4f2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
  },
  mapContainer: {
    backgroundColor: '#f3f4f2',
    borderRadius: 16,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

