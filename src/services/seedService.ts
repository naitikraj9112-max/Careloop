import { createPatient } from './patientService';
import { createMedication } from './medicationService';
import { createSchedule } from './scheduleService';
import { createEvent, updateEventStatus } from './medicationEventService';
import { createAppointment } from './appointmentService';
import { inviteMember } from './membershipService';
import { logAction } from './auditService';
import { createNotification } from './notificationService';
import type { Patient } from '@/types';

/**
 * Seed fictional, comprehensive demo data for CareLoop demo (§14 in CLAUDE.md)
 */
export async function seedDemoData(userId: string, userName: string): Promise<Patient> {
  // 1. Create fictional patient profile: Eleanor Vance
  const patient = await createPatient(
    {
      name: 'Eleanor Vance',
      dateOfBirth: '1948-03-12',
      gender: 'Female',
      bloodType: 'O+',
      allergies: ['Penicillin', 'Sulfa drugs'],
      emergencyContact: {
        name: 'David Vance (Son)',
        phone: '+1 (555) 019-2834',
        relationship: 'Son / Primary Caregiver',
      },
      primaryUserId: userId,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    },
    userId,
  );

  await logAction({
    actorId: userId,
    actorName: userName,
    action: 'patient_created',
    targetType: 'patient',
    targetId: patient.id,
    patientId: patient.id,
    details: { name: patient.name, note: 'Initial patient profile created' },
  });

  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];

  // 2. Create Medications
  const metformin = await createMedication({
    patientId: patient.id,
    name: 'Metformin',
    genericName: 'Metformin Hydrochloride',
    dosage: '500mg',
    form: 'tablet',
    instructions: 'Take with food to reduce stomach upset. Once with breakfast, once with dinner.',
    sideEffects: 'Mild nausea, upset stomach initially',
    prescribedBy: 'Dr. Sarah Chen, Endocrinologist',
    startDate: dateStr,
    isActive: true,
    createdBy: userId,
  });

  const lisinopril = await createMedication({
    patientId: patient.id,
    name: 'Lisinopril',
    genericName: 'Lisinopril',
    dosage: '10mg',
    form: 'tablet',
    instructions: 'Take once daily in the morning with a full glass of water.',
    sideEffects: 'Dizziness upon standing, dry cough',
    prescribedBy: 'Dr. Robert Martinez, Cardiologist',
    startDate: dateStr,
    isActive: true,
    createdBy: userId,
  });

  const atorvastatin = await createMedication({
    patientId: patient.id,
    name: 'Atorvastatin',
    genericName: 'Atorvastatin Calcium',
    dosage: '20mg',
    form: 'tablet',
    instructions: 'Take once in the evening before bed.',
    sideEffects: 'Mild muscle ache',
    prescribedBy: 'Dr. Robert Martinez, Cardiologist',
    startDate: dateStr,
    isActive: true,
    createdBy: userId,
  });

  // 3. Create Schedules
  const schedMetformin = await createSchedule({
    patientId: patient.id,
    medicationId: metformin.id,
    frequency: 'twice_daily',
    times: ['08:00', '19:00'],
    gracePeriodMinutes: 30,
    escalationDelayMinutes: 45,
    isActive: true,
    createdBy: userId,
  });

  const schedLisinopril = await createSchedule({
    patientId: patient.id,
    medicationId: lisinopril.id,
    frequency: 'daily',
    times: ['08:00'],
    gracePeriodMinutes: 30,
    escalationDelayMinutes: 60,
    isActive: true,
    createdBy: userId,
  });

  const schedAtorvastatin = await createSchedule({
    patientId: patient.id,
    medicationId: atorvastatin.id,
    frequency: 'daily',
    times: ['21:00'],
    gracePeriodMinutes: 45,
    escalationDelayMinutes: 60,
    isActive: true,
    createdBy: userId,
  });

  // 4. Create Today's Dose Events
  // Morning Metformin - Marked as Taken (Self-reported)
  const morningMetformin = await createEvent({
    patientId: patient.id,
    medicationId: metformin.id,
    scheduleId: schedMetformin.id,
    scheduledAt: `${dateStr}T08:00:00.000Z`,
    status: 'scheduled',
  });
  await updateEventStatus(
    morningMetformin.id,
    'taken_self_reported',
    userId,
    'self_report',
    'Taken after oatmeal breakfast without issues.',
  );

  // Morning Lisinopril - Marked as Taken (Self-reported)
  const morningLisinopril = await createEvent({
    patientId: patient.id,
    medicationId: lisinopril.id,
    scheduleId: schedLisinopril.id,
    scheduledAt: `${dateStr}T08:00:00.000Z`,
    status: 'scheduled',
  });
  await updateEventStatus(
    morningLisinopril.id,
    'taken_self_reported',
    userId,
    'self_report',
    'Taken with full glass of water.',
  );

  // Evening Metformin - Scheduled (upcoming)
  await createEvent({
    patientId: patient.id,
    medicationId: metformin.id,
    scheduleId: schedMetformin.id,
    scheduledAt: `${dateStr}T19:00:00.000Z`,
    status: 'scheduled',
  });

  // Night Atorvastatin - Scheduled (upcoming)
  await createEvent({
    patientId: patient.id,
    medicationId: atorvastatin.id,
    scheduleId: schedAtorvastatin.id,
    scheduledAt: `${dateStr}T21:00:00.000Z`,
    status: 'scheduled',
  });

  // 5. Create Appointments
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  await createAppointment({
    patientId: patient.id,
    title: 'Cardiology 6-Month Review',
    description: 'Routine blood pressure assessment, review ECG and medication effectiveness.',
    doctorName: 'Dr. Robert Martinez',
    location: 'Metropolitan Heart Institute, Suite 402',
    scheduledAt: `${tomorrowStr}T10:30:00.000Z`,
    durationMinutes: 45,
    status: 'scheduled',
    reminderMinutesBefore: 120,
    notes: 'Please bring current medication bottles and morning BP log.',
    createdBy: userId,
  });

  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const nextWeekStr = nextWeek.toISOString().split('T')[0];

  await createAppointment({
    patientId: patient.id,
    title: 'HbA1c & Comprehensive Metabolic Panel',
    description: 'Fasting blood draw for diabetes monitoring.',
    doctorName: 'Central Diagnostic Lab',
    location: 'Building B, 1st Floor Outpatient Lab',
    scheduledAt: `${nextWeekStr}T08:15:00.000Z`,
    durationMinutes: 30,
    status: 'scheduled',
    reminderMinutesBefore: 1440,
    notes: 'Fasting required for 10 hours prior. Sips of water are okay.',
    createdBy: userId,
  });

  // 6. CareCircle Member Invitation (Caretaker)
  await inviteMember(
    patient.id,
    'caretaker.marcus@example.com',
    'caretaker',
    ['view_schedule', 'record_dose', 'view_adherence', 'manage_appointments'],
    userId,
  );

  // 7. Initial Welcome Notification
  await createNotification({
    recipientId: userId,
    patientId: patient.id,
    type: 'system',
    title: 'Demo Profile Active',
    message: `Eleanor Vance has been initialized with medications, schedules, and upcoming appointments.`,
    isRead: false,
  });

  return patient;
}
