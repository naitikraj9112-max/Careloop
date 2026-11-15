import emailjs from '@emailjs/browser';

const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || '';
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || '';
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || '';

/**
 * Checks whether EmailJS credentials are configured in environment variables.
 */
export function isEmailConfigured(): boolean {
  return Boolean(SERVICE_ID && TEMPLATE_ID && PUBLIC_KEY);
}

export interface SendEmailResult {
  success: boolean;
  error?: string;
}

/**
 * Internal generic sender using EmailJS.
 */
async function sendEmail(templateParams: Record<string, any>): Promise<SendEmailResult> {
  if (!isEmailConfigured()) {
    console.warn('[EmailJS] Skipping email dispatch: EmailJS credentials not found in .env');
    return { success: false, error: 'EmailJS credentials missing in .env' };
  }

  try {
    const response = await emailjs.send(
      SERVICE_ID,
      TEMPLATE_ID,
      templateParams,
      PUBLIC_KEY
    );
    console.log('[EmailJS] Sent email successfully:', response.status, response.text);
    return { success: true };
  } catch (error: any) {
    const errorText = error?.text || error?.message || (typeof error === 'string' ? error : 'Unknown EmailJS error');
    console.error('[EmailJS] Failed to send email:', errorText, error);
    return { success: false, error: errorText };
  }
}

/**
 * Helper to build rich multi-alias template params so any user template syntax works.
 */
function buildParams(base: {
  toEmail: string;
  toName?: string;
  subject: string;
  title: string;
  message: string;
  patientName: string;
  actionUrl?: string;
  actionLabel?: string;
  extra?: Record<string, any>;
}): Record<string, any> {
  const fallbackName = base.toName || base.toEmail.split('@')[0];
  const url = base.actionUrl || window.location.origin + '/dashboard';

  return {
    // Email addresses
    to_email: base.toEmail,
    email: base.toEmail,
    user_email: base.toEmail,
    recipient_email: base.toEmail,

    // Recipient names
    to_name: fallbackName,
    name: fallbackName,
    recipient_name: fallbackName,

    // Core content
    subject: base.subject,
    title: base.title,
    message: base.message,
    content: base.message,
    patient_name: base.patientName,

    // Links & Actions
    action_url: url,
    link: url,
    invite_link: url,
    action_label: base.actionLabel || 'View in CareLoop',

    // Extra metadata
    ...base.extra,
  };
}

/**
 * 1. Send CareCircle Invitation Email with Direct Invite Link
 */
export async function sendCareCircleInvitation(params: {
  toEmail: string;
  patientName: string;
  inviterName: string;
  role: string;
  inviteLink: string;
}): Promise<SendEmailResult> {
  const roleLabel = params.role.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const subject = `Invitation to join ${params.patientName}'s CareCircle on CareLoop`;
  const message = `${params.inviterName} has invited you to join the CareCircle for ${params.patientName} as a ${roleLabel}.\n\nPlease click the invitation link below to accept and access the care portal:\n${params.inviteLink}`;

  return sendEmail(
    buildParams({
      toEmail: params.toEmail,
      subject,
      title: "CareCircle Invitation",
      message,
      patientName: params.patientName,
      actionUrl: params.inviteLink,
      actionLabel: 'Accept Invitation & Join',
      extra: {
        inviter_name: params.inviterName,
        role: roleLabel,
        invite_link: params.inviteLink,
      },
    })
  );
}

/**
 * 2. Send Medicine Dosage Reminder or Overdue Escalation Alert
 */
