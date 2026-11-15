import { useState, useEffect, useCallback, useMemo } from 'react';
import { Appointment } from '@/types';
import * as appointmentService from '@/services/appointmentService';

interface UseAppointmentsReturn {
  appointments: Appointment[];
  upcomingAppointments: Appointment[];
  loading: boolean;
  error: string | null;
  createAppointment: (data: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Appointment>;
  updateAppointment: (id: string, data: Partial<Appointment>) => Promise<void>;
  cancelAppointment: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useAppointments(patientId: string | undefined): UseAppointmentsReturn {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAppointments = useCallback(async () => {
    if (!patientId) {
      setAppointments([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await appointmentService.getAppointments(patientId);
      setAppointments(data);
    } catch (err: any) {
      console.error('Failed to fetch appointments:', err);
      setError(err.message || 'Failed to load appointments');
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const upcomingAppointments = useMemo(() => {
    const now = new Date();
    return appointments
      .filter((a) => a.status === 'scheduled' && new Date(a.scheduledAt) > now)
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
  }, [appointments]);

  const createAppointment = useCallback(
    async (data: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'>): Promise<Appointment> => {
      const newAppointment = await appointmentService.createAppointment(data);
      setAppointments((prev) => [...prev, newAppointment]);
      return newAppointment;
    },
    []
  );

  const updateAppointment = useCallback(
    async (id: string, data: Partial<Appointment>): Promise<void> => {
      await appointmentService.updateAppointment(id, data);
      setAppointments((prev) =>
        prev.map((a) => (a.id === id ? { ...a, ...data, updatedAt: new Date().toISOString() } : a))
      );
    },
    []
  );

  const cancelAppointment = useCallback(
    async (id: string): Promise<void> => {
      await appointmentService.cancelAppointment(id);
      setAppointments((prev) =>
        prev.map((a) =>
          a.id === id
            ? { ...a, status: 'cancelled' as const, updatedAt: new Date().toISOString() }
            : a
        )
      );
    },
    []
  );

  return {
    appointments,
    upcomingAppointments,
    loading,
    error,
    createAppointment,
    updateAppointment,
    cancelAppointment,
    refresh: fetchAppointments,
  };
}
