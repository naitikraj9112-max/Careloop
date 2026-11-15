import { supabase } from '@/config/supabase';
import type { MedicationSchedule } from '@/types';
import { generateId } from '@/lib/utils';
import { mapScheduleFromDb, mapScheduleToDb } from '@/lib/mappers';

/**
 * Create a medication schedule.
 */
export async function createSchedule(
  data: Omit<MedicationSchedule, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<MedicationSchedule> {
  const id = generateId();
  const now = new Date().toISOString();

  const schedule: MedicationSchedule = {
    ...data,
    id,
    createdAt: now,
    updatedAt: now,
  };

  const { error } = await supabase
    .from('medication_schedules')
    .insert(mapScheduleToDb(schedule));

  if (error) {
    throw error;
  }

  return schedule;
}

/**
 * Get a single schedule by ID.
 */
export async function getSchedule(scheduleId: string): Promise<MedicationSchedule | null> {
  const { data, error } = await supabase
    .from('medication_schedules')
    .select('*')
    .eq('id', scheduleId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapScheduleFromDb(data);
}

/**
 * Get all schedules for a patient.
 */
export async function getSchedulesByPatient(patientId: string): Promise<MedicationSchedule[]> {
  const { data, error } = await supabase
    .from('medication_schedules')
    .select('*')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching schedules for patient:', error);
    return [];
  }

  return (data || []).map(mapScheduleFromDb);
}

export const getSchedules = getSchedulesByPatient;

/**
 * Get all schedules for a specific medication.
 */
export async function getSchedulesByMedication(medicationId: string): Promise<MedicationSchedule[]> {
  const { data, error } = await supabase
    .from('medication_schedules')
    .select('*')
    .eq('medication_id', medicationId);

  if (error) {
    console.error('Error fetching schedules for medication:', error);
    return [];
  }

  return (data || []).map(mapScheduleFromDb);
}

/**
 * Update a schedule record.
 */
export async function updateSchedule(
  scheduleId: string,
  data: Partial<Omit<MedicationSchedule, 'id' | 'createdAt'>>,
): Promise<void> {
  const now = new Date().toISOString();
  const dbData = mapScheduleToDb({ ...data, updatedAt: now });

  const { error } = await supabase
    .from('medication_schedules')
    .update(dbData)
    .eq('id', scheduleId);

  if (error) {
    throw error;
  }
}

/**
 * Deactivate a schedule by setting isActive to false.
 */
export async function deactivateSchedule(scheduleId: string): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('medication_schedules')
    .update({
      is_active: false,
      updated_at: now,
    })
    .eq('id', scheduleId);

  if (error) {
    throw error;
  }
}
