import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePatient } from '@/contexts/PatientContext';
import { useAppointments } from '@/hooks/useAppointments';
import * as auditService from '@/services/auditService';
import * as emailService from '@/services/emailService';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { formatDate, formatTime } from '@/lib/utils';
import { Calendar, Plus, MapPin, User, Clock, Trash2 } from 'lucide-react';

export default function AppointmentsPage() {
  const { user } = useAuth();
  const { currentPatient, hasPermission } = usePatient();
  const { appointments, loading, createAppointment, cancelAppointment } = useAppointments(currentPatient?.id);
  const canManage = hasPermission('manage_appointments');

  const [showModal, setShowModal] = useState(false);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [location, setLocation] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [duration, setDuration] = useState('30');
  const [reminderBefore, setReminderBefore] = useState('60');

  const upcoming = appointments.filter((a) => a.status === 'scheduled' && new Date(a.scheduledAt) >= new Date());
  const past = appointments.filter((a) => a.status !== 'scheduled' || new Date(a.scheduledAt) < new Date());

  const resetForm = () => {
    setTitle(''); setDescription(''); setDoctorName(''); setLocation('');
    setScheduledAt(''); setDuration('30'); setReminderBefore('60');
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPatient || !user) return;
    setSaving(true);
    try {
      const apt = await createAppointment({
        patientId: currentPatient.id,
        title, description, doctorName, location,
        scheduledAt: new Date(scheduledAt).toISOString(),
        durationMinutes: parseInt(duration),
        status: 'scheduled',
        reminderMinutesBefore: parseInt(reminderBefore),
        createdBy: user.id,
      });
      await auditService.logAction({
        actorId: user.id, actorName: user.displayName,
        action: 'appointment_created', targetType: 'appointment',
        targetId: apt.id, patientId: currentPatient.id,
      });

      // Automated EmailJS dispatch for new appointment
      if (emailService.isEmailConfigured() && user.email) {
        emailService.sendAppointmentAlert({
          toEmail: user.email,
          recipientName: user.displayName,
          patientName: currentPatient.name,
          title,
          doctorName: doctorName || undefined,
          location: location || undefined,
          scheduledAt: new Date(scheduledAt).toLocaleString(),
        }).catch((err) => console.warn('Appointment email failed:', err));
      }

      setShowModal(false); resetForm();
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  const handleCancel = async () => {
    if (!cancelId || !user || !currentPatient) return;
    await cancelAppointment(cancelId);
    await auditService.logAction({
      actorId: user.id, actorName: user.displayName,
      action: 'appointment_cancelled', targetType: 'appointment',
      targetId: cancelId, patientId: currentPatient.id,
    });
    setCancelId(null);
  };

  if (loading) return <LoadingSpinner size="lg" text="Loading appointments..." />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Calendar className="w-7 h-7 text-blue-600" /> Appointments
        </h1>
        {canManage && (
          <Button variant="primary" onClick={() => setShowModal(true)}>
            <Plus className="w-5 h-5 mr-1" /> New Appointment
          </Button>
        )}
      </div>

      {appointments.length === 0 ? (
        <EmptyState icon={Calendar} title="No appointments" description="Schedule an appointment to keep track of visits."
          action={canManage ? { label: 'New Appointment', onClick: () => setShowModal(true) } : undefined} />
      ) : (
        <>
          {upcoming.length > 0 && (
            <div>
              <h2 className="text-lg font-bold mb-3">Upcoming</h2>
              <div className="space-y-3">
                {upcoming.map((apt) => (
                  <Card key={apt.id} className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold">{apt.title}</h3>
                        <div className="flex flex-wrap gap-4 text-sm text-gray-600 mt-2">
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" /> {formatDate(apt.scheduledAt)} at {formatTime(apt.scheduledAt)}
                          </span>
                          {apt.doctorName && <span className="flex items-center gap-1"><User className="w-4 h-4" /> Dr. {apt.doctorName}</span>}
                          {apt.location && <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {apt.location}</span>}
                        </div>
                        {apt.description && <p className="text-sm text-gray-500 mt-2">{apt.description}</p>}
                      </div>
                      {canManage && (
                        <Button variant="ghost" size="sm" className="text-red-600" onClick={() => setCancelId(apt.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {past.length > 0 && (
            <div>
              <h2 className="text-lg font-bold mb-3">Past / Cancelled</h2>
              <div className="space-y-2">
                {past.map((apt) => (
                  <Card key={apt.id} className="p-4 bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{apt.title}</p>
                        <p className="text-sm text-gray-500">{formatDate(apt.scheduledAt)}</p>
                      </div>
                      <Badge variant={apt.status === 'cancelled' ? 'danger' : 'neutral'}>
                        {apt.status}
                      </Badge>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <Modal isOpen={showModal} onClose={() => { setShowModal(false); resetForm(); }} title="New Appointment" size="md">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Cardiology Checkup" required />
          <Input label="Date & Time" type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} required />
          <Input label="Doctor Name" value={doctorName} onChange={(e) => setDoctorName(e.target.value)} placeholder="Optional" />
          <Input label="Location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Optional" />
          <Input label="Description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional notes" />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Duration (min)" type="number" value={duration} onChange={(e) => setDuration(e.target.value)} />
            <Input label="Reminder Before (min)" type="number" value={reminderBefore} onChange={(e) => setReminderBefore(e.target.value)} />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => { setShowModal(false); resetForm(); }}>Cancel</Button>
            <Button type="submit" variant="primary" loading={saving} fullWidth>Create Appointment</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog isOpen={!!cancelId} onConfirm={handleCancel} onCancel={() => setCancelId(null)}
        title="Cancel Appointment" message="Are you sure you want to cancel this appointment?" confirmLabel="Cancel Appointment" confirmVariant="danger" />
    </div>
  );
}
