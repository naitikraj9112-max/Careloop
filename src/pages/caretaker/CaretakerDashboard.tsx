import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePatient } from '@/contexts/PatientContext';
import { useMedicationEvents } from '@/hooks/useMedicationEvents';
import { useMedications } from '@/hooks/useMedications';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import AdminPatientAIAssistant from '@/components/voice/AdminPatientAIAssistant';
import * as auditService from '@/services/auditService';
import * as notificationService from '@/services/notificationService';
import * as emailService from '@/services/emailService';
import { supabase } from '@/config/supabase';
import { formatTime } from '@/lib/utils';
import {
  UserCheck,
  Pill,
  CheckCircle,
  Clock,
  Lock,
  Send,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

const REQUEST_TYPE_OPTIONS = [
  { value: 'refill', label: 'Medication Refill Needed' },
  { value: 'dosage_change', label: 'Dosage Adjustment Request' },
  { value: 'new_medication', label: 'New Prescription to Add' },
  { value: 'discontinue', label: 'Report Side Effect / Discontinue' },
];

export default function CaretakerDashboard() {
  const { user } = useAuth();
  const { currentPatient, currentMembership } = usePatient();
  const { todayEvents, loading, updateEventStatus } = useMedicationEvents(currentPatient?.id);
  const { medications } = useMedications(currentPatient?.id);
  const navigate = useNavigate();

  // Request modal state
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestType, setRequestType] = useState('refill');
  const [requestMedId, setRequestMedId] = useState('');
  const [customMedName, setCustomMedName] = useState('');
  const [requestNotes, setRequestNotes] = useState('');
  const [requestUrgency, setRequestUrgency] = useState<'standard' | 'urgent'>('standard');
  const [requestSubmitting, setRequestSubmitting] = useState(false);
  const [requestSuccess, setRequestSuccess] = useState(false);

  const pendingTasks = todayEvents.filter((e) =>
    ['scheduled', 'reminder_sent', 'acknowledged', 'unacknowledged'].includes(e.status)
  );
  const completedTasks = todayEvents.filter((e) =>
    ['taken_self_reported', 'taken_caregiver_reported', 'skipped'].includes(e.status)
  );

  const getMedicationName = (medId: string) =>
    medications.find((m) => m.id === medId)?.name || 'Medication';

  const handleRecordDose = async (eventId: string) => {
    await updateEventStatus(eventId, 'taken_caregiver_reported', user?.id, 'caregiver_report');
    if (currentPatient && user) {
      await auditService.logAction({
        actorId: user.id,
        actorName: user.displayName,
        action: 'dose_taken',
        targetType: 'medication_event',
        targetId: eventId,
        patientId: currentPatient.id,
      });
    }
  };

  const handleReportMissed = async (eventId: string) => {
    await updateEventStatus(eventId, 'confirmed_missed', user?.id, 'caregiver_report');
    if (currentPatient && user) {
      await auditService.logAction({
        actorId: user.id,
        actorName: user.displayName,
        action: 'dose_missed',
        targetType: 'medication_event',
        targetId: eventId,
        patientId: currentPatient.id,
      });

      // Escalation alert to primary family admin
      await notificationService.createNotification({
        recipientId: currentPatient.primaryUserId,
        patientId: currentPatient.id,
        type: 'escalation',
        title: `Missed Dose Confirmed: ${currentPatient.name}`,
        message: `Caretaker ${user.displayName} confirmed a missed dose for ${currentPatient.name}. Please follow up.`,
        referenceId: eventId,
        referenceType: 'medication_event',
        isRead: false,
      });
    }
  };

  const handleSendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !currentPatient) return;
    setRequestSubmitting(true);
    try {
      const selectedMed = medications.find((m) => m.id === requestMedId);
      const targetMedName =
        requestType === 'new_medication'
          ? customMedName.trim() || 'New Prescription'
          : selectedMed?.name || customMedName.trim() || 'Medication';

      const typeLabel =
        REQUEST_TYPE_OPTIONS.find((o) => o.value === requestType)?.label || 'Medication Request';

      const fullMessage = `Caretaker ${user.displayName} requested: ${typeLabel} for "${targetMedName}". Details: ${requestNotes.trim() || 'No additional notes'}. Urgency: ${requestUrgency.toUpperCase()}`;

      // In-app alert to Primary Family Admin
      await notificationService.createNotification({
        recipientId: currentPatient.primaryUserId,
        patientId: currentPatient.id,
        type: 'escalation',
        title: `Caretaker Request: ${typeLabel}`,
        message: fullMessage,
        referenceId: requestMedId || currentPatient.id,
        referenceType: 'medication',
        isRead: false,
      });

      // EmailJS alert to Primary Family Admin
      const { data: primaryAdmin } = await supabase
        .from('users')
        .select('email, display_name')
        .eq('id', currentPatient.primaryUserId)
        .maybeSingle();

      if (primaryAdmin?.email) {
        await emailService.sendGenericNotificationEmail({
          toEmail: primaryAdmin.email,
          recipientName: primaryAdmin.display_name,
          patientName: currentPatient.name,
          title: `CareCircle Request: ${typeLabel} (${targetMedName})`,
          message: `${user.displayName} (Caretaker) has submitted an action request for your approval:\n\nPatient: ${currentPatient.name}\nItem: ${targetMedName}\nRequest: ${typeLabel}\nNotes: "${requestNotes}"\nPriority: ${requestUrgency.toUpperCase()}`,
          actionUrl: `${window.location.origin}/medications`,
          actionLabel: 'Review in CareLoop',
        });
      }

      await auditService.logAction({
        actorId: user.id,
        actorName: user.displayName,
        action: 'medication_updated',
        targetType: 'medication_request',
        targetId: requestMedId || currentPatient.id,
        patientId: currentPatient.id,
      });

      setRequestSuccess(true);
      setTimeout(() => {
        setShowRequestModal(false);
        setRequestSuccess(false);
        setRequestNotes('');
      }, 2500);
    } catch (err) {
      console.error(err);
    } finally {
      setRequestSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner size="lg" text="Loading caretaker tasks..." />;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900 tracking-tight flex items-center gap-2">
            <UserCheck className="w-7 h-7 text-[#22C55E]" />
            Caretaker Dashboard
          </h1>
          <p className="text-sm font-medium text-neutral-500 mt-0.5">
            {currentPatient ? `Active care for ${currentPatient.name}` : 'Select a patient to view tasks'}
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={() => {
            setRequestMedId(medications[0]?.id || '');
            setShowRequestModal(true);
          }}
          className="font-semibold"
        >
          <Send className="w-4 h-4 mr-1.5 text-[#22C55E]" /> Request Medication Change
        </Button>
      </div>

      {/* Role Notice: Locked Prescriptions */}
      <div className="bg-amber-50/80 border border-amber-200/80 rounded-3xl p-5 flex items-start gap-3.5">
        <div className="w-9 h-9 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
          <Lock className="w-4 h-4" />
        </div>
        <div className="flex-1">
          <h4 className="font-bold text-amber-900 text-sm">
            Prescriptions Locked for Caretakers
          </h4>
          <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
            Per clinical protocol, prescriptions are authored by the Primary Family Admin. If a medicine dosage needs changing or a refill is required, use the <strong>Request Medication Change</strong> button to notify the family admin with one click.
          </p>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-3xl p-5 border border-neutral-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] text-center">
          <Clock className="w-7 h-7 text-amber-500 mx-auto mb-2" />
          <p className="text-3xl font-bold text-neutral-900 tracking-tight">{pendingTasks.length}</p>
          <p className="text-xs font-semibold text-neutral-500 mt-0.5">Pending Tasks Today</p>
        </div>
        <div className="bg-white rounded-3xl p-5 border border-neutral-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] text-center">
          <CheckCircle className="w-7 h-7 text-[#22C55E] mx-auto mb-2" />
          <p className="text-3xl font-bold text-neutral-900 tracking-tight">{completedTasks.length}</p>
          <p className="text-xs font-semibold text-neutral-500 mt-0.5">Completed Today</p>
        </div>
      </div>

      {/* DeepSeek AI Clinical & Care Assistant for Patient */}
      <AdminPatientAIAssistant
        patient={currentPatient}
        medications={medications}
      />

      {/* Pending Medication Tasks */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-neutral-900 tracking-tight flex items-center gap-2">
          <Pill className="w-5 h-5 text-[#22C55E]" />
          Today&apos;s Medication Tasks
        </h2>

        {pendingTasks.length === 0 ? (
          <EmptyState
            icon={CheckCircle}
            title="All caught up!"
            description="No pending medication tasks right now."
          />
        ) : (
          <div className="space-y-3">
            {pendingTasks.map((event) => (
              <div
                key={event.id}
                className="bg-white rounded-3xl p-5 border border-neutral-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-lg text-neutral-900">
                      {getMedicationName(event.medicationId)}
                    </h3>
                    <StatusBadge status={event.status} />
                  </div>
                  <p className="text-xs font-semibold text-neutral-500">
                    Scheduled at: {formatTime(event.scheduledAt)}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="green"
                    size="sm"
                    onClick={() => handleRecordDose(event.id)}
                    className="font-bold"
                  >
                    ✓ Record as Taken
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleReportMissed(event.id)}
                    className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    Report Missed
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Completed Tasks */}
      {completedTasks.length > 0 && (
        <div className="space-y-3 pt-2">
          <h2 className="text-lg font-bold text-neutral-900 tracking-tight">Completed Today</h2>
          <div className="space-y-2">
            {completedTasks.map((event) => (
              <div
                key={event.id}
                className="bg-[#F9FAF7] rounded-2xl p-4 border border-neutral-200/60 flex items-center justify-between"
              >
                <div>
                  <p className="font-bold text-sm text-neutral-800">
                    {getMedicationName(event.medicationId)}
                  </p>
                  <p className="text-xs text-neutral-400">{formatTime(event.scheduledAt)}</p>
                </div>
                <StatusBadge status={event.status} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Request Medication Update Modal */}
      <Modal
        isOpen={showRequestModal}
        onClose={() => {
          setShowRequestModal(false);
          setRequestSuccess(false);
        }}
        title="Request Medication Update from Family Admin"
        size="md"
      >
        <form onSubmit={handleSendRequest} className="space-y-4">
          {requestSuccess ? (
            <div className="p-6 bg-[#EBF7EE] border border-[#22C55E]/40 text-[#1E3A2F] rounded-2xl text-center space-y-2">
              <CheckCircle2 className="w-10 h-10 text-[#22C55E] mx-auto" />
              <h4 className="font-bold text-base">Request Dispatched!</h4>
              <p className="text-xs text-neutral-600">
                Your request has been routed to the Primary Family Admin. An in-app alert and email notification have been sent.
              </p>
            </div>
          ) : (
            <>
              <p className="text-xs text-neutral-500">
                Submit a prescription change, refill reminder, or dosage adjustment for Primary Family Admin review and approval.
              </p>

              <Select
                label="Request Type"
                value={requestType}
                onChange={(e) => setRequestType(e.target.value)}
                options={REQUEST_TYPE_OPTIONS}
              />

              {requestType === 'new_medication' ? (
                <Input
                  label="New Medication Name & Details"
                  value={customMedName}
                  onChange={(e) => setCustomMedName(e.target.value)}
                  placeholder="e.g. Atorvastatin 20mg daily"
                  required
                />
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Select Medication
                  </label>
                  <select
                    value={requestMedId}
                    onChange={(e) => setRequestMedId(e.target.value)}
                    className="w-full text-sm rounded-xl border border-neutral-300 p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#22C55E]"
                  >
                    {medications.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.dosage}, {m.form})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Reason & Clinical Details *
                </label>
                <textarea
                  value={requestNotes}
                  onChange={(e) => setRequestNotes(e.target.value)}
                  rows={3}
                  placeholder="e.g. Doctor visited today and advised increasing dose, or only 2 tablets remaining in strip..."
                  required
                  className="w-full text-sm rounded-xl border border-neutral-300 p-3 bg-white focus:outline-none focus:ring-2 focus:ring-[#22C55E] resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Priority
                </label>
                <div className="flex gap-3">
                  <label className="flex items-center gap-2 text-xs font-semibold text-neutral-700 cursor-pointer">
                    <input
                      type="radio"
                      name="urgency"
                      checked={requestUrgency === 'standard'}
                      onChange={() => setRequestUrgency('standard')}
                      className="accent-[#22C55E]"
                    />
                    Standard
                  </label>
                  <label className="flex items-center gap-2 text-xs font-semibold text-red-600 cursor-pointer">
                    <input
                      type="radio"
                      name="urgency"
                      checked={requestUrgency === 'urgent'}
                      onChange={() => setRequestUrgency('urgent')}
                      className="accent-red-600"
                    />
                    Urgent (Requires immediate attention)
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-3">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowRequestModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  loading={requestSubmitting}
                  fullWidth
                  className="font-bold"
                >
                  <Send className="w-4 h-4 mr-1 text-[#22C55E]" /> Send Request to Admin
                </Button>
              </div>
            </>
          )}
        </form>
      </Modal>
    </div>
  );
}
