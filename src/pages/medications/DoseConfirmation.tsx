import { useAuth } from '@/contexts/AuthContext';
import { usePatient } from '@/contexts/PatientContext';
import { useMedicationEvents } from '@/hooks/useMedicationEvents';
import { useMedications } from '@/hooks/useMedications';
import * as auditService from '@/services/auditService';
import * as notificationService from '@/services/notificationService';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatTime } from '@/lib/utils';
import { Pill, CheckCircle, AlertTriangle } from 'lucide-react';

export default function DoseConfirmation() {
  const { user } = useAuth();
  const { currentPatient, currentMembership } = usePatient();
  const { todayEvents, loading, updateEventStatus } = useMedicationEvents(currentPatient?.id);
  const { medications } = useMedications(currentPatient?.id);

  const isCaretaker = currentMembership?.role === 'caretaker';
  const getMedicationName = (medId: string) =>
    medications.find((m) => m.id === medId)?.name || 'Medication';
  const getMedicationDosage = (medId: string) =>
    medications.find((m) => m.id === medId)?.dosage || '';

  const pendingEvents = todayEvents.filter((e) =>
    ['scheduled', 'reminder_sent', 'acknowledged'].includes(e.status)
  );
  const needsAttention = todayEvents.filter((e) => e.status === 'unacknowledged');
  const resolvedEvents = todayEvents.filter((e) =>
    ['taken_self_reported', 'taken_caregiver_reported', 'skipped', 'confirmed_missed'].includes(e.status)
  );

  const handleAction = async (eventId: string, action: 'take' | 'skip' | 'missed') => {
    if (!user || !currentPatient) return;

    const statusMap = {
      take: isCaretaker ? 'taken_caregiver_reported' as const : 'taken_self_reported' as const,
      skip: 'skipped' as const,
      missed: 'confirmed_missed' as const,
    };
    const methodMap = {
      take: isCaretaker ? 'caregiver_report' as const : 'self_report' as const,
      skip: 'self_report' as const,
      missed: isCaretaker ? 'caregiver_report' as const : 'self_report' as const,
    };
    const auditMap = {
      take: 'dose_taken' as const,
      skip: 'dose_skipped' as const,
      missed: 'dose_missed' as const,
    };

    await updateEventStatus(eventId, statusMap[action], user.id, methodMap[action]);
    await auditService.logAction({
      actorId: user.id, actorName: user.displayName,
      action: auditMap[action], targetType: 'medication_event',
      targetId: eventId, patientId: currentPatient.id,
    });

    const medName = getMedicationName(todayEvents.find((e) => e.id === eventId)?.medicationId || '');
    const dosage = getMedicationDosage(todayEvents.find((e) => e.id === eventId)?.medicationId || '');

    // Notify caregivers on verification or skip/missed
    if (action === 'take') {
      await notificationService.createNotification({
        recipientId: currentPatient.primaryUserId,
        patientId: currentPatient.id,
        type: 'dose_reminder',
        title: `Dose Verified: ${medName}`,
        message: `Dose of ${medName} (${dosage}) was verified and recorded as taken by ${user.displayName || 'Caregiver'}.`,
        referenceId: eventId,
        referenceType: 'medication_event',
        isRead: false,
      });
    } else {
      await notificationService.createNotification({
        recipientId: currentPatient.primaryUserId,
        patientId: currentPatient.id,
        type: 'escalation',
        title: `Dose ${action === 'skip' ? 'Skipped' : 'Missed'}`,
        message: `${medName} was ${action === 'skip' ? 'skipped' : 'confirmed missed'} by ${user.displayName}.`,
        referenceId: eventId,
        referenceType: 'medication_event',
        isRead: false,
      });
    }
  };

  if (loading) return <LoadingSpinner size="lg" text="Loading doses..." />;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
        <Pill className="w-7 h-7 text-blue-600" />
        {isCaretaker ? 'Record Dose Outcomes' : 'My Medications Today'}
      </h1>

      {/* Needs Attention */}
      {needsAttention.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-red-700 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" /> Needs Attention
          </h2>
          <div className="space-y-3">
            {needsAttention.map((event) => (
              <Card key={event.id} className="p-5 border-red-200 bg-red-50">
                <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
                  <div>
                    <h3 className="font-semibold text-lg">{getMedicationName(event.medicationId)}</h3>
                    <p className="text-gray-600">{getMedicationDosage(event.medicationId)} — {formatTime(event.scheduledAt)}</p>
                  </div>
                  <StatusBadge status={event.status} />
                </div>
                <div className="flex gap-3">
                  <Button variant="primary" size="lg" onClick={() => handleAction(event.id, 'take')} className="flex-1">
                    ✓ {isCaretaker ? 'Record as Taken' : 'Mark as Taken'}
                  </Button>
                  <Button variant="outline" onClick={() => handleAction(event.id, 'skip')}>Skip</Button>
                  <Button variant="danger" size="sm" onClick={() => handleAction(event.id, 'missed')}>Missed</Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Pending */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-3">
          {pendingEvents.length > 0 ? 'Upcoming Doses' : ''}
        </h2>
        {pendingEvents.length === 0 && needsAttention.length === 0 ? (
          <EmptyState icon={CheckCircle} title="All done for now!" description="No pending medications at this time." />
        ) : (
          <div className="space-y-3">
            {pendingEvents.map((event) => (
              <Card key={event.id} className="p-5">
                <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
                  <div>
                    <h3 className="font-semibold text-lg">{getMedicationName(event.medicationId)}</h3>
                    <p className="text-gray-600">{getMedicationDosage(event.medicationId)} — {formatTime(event.scheduledAt)}</p>
                  </div>
                  <StatusBadge status={event.status} />
                </div>
                <div className="flex gap-3">
                  <Button variant="primary" size="lg" onClick={() => handleAction(event.id, 'take')} className="flex-1">
                    ✓ {isCaretaker ? 'Record as Taken' : 'Take'}
                  </Button>
                  <Button variant="outline" onClick={() => handleAction(event.id, 'skip')}>Skip</Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Completed */}
      {resolvedEvents.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-3">Completed</h2>
          <div className="space-y-2">
            {resolvedEvents.map((event) => (
              <Card key={event.id} className="p-4 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{getMedicationName(event.medicationId)}</p>
                    <p className="text-sm text-gray-500">{formatTime(event.scheduledAt)}</p>
                  </div>
                  <StatusBadge status={event.status} />
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
