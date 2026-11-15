import { useState, useEffect, useCallback } from 'react';
import { MedicationSchedule } from '@/types';
import * as scheduleService from '@/services/scheduleService';

interface UseSchedulesReturn {
  schedules: MedicationSchedule[];
  loading: boolean;
  error: string | null;
  createSchedule: (data: Omit<MedicationSchedule, 'id' | 'createdAt' | 'updatedAt'>) => Promise<MedicationSchedule>;
  updateSchedule: (id: string, data: Partial<MedicationSchedule>) => Promise<void>;
  deactivateSchedule: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useSchedules(patientId: string | undefined): UseSchedulesReturn {
  const [schedules, setSchedules] = useState<MedicationSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSchedules = useCallback(async () => {
    if (!patientId) {
      setSchedules([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await scheduleService.getSchedules(patientId);
      setSchedules(data);
    } catch (err: any) {
      console.error('Failed to fetch schedules:', err);
      setError(err.message || 'Failed to load schedules');
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  const createSchedule = useCallback(
    async (data: Omit<MedicationSchedule, 'id' | 'createdAt' | 'updatedAt'>): Promise<MedicationSchedule> => {
      const newSchedule = await scheduleService.createSchedule(data);
      setSchedules((prev) => [...prev, newSchedule]);
      return newSchedule;
    },
    []
  );

  const updateSchedule = useCallback(
    async (id: string, data: Partial<MedicationSchedule>): Promise<void> => {
      await scheduleService.updateSchedule(id, data);
      setSchedules((prev) =>
        prev.map((s) => (s.id === id ? { ...s, ...data, updatedAt: new Date().toISOString() } : s))
      );
    },
    []
  );

  const deactivateSchedule = useCallback(
    async (id: string): Promise<void> => {
      await scheduleService.deactivateSchedule(id);
      setSchedules((prev) =>
        prev.map((s) =>
          s.id === id ? { ...s, isActive: false, updatedAt: new Date().toISOString() } : s
        )
      );
    },
    []
  );

  return {
    schedules,
    loading,
    error,
    createSchedule,
    updateSchedule,
    deactivateSchedule,
    refresh: fetchSchedules,
  };
}
