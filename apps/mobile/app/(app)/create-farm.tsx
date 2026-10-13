import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Check, PlusCircle } from 'lucide-react-native';
import { useCreateFarm } from '../../src/hooks/useFarms';
import { Button } from '../../src/components/Button';
import { Input } from '../../src/components/Input';
import { colors } from '../../src/theme/colors';

const CROP_OPTIONS = [
  'Wheat',
  'Rice',
  'Cotton',
  'Sugarcane',
  'Vegetables',
  'Other',
] as const;

const createFarmFormSchema = z.object({
  name: z
    .string({ required_error: 'Farm name is required' })
    .min(1, 'Farm name cannot be empty')
    .max(100, 'Farm name must be at most 100 characters'),
  cropType: z.string({ required_error: 'Crop type is required' }).min(1),
  areaAcres: z.coerce
    .number({ required_error: 'Area in acres is required' })
    .gt(0, 'Area must be greater than 0')
    .lte(1000, 'Area must be at most 1000 acres'),
  lat: z.coerce
    .number({ required_error: 'Latitude is required' })
    .min(-90, 'Latitude must be between -90 and 90')
    .max(90, 'Latitude must be between -90 and 90'),
  lng: z.coerce
    .number({ required_error: 'Longitude is required' })
    .min(-180, 'Longitude must be between -180 and 180')
    .max(180, 'Longitude must be between -180 and 180'),
});

type CreateFarmFormData = z.infer<typeof createFarmFormSchema>;

export default function CreateFarmScreen() {
  const router = useRouter();
  const createFarmMutation = useCreateFarm();
  const [selectedCrop, setSelectedCrop] = useState<string>('Wheat');

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CreateFarmFormData>({
    resolver: zodResolver(createFarmFormSchema),
    defaultValues: {
      name: '',
      cropType: 'Wheat',
      areaAcres: 50,
      lat: 30.7333,
      lng: 76.7794,
    },
  });

  const handleSelectCrop = (crop: string) => {
    setSelectedCrop(crop);
    setValue('cropType', crop, { shouldValidate: true });
  };

  const onSubmit = async (data: CreateFarmFormData) => {
    try {
      await createFarmMutation.mutateAsync({
        name: data.name.trim(),
        cropType: data.cropType,
        areaAcres: Number(data.areaAcres),
        location: {
          lat: Number(data.lat),
          lng: Number(data.lng),
        },
        timezone: 'Asia/Kolkata',
      });

      Alert.alert('Success', 'Farm created successfully!', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to create farm');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>Farm Information</Text>

          {/* Farm Name */}
          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Farm Name"
                placeholder="e.g. Green Valley Farm"
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                error={errors.name?.message}
              />
            )}
          />

          {/* Crop Type Chips */}
          <Text style={styles.fieldLabel}>Crop Type</Text>
          <View style={styles.chipGrid}>
            {CROP_OPTIONS.map((crop) => {
              const isSelected = selectedCrop === crop;
              return (
                <TouchableOpacity
                  key={crop}
                  activeOpacity={0.7}
                  onPress={() => handleSelectCrop(crop)}
                  style={[styles.chip, isSelected && styles.chipSelected]}
                >
                  {isSelected ? (
                    <Check size={14} color={colors.primaryDark} style={styles.chipCheck} />
                  ) : null}
                  <Text
                    style={[styles.chipText, isSelected && styles.chipTextSelected]}
                  >
                    {crop}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {errors.cropType?.message ? (
            <Text style={styles.errorText}>{errors.cropType.message}</Text>
          ) : null}

          {/* Area in Acres */}
          <Controller
            control={control}
            name="areaAcres"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Area (in Acres)"
                placeholder="50"
                keyboardType="numeric"
                value={value?.toString() ?? ''}
                onBlur={onBlur}
                onChangeText={onChange}
                error={errors.areaAcres?.message}
                containerStyle={styles.topSpacing}
              />
            )}
          />

          <View style={styles.divider} />
          <Text style={styles.sectionTitle}>Geographical Coordinates</Text>

          {/* Coordinates row */}
          <View style={styles.row}>
            <View style={styles.halfCol}>
              <Controller
                control={control}
                name="lat"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Latitude"
                    placeholder="30.7333"
                    keyboardType="numeric"
                    value={value?.toString() ?? ''}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    error={errors.lat?.message}
                  />
                )}
              />
            </View>
            <View style={styles.halfCol}>
              <Controller
                control={control}
                name="lng"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Longitude"
                    placeholder="76.7794"
                    keyboardType="numeric"
                    value={value?.toString() ?? ''}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    error={errors.lng?.message}
                  />
                )}
              />
            </View>
          </View>

          <Text style={styles.infoNote}>
            Defaulted to 30.7333 / 76.7794 with timezone fixed to Asia/Kolkata.
          </Text>

          <Button
            title="Create Farm"
            loading={createFarmMutation.isPending}
            onPress={handleSubmit(onSubmit)}
            icon={<PlusCircle size={18} color={colors.textInverse} />}
            style={styles.submitButton}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  formCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: 20,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primaryDark,
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.borderLight,
    margin: 4,
  },
  chipSelected: {
    backgroundColor: colors.primarySurface,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  chipCheck: {
    marginRight: 6,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  chipTextSelected: {
    color: colors.primaryDark,
    fontWeight: '700',
  },
  topSpacing: {
    marginTop: 12,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: 16,
  },
  row: {
    flexDirection: 'row',
    marginHorizontal: -6,
  },
  halfCol: {
    flex: 1,
    paddingHorizontal: 6,
  },
  infoNote: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 20,
    lineHeight: 18,
  },
  submitButton: {
    marginTop: 8,
  },
  errorText: {
    fontSize: 12,
    color: colors.error,
    marginTop: 4,
    fontWeight: '500',
  },
});
