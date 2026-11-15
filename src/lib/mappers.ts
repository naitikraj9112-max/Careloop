import type {
  UserProfile,
  Patient,
  CaregiverMembership,
  Medication,
  MedicationSchedule,
  MedicationEvent,
  Appointment,
  Notification,
  AuditLog,
  HealthObservation,
} from '@/types';

// User Profile
export function mapUserFromDb(row: any): UserProfile {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name || '',
    phone: row.phone || undefined,
    photoURL: row.photo_url || undefined,
    defaultRole: row.default_role || undefined,
    timezone: row.timezone || 'UTC',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapUserToDb(profile: Partial<UserProfile>): any {
  const row: any = {};
  if (profile.id !== undefined) row.id = profile.id;
  if (profile.email !== undefined) row.email = profile.email;
  if (profile.displayName !== undefined) row.display_name = profile.displayName;
  if (profile.phone !== undefined) row.phone = profile.phone;
  if (profile.photoURL !== undefined) row.photo_url = profile.photoURL;
  if (profile.defaultRole !== undefined) row.default_role = profile.defaultRole;
  if (profile.timezone !== undefined) row.timezone = profile.timezone;
  if (profile.createdAt !== undefined) row.created_at = profile.createdAt;
  if (profile.updatedAt !== undefined) row.updated_at = profile.updatedAt;
  return row;
}

// Patient
export function mapPatientFromDb(row: any): Patient {
  const rawContact = row.emergency_contact;
  const uniquePatientId =
    rawContact?.uniquePatientId ||
    `CARE-${(row.id || '').replace(/-/g, '').slice(0, 6).toUpperCase()}`;

  const patientPin = rawContact?.patientPin || '1234';

  return {
    id: row.id,
    name: row.name,
    uniquePatientId,
    patientPin,
    dateOfBirth: row.date_of_birth || undefined,
    gender: row.gender || undefined,
    bloodType: row.blood_type || undefined,
    allergies: Array.isArray(row.allergies) ? row.allergies : [],
    emergencyContact: rawContact
      ? {
          ...rawContact,
          uniquePatientId: rawContact.uniquePatientId || uniquePatientId,
          patientPin,
        }
      : undefined,
    primaryUserId: row.primary_user_id,
    timezone: row.timezone || 'UTC',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapPatientToDb(patient: Partial<Patient>): any {
  const row: any = {};
  if (patient.id !== undefined) row.id = patient.id;
  if (patient.name !== undefined) row.name = patient.name;
  if (patient.dateOfBirth !== undefined) row.date_of_birth = patient.dateOfBirth;
  if (patient.gender !== undefined) row.gender = patient.gender;
  if (patient.bloodType !== undefined) row.blood_type = patient.bloodType;
  if (patient.allergies !== undefined) row.allergies = patient.allergies;
  
  const uniqueCode =
    patient.uniquePatientId ||
    (patient.id ? `CARE-${patient.id.replace(/-/g, '').slice(0, 6).toUpperCase()}` : undefined);

  const pin = patient.patientPin || patient.emergencyContact?.patientPin || '1234';

  if (patient.emergencyContact !== undefined || uniqueCode || pin) {
    row.emergency_contact = {
      ...(patient.emergencyContact || {
        name: 'Family Admin',
        phone: '',
        relationship: 'Primary Caregiver',
      }),
      uniquePatientId: uniqueCode || patient.emergencyContact?.uniquePatientId,
      patientPin: pin,
    };
  }

  if (patient.primaryUserId !== undefined) row.primary_user_id = patient.primaryUserId;
  if (patient.timezone !== undefined) row.timezone = patient.timezone;
  if (patient.createdAt !== undefined) row.created_at = patient.createdAt;
  if (patient.updatedAt !== undefined) row.updated_at = patient.updatedAt;
  return row;
}

// Membership
export function mapMembershipFromDb(row: any): CaregiverMembership {
  return {
    id: row.id,
    patientId: row.patient_id,
    userId: row.user_id || '',
    role: row.role,
    permissions: Array.isArray(row.permissions) ? row.permissions : [],
    status: row.status,
    invitedBy: row.invited_by,
    invitedAt: row.invited_at,
    invitationToken: row.invitation_token || undefined,
    tokenExpiresAt: row.token_expires_at || undefined,
    acceptedAt: row.accepted_at || undefined,
    revokedAt: row.revoked_at || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapMembershipToDb(m: Partial<CaregiverMembership>): any {
  const row: any = {};
  if (m.id !== undefined) row.id = m.id;
  if (m.patientId !== undefined) row.patient_id = m.patientId;
  if (m.userId !== undefined) row.user_id = m.userId;
  if (m.role !== undefined) row.role = m.role;
  if (m.permissions !== undefined) row.permissions = m.permissions;
  if (m.status !== undefined) row.status = m.status;
  if (m.invitedBy !== undefined) row.invited_by = m.invitedBy;
  if (m.invitedAt !== undefined) row.invited_at = m.invitedAt;
  if (m.invitationToken !== undefined) row.invitation_token = m.invitationToken;
  if (m.tokenExpiresAt !== undefined) row.token_expires_at = m.tokenExpiresAt;
  if (m.acceptedAt !== undefined) row.accepted_at = m.acceptedAt;
  if (m.revokedAt !== undefined) row.revoked_at = m.revokedAt;
  if (m.createdAt !== undefined) row.created_at = m.createdAt;
  if (m.updatedAt !== undefined) row.updated_at = m.updatedAt;
  return row;
}

// Medication
export function mapMedicationFromDb(row: any): Medication {
  return {
    id: row.id,
    patientId: row.patient_id,
    name: row.name,
    genericName: row.generic_name || undefined,
    dosage: row.dosage,
    form: row.form,
    instructions: row.instructions || undefined,
    sideEffects: row.side_effects || undefined,
    prescribedBy: row.prescribed_by || undefined,
    startDate: row.start_date,
    endDate: row.end_date || undefined,
    isActive: row.is_active ?? true,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapMedicationToDb(m: Partial<Medication>): any {
  const row: any = {};
  if (m.id !== undefined) row.id = m.id;
  if (m.patientId !== undefined) row.patient_id = m.patientId;
  if (m.name !== undefined) row.name = m.name;
  if (m.genericName !== undefined) row.generic_name = m.genericName;
  if (m.dosage !== undefined) row.dosage = m.dosage;
  if (m.form !== undefined) row.form = m.form;
  if (m.instructions !== undefined) row.instructions = m.instructions;
  if (m.sideEffects !== undefined) row.side_effects = m.sideEffects;
  if (m.prescribedBy !== undefined) row.prescribed_by = m.prescribedBy;
  if (m.startDate !== undefined) row.start_date = m.startDate;
  if (m.endDate !== undefined) row.end_date = m.endDate;
  if (m.isActive !== undefined) row.is_active = m.isActive;
  if (m.createdBy !== undefined) row.created_by = m.createdBy;
  if (m.createdAt !== undefined) row.created_at = m.createdAt;
  if (m.updatedAt !== undefined) row.updated_at = m.updatedAt;
  return row;
}

// MedicationSchedule
export function mapScheduleFromDb(row: any): MedicationSchedule {
  return {
    id: row.id,
    patientId: row.patient_id,
    medicationId: row.medication_id,
    frequency: row.frequency,
    times: Array.isArray(row.times) ? row.times : [],
    daysOfWeek: Array.isArray(row.days_of_week) ? row.days_of_week : undefined,
    gracePeriodMinutes: row.grace_period_minutes ?? 30,
    escalationDelayMinutes: row.escalation_delay_minutes ?? 60,
    escalationContactId: row.escalation_contact_id || undefined,
    isActive: row.is_active ?? true,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapScheduleToDb(s: Partial<MedicationSchedule>): any {
  const row: any = {};
  if (s.id !== undefined) row.id = s.id;
  if (s.patientId !== undefined) row.patient_id = s.patientId;
  if (s.medicationId !== undefined) row.medication_id = s.medicationId;
  if (s.frequency !== undefined) row.frequency = s.frequency;
  if (s.times !== undefined) row.times = s.times;
  if (s.daysOfWeek !== undefined) row.days_of_week = s.daysOfWeek;
  if (s.gracePeriodMinutes !== undefined) row.grace_period_minutes = s.gracePeriodMinutes;
  if (s.escalationDelayMinutes !== undefined) row.escalation_delay_minutes = s.escalationDelayMinutes;
  if (s.escalationContactId !== undefined) row.escalation_contact_id = s.escalationContactId;
  if (s.isActive !== undefined) row.is_active = s.isActive;
  if (s.createdBy !== undefined) row.created_by = s.createdBy;
  if (s.createdAt !== undefined) row.created_at = s.createdAt;
  if (s.updatedAt !== undefined) row.updated_at = s.updatedAt;
  return row;
}

// MedicationEvent
export function mapEventFromDb(row: any): MedicationEvent {
  return {
    id: row.id,
    patientId: row.patient_id,
    medicationId: row.medication_id,
    scheduleId: row.schedule_id,
    scheduledAt: row.scheduled_at,
    status: row.status,
    confirmationMethod: row.confirmation_method || undefined,
    confirmedBy: row.confirmed_by || undefined,
    confirmedAt: row.confirmed_at || undefined,
    reportedOutcome: row.reported_outcome || undefined,
    notes: row.notes || undefined,
    escalatedAt: row.escalated_at || undefined,
    escalatedTo: row.escalated_to || undefined,
    reminderSentAt: row.reminder_sent_at || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapEventToDb(e: Partial<MedicationEvent>): any {
  const row: any = {};
  if (e.id !== undefined) row.id = e.id;
  if (e.patientId !== undefined) row.patient_id = e.patientId;
  if (e.medicationId !== undefined) row.medication_id = e.medicationId;
  if (e.scheduleId !== undefined) row.schedule_id = e.scheduleId;
  if (e.scheduledAt !== undefined) row.scheduled_at = e.scheduledAt;
  if (e.status !== undefined) row.status = e.status;
  if (e.confirmationMethod !== undefined) row.confirmation_method = e.confirmationMethod;
  if (e.confirmedBy !== undefined) row.confirmed_by = e.confirmedBy;
  if (e.confirmedAt !== undefined) row.confirmed_at = e.confirmedAt;
  if (e.reportedOutcome !== undefined) row.reported_outcome = e.reportedOutcome;
  if (e.notes !== undefined) row.notes = e.notes;
  if (e.escalatedAt !== undefined) row.escalated_at = e.escalatedAt;
  if (e.escalatedTo !== undefined) row.escalated_to = e.escalatedTo;
  if (e.reminderSentAt !== undefined) row.reminder_sent_at = e.reminderSentAt;
  if (e.createdAt !== undefined) row.created_at = e.createdAt;
  if (e.updatedAt !== undefined) row.updated_at = e.updatedAt;
  return row;
}

// Appointment
export function mapAppointmentFromDb(row: any): Appointment {
  return {
    id: row.id,
    patientId: row.patient_id,
    title: row.title,
    description: row.description || undefined,
    doctorName: row.doctor_name || undefined,
    location: row.location || undefined,
    scheduledAt: row.scheduled_at,
    durationMinutes: row.duration_minutes ?? 30,
    status: row.status,
    reminderMinutesBefore: row.reminder_minutes_before ?? 60,
    notes: row.notes || undefined,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapAppointmentToDb(a: Partial<Appointment>): any {
  const row: any = {};
  if (a.id !== undefined) row.id = a.id;
  if (a.patientId !== undefined) row.patient_id = a.patientId;
  if (a.title !== undefined) row.title = a.title;
  if (a.description !== undefined) row.description = a.description;
  if (a.doctorName !== undefined) row.doctor_name = a.doctorName;
  if (a.location !== undefined) row.location = a.location;
  if (a.scheduledAt !== undefined) row.scheduled_at = a.scheduledAt;
  if (a.durationMinutes !== undefined) row.duration_minutes = a.durationMinutes;
  if (a.status !== undefined) row.status = a.status;
  if (a.reminderMinutesBefore !== undefined) row.reminder_minutes_before = a.reminderMinutesBefore;
  if (a.notes !== undefined) row.notes = a.notes;
  if (a.createdBy !== undefined) row.created_by = a.createdBy;
  if (a.createdAt !== undefined) row.created_at = a.createdAt;
  if (a.updatedAt !== undefined) row.updated_at = a.updatedAt;
  return row;
}

// Notification
export function mapNotificationFromDb(row: any): Notification {
  return {
    id: row.id,
    recipientId: row.recipient_id,
    patientId: row.patient_id || '',
    type: row.type,
    title: row.title,
    message: row.message,
    referenceId: row.reference_id || undefined,
    referenceType: row.reference_type || undefined,
    isRead: row.is_read ?? false,
    createdAt: row.created_at,
    readAt: row.read_at || undefined,
  };
}

export function mapNotificationToDb(n: Partial<Notification>): any {
  const row: any = {};
  if (n.id !== undefined) row.id = n.id;
  if (n.recipientId !== undefined) row.recipient_id = n.recipientId;
  if (n.patientId !== undefined) row.patient_id = n.patientId;
  if (n.type !== undefined) row.type = n.type;
  if (n.title !== undefined) row.title = n.title;
  if (n.message !== undefined) row.message = n.message;
  if (n.referenceId !== undefined) row.reference_id = n.referenceId;
  if (n.referenceType !== undefined) row.reference_type = n.referenceType;
  if (n.isRead !== undefined) row.is_read = n.isRead;
  if (n.createdAt !== undefined) row.created_at = n.createdAt;
  if (n.readAt !== undefined) row.read_at = n.readAt;
  return row;
}

// AuditLog
export function mapAuditLogFromDb(row: any): AuditLog {
  return {
    id: row.id,
    actorId: row.actor_id,
    actorName: row.actor_name,
    action: row.action,
    targetType: row.target_type,
    targetId: row.target_id,
    patientId: row.patient_id,
    details: row.details || undefined,
    timestamp: row.timestamp,
  };
}

export function mapAuditLogToDb(l: Partial<AuditLog>): any {
  const row: any = {};
  if (l.id !== undefined) row.id = l.id;
  if (l.actorId !== undefined) row.actor_id = l.actorId;
  if (l.actorName !== undefined) row.actor_name = l.actorName;
  if (l.action !== undefined) row.action = l.action;
  if (l.targetType !== undefined) row.target_type = l.targetType;
  if (l.targetId !== undefined) row.target_id = l.targetId;
  if (l.patientId !== undefined) row.patient_id = l.patientId;
  if (l.details !== undefined) row.details = l.details;
  if (l.timestamp !== undefined) row.timestamp = l.timestamp;
  return row;
}

// HealthObservation
export function mapHealthObservationFromDb(row: any): HealthObservation {
  return {
    id: row.id,
    patientId: row.patient_id,
    type: row.type,
    value: row.value,
    unit: row.unit || undefined,
    recordedBy: row.recorded_by,
    recordedAt: row.recorded_at,
    notes: row.notes || undefined,
    createdAt: row.created_at,
  };
}
