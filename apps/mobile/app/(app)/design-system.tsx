import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  User,
  Router,
  Calendar,
  CheckCircle2,
  Spline,
  ArrowUpRight,
  Droplets,
} from 'lucide-react-native';

import {
  ControllerOfflineBanner,
  HoldToActivateSiren,
  DeleteConfirmationModal,
  SkeletonLoader,
  OfflineQueueCard,
  EmptyStateCard,
} from '../../src/components/states';

export default function DesignSystemScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* 1. Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}
            accessibilityLabel="Back"
          >
            <ArrowLeft size={22} color="#191c1b" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>System States</Text>
        </View>

        <View style={styles.headerRight}>
          <View style={styles.specBadge}>
            <Text style={styles.specBadgeText}>V2.4</Text>
          </View>
          <View style={styles.profileAvatar}>
            <User size={16} color="#ffffff" />
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom + 32, 48) }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Showcase Context Banner */}
        <View style={styles.contextCard}>
          <View style={styles.contextTopRow}>
            <Text style={styles.contextTag}>KRISHIVA PRECISION DS</Text>
            <View style={styles.specTagPill}>
              <Text style={styles.specTagPillText}>SPEC V2.4</Text>
            </View>
          </View>
          <Text style={styles.contextTitle}>System State Systematics</Text>
          <Text style={styles.contextSubtitle}>
            Telemetry failure modes, emergency actions, and fallback patterns designed for high-stress agricultural workflows.
          </Text>
        </View>

        {/* 01 / CONTROLLER OFFLINE BANNER */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionIndex}>01 / CONTROLLER OFFLINE BANNER</Text>
            <View style={styles.redDot} />
          </View>
          <ControllerOfflineBanner
            nodeId="NODE #LORA-841"
            lastSeenText="Last telemetry seen 2 hours ago. Automated valve schedules are held in safe-mode until sync reconnects."
            onRetry={() => Alert.alert('Gateway Handshake', 'Pinging Sentinel LoRaWAN repeater...')}
          />
        </View>

        {/* 02 / SIREN HOLD-TO-ACTIVATE SHEET */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionIndex}>02 / SIREN HOLD-TO-ACTIVATE SHEET</Text>
            <Text style={styles.sectionStatusRed}>ACTIVE TRIGGER</Text>
          </View>
          <HoldToActivateSiren
            title="ACTIVATE FIELD SIREN"
            subtitle="Engages high-decibel acoustic ward across Sector 3. Press and hold to prevent accidental triggers."
            onTrigger={() => Alert.alert('SIREN ENGAGED', 'Acoustic ward activated across Sector 3 for 30 seconds.')}
            onCancel={() => Alert.alert('Cancelled', 'Siren sequence reset.')}
          />
        </View>

        {/* 03 / DELETE CONFIRMATION MODAL */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionIndex}>03 / DELETE CONFIRMATION MODAL</Text>
            <TouchableOpacity onPress={() => setDeleteModalVisible(true)}>
              <Text style={styles.interactiveLink}>OPEN MODAL</Text>
            </TouchableOpacity>
          </View>

          {/* Embedded Preview Box representing the modal */}
          <View style={styles.modalBackdropPreview}>
            <View style={styles.dialogCardPreview}>
              <View style={styles.trashCircle}>
                <Droplets size={22} color="#ba1a1a" />
              </View>
              <Text style={styles.previewDialogTitle}>Delete This Schedule?</Text>

              <View style={styles.previewMetaBox}>
                <View style={styles.previewMetaLeft}>
                  <Droplets size={16} color="#516600" />
                  <View>
                    <Text style={styles.previewMetaTitle}>Morning drip irrigation</Text>
                    <Text style={styles.previewMetaSub}>06:00 AM • Mon, Wed, Fri</Text>
                  </View>
                </View>
                <View style={styles.previewBadge}>
                  <Text style={styles.previewBadgeText}>45 MIN</Text>
                </View>
              </View>

              <Text style={styles.previewDesc}>
                This action immediately purges local memory & LoRa transmission schedules. Irreversible.
              </Text>

              <View style={styles.previewBtnRow}>
                <TouchableOpacity
                  style={styles.previewCancelBtn}
                  onPress={() => setDeleteModalVisible(true)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.previewCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.previewDeleteBtn}
                  onPress={() => setDeleteModalVisible(true)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.previewDeleteText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* 04 / SKELETON SHIMMER LOADER */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionIndex}>04 / SKELETON SHIMMER LOADER</Text>
            <View style={styles.telemetryTag}>
              <Text style={styles.telemetryTagText}>320ms TELEMETRY</Text>
            </View>
          </View>
          <SkeletonLoader variant="full" />
        </View>

        {/* 05 / ERROR STATE WITH OFFLINE QUEUE */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionIndex}>05 / SYSTEM ERROR & OFFLINE QUEUE</Text>
            <View style={styles.oliveDot} />
          </View>
          <OfflineQueueCard
            errorMessage="Couldn't load your farm"
            description="Gateway timed out. Check your local mesh router or cellular antenna connection."
            onRetry={() => Alert.alert('Mesh Reconnect', 'Re-synchronizing local mesh nodes...')}
            queueItems={[
              { id: '1', label: 'Turn ON Valve 2 (Canal Line)' },
              { id: '2', label: 'Set Timer: North Drip 45m' },
            ]}
          />
        </View>

        {/* 06 / MODULAR EMPTY STATES (4 VARIANTS) */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionIndex}>06 / MODULAR EMPTY STATES (4 VARIANTS)</Text>
            <Text style={styles.sectionStatusMuted}>2X2 MATRIX</Text>
          </View>

          <View style={styles.matrixGrid}>
            <View style={styles.matrixRow}>
              {/* Variant 1: Devices */}
              <EmptyStateCard
                icon={<Router size={22} color="#516600" />}
                title="No Devices"
                subtitle="Link GSM Hub or LoRa Node"
                buttonText="Add Device +"
                onPress={() => router.push('/(app)/scan-device')}
              />

              {/* Variant 2: Schedules */}
              <EmptyStateCard
                icon={<Calendar size={22} color="#516600" />}
                title="No Schedules"
                subtitle="Set automated irrigation"
                buttonText="Schedule"
                onPress={() => router.push('/(app)/(farm)/schedule-edit')}
              />
            </View>

            <View style={styles.matrixRow}>
              {/* Variant 3: Alerts (All Clear!) */}
              <EmptyStateCard
                icon={<CheckCircle2 size={22} color="#161e00" />}
                title="All Clear!"
                subtitle="Canals and pressures normal"
                badgeText="Health 100%"
              />

              {/* Variant 4: Fields */}
              <EmptyStateCard
                icon={<Spline size={22} color="#516600" />}
                title="No Fields"
                subtitle="Map boundaries & plots"
                buttonText="Draw Field"
                onPress={() => router.push('/(app)/(farm)/new-field')}
              />
            </View>
          </View>
        </View>

        {/* Footnote Anchor */}
        <View style={styles.footnoteRow}>
          <View style={styles.footnoteLeft}>
            <View style={styles.limeTinyDot} />
            <Text style={styles.footnoteText}>CARTOGRAPHIC SYSTEM ARCHETYPES</Text>
          </View>
          <TouchableOpacity
            style={styles.signatureArrowBtn}
            onPress={() => Alert.alert('Design System', 'Krishiva Precision Agriculture UI Design System v2.4')}
            activeOpacity={0.8}
          >
            <ArrowUpRight size={18} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        visible={deleteModalVisible}
        title="Delete This Schedule?"
        itemTitle="Morning drip irrigation"
        itemSubtitle="06:00 AM • Mon, Wed, Fri"
        itemBadge="45 MIN"
        onCancel={() => setDeleteModalVisible(false)}
        onConfirm={() => {
          setDeleteModalVisible(false);
          Alert.alert('Schedule Deleted', 'Purged from node memory and transmission queue.');
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f9faf8',
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: 'rgba(249, 250, 248, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.03)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#191c1b',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  specBadge: {
    backgroundColor: '#d8e7d4',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  specBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#131e13',
  },
  profileAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#516600',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 24,
  },

  // Context Card
  contextCard: {
    gap: 4,
  },
  contextTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  contextTag: {
    fontSize: 11,
    fontWeight: '700',
    color: '#757965',
    letterSpacing: 0.8,
  },
  specTagPill: {
    backgroundColor: '#c6e85a',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  specTagPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#526700',
  },
  contextTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#191c1b',
    marginTop: 4,
  },
  contextSubtitle: {
    fontSize: 13,
    color: '#556253',
    lineHeight: 18,
  },

  // Sections
  section: {
    gap: 8,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  sectionIndex: {
    fontSize: 11,
    fontWeight: '700',
    color: '#757965',
    letterSpacing: 0.6,
  },
  sectionStatusRed: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ba1a1a',
    letterSpacing: 0.4,
  },
  sectionStatusMuted: {
    fontSize: 11,
    fontWeight: '700',
    color: '#757965',
  },
  interactiveLink: {
    fontSize: 11,
    fontWeight: '700',
    color: '#516600',
    textDecorationLine: 'underline',
  },
  redDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ba1a1a',
  },
  oliveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#576334',
  },
  telemetryTag: {
    backgroundColor: '#e7e8e6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  telemetryTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#556253',
  },

  // Modal Preview
  modalBackdropPreview: {
    backgroundColor: 'rgba(46, 49, 48, 0.88)',
    borderRadius: 24,
    padding: 16,
    alignItems: 'center',
  },
  dialogCardPreview: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 18,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  trashCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ffdad6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  previewDialogTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#191c1b',
  },
  previewMetaBox: {
    width: '100%',
    backgroundColor: '#f3f4f2',
    borderRadius: 14,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 10,
  },
  previewMetaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  previewMetaTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#191c1b',
  },
  previewMetaSub: {
    fontSize: 10,
    color: '#556253',
  },
  previewBadge: {
    backgroundColor: '#516600',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  previewBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#cef061',
  },
  previewDesc: {
    fontSize: 11,
    color: '#757965',
    textAlign: 'center',
    lineHeight: 15,
    marginBottom: 14,
  },
  previewBtnRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  previewCancelBtn: {
    flex: 1,
    backgroundColor: '#e7e8e6',
    paddingVertical: 10,
    borderRadius: 20,
    alignItems: 'center',
  },
  previewCancelText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#191c1b',
  },
  previewDeleteBtn: {
    flex: 1,
    backgroundColor: '#ba1a1a',
    paddingVertical: 10,
    borderRadius: 20,
    alignItems: 'center',
  },
  previewDeleteText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },

  // 2x2 Matrix
  matrixGrid: {
    gap: 10,
  },
  matrixRow: {
    flexDirection: 'row',
    gap: 10,
  },

  // Footnote
  footnoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
  },
  footnoteLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  limeTinyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#b2d348',
  },
  footnoteText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#757965',
    letterSpacing: 0.6,
  },
  signatureArrowBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#191c1b',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
});
