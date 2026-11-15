import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePatient } from '@/contexts/PatientContext';
import { useMedications } from '@/hooks/useMedications';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import * as auditService from '@/services/auditService';
import * as notificationService from '@/services/notificationService';
import * as emailService from '@/services/emailService';
import { supabase } from '@/config/supabase';
import PrescriptionOcrModal from '@/components/medications/PrescriptionOcrModal';
import {
  Pill,
  Plus,
  Edit,
  Trash2,
  Calendar,
  Clock,
  FileText,
  Camera,
  Lock,
  Send,
  AlertCircle,
  CheckCircle2,
  ShieldAlert,
} from 'lucide-react';

const FORM_OPTIONS = [
  { value: 'tablet', label: 'Tablet' },
  { value: 'capsule', label: 'Capsule' },
  { value: 'liquid', label: 'Liquid' },
  { value: 'injection', label: 'Injection' },
  { value: 'cream', label: 'Cream' },
  { value: 'drops', label: 'Drops' },
  { value: 'inhaler', label: 'Inhaler' },
  { value: 'patch', label: 'Patch' },
];

const REQUEST_TYPE_OPTIONS = [
  { value: 'refill', label: 'Medication Refill Needed' },
  { value: 'dosage_change', label: 'Dosage Adjustment Request' },
  { value: 'new_medication', label: 'New Prescription to Add' },
  { value: 'discontinue', label: 'Report Side Effect / Discontinue' },
];

