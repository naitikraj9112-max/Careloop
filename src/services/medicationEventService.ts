import { supabase } from '@/config/supabase';
import type {
  MedicationEvent,
  MedicationEventStatus,
  ConfirmationMethod,
  MedicationSchedule,
} from '@/types';
import { mapEventFromDb, mapEventToDb, mapScheduleFromDb } from '@/lib/mappers';

/**
 * Create a medication event with idempotency.
 * Uses `${scheduleId}_${scheduledAt}` as the primary key to prevent duplicates.
 */
export async function createEvent(
  data: Omit<MedicationEvent, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<MedicationEvent> {
  const deterministicId = `${data.scheduleId}_${data.scheduledAt}`;
  const now = new Date().toISOString();

  const event: MedicationEvent = {
    ...data,
    id: deterministicId,
    createdAt: now,
    updatedAt: now,
  };

  const { error } = await supabase
    .from('medication_events')
    .upsert(mapEventToDb(event));

  if (error) {
    throw error;
  }

  return event;
}

/**
 * Get a single event by ID.
 */
export async function getEvent(eventId: string): Promise<MedicationEvent | null> {
  const { data, error } = await supabase
    .from('medication_events')
    .select('*')
    .eq('id', eventId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapEventFromDb(data);
}

/**
 * Get events by patient, optionally filtered by date range.
 */
export async function getEventsByPatient(
  patientId: string,
  startDate?: string,
  endDate?: string,
): Promise<MedicationEvent[]> {
  let query = supabase
    .from('medication_events')
    .select('*')
    .eq('patient_id', patientId);

  if (startDate) {
    query = query.gte('scheduled_at', startDate);
  }
  if (endDate) {
    query = query.lte('scheduled_at', endDate);
  }

  query = query.order('scheduled_at', { ascending: true });

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching events by patient:', error);
    return [];
  }

  return (data || []).map(mapEventFromDb);
}

/**
 * Get events by schedule, optionally filtered by date range.
 */
export async function getEventsBySchedule(
  scheduleId: string,
  startDate?: string,
  endDate?: string,
): Promise<MedicationEvent[]> {
  let query = supabase
    .from('medication_events')
    .select('*')
    .eq('schedule_id', scheduleId);

  if (startDate) {
    query = query.gte('scheduled_at', startDate);
  }
  if (endDate) {
    query = query.lte('scheduled_at', endDate);
  }

  query = query.order('scheduled_at', { ascending: true });

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching events by schedule:', error);
    return [];
  }

  return (data || []).map(mapEventFromDb);
}

/**
 * Get today's events for a patient.
 */
export async function getTodayEvents(patientId: string): Promise<MedicationEvent[]> {
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999).toISOString();

  return getEventsByPatient(patientId, startOfDay, endOfDay);
}

/**
 * Update the status and confirmation fields of an event.
 */
export async function updateEventStatus(
  eventId: string,
  status: MedicationEventStatus,
  confirmedBy?: string,
  confirmationMethod?: ConfirmationMethod,
  notes?: string,
): Promise<void> {
  const now = new Date().toISOString();
  const updates: Partial<MedicationEvent> = {
    status,
    updatedAt: now,
  };

  if (confirmedBy !== undefined) updates.confirmedBy = confirmedBy;
  if (confirmationMethod !== undefined) updates.confirmationMethod = confirmationMethod;
  if (notes !== undefined) updates.notes = notes;

  if (confirmationMethod) {
    updates.confirmedAt = now;
  }

  const { error } = await supabase
    .from('medication_events')
    .update(mapEventToDb(updates))
    .eq('id', eventId);

  if (error) {
    throw error;
  }
}

/**
 * Get unacknowledged events (scheduled or reminder_sent) that are past their grace period.
 */
export async function getUnacknowledgedEvents(
  patientId: string,
): Promise<MedicationEvent[]> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('medication_events')
    .select('*')
    .eq('patient_id', patientId)
    .in('status', ['scheduled', 'reminder_sent'])
    .lt('scheduled_at', now);

  if (error) {
    console.error('Error fetching unacknowledged events:', error);
    return [];
  }

  return (data || []).map(mapEventFromDb);
}

export const getMedicationEvents = getEventsByPatient;

/**
 * Generate dose events for a specific date based on the schedule's times array.
 * Uses deterministic IDs: `${scheduleId}_${dateISO}T${time}:00.000Z`.
 */
export async function generateDoseEvents(
  scheduleId: string,
  date: Date,
): Promise<MedicationEvent[]> {
  const { data: scheduleData, error: scheduleError } = await supabase
    .from('medication_schedules')
    .select('*')
    .eq('id', scheduleId)
    .maybeSingle();

  if (scheduleError || !scheduleData) {
    throw new Error(`Schedule ${scheduleId} not found.`);
  }

  const schedule: MedicationSchedule = mapScheduleFromDb(scheduleData);
  const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
  const now = new Date().toISOString();
  const events: MedicationEvent[] = [];

  for (const time of schedule.times) {
    // Standardize time string "08:00" -> "YYYY-MM-DDT08:00:00.000Z"
    const scheduledAt = `${dateStr}T${time.length === 5 ? time + ':00.000Z' : time}`;
    const deterministicId = `${scheduleId}_${scheduledAt}`;

    const event: MedicationEvent = {
      id: deterministicId,
      patientId: schedule.patientId,
      medicationId: schedule.medicationId,
      scheduleId,
      scheduledAt,
      status: 'scheduled',
      createdAt: now,
      updatedAt: now,
    };

    const { error: upsertError } = await supabase
      .from('medication_events')
      .upsert(mapEventToDb(event));

    if (upsertError) {
      console.error('Error upserting dose event:', upsertError);
    } else {
      events.push(event);
    }
  }

  return events;
}

/**
 * Generate dose events for all schedules of a patient on a date.
 */
export async function generateEvents(
  patientId: string,
  dateInput: string | Date,
): Promise<MedicationEvent[]> {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;

  const { data: scheduleRows, error } = await supabase
    .from('medication_schedules')
    .select('*')
    .eq('patient_id', patientId)
    .eq('is_active', true);

  if (error || !scheduleRows) {
    console.error('Error fetching schedules to generate events:', error);
    return [];
  }

  const allEvents: MedicationEvent[] = [];
  for (const row of scheduleRows) {
    const evts = await generateDoseEvents(row.id, d);
    allEvents.push(...evts);
  }

  return allEvents;
}
