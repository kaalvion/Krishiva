import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from './Modal';
import { useCreateFarm } from '../hooks/useFarms';
import { useToast } from './Toast';
import { useNavigate } from 'react-router-dom';

const createFarmSchema = z.object({
  name: z.string().min(2, 'Farm name must be at least 2 characters'),
  cropType: z.string().min(2, 'Crop type is required'),
  areaAcres: z.coerce.number().positive('Area must be a positive number'),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  timezone: z.string().min(1, 'Timezone is required'),
});

type CreateFarmFormValues = z.infer<typeof createFarmSchema>;

interface CreateFarmModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateFarmModal: React.FC<CreateFarmModalProps> = ({ isOpen, onClose }) => {
  const { mutateAsync: createFarm, isPending } = useCreateFarm();
  const toast = useToast();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateFarmFormValues>({
    resolver: zodResolver(createFarmSchema),
    defaultValues: {
      name: '',
      cropType: 'Wheat',
      areaAcres: 10,
      lat: 28.6139,
      lng: 77.209,
      timezone: 'Asia/Kolkata',
    },
  });

  const onSubmit = async (values: CreateFarmFormValues) => {
    try {
      const res = await createFarm({
        name: values.name,
        cropType: values.cropType,
        areaAcres: values.areaAcres,
        location: {
          lat: values.lat,
          lng: values.lng,
        },
        timezone: values.timezone,
      });

      toast.success('Farm created', `Successfully created ${values.name}!`);
      localStorage.setItem('krishiva_selected_farmId', res.farmId);
      reset();
      onClose();
      navigate(`/farms/${res.farmId}/overview`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create farm';
      toast.error('Error creating farm', msg);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Create New Farm"
      description="Register a new smart-farm for IoT monitoring and telemetry."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Farm Name
          </label>
          <input
            {...register('name')}
            placeholder="e.g. Green Valley Farm"
            className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
          />
          {errors.name && (
            <p className="mt-1 text-xs text-rose-500 font-medium">{errors.name.message}</p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Crop Type
            </label>
            <input
              {...register('cropType')}
              placeholder="e.g. Wheat, Tomato, Cotton"
              className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
            />
            {errors.cropType && (
              <p className="mt-1 text-xs text-rose-500 font-medium">{errors.cropType.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Area (Acres)
            </label>
            <input
              type="number"
              step="0.1"
              {...register('areaAcres')}
              placeholder="10.5"
              className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
            />
            {errors.areaAcres && (
              <p className="mt-1 text-xs text-rose-500 font-medium">{errors.areaAcres.message}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Latitude
            </label>
            <input
              type="number"
              step="0.0001"
              {...register('lat')}
              placeholder="28.6139"
              className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
            />
            {errors.lat && (
              <p className="mt-1 text-xs text-rose-500 font-medium">{errors.lat.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Longitude
            </label>
            <input
              type="number"
              step="0.0001"
              {...register('lng')}
              placeholder="77.2090"
              className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
            />
            {errors.lng && (
              <p className="mt-1 text-xs text-rose-500 font-medium">{errors.lng.message}</p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Timezone
          </label>
          <input
            {...register('timezone')}
            defaultValue="Asia/Kolkata"
            placeholder="Asia/Kolkata"
            className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all font-mono"
          />
          {errors.timezone && (
            <p className="mt-1 text-xs text-rose-500 font-medium">{errors.timezone.message}</p>
          )}
        </div>

        <div className="flex justify-end items-center gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="px-4 py-2 text-sm font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {isPending && (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            <span>Create Farm</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
