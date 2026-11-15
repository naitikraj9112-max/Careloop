import { supabase } from '@/config/supabase';
import type { Medication } from '@/types';
import { generateId } from '@/lib/utils';
import { mapMedicationFromDb, mapMedicationToDb } from '@/lib/mappers';

/**
 * Create a medication record.
 */
export async function createMedication(
  data: Omit<Medication, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<Medication> {
  const id = generateId();
  const now = new Date().toISOString();

  const medication: Medication = {
    ...data,
    id,
    createdAt: now,
    updatedAt: now,
  };

  const { error } = await supabase
    .from('medications')
    .insert(mapMedicationToDb(medication));

  if (error) {
    throw error;
  }

  return medication;
}

/**
 * Get a single medication by ID.
 */
export async function getMedication(medicationId: string): Promise<Medication | null> {
  const { data, error } = await supabase
    .from('medications')
    .select('*')
    .eq('id', medicationId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapMedicationFromDb(data);
}

/**
 * Get all medications for a patient.
 */
export async function getMedicationsByPatient(patientId: string): Promise<Medication[]> {
  const { data, error } = await supabase
    .from('medications')
    .select('*')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching medications for patient:', error);
    return [];
  }

  return (data || []).map(mapMedicationFromDb);
}

export const getMedications = getMedicationsByPatient;

/**
 * Update a medication record.
 */
export async function updateMedication(
  medicationId: string,
  data: Partial<Omit<Medication, 'id' | 'createdAt'>>,
): Promise<void> {
  const now = new Date().toISOString();
  const dbData = mapMedicationToDb({ ...data, updatedAt: now });

  const { error } = await supabase
    .from('medications')
    .update(dbData)
    .eq('id', medicationId);

  if (error) {
    throw error;
  }
}

/**
 * Soft-delete a medication by setting isActive to false.
 */
export async function deleteMedication(medicationId: string): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('medications')
    .update({
      is_active: false,
      updated_at: now,
    })
    .eq('id', medicationId);

  if (error) {
    throw error;
  }
}
