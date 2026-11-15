// User roles
export type UserRole = 'elderly' | 'family_admin' | 'caretaker' | 'doctor';

// Membership status
export type MembershipStatus = 'invited' | 'active' | 'revoked' | 'declined';

// Medication event status - MANDATORY per CLAUDE.md Section 7
export type MedicationEventStatus =
  | 'scheduled'
  | 'reminder_sent'
  | 'acknowledged'
  | 'taken_self_reported'
  | 'taken_caregiver_reported'
  | 'skipped'
  | 'unacknowledged'
  | 'confirmed_missed'
  | 'unverified_interaction';

// Confirmation method
export type ConfirmationMethod = 'self_report' | 'caregiver_report' | 'device_signal' | 'manual';

// Schedule frequency
export type ScheduleFrequency = 'once' | 'daily' | 'twice_daily' | 'three_times_daily' | 'weekly' | 'custom';

// Notification type
export type NotificationType = 'dose_reminder' | 'escalation' | 'appointment_reminder' | 'invitation' | 'system';

// Permission types
export type Permission = 
  | 'view_schedule'
  | 'manage_medications'
  | 'record_dose'
  | 'view_adherence'
  | 'manage_appointments'
  | 'manage_members'
  | 'view_audit_log'
  | 'manage_patient_profile';

// Appointment status
export type AppointmentStatus = 'scheduled' | 'completed' | 'cancelled' | 'missed';

// Audit action types
export type AuditAction =
  | 'patient_created'
  | 'member_invited'
  | 'member_accepted'
  | 'member_revoked'
  | 'medication_created'
  | 'medication_updated'
  | 'medication_deleted'
  | 'schedule_created'
  | 'dose_taken'
  | 'dose_skipped'
  | 'dose_missed'
  | 'dose_escalated'
  | 'appointment_created'
  | 'appointment_updated'
  | 'appointment_cancelled'
  | 'permission_changed';

// ---- Document Interfaces ----

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  phone?: string;
  photoURL?: string;
  defaultRole?: UserRole;
  timezone: string;
  createdAt: string;
  updatedAt: string;
}

export interface Patient {
  id: string;
  name: string;
  uniquePatientId?: string;
  patientPin?: string;
  dateOfBirth?: string;
  gender?: string;
  bloodType?: string;
  allergies: string[];
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
    email?: string;
    uniquePatientId?: string;
    patientPin?: string;
    patientEmail?: string;
  };
  primaryUserId: string; // The primary family admin's or elderly person's user ID
  timezone: string;
  createdAt: string;
  updatedAt: string;
}

export interface CaregiverMembership {
  id: string;
  patientId: string;
  userId: string;
  role: UserRole;
  permissions: Permission[];
  status: MembershipStatus;
  invitedBy: string;
  invitedAt: string;
  invitationToken?: string;
  tokenExpiresAt?: string;
  acceptedAt?: string;
  revokedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Medication {
  id: string;
  patientId: string;
  name: string;
  genericName?: string;
  dosage: string;
  form: string; // tablet, capsule, liquid, injection, etc.
  instructions?: string;
  sideEffects?: string;
  prescribedBy?: string;
  startDate: string;
  endDate?: string;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface MedicationSchedule {
  id: string;
  patientId: string;
  medicationId: string;
  frequency: ScheduleFrequency;
  times: string[]; // HH:mm format in patient's timezone
  daysOfWeek?: number[]; // 0=Sunday for weekly schedules
  gracePeriodMinutes: number; // Minutes before marking unacknowledged
  escalationDelayMinutes: number; // Minutes after grace period to escalate
  escalationContactId?: string; // userId to notify on escalation
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface MedicationEvent {
  id: string;
  patientId: string;
  medicationId: string;
  scheduleId: string;
  scheduledAt: string;
  status: MedicationEventStatus;
  confirmationMethod?: ConfirmationMethod;
  confirmedBy?: string;
  confirmedAt?: string;
  reportedOutcome?: string;
  notes?: string;
  escalatedAt?: string;
  escalatedTo?: string;
  reminderSentAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  title: string;
  description?: string;
  doctorName?: string;
  location?: string;
  scheduledAt: string;
  durationMinutes: number;
  status: AppointmentStatus;
  reminderMinutesBefore: number;
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  recipientId: string;
  patientId: string;
  type: NotificationType;
  title: string;
  message: string;
  referenceId?: string; // eventId, appointmentId, etc.
  referenceType?: string;
  isRead: boolean;
  createdAt: string;
  readAt?: string;
}

export interface AuditLog {
  id: string;
  actorId: string;
  actorName: string;
  action: AuditAction;
  targetType: string;
  targetId: string;
  patientId: string;
  details?: Record<string, unknown>;
  timestamp: string;
}

export interface HealthObservation {
  id: string;
  patientId: string;
  type: string;
  value: string;
  unit?: string;
  recordedBy: string;
  recordedAt: string;
  notes?: string;
  createdAt: string;
}

// UI State types
export interface AuthState {
  user: UserProfile | null;
  loading: boolean;
  error: string | null;
}

export interface PatientContext {
  patient: Patient | null;
  membership: CaregiverMembership | null;
  role: UserRole | null;
}
