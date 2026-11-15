import { supabase } from '@/config/supabase';
import type { Patient, CaregiverMembership, Permission } from '@/types';
import { generateId } from '@/lib/utils';
import { mapPatientFromDb, mapPatientToDb, mapMembershipToDb } from '@/lib/mappers';

const ALL_PERMISSIONS: Permission[] = [
  'view_schedule',
  'manage_medications',
  'record_dose',
  'view_adherence',
  'manage_appointments',
  'manage_members',
  'view_audit_log',
  'manage_patient_profile',
];

/**
 * Create a patient and auto-create a family_admin membership for the creator.
 */
export async function createPatient(
  data: Omit<Patient, 'id' | 'createdAt' | 'updatedAt'>,
  creatorId: string,
): Promise<Patient> {
  const patientId = generateId();
  const uniqueCode = `CARE-${patientId.replace(/-/g, '').slice(0, 6).toUpperCase()}`;
  const now = new Date().toISOString();

  const patient: Patient = {
    ...data,
    id: patientId,
    uniquePatientId: uniqueCode,
    patientPin: data.patientPin || '1234',
    createdAt: now,
    updatedAt: now,
  };

  const { error: patientError } = await supabase
    .from('patients')
    .insert(mapPatientToDb(patient));

  if (patientError) {
    throw patientError;
  }

  // Auto-create membership for the creator
  const membershipId = generateId();
  const membership: CaregiverMembership = {
    id: membershipId,
    patientId,
    userId: creatorId,
    role: 'family_admin',
    permissions: ALL_PERMISSIONS,
    status: 'active',
    invitedBy: creatorId,
    invitedAt: now,
    acceptedAt: now,
    createdAt: now,
    updatedAt: now,
  };

  const { error: memberError } = await supabase
    .from('memberships')
    .insert(mapMembershipToDb(membership));

  if (memberError) {
    console.error('Failed to create creator membership:', memberError);
  }

  return patient;
}

/**
 * Find patient by Unique Code (e.g. CARE-14EC01), UUID, or Email
 */
export async function findPatientByCodeOrId(query: string): Promise<Patient | null> {
  const clean = query.trim();
  if (!clean) return null;

  // 1. Try exact ID lookup first
  const { data: exactMatch } = await supabase
    .from('patients')
    .select('*')
    .eq('id', clean)
    .maybeSingle();

  if (exactMatch) return mapPatientFromDb(exactMatch);

  // 2. Fetch all patients to match code or email or partial ID
  const { data: allPatients } = await supabase
    .from('patients')
    .select('*');

  if (allPatients && allPatients.length > 0) {
    const uppercaseClean = clean.toUpperCase();
    const matched = allPatients.find((p) => {
      const code = (p.emergency_contact?.uniquePatientId || `CARE-${p.id.replace(/-/g, '').slice(0, 6)}`).toUpperCase();
      if (code === uppercaseClean || code.replace('CARE-', '') === uppercaseClean.replace('CARE-', '')) {
        return true;
      }
      if (p.id.toLowerCase().startsWith(clean.toLowerCase())) {
        return true;
      }
      if (p.emergency_contact?.email && p.emergency_contact.email.toLowerCase() === clean.toLowerCase()) {
        return true;
      }
      if (p.name.toLowerCase() === clean.toLowerCase()) {
        return true;
      }
      return false;
    });

    if (matched) return mapPatientFromDb(matched);
  }

  return null;
}

/**
 * Set or reset a senior patient's login PIN / password and optional email
 */
export async function setPatientPin(
  patientId: string,
  pin: string,
  email?: string
): Promise<void> {
  const patient = await getPatient(patientId);
  if (!patient) throw new Error('Patient profile not found');

  const cleanPin = pin.trim();
  if (!cleanPin) throw new Error('PIN / password cannot be empty');

  const updatedContact = {
    ...(patient.emergencyContact || {
      name: 'Family Admin',
      phone: '',
      relationship: 'Primary Caregiver',
    }),
    patientPin: cleanPin,
    uniquePatientId:
      patient.uniquePatientId || `CARE-${patient.id.replace(/-/g, '').slice(0, 6).toUpperCase()}`,
    ...(email ? { patientEmail: email.trim(), email: email.trim() } : {}),
  };

  const now = new Date().toISOString();
  const { error } = await supabase
    .from('patients')
    .update({
      emergency_contact: updatedContact,
      updated_at: now,
    })
    .eq('id', patientId);

  if (error) throw error;
}

/**
 * Verify senior patient credentials using Unique ID or Gmail/Email + PIN
 */
export async function verifyPatientCredentials(
  identifier: string,
  enteredPin: string
): Promise<{ success: boolean; patient: Patient | null; error?: string }> {
  const patient = await findPatientByCodeOrId(identifier);
  if (!patient) {
    return { success: false, patient: null, error: 'Patient ID or email not found in CareLoop records' };
  }

  const expectedPin = patient.patientPin || patient.emergencyContact?.patientPin || '1234';
  if (enteredPin.trim() === expectedPin.trim()) {
    return { success: true, patient };
  }

  return { success: false, patient: null, error: 'Incorrect PIN or password for this senior patient' };
}

/**
 * Fetch a single patient by ID.
 */
export async function getPatient(patientId: string): Promise<Patient | null> {
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .eq('id', patientId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching patient:', error);
    return null;
  }

  return data ? mapPatientFromDb(data) : null;
}

/**
 * Update a patient record.
 */
export async function updatePatient(
  patientId: string,
  data: Partial<Omit<Patient, 'id' | 'createdAt'>>,
): Promise<void> {
  const now = new Date().toISOString();
  const dbData = mapPatientToDb({ ...data, updatedAt: now });

  const { error } = await supabase
    .from('patients')
    .update(dbData)
    .eq('id', patientId);

  if (error) {
    throw error;
  }
}

/**
 * Get all patients that a user has an active membership for.
 */
export async function getPatientsByUser(userId: string): Promise<Patient[]> {
  const { data: memberRows, error: memberError } = await supabase
    .from('memberships')
    .select('patient_id')
    .eq('user_id', userId)
    .eq('status', 'active');

  if (memberError) {
    console.error('Error fetching memberships for user:', memberError);
    return [];
  }

  if (!memberRows || memberRows.length === 0) {
    return [];
  }

  const patientIds = memberRows.map((m) => m.patient_id);
  const { data: patientRows, error: patientsError } = await supabase
    .from('patients')
    .select('*')
    .in('id', patientIds);

  if (patientsError) {
    console.error('Error fetching patients:', patientsError);
    return [];
  }

  return (patientRows || []).map(mapPatientFromDb);
}

/**
 * Delete a patient record.
 */
export async function deletePatient(patientId: string): Promise<void> {
  const { error } = await supabase
    .from('patients')
    .delete()
    .eq('id', patientId);

  if (error) {
    throw error;
  }
}
