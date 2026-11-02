import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { Trash2, Droplets } from 'lucide-react-native';

export interface DeleteConfirmationModalProps {
  visible: boolean;
  title?: string;
  description?: string;
  itemTitle?: string;
  itemSubtitle?: string;
  itemBadge?: string;
  itemIcon?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DeleteConfirmationModal({
  visible,
  title = 'Delete This Schedule?',
  description = 'This action immediately purges local memory & LoRa transmission schedules. Irreversible.',
  itemTitle = 'Morning drip irrigation',
  itemSubtitle = '06:00 AM • Mon, Wed, Fri',
  itemBadge = '45 MIN',
  itemIcon,
  confirmText = 'Delete',
  cancelText = 'Cancel',
  onCancel,
  onConfirm,
}: DeleteConfirmationModalProps) {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.modalBackdrop}>
        <Pressable style={styles.backdropPressArea} onPress={onCancel} />

        <View style={styles.dialogCard}>
          {/* Red Trash Icon */}
          <View style={styles.iconCircle}>
            <Trash2 size={24} color="#ba1a1a" />
          </View>

          <Text style={styles.title}>{title}</Text>

          {/* Item Metadata Box */}
          <View style={styles.metadataBox}>
            <View style={styles.metaLeft}>
              <View style={styles.metaIcon}>
                {itemIcon || <Droplets size={18} color="#516600" />}
              </View>
              <View style={styles.metaTextCol}>
                <Text style={styles.itemTitle} numberOfLines={1}>
                  {itemTitle}
                </Text>
                <Text style={styles.itemSubtitle} numberOfLines={1}>
                  {itemSubtitle}
                </Text>
              </View>
            </View>

            {itemBadge && (
              <View style={styles.badgePill}>
                <Text style={styles.badgeText}>{itemBadge}</Text>
              </View>
            )}
          </View>

          <Text style={styles.description}>{description}</Text>

          {/* Action Buttons */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onCancel}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelBtnText}>{cancelText}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={onConfirm}
              activeOpacity={0.8}
            >
              <Text style={styles.confirmBtnText}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(46, 49, 48, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  backdropPressArea: {
    ...StyleSheet.absoluteFill,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 8,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ffdad6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#191c1b',
    textAlign: 'center',
  },
  metadataBox: {
    width: '100%',
    backgroundColor: '#f3f4f2',
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 14,
  },
  metaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 8,
  },
  metaIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaTextCol: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#191c1b',
  },
  itemSubtitle: {
    fontSize: 11,
    color: '#556253',
    marginTop: 2,
  },
  badgePill: {
    backgroundColor: '#516600',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#cef061',
    letterSpacing: 0.5,
  },
  description: {
    fontSize: 12,
    color: '#757965',
    textAlign: 'center',
    lineHeight: 17,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#e7e8e6',
    paddingVertical: 12,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#191c1b',
  },
  confirmBtn: {
    flex: 1,
    backgroundColor: '#ba1a1a',
    paddingVertical: 12,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ba1a1a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  confirmBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
});
