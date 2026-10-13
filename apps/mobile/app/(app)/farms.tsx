import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Plus,
  LogOut,
  Tractor,
  ChevronRight,
  Sprout,
  Maximize2,
} from 'lucide-react-native';
import { useAuth } from '../../src/hooks/useAuth';
import { useFarms } from '../../src/hooks/useFarms';
import { useActiveFarm } from '../../src/context/FarmContext';
import { Card } from '../../src/components/Card';
import { Badge } from '../../src/components/Badge';
import { ErrorView } from '../../src/components/ErrorView';
import { LoadingView } from '../../src/components/LoadingView';
import { EmptyState } from '../../src/components/EmptyState';
import { colors } from '../../src/theme/colors';
import type { Farm } from '../../src/types';

export default function FarmsScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { setActiveFarm } = useActiveFarm();
  const { data: farms, isLoading, isError, error, refetch, isRefetching } = useFarms();

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to log out of Krishiva?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut();
            router.replace('/(auth)/login');
          } catch (err: unknown) {
            Alert.alert('Error', err instanceof Error ? err.message : 'Sign out failed');
          }
        },
      },
    ]);
  };

  const handleSelectFarm = (farm: Farm) => {
    setActiveFarm(farm);
    router.push('/(app)/(farm)/dashboard');
  };

  const renderFarmCard = ({ item }: { item: Farm }) => {
    const badgeVariant =
      item.role === 'owner' ? 'success' : item.role === 'admin' ? 'warning' : 'neutral';

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => handleSelectFarm(item)}
        style={styles.cardWrapper}
      >
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.farmTitleContainer}>
              <View style={styles.farmIconBox}>
                <Tractor size={22} color={colors.primary} />
              </View>
              <View style={styles.farmNameBox}>
                <Text style={styles.farmName} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.farmIdText}>ID: {item.id}</Text>
              </View>
            </View>
            <Badge label={item.role} variant={badgeVariant} />
          </View>

          <View style={styles.divider} />

          <View style={styles.cardDetails}>
            <View style={styles.detailItem}>
              <Sprout size={16} color={colors.textSecondary} />
              <Text style={styles.detailText}>{item.cropType}</Text>
            </View>
            <View style={styles.detailItem}>
              <Maximize2 size={15} color={colors.textSecondary} />
              <Text style={styles.detailText}>{item.areaAcres} Acres</Text>
            </View>
            <ChevronRight size={18} color={colors.textMuted} style={styles.arrowIcon} />
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Screen Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerGreeting}>
            Welcome, {user?.email?.split('@')[0] ?? 'Farmer'}
          </Text>
          <Text style={styles.headerTitle}>My Farms</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => router.push('/(app)/create-farm')}
            accessibilityLabel="Create Farm"
          >
            <Plus size={22} color={colors.primaryDark} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.iconButton, styles.signOutButton]}
            onPress={handleSignOut}
            accessibilityLabel="Sign Out"
          >
            <LogOut size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      {isLoading ? (
        <LoadingView label="Fetching your farms..." />
      ) : isError ? (
        <ErrorView
          title="Could Not Load Farms"
          message={error?.message || 'Failed to communicate with backend server.'}
          onRetry={() => refetch()}
          retrying={isRefetching}
        />
      ) : farms && farms.length > 0 ? (
        <FlatList
          data={farms}
          keyExtractor={(item) => item.id}
          renderItem={renderFarmCard}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => refetch()}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        />
      ) : (
        <EmptyState
          icon={<Tractor size={32} color={colors.primary} />}
          title="No Farms Found"
          description="You haven't created or been assigned to any farms yet. Register your first farm to start monitoring."
          actionTitle="Create Your First Farm"
          onAction={() => router.push('/(app)/create-farm')}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  headerGreeting: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.primaryDark,
    letterSpacing: -0.5,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  signOutButton: {
    backgroundColor: colors.borderLight,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  cardWrapper: {
    marginBottom: 14,
  },
  card: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  farmTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  farmIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  farmNameBox: {
    flex: 1,
  },
  farmName: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  farmIdText: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
    fontFamily: 'monospace',
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: 12,
  },
  cardDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  detailText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
    marginLeft: 6,
  },
  arrowIcon: {
    marginLeft: 'auto',
  },
});