export default function MedicationManagement() {
  const { user } = useAuth();
  const { currentPatient, currentMembership, hasPermission } = usePatient();
  const { medications, loading, createMedication, updateMedication, deleteMedication, refresh } =
    useMedications(currentPatient?.id);
  const navigate = useNavigate();

  // Primary Family Admin has full permissions; Caretakers & others have locked actions with request capability
  const isPrimaryAdmin = Boolean(
    user && currentPatient && user.id === currentPatient.primaryUserId
  );
  const canManage = isPrimaryAdmin || (hasPermission('manage_medications') && currentMembership?.role === 'family_admin');

  const [showModal, setShowModal] = useState(false);
  const [showOcrModal, setShowOcrModal] = useState(false);
  const [editingMed, setEditingMed] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [form, setForm] = useState('tablet');
  const [instructions, setInstructions] = useState('');
  const [prescribedBy, setPrescribedBy] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');

  // Request Modal State for Caretaker / Non-Admin
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestType, setRequestType] = useState('refill');
  const [requestMedId, setRequestMedId] = useState('');
  const [customMedName, setCustomMedName] = useState('');
  const [requestNotes, setRequestNotes] = useState('');
  const [requestUrgency, setRequestUrgency] = useState<'standard' | 'urgent'>('standard');
  const [requestSubmitting, setRequestSubmitting] = useState(false);
  const [requestSuccess, setRequestSuccess] = useState(false);

  const resetForm = () => {
    setName('');
    setDosage('');
    setForm('tablet');
    setInstructions('');
    setPrescribedBy('');
    setStartDate(new Date().toISOString().split('T')[0]);
    setEndDate('');
    setEditingMed(null);
  };

  const openCreate = () => {
    resetForm();
    setShowModal(true);
  };

  const openEdit = (medId: string) => {
    const med = medications.find((m) => m.id === medId);
    if (!med) return;
    setName(med.name);
    setDosage(med.dosage);
    setForm(med.form);
    setInstructions(med.instructions || '');
    setPrescribedBy(med.prescribedBy || '');
    setStartDate(med.startDate);
    setEndDate(med.endDate || '');
    setEditingMed(medId);
    setShowModal(true);
  };

  const openRequestModal = (medId?: string) => {
    setRequestMedId(medId || (medications[0]?.id || ''));
    setCustomMedName('');
    setRequestNotes('');
    setRequestUrgency('standard');
    setRequestSuccess(false);
    setShowRequestModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPatient || !user) return;
    setSaving(true);
    try {
      if (editingMed) {
        await updateMedication(editingMed, {
          name,
          dosage,
          form,
          instructions,
          prescribedBy,
          startDate,
          endDate: endDate || undefined,
        });
        await auditService.logAction({
          actorId: user.id,
          actorName: user.displayName,
          action: 'medication_updated',
          targetType: 'medication',
          targetId: editingMed,
          patientId: currentPatient.id,
        });
      } else {
        const med = await createMedication({
          patientId: currentPatient.id,
          name,
          dosage,
          form,
          instructions,
          prescribedBy,
          startDate,
          endDate: endDate || undefined,
          isActive: true,
          createdBy: user.id,
        });
        await auditService.logAction({
          actorId: user.id,
          actorName: user.displayName,
          action: 'medication_created',
          targetType: 'medication',
          targetId: med.id,
          patientId: currentPatient.id,
        });
      }
      setShowModal(false);
      resetForm();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId || !user || !currentPatient) return;
    await deleteMedication(deleteId);
    await auditService.logAction({
      actorId: user.id,
      actorName: user.displayName,
      action: 'medication_deleted',
      targetType: 'medication',
      targetId: deleteId,
      patientId: currentPatient.id,
    });
    setDeleteId(null);
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

      // 1. In-app escalation notification for Primary Family Admin
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

      // 2. Fetch primary admin user email for EmailJS dispatch
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
          message: `${user.displayName} (${currentMembership?.role || 'Caretaker'}) has submitted a request for your approval:\n\nPatient: ${currentPatient.name}\nRequest Type: ${typeLabel}\nMedication: ${targetMedName}\nNotes: "${requestNotes}"\nPriority: ${requestUrgency.toUpperCase()}\n\nPlease review and approve on your CareLoop dashboard.`,
          actionUrl: `${window.location.origin}/medications`,
          actionLabel: 'Review in CareLoop',
        });
      }

      // 3. Log audit event
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
      console.error('Failed to submit medication request:', err);
    } finally {
      setRequestSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner size="lg" text="Loading prescriptions..." />;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900 tracking-tight">
            Prescriptions & Medications
          </h1>
          <p className="text-sm font-medium text-neutral-500 mt-0.5">
            Manage medications, dosage, and intake instructions
          </p>
        </div>

        {canManage ? (
          <div className="flex items-center gap-2.5 flex-wrap">
            <Button
              variant="outline"
              size="md"
              onClick={() => setShowOcrModal(true)}
              className="gap-2 font-semibold"
            >
              <div className="flex items-center gap-1 text-[#22C55E]">
                <FileText className="w-4 h-4" />
                <Camera className="w-4 h-4" />
              </div>
              <span>Scan Prescription (PDF / Photo)</span>
            </Button>
            <Button variant="primary" size="md" onClick={openCreate} className="font-semibold">
              <Plus className="w-4 h-4 mr-1 text-[#22C55E]" /> Add Medication
            </Button>
          </div>
        ) : (
          <Button
            variant="primary"
            size="md"
            onClick={() => openRequestModal()}
            className="font-semibold"
          >
            <Send className="w-4 h-4 mr-1.5 text-[#22C55E]" /> Request Medication Change
          </Button>
        )}
      </div>

      {/* Role Restriction Banner for Caretakers & Secondary Members */}
      {!canManage && (
        <div className="bg-amber-50/80 border border-amber-200/80 rounded-3xl p-5 flex items-start gap-4">
          <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-amber-900 text-sm">
              Prescription Management Locked (Caretaker View)
            </h3>
            <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
              To protect senior health and clinical safety, direct edits or deletions of prescriptions are restricted to the <strong>Primary Family Admin</strong>. As a Caretaker, you can record doses, monitor schedules, and request dosage changes or refills below.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => openRequestModal()}
              className="mt-3 bg-white text-xs font-semibold"
            >
              <Send className="w-3.5 h-3.5 mr-1 text-amber-700" />
              Request Medication Update from Family Admin
            </Button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {medications.length === 0 ? (
        <EmptyState
          icon={Pill}
          title="No medications registered"
          description="Add active prescriptions to schedule daily reminders and track adherence."
          action={canManage ? { label: 'Add Medication', onClick: openCreate } : undefined}
        />
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {medications.map((med) => (
            <div
              key={med.id}
              className="bg-white rounded-3xl p-5 border border-neutral-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-[#EBF7EE] text-[#22C55E] flex items-center justify-center shrink-0">
                      <Pill className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-neutral-900">{med.name}</h3>
                      <p className="text-xs font-semibold text-neutral-500">
                        {med.dosage} • {med.form}
                      </p>
                    </div>
                  </div>
                  <Badge variant={med.isActive ? 'success' : 'neutral'} size="sm">
                    {med.isActive ? 'Active' : 'Archived'}
                  </Badge>
                </div>

                {med.instructions && (
                  <p className="text-xs text-neutral-600 mb-3 bg-neutral-50 p-2.5 rounded-2xl border border-neutral-100">
                    {med.instructions}
                  </p>
                )}

                <div className="flex items-center gap-4 text-xs font-medium text-neutral-500 mb-4">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" /> {med.startDate}
                  </span>
                  {med.prescribedBy && <span className="truncate">Rx: {med.prescribedBy}</span>}
                </div>
              </div>

              {/* Action buttons row */}
              <div className="flex items-center justify-between gap-2 pt-3 border-t border-neutral-100">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/medications/${med.id}/schedules`)}
                  className="text-xs font-semibold"
                >
                  <Clock className="w-3.5 h-3.5 mr-1" /> Schedules
                </Button>

                {canManage ? (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(med.id)}
                      className="text-xs text-neutral-600"
                    >
                      <Edit className="w-3.5 h-3.5 mr-1" /> Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50/50"
                      onClick={() => setDeleteId(med.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" /> Remove
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openRequestModal(med.id)}
                    className="text-xs text-neutral-600 hover:text-neutral-900"
                  >
                    <Send className="w-3 h-3 mr-1 text-neutral-500" />
                    Request Refill / Change
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Prescription Modal (Admin Only) */}
      {canManage && (
        <Modal
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            resetForm();
          }}
          title={editingMed ? 'Edit Medication' : 'Add Medication'}
          size="md"
        >
          <form onSubmit={handleSave} className="space-y-4">
            <Input
              label="Medication Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Metformin"
              required
            />
            <Input
              label="Dosage"
              value={dosage}
              onChange={(e) => setDosage(e.target.value)}
              placeholder="e.g. 500mg"
              required
            />
            <Select
              label="Form"
              value={form}
              onChange={(e) => setForm(e.target.value)}
              options={FORM_OPTIONS}
            />
            <Input
              label="Instructions"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="e.g. Take with meals"
            />
            <Input
              label="Prescribed By"
              value={prescribedBy}
              onChange={(e) => setPrescribedBy(e.target.value)}
              placeholder="Doctor's name"
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Start Date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
              <Input
                label="End Date (optional)"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="flex gap-3 pt-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" loading={saving} fullWidth>
                {editingMed ? 'Save Changes' : 'Add Medication'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Caretaker / Member Request Modal */}
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

      <ConfirmDialog
        isOpen={!!deleteId}
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
        title="Remove Medication"
        message="This will deactivate this prescription. Historical dose records and adherence data will be preserved."
        confirmLabel="Deactivate"
        confirmVariant="danger"
      />

      {/* Prescription PDF OCR & Extraction Modal */}
      <PrescriptionOcrModal
        isOpen={showOcrModal}
        onClose={() => setShowOcrModal(false)}
        onImportSuccess={() => {
          refresh();
        }}
      />
    </div>
  );
}
