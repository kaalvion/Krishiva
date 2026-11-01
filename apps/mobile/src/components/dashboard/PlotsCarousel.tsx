import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ImageBackground,
  Alert,
} from 'react-native';
import { ArrowRight, Plus } from 'lucide-react-native';

const PLOT_IMAGE_URL =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuC9uVl0atJYmZFOW_UkEU8LsIAR-tK2yWk_7XzUN7R5dS9kraBATJUSWFZRfh2C207H3aSfh0SBMWgHUih-tKDmJz1OEZ2FjKfeVqhSwZRzv6tUy-0h4uafAR0z7YJDs1g4zz5bqkRoRV1c3zzno8YCjM5FLCetcsL9kJ1YSCknVp8xgzqick_pkw3OkKIwQtj-QisBl48XLwkLbllpbGabujv7eLJxSrKMpybqnnY';

interface PlotData {
  id: string;
  name: string;
  size: string;
  moisture: string;
  isActive?: boolean;
}

const DEFAULT_PLOTS: PlotData[] = [
  { id: '1', name: 'Plot 4B', size: '18 ha', moisture: '42% Moist', isActive: true },
  { id: '2', name: 'Sector 2 Cane', size: '12 ha', moisture: '55% Moist' },
  { id: '3', name: 'Polyhouse 1', size: '6.5 ha', moisture: '38% Moist' },
];

interface PlotsCarouselProps {
  plots?: PlotData[];
  onSelectPlot?: (plot: PlotData) => void;
  onAddPlot?: () => void;
}

export const PlotsCarousel: React.FC<PlotsCarouselProps> = ({
  plots = DEFAULT_PLOTS,
  onSelectPlot,
  onAddPlot,
}) => {
  const [selectedId, setSelectedId] = useState<string>('1');

  const handlePress = (plot: PlotData) => {
    setSelectedId(plot.id);
    onSelectPlot?.(plot);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>AGRICULTURAL PLOTS</Text>
        <Text style={styles.sectionCount}>{plots.length + 1} Fields</Text>
      </View>

      {/* Horizontal List */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {plots.map((plot) => {
          const isSelected = plot.id === selectedId;

          return (
            <TouchableOpacity
              key={plot.id}
              style={[styles.plotCard, isSelected && styles.plotCardSelected]}
              onPress={() => handlePress(plot)}
              activeOpacity={0.85}
            >
              {/* Thumbnail Image */}
              <View style={styles.thumbnailContainer}>
                <ImageBackground
                  source={{ uri: PLOT_IMAGE_URL }}
                  style={styles.thumbnailImage}
                  resizeMode="cover"
                >
                  {isSelected ? (
                    <View style={styles.thumbnailOverlayActive}>
                      <View style={styles.activeTag}>
                        <Text style={styles.activeTagText}>Active</Text>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.thumbnailOverlayDim} />
                  )}
                </ImageBackground>
              </View>

              {/* Title & Size */}
              <View style={styles.infoBlock}>
                <View style={styles.titleRow}>
                  <Text style={styles.plotName} numberOfLines={1}>
                    {plot.name}
                  </Text>
                  <Text style={styles.plotSize}>{plot.size}</Text>
                </View>

                {/* Footer: Moisture & Action Arrow */}
                <View style={styles.bottomRow}>
                  <View
                    style={[
                      styles.moisturePill,
                      isSelected ? styles.moisturePillActive : styles.moisturePillInactive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.moistureText,
                        isSelected && styles.moistureTextActive,
                      ]}
                    >
                      {plot.moisture}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.arrowCircle,
                      isSelected ? styles.arrowCircleActive : styles.arrowCircleInactive,
                    ]}
                  >
                    <ArrowRight
                      size={14}
                      color={isSelected ? '#161e00' : '#556253'}
                    />
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}

        {/* Add Field Button */}
        <TouchableOpacity
          style={styles.addCard}
          onPress={onAddPlot || (() => Alert.alert('Add Field', 'Add new field wizard'))}
          activeOpacity={0.7}
        >
          <View style={styles.addIconCircle}>
            <Plus size={20} color="#191c1b" />
          </View>
          <Text style={styles.addText}>Add Field</Text>
        </TouchableOpacity>
      </ScrollView>
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
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: 'Manrope_600SemiBold',
    color: '#556253',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  sectionCount: {
    fontSize: 11,
    fontFamily: 'Manrope_500Medium',
    color: '#556253',
  },
  scrollContent: {
    flexDirection: 'row',
    gap: 12,
    paddingRight: 8,
  },
  plotCard: {
    width: 160,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.7)',
    shadowColor: '#1E2A1E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 2,
    justifyContent: 'space-between',
  },
  plotCardSelected: {
    borderColor: '#C6E85A',
    borderWidth: 2,
    shadowColor: '#C6E85A',
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  thumbnailContainer: {
    width: '100%',
    height: 64,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 8,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  thumbnailOverlayActive: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(198, 232, 90, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(198, 232, 90, 0.6)',
    borderRadius: 14,
  },
  thumbnailOverlayDim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
  },
  activeTag: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#C6E85A',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 99,
  },
  activeTagText: {
    fontSize: 9,
    fontFamily: 'Manrope_700Bold',
    color: '#161e00',
  },
  infoBlock: {
    flex: 1,
    justifyContent: 'space-between',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  plotName: {
    fontSize: 13,
    fontFamily: 'Manrope_700Bold',
    color: '#191c1b',
    flex: 1,
    marginRight: 4,
  },
  plotSize: {
    fontSize: 11,
    fontFamily: 'Manrope_400Regular',
    color: '#556253',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  moisturePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
  },
  moisturePillActive: {
    backgroundColor: 'rgba(216, 231, 212, 0.6)',
  },
  moisturePillInactive: {
    backgroundColor: '#e7e8e6',
  },
  moistureText: {
    fontSize: 10,
    fontFamily: 'Manrope_600SemiBold',
    color: '#454937',
  },
  moistureTextActive: {
    color: '#3d4a3c',
  },
  arrowCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowCircleActive: {
    backgroundColor: '#C6E85A',
  },
  arrowCircleInactive: {
    backgroundColor: '#e2e3e1',
  },
  addCard: {
    width: 140,
    height: 146,
    borderRadius: 24,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#c5c9b1',
    backgroundColor: 'rgba(243, 244, 242, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e2e3e1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addText: {
    fontSize: 12,
    fontFamily: 'Manrope_600SemiBold',
    color: '#191c1b',
  },
});
