import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  type Farm,
  type FarmRole,
  type FarmMember,
  ApiError,
} from '../types';
import { useMembers, useAddMember } from '../hooks';
import { DataTable, type Column } from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { useToast } from '../components/Toast';
import {
  UserPlus,
  Mail,
  ShieldAlert,
} from 'lucide-react';

const addMemberSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  role: z.enum(['admin', 'viewer']),
});

type AddMemberFormValues = z.infer<typeof addMemberSchema>;

export function getDisplayName(member?: FarmMember | null): string {
  if (!member) return 'Unknown user';
  if (member.displayName && typeof member.displayName === 'string' && member.displayName.trim()) {
    return member.displayName.trim();
  }
  if (member.name && typeof member.name === 'string' && member.name.trim()) {
    return member.name.trim();
  }
  if (member.email && typeof member.email === 'string' && member.email.trim()) {
    return member.email.trim();
  }
  const id = member.userId || member.uid || member.id;
  if (id && typeof id === 'string' && id.trim()) {
    return id.trim().slice(0, 8);
  }
  return 'Unknown user';
}

export function getInitial(name?: string | null): string {
  if (!name || typeof name !== 'string' || !name.trim()) {
    return '?';
  }
  return name.trim().charAt(0).toUpperCase();
}

export function formatJoinedAt(dateStr?: string | null): string {
  if (!dateStr || typeof dateStr !== 'string') return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString();
}

export const Members: React.FC = () => {
  const { currentFarm, role } = useOutletContext<{ currentFarm: Farm; role: FarmRole }>();
  const farmId = currentFarm?.id;
  const isOwner = role === 'owner';
  const isViewer = role === 'viewer';
  const toast = useToast();

  const { data: members = [], isLoading, refetch } = useMembers(farmId);
  const { mutateAsync: addMember, isPending: isAdding } = useAddMember(farmId);

  const [modalOpen, setModalOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AddMemberFormValues>({
    resolver: zodResolver(addMemberSchema),
    defaultValues: {
      email: '',
      role: 'viewer',
    },
  });

  const onSubmit = async (values: AddMemberFormValues) => {
    try {
      await addMember({
        email: values.email.trim(),
        role: values.role,
      });

      toast.success(
        'Member Added',
        `Successfully added ${values.email} as ${values.role} to ${currentFarm?.name}.`
      );
      reset();
      setModalOpen(false);
      refetch();
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.statusCode === 404) {
          toast.error(
            'User Not Found',
            'No registered Firebase account found with this email. The user must first register an account.'
          );
          return;
        }
        if (err.statusCode === 409) {
          toast.error(
            'Already a Member',
            'This user is already a member or collaborator on this farm.'
          );
          return;
        }
        if (err.statusCode === 403) {
          toast.error(
            'Permission Denied',
            'Only the farm owner has permission to invite or add members.'
          );
          return;
        }
      }

      const msg = err instanceof Error ? err.message : 'Failed to add member';
      toast.error('Add Member Failed', msg);
    }
  };

  const columns: Column<FarmMember>[] = [
    {
      header: 'Member',
      accessor: (m) => {
        const displayName = getDisplayName(m);
        const initial = getInitial(displayName);
        const subtext = m.email || m.userId || m.uid || m.id || '-';
        return (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs uppercase">
              {initial}
            </div>
            <div>
              <span className="font-semibold text-slate-800 text-xs block">{displayName}</span>
              <span className="text-[10px] text-slate-400 font-mono">{subtext}</span>
            </div>
          </div>
        );
      },
    },
    {
      header: 'Farm Role',
      accessor: (m) => <StatusBadge status={m.role} size="sm" />,
    },
    {
      header: 'Permissions',
      accessor: (m) => (
        <span className="text-xs text-slate-500">
          {m.role === 'owner'
            ? 'Full Control & Member Management'
            : m.role === 'admin'
            ? 'Actuator Commands & Device Configuration'
            : 'Read-only Telemetry & Analytics'}
        </span>
      ),
    },
    {
      header: 'Joined Date',
      accessor: (m) => (
        <span className="text-xs text-slate-500">
          {formatJoinedAt(m.joinedAt || m.addedAt)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Farm Members</h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage authorized collaborators, operators, and viewers for {currentFarm?.name}.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isOwner ? (
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add Member</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 px-3.5 py-2 bg-slate-100 border border-slate-200 text-slate-600 rounded-xl text-xs">
              <ShieldAlert className="w-4 h-4 text-slate-500" />
              <span>
                {isViewer ? 'Viewer (Read-only)' : 'Admin (Member invites restricted to Owner)'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Members DataTable */}
      <DataTable
        columns={columns}
        data={members}
        keyExtractor={(m) => m.userId || m.uid || m.id || Math.random().toString()}
        loading={isLoading}
        emptyMessage="No members listed for this farm."
      />

      {/* Add Member Modal (Owner Only) */}
      <Modal
        isOpen={modalOpen}
        onClose={() => {
          reset();
          setModalOpen(false);
        }}
        title="Add Farm Member"
        description="Invite an existing user to collaborate on this farm."
        maxWidth="md"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              User Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                {...register('email')}
                placeholder="colleague@krishiva.com"
                className="w-full pl-10 pr-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              />
            </div>
            {errors.email && (
              <p className="mt-1 text-xs text-rose-500 font-medium">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Role Assignment
            </label>
            <select
              {...register('role')}
              className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 capitalize"
            >
              <option value="viewer">Viewer (Read-only telemetry, no actuator control)</option>
              <option value="admin">Admin (Can send actuator commands, register devices, manage schedules)</option>
            </select>
          </div>

          <div className="flex justify-end items-center gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                reset();
                setModalOpen(false);
              }}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isAdding}
              className="px-4 py-2 text-sm font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {isAdding && (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              <span>Add Member</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
