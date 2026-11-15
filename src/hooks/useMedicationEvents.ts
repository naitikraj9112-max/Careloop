import { useState, useEffect, useCallback, useMemo } from 'react';
import type { MedicationEvent, MedicationEventStatus, ConfirmationMethod } from '@/types';
import * as medicationEventService from '@/services/medicationEventService';

interface UseMedicationEventsReturn {
  events: MedicationEvent[];
  todayEvents: MedicationEvent[];
  loading: boolean;
  error: string | null;
  updateEventStatus: (
    eventId: string,
    status: MedicationEventStatus,
    confirmedBy?: string,
    confirmationMethod?: ConfirmationMethod,
    notes?: string
  ) => Promise<void>;
  generateEvents: (scheduleId: string, date: Date) => Promise<void>;
  refresh: () => Promise<void>;
}

function isToday(dateStr: string): boolean {
  const eventDate = new Date(dateStr);
  const now = new Date();
  return (
    eventDate.getFullYear() === now.getFullYear() &&
    eventDate.getMonth() === now.getMonth() &&
    eventDate.getDate() === now.getDate()
  );
}

export function useMedicationEvents(patientId: string | undefined): UseMedicationEventsReturn {
  const [events, setEvents] = useState<MedicationEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    if (!patientId) {
      setEvents([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await medicationEventService.getEventsByPatient(patientId);
      setEvents(data);
    } catch (err: any) {
      console.error('Failed to fetch medication events:', err);
      setError(err.message || 'Failed to load medication events');
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const todayEvents = useMemo(() => {
    return events.filter((e) => isToday(e.scheduledAt));
  }, [events]);

  const updateEventStatus = useCallback(
    async (
      eventId: string,
      status: MedicationEventStatus,
      confirmedBy?: string,
      confirmationMethod?: ConfirmationMethod,
      notes?: string
    ): Promise<void> => {
      await medicationEventService.updateEventStatus(eventId, status, confirmedBy, confirmationMethod, notes);
      setEvents((prev) =>
        prev.map((e) =>
          e.id === eventId
            ? {
                ...e,
                status,
                confirmationMethod: confirmationMethod || e.confirmationMethod,
                confirmedBy: confirmedBy || e.confirmedBy,
                confirmedAt: confirmedBy ? new Date().toISOString() : e.confirmedAt,
                notes: notes || e.notes,
                updatedAt: new Date().toISOString(),
              }
            : e
        )
      );
    },
    []
  );

  const generateEventsForSchedule = useCallback(
    async (scheduleId: string, date: Date): Promise<void> => {
      await medicationEventService.generateDoseEvents(scheduleId, date);
      await fetchEvents();
    },
    [fetchEvents]
  );

  return {
    events,
    todayEvents,
    loading,
    error,
    updateEventStatus,
    generateEvents: generateEventsForSchedule,
    refresh: fetchEvents,
  };
}