export async function sendMedicationAlert(params: {
  toEmail: string;
  recipientName?: string;
  patientName: string;
  medicationName: string;
  dosage: string;
  scheduledTime: string;
  alertType: 'reminder' | 'escalation' | 'missed';
  instructions?: string;
  actionUrl?: string;
}): Promise<SendEmailResult> {
  const isEscalation = params.alertType === 'escalation' || params.alertType === 'missed';
  const prefix = isEscalation ? '⚠️ [ACTION REQUIRED]' : '🔔 [MEDICATION REMINDER]';
  const subject = `${prefix} ${params.medicationName} for ${params.patientName}`;

  const message = isEscalation
    ? `ATTENTION: The scheduled dose of ${params.medicationName} (${params.dosage}) for ${params.patientName} scheduled for ${params.scheduledTime} has exceeded its grace period and is unacknowledged. Please check in with ${params.patientName} or record the dose outcome.`
    : `Friendly reminder: It is time for ${params.patientName} to take ${params.medicationName} (${params.dosage}) scheduled at ${params.scheduledTime}.${params.instructions ? ` Instructions: ${params.instructions}` : ''}`;

  return sendEmail(
    buildParams({
      toEmail: params.toEmail,
      toName: params.recipientName,
      subject,
      title: isEscalation ? 'Medication Dose Escalation' : 'Medication Reminder',
      message,
      patientName: params.patientName,
      actionUrl: params.actionUrl || window.location.origin + '/dose-confirmation',
      actionLabel: 'Check Medication Schedule',
      extra: {
        medication_name: params.medicationName,
        medicine_name: params.medicationName,
        dosage: params.dosage,
        scheduled_time: params.scheduledTime,
        time: params.scheduledTime,
        alert_type: params.alertType,
      },
    })
  );
}

/**
 * 3. Send Dose Verification Confirmation Alert
 */
export async function sendDoseVerificationAlert(params: {
  toEmail: string;
  recipientName?: string;
  patientName: string;
  medicationName: string;
  dosage: string;
  verifiedAt: string;
  confirmedBy: string;
  actionUrl?: string;
}): Promise<SendEmailResult> {
  const subject = `✅ [Dose Verified] ${params.medicationName} taken by ${params.patientName}`;
  const message = `Confirmation: The dose of ${params.medicationName} (${params.dosage}) for ${params.patientName} was verified and recorded as taken at ${params.verifiedAt} by ${params.confirmedBy}.`;

  return sendEmail(
    buildParams({
      toEmail: params.toEmail,
      toName: params.recipientName,
      subject,
      title: 'Medication Dose Confirmed',
      message,
      patientName: params.patientName,
      actionUrl: params.actionUrl || window.location.origin + '/activity',
      actionLabel: 'View Activity Timeline',
      extra: {
        medication_name: params.medicationName,
        medicine_name: params.medicationName,
        dosage: params.dosage,
        time: params.verifiedAt,
        confirmed_by: params.confirmedBy,
      },
    })
  );
}

/**
 * 4. Send Upcoming Appointment Alert
 */
export async function sendAppointmentAlert(params: {
  toEmail: string;
  recipientName?: string;
  patientName: string;
  title: string;
  doctorName?: string;
  location?: string;
  scheduledAt: string;
  actionUrl?: string;
}): Promise<SendEmailResult> {
  const subject = `📅 [Appointment Reminder] ${params.title} for ${params.patientName}`;
  const details = [
    `Patient: ${params.patientName}`,
    `Date & Time: ${params.scheduledAt}`,
    params.doctorName ? `Doctor / Specialist: ${params.doctorName}` : '',
    params.location ? `Location / Clinic: ${params.location}` : '',
  ].filter(Boolean).join('\n');

  const message = `You have an upcoming medical consultation scheduled:\n\n${details}`;

  return sendEmail(
    buildParams({
      toEmail: params.toEmail,
      toName: params.recipientName,
      subject,
      title: 'Upcoming Medical Appointment',
      message,
      patientName: params.patientName,
      actionUrl: params.actionUrl || window.location.origin + '/appointments',
      actionLabel: 'View Appointment Details',
      extra: {
        appointment_title: params.title,
        doctor_name: params.doctorName || '',
        location: params.location || '',
        scheduled_at: params.scheduledAt,
        date: params.scheduledAt,
      },
    })
  );
}

/**
 * 5. Send Generic Notification Email
 */
export async function sendGenericNotificationEmail(params: {
  toEmail: string;
  recipientName?: string;
  patientName: string;
  title: string;
  message: string;
  actionUrl?: string;
  actionLabel?: string;
}): Promise<SendEmailResult> {
  return sendEmail(
    buildParams({
      toEmail: params.toEmail,
      toName: params.recipientName,
      subject: `[CareLoop] ${params.title} - ${params.patientName}`,
      title: params.title,
      message: params.message,
      patientName: params.patientName,
      actionUrl: params.actionUrl,
      actionLabel: params.actionLabel,
    })
  );
}
