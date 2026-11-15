import { supabase } from '@/config/supabase';
import type { Appointment } from '@/types';
import { generateId } from '@/lib/utils';
import { mapAppointmentFromDb, mapAppointmentToDb } from '@/lib/mappers';

export async function createAppointment(
  data: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<Appointment> {
  const id = generateId();
  const now = new Date().toISOString();

  const appointment: Appointment = {
    ...data,
    id,
    createdAt: now,
    updatedAt: now,
  };

  const { error } = await supabase
    .from('appointments')
    .insert(mapAppointmentToDb(appointment));

  if (error) {
    throw error;
  }

  return appointment;
}

export async function getAppointment(appointmentId: string): Promise<Appointment | null> {
  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .eq('id', appointmentId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapAppointmentFromDb(data);
}

export async function getAppointments(patientId: string): Promise<Appointment[]> {
  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .eq('patient_id', patientId)
    .order('scheduled_at', { ascending: true });

  if (error) {
    console.error('Error fetching appointments:', error);
    return [];
  }

  return (data || []).map(mapAppointmentFromDb);
}

export const getAppointmentsByPatient = getAppointments;

export async function getUpcomingAppointments(patientId: string): Promise<Appointment[]> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .eq('patient_id', patientId)
    .eq('status', 'scheduled')
    .gte('scheduled_at', now)
    .order('scheduled_at', { ascending: true });

  if (error) {
    console.error('Error fetching upcoming appointments:', error);
    return [];
  }

  return (data || []).map(mapAppointmentFromDb);
}

export async function updateAppointment(
  appointmentId: string,
  data: Partial<Omit<Appointment, 'id' | 'createdAt'>>,
): Promise<void> {
  const now = new Date().toISOString();
  const dbData = mapAppointmentToDb({ ...data, updatedAt: now });

  const { error } = await supabase
    .from('appointments')
    .update(dbData)
    .eq('id', appointmentId);

  if (error) {
    throw error;
  }
}

export async function cancelAppointment(appointmentId: string): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('appointments')
    .update({
      status: 'cancelled',
      updated_at: now,
    })
    .eq('id', appointmentId);

  if (error) {
    throw error;
  }
}
