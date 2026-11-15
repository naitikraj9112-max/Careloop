import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePatient } from '@/contexts/PatientContext';
import { useSchedules } from '@/hooks/useSchedules';
import * as medicationService from '@/services/medicationService';
import * as medicationEventService from '@/services/medicationEventService';
import * as auditService from '@/services/auditService';
import type { Medication } from '@/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { ArrowLeft, Plus, Clock, Zap, Calendar } from 'lucide-react';

const FREQUENCY_OPTIONS = [
  { value: 'once', label: 'Once' },
  { value: 'daily', label: 'Once Daily' },
  { value: 'twice_daily', label: 'Twice Daily' },
  { value: 'three_times_daily', label: 'Three Times Daily' },
  { value: 'weekly', label: 'Weekly' },
];

export default function ScheduleManagement() {
  const { medicationId } = useParams<{ medicationId: string }>();
  const { user } = useAuth();
  const { currentPatient, hasPermission } = usePatient();
  const { schedules, loading, createSchedule, deactivateSchedule } = useSchedules(currentPatient?.id);
  const navigate = useNavigate();
  const canManage = hasPermission('manage_medications');

  const [medication, setMedication] = useState<Medication | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form
  const [frequency, setFrequency] = useState('daily');
  const [time1, setTime1] = useState('08:00');
  const [time2, setTime2] = useState('14:00');
  const [time3, setTime3] = useState('20:00');
  const [gracePeriod, setGracePeriod] = useState('30');
  const [escalationDelay, setEscalationDelay] = useState('60');

  useEffect(() => {
    if (medicationId) {
      medicationService.getMedication(medicationId).then(setMedication);
    }
  }, [medicationId]);

  const medSchedules = schedules.filter((s) => s.medicationId === medicationId);

  const getTimesForFrequency = () => {
    switch (frequency) {
      case 'once': case 'daily': case 'weekly': return [time1];
      case 'twice_daily': return [time1, time2];
      case 'three_times_daily': return [time1, time2, time3];
      default: return [time1];
    }
  };

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPatient || !medicationId || !user) return;
    setSaving(true);
    try {
      await createSchedule({
        patientId: currentPatient.id,
        medicationId,
        frequency: frequency as any,
        times: getTimesForFrequency(),
        gracePeriodMinutes: parseInt(gracePeriod),
        escalationDelayMinutes: parseInt(escalationDelay),
        isActive: true,
        createdBy: user.id,
      });
      await auditService.logAction({
        actorId: user.id, actorName: user.displayName,
        action: 'schedule_created', targetType: 'schedule',
        targetId: medicationId, patientId: currentPatient.id,
      });
      setShowModal(false);
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  const handleGenerateDoses = async () => {
    if (!currentPatient) return;
    setGenerating(true);
    try {
      for (const schedule of medSchedules.filter((s) => s.isActive)) {
        await medicationEventService.generateDoseEvents(schedule.id, new Date());
      }
      alert('Today\'s dose events generated successfully!');
    } catch (err) { console.error(err); }
    finally { setGenerating(false); }
  };

  if (loading) return <LoadingSpinner size="lg" text="Loading schedules..." />;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <button onClick={() => navigate('/medications')} className="flex items-center gap-2 text-blue-600 font-medium hover:underline">
        <ArrowLeft className="w-5 h-5" /> Back to Medications
      </button>

      {medication && (
        <div className="bg-blue-50 rounded-xl p-5">
          <h1 className="text-xl font-bold text-gray-900">{medication.name}</h1>
          <p className="text-gray-600">{medication.dosage} — {medication.form}</p>
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-bold">Schedules</h2>
        <div className="flex gap-2">
          {medSchedules.some((s) => s.isActive) && (
            <Button variant="secondary" onClick={handleGenerateDoses} loading={generating}>
              <Zap className="w-4 h-4 mr-1" /> Generate Today&apos;s Doses
            </Button>
          )}
          {canManage && (
            <Button variant="primary" onClick={() => setShowModal(true)}>
              <Plus className="w-4 h-4 mr-1" /> Add Schedule
            </Button>
          )}
        </div>
      </div>

      {medSchedules.length === 0 ? (
        <EmptyState icon={Clock} title="No schedules" description="Add a schedule to start generating dose events."
          action={canManage ? { label: 'Add Schedule', onClick: () => setShowModal(true) } : undefined} />
      ) : (
        <div className="space-y-3">
          {medSchedules.map((schedule) => (
            <Card key={schedule.id} className="p-5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <h3 className="font-semibold">{FREQUENCY_OPTIONS.find((f) => f.value === schedule.frequency)?.label || schedule.frequency}</h3>
                  <p className="text-gray-600 flex items-center gap-1">
                    <Clock className="w-4 h-4" /> {schedule.times.join(', ')}
                  </p>
                </div>
                <Badge variant={schedule.isActive ? 'success' : 'neutral'}>
                  {schedule.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <div className="text-sm text-gray-500 space-y-1">
                <p>Grace period: {schedule.gracePeriodMinutes} min</p>
                <p>Escalation after: {schedule.escalationDelayMinutes} min</p>
              </div>
              {canManage && schedule.isActive && (
                <Button variant="ghost" size="sm" className="mt-3 text-red-600"
                  onClick={() => deactivateSchedule(schedule.id)}>
                  Deactivate
                </Button>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Add Schedule Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add Schedule" size="md">
        <form onSubmit={handleCreateSchedule} className="space-y-4">
          <Select label="Frequency" value={frequency} onChange={(e) => setFrequency(e.target.value)} options={FREQUENCY_OPTIONS} />
          <Input label="Time 1" type="time" value={time1} onChange={(e) => setTime1(e.target.value)} required />
          {['twice_daily', 'three_times_daily'].includes(frequency) && (
            <Input label="Time 2" type="time" value={time2} onChange={(e) => setTime2(e.target.value)} required />
          )}
          {frequency === 'three_times_daily' && (
            <Input label="Time 3" type="time" value={time3} onChange={(e) => setTime3(e.target.value)} required />
          )}
          <div className="grid grid-cols-2 gap-4">
            <Input label="Grace Period (min)" type="number" value={gracePeriod} onChange={(e) => setGracePeriod(e.target.value)} min="5" />
            <Input label="Escalation Delay (min)" type="number" value={escalationDelay} onChange={(e) => setEscalationDelay(e.target.value)} min="5" />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" variant="primary" loading={saving} fullWidth>Create Schedule</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
