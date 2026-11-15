import { usePatient } from '@/contexts/PatientContext';
import { useMedicationEvents } from '@/hooks/useMedicationEvents';
import { useMedications } from '@/hooks/useMedications';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatDate, formatTime } from '@/lib/utils';
import { ClipboardList, TrendingUp, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

export default function AdherencePage() {
  const { currentPatient } = usePatient();
  const { events, loading } = useMedicationEvents(currentPatient?.id);
  const { medications } = useMedications(currentPatient?.id);

  const getMedicationName = (medId: string) =>
    medications.find((m) => m.id === medId)?.name || 'Medication';

  // Compute adherence
  const takenCount = events.filter((e) => ['taken_self_reported', 'taken_caregiver_reported'].includes(e.status)).length;
  const skippedCount = events.filter((e) => e.status === 'skipped').length;
  const missedCount = events.filter((e) => ['unacknowledged', 'confirmed_missed'].includes(e.status)).length;
  const totalEligible = events.filter((e) => new Date(e.scheduledAt) <= new Date()).length;
  const adherencePercent = totalEligible > 0 ? Math.round((takenCount / totalEligible) * 100) : 0;

  const unresolvedEvents = events.filter((e) =>
    ['unacknowledged', 'scheduled', 'reminder_sent'].includes(e.status) &&
    new Date(e.scheduledAt) < new Date()
  );

  if (loading) return <LoadingSpinner size="lg" text="Loading adherence data..." />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
        <ClipboardList className="w-7 h-7 text-blue-600" /> Adherence Report
      </h1>

      {/* Adherence Score */}
      <Card className="p-6 text-center">
        <TrendingUp className="w-10 h-10 text-blue-600 mx-auto mb-3" />
        <p className="text-5xl font-bold text-gray-900">{adherencePercent}%</p>
        <p className="text-gray-600 mt-1">Overall Adherence Rate</p>
        <p className="text-sm text-gray-500 mt-2">
          Based on {totalEligible} eligible doses. Confirmed taken / eligible scheduled doses × 100.
        </p>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 text-center">
          <CheckCircle className="w-6 h-6 text-emerald-500 mx-auto mb-1" />
          <p className="text-xl font-bold text-emerald-600">{takenCount}</p>
          <p className="text-sm text-gray-600">Taken</p>
        </Card>
        <Card className="p-4 text-center">
          <div className="w-6 h-6 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-1">
            <span className="text-amber-600 text-xs font-bold">S</span>
          </div>
          <p className="text-xl font-bold text-amber-600">{skippedCount}</p>
          <p className="text-sm text-gray-600">Skipped</p>
        </Card>
        <Card className="p-4 text-center">
          <XCircle className="w-6 h-6 text-red-500 mx-auto mb-1" />
          <p className="text-xl font-bold text-red-600">{missedCount}</p>
          <p className="text-sm text-gray-600">Missed / Unacknowledged</p>
        </Card>
        <Card className="p-4 text-center">
          <AlertTriangle className="w-6 h-6 text-orange-500 mx-auto mb-1" />
          <p className="text-xl font-bold text-orange-600">{unresolvedEvents.length}</p>
          <p className="text-sm text-gray-600">Unresolved</p>
        </Card>
      </div>

      <p className="text-sm text-gray-500 bg-gray-50 p-4 rounded-lg">
        <strong>How this is calculated:</strong> Adherence = confirmed taken doses ÷ eligible scheduled doses × 100.
        Skipped, unacknowledged, and unverified doses are shown separately and not counted as taken.
        The denominator includes only doses whose scheduled time has passed.
      </p>

      {/* Unresolved Events */}
      {unresolvedEvents.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-red-700 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" /> Unresolved Events
          </h2>
          <div className="space-y-2">
            {unresolvedEvents.map((event) => (
              <Card key={event.id} className="p-4 border-red-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{getMedicationName(event.medicationId)}</p>
                    <p className="text-sm text-gray-500">{formatDate(event.scheduledAt)} at {formatTime(event.scheduledAt)}</p>
                  </div>
                  <StatusBadge status={event.status} />
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* All Events */}
      {events.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No dose events yet" description="Events will appear here once medication schedules generate doses." />
      ) : (
        <div>
          <h2 className="text-lg font-bold mb-3">All Events ({events.length})</h2>
          <div className="space-y-2 max-h-96 overflow-auto">
            {events.slice().reverse().map((event) => (
              <Card key={event.id} className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{getMedicationName(event.medicationId)}</p>
                    <p className="text-xs text-gray-500">{formatDate(event.scheduledAt)} at {formatTime(event.scheduledAt)}</p>
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
