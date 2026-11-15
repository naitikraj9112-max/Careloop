import { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePatient } from '@/contexts/PatientContext';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import * as ocrService from '@/services/prescriptionOcrService';
import type { ExtractedMedication, PrescriptionExtractionResult } from '@/services/prescriptionOcrService';
import * as medicationService from '@/services/medicationService';
import * as scheduleService from '@/services/scheduleService';
import * as medicationEventService from '@/services/medicationEventService';
import * as auditService from '@/services/auditService';
import {
  FileText, UploadCloud, Sparkles, CheckCircle2,
  AlertTriangle, Trash2, Plus, ArrowRight, ShieldCheck,
  Stethoscope, Image as ImageIcon, Camera
} from 'lucide-react';

const FORM_OPTIONS = [
  { value: 'tablet', label: 'Tablet' },
  { value: 'capsule', label: 'Capsule' },
  { value: 'liquid', label: 'Liquid' },
  { value: 'injection', label: 'Injection' },
  { value: 'drops', label: 'Drops' },
  { value: 'inhaler', label: 'Inhaler' },
  { value: 'cream', label: 'Cream' },
  { value: 'patch', label: 'Patch' },
];

const FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Once Daily' },
  { value: 'twice_daily', label: 'Twice Daily (Morning & Evening)' },
  { value: 'three_times_daily', label: 'Three Times Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'custom', label: 'Custom' },
];

interface PrescriptionOcrModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: () => void;
}

export default function PrescriptionOcrModal({
  isOpen,
  onClose,
  onImportSuccess,
}: PrescriptionOcrModalProps) {
  const { user } = useAuth();
  const { currentPatient } = usePatient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<'upload' | 'verifying' | 'importing'>('upload');
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Analyzing document...');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [extractedData, setExtractedData] = useState<PrescriptionExtractionResult | null>(null);
  const [medsList, setMedsList] = useState<ExtractedMedication[]>([]);
  const [geminiApiKey, setGeminiApiKey] = useState('');

  const resetState = () => {
    setStep('upload');
    setLoading(false);
    setStatusMessage('Analyzing document...');
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setError(null);
    setExtractedData(null);
    setMedsList([]);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  // Process Document (PDF or Photo/Image)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }

    setLoading(true);
    setError(null);
    setStatusMessage(file.type.startsWith('image/') ? 'Processing prescription image (OCR)...' : 'Reading prescription PDF...');

    try {
      const result = await ocrService.processPrescriptionDocument(
        file,
        geminiApiKey,
        (msg) => setStatusMessage(msg)
      );

      if (result.medications.length === 0) {
        throw new Error('Could not identify any medications from this document. You can add them manually below.');
      }

      setExtractedData(result);
      setMedsList(result.medications);
      setStep('verifying');
    } catch (err: any) {
      console.error('Prescription processing failed:', err);
      setError(err.message || 'Failed to parse prescription file.');
    } finally {
      setLoading(false);
    }
  };

  // Sample prescription for testing
  const handleLoadSample = () => {
    const sampleText = `
Dr. Robert Vance, MD
Metropolitan Senior Health Center
Date: 2026-11-15
Patient: Eleanor Vance

Rx Prescriptions:
1. Tab Metformin 500mg - Take 1 tablet twice daily after meals (1-0-1)
2. Tab Lisinopril 10mg - Take 1 tablet once daily in the morning (1-0-0)
3. Cap Omeprazole 20mg - Take 1 capsule once daily before breakfast
4. Tab Atorvastatin 20mg - Take 1 tablet once daily at bedtime (0-0-1)
    `;

    setLoading(true);
    setStatusMessage('Loading sample prescription...');
    setTimeout(() => {
      const result = ocrService.parsePrescriptionText(sampleText);
      setExtractedData(result);
      setMedsList(result.medications);
      setLoading(false);
      setStep('verifying');
    }, 500);
  };

  const handleUpdateMed = (id: string, updates: Partial<ExtractedMedication>) => {
    setMedsList((prev) =>
      prev.map((m) => {
        if (m.id !== id) return m;
        const updated = { ...m, ...updates };

        if (updates.frequency) {
          if (updates.frequency === 'daily') updated.times = ['09:00'];
          else if (updates.frequency === 'twice_daily') updated.times = ['09:00', '21:00'];
          else if (updates.frequency === 'three_times_daily') updated.times = ['08:00', '14:00', '20:00'];
          else if (updates.frequency === 'weekly') updated.times = ['09:00'];
        }
        return updated;
      })
    );
  };

  const handleToggleSelect = (id: string) => {
    setMedsList((prev) =>
      prev.map((m) => (m.id === id ? { ...m, selected: !m.selected } : m))
    );
  };

  const handleRemoveMed = (id: string) => {
    setMedsList((prev) => prev.filter((m) => m.id !== id));
  };

  const handleAddBlankMed = () => {
    const newMed: ExtractedMedication = {
      id: `manual_${Date.now()}`,
      name: '',
      dosage: '500mg',
      form: 'tablet',
      frequency: 'daily',
      times: ['09:00'],
      instructions: 'Take after meals',
      startDate: new Date().toISOString().split('T')[0],
      selected: true,
    };
    setMedsList((prev) => [...prev, newMed]);
  };

  // Final Approval and Import to Supabase
  const handleConfirmImport = async () => {
    if (!currentPatient || !user) return;
    const selectedMeds = medsList.filter((m) => m.selected && m.name.trim());

    if (selectedMeds.length === 0) {
      setError('Please select at least one medication to import.');
      return;
    }

    setStep('importing');
    setLoading(true);
    setError(null);

    try {
      const today = new Date();

      for (const med of selectedMeds) {
        // 1. Create medication
        const createdMed = await medicationService.createMedication({
          patientId: currentPatient.id,
          name: med.name.trim(),
          genericName: med.genericName?.trim() || undefined,
          dosage: med.dosage.trim(),
          form: med.form,
          instructions: med.instructions.trim() || undefined,
          prescribedBy: med.prescribedBy || extractedData?.doctorName || undefined,
          startDate: med.startDate || today.toISOString().split('T')[0],
          isActive: true,
          createdBy: user.id,
        });

        // 2. Create schedule
        const createdSchedule = await scheduleService.createSchedule({
          patientId: currentPatient.id,
          medicationId: createdMed.id,
          frequency: med.frequency,
          times: med.times.length > 0 ? med.times : ['09:00'],
          gracePeriodMinutes: 30,
          escalationDelayMinutes: 60,
          isActive: true,
          createdBy: user.id,
        });

        // 3. Generate today's dose events
        await medicationEventService.generateDoseEvents(createdSchedule.id, today);

        // 4. Audit Log
        await auditService.logAction({
          actorId: user.id,
          actorName: user.displayName,
          action: 'medication_created',
          targetType: 'medication',
          targetId: createdMed.id,
          patientId: currentPatient.id,
          details: { source: 'prescription_ocr', name: createdMed.name },
        });
      }

      onImportSuccess();
      handleClose();
    } catch (err: any) {
      console.error('Import failed:', err);
      setError(err.message || 'Failed to import medications.');
      setStep('verifying');
    } finally {
      setLoading(false);
    }
  };

  const selectedCount = medsList.filter((m) => m.selected && m.name.trim()).length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Scan Prescription (PDF or Photo)"
      size="lg"
    >
      {/* Step 1: Upload */}
      {step === 'upload' && (
        <div className="space-y-6 py-2">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-xs font-medium">
              {error}
            </div>
          )}

          {/* Drag & Drop Zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-neutral-300 hover:border-[#22C55E] bg-[#F9FAF7] rounded-3xl p-8 text-center cursor-pointer transition-colors group"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="application/pdf,image/png,image/jpeg,image/jpg,image/webp"
              className="hidden"
            />
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-white shadow-xs border border-neutral-200 flex items-center justify-center group-hover:scale-105 transition-transform text-[#22C55E]">
                <FileText className="w-6 h-6" />
              </div>
              <div className="w-12 h-12 rounded-2xl bg-white shadow-xs border border-neutral-200 flex items-center justify-center group-hover:scale-105 transition-transform text-neutral-800">
                <Camera className="w-6 h-6" />
              </div>
            </div>

            <h3 className="font-bold text-base text-neutral-900 mb-1">
              Click or drag a prescription PDF or Photo here
            </h3>
            <p className="text-xs text-neutral-500 max-w-sm mx-auto">
              Supports clinic PDF documents or photos taken with your phone camera (.pdf, .jpg, .png, .webp).
            </p>
          </div>

          {/* Image preview while scanning */}
          {previewUrl && (
            <div className="max-w-xs mx-auto rounded-2xl overflow-hidden border border-neutral-200 shadow-xs">
              <img src={previewUrl} alt="Prescription preview" className="w-full h-36 object-cover" />
            </div>
          )}

          {/* Quick Sample Demo Button */}
          <div className="flex items-center justify-between bg-neutral-50 border border-neutral-200/80 rounded-2xl p-3.5">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-5 h-5 text-[#22C55E]" />
              <div>
                <p className="text-xs font-bold text-neutral-900">Want to test right now?</p>
                <p className="text-[11px] text-neutral-500">Test with a verified 4-medicine clinical prescription sample.</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleLoadSample} className="text-xs shrink-0 font-semibold">
              Test Sample
            </Button>
          </div>

          {/* Optional Gemini API Key input */}
          <div className="pt-2 border-t border-neutral-100">
            <details className="text-xs text-neutral-500">
              <summary className="cursor-pointer font-semibold text-neutral-700 hover:text-neutral-900">
                Advanced: Google Gemini AI Key (Optional)
              </summary>
              <div className="mt-3 space-y-2">
                <Input
                  label="Gemini API Key"
                  type="password"
                  placeholder="AIzaSy..."
                  value={geminiApiKey}
                  onChange={(e) => setGeminiApiKey(e.target.value)}
                />
                <p className="text-[11px] text-neutral-400">
                  CareLoop includes built-in OCR and clinical parsers. Adding a Gemini key enables high-level visual understanding for handwritten doctor notes and irregular layouts.
                </p>
              </div>
            </details>
          </div>

          {loading && (
            <div className="py-6 flex justify-center">
              <LoadingSpinner size="md" text={statusMessage} />
            </div>
          )}
        </div>
      )}

      {/* Step 2: Human Verification & Review */}
      {step === 'verifying' && (
        <div className="space-y-5 py-2">
          {/* Safety Notice */}
          <div className="bg-[#EBF7EE] border border-[#22C55E]/40 rounded-2xl p-3.5 flex items-start gap-2.5">
            <ShieldCheck className="w-5 h-5 text-[#22C55E] shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-bold text-[#1e6f39]">Human Verification Required</p>
              <p className="text-[#2e7d32] mt-0.5 leading-relaxed">
                Review and verify each extracted medication, dosage, and intake time before adding to {currentPatient?.name}&apos;s active schedule.
              </p>
            </div>
          </div>

          {/* Doctor & Clinic Details */}
          {(extractedData?.doctorName || extractedData?.clinicName || extractedData?.sourceType) && (
            <div className="flex items-center justify-between flex-wrap gap-2 text-xs font-semibold text-neutral-600 bg-neutral-50 border border-neutral-200/80 px-3.5 py-2.5 rounded-2xl">
              <div className="flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-neutral-500" />
                <span>
                  {extractedData.doctorName ? `Prescribed by ${extractedData.doctorName}` : 'Prescription Document'}
                  {extractedData.clinicName ? ` • ${extractedData.clinicName}` : ''}
                </span>
              </div>
              <span className="text-[11px] font-bold text-neutral-500 px-2 py-0.5 bg-white border border-neutral-200 rounded-full flex items-center gap-1">
                {extractedData.sourceType === 'image' ? <Camera className="w-3 h-3 text-[#22C55E]" /> : <FileText className="w-3 h-3 text-[#22C55E]" />}
                {extractedData.sourceType === 'image' ? 'Photo OCR' : 'PDF OCR'}
              </span>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-3 text-xs font-medium">
              {error}
            </div>
          )}

          {/* Medication Cards List */}
          <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
            {medsList.map((med, idx) => (
              <div
                key={med.id}
                className={`p-4 rounded-3xl border transition-all ${
                  med.selected
                    ? 'bg-white border-neutral-200/90 shadow-[0_2px_12px_rgba(0,0,0,0.03)]'
                    : 'bg-neutral-50 border-neutral-200 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={med.selected}
                      onChange={() => handleToggleSelect(med.id)}
                      className="w-4 h-4 rounded text-[#22C55E] focus:ring-[#22C55E]"
                    />
                    <span className="font-bold text-xs uppercase tracking-wider text-neutral-400">
                      Medication #{idx + 1}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveMed(med.id)}
                    className="p-1 text-neutral-400 hover:text-red-500 rounded-full"
                    title="Remove medication"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <Input
                    label="Medicine Name"
                    value={med.name}
                    onChange={(e) => handleUpdateMed(med.id, { name: e.target.value })}
                    placeholder="e.g. Metformin"
                    required
                  />
                  <Input
                    label="Dosage"
                    value={med.dosage}
                    onChange={(e) => handleUpdateMed(med.id, { dosage: e.target.value })}
                    placeholder="e.g. 500mg"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <Select
                    label="Form"
                    value={med.form}
                    onChange={(e) => handleUpdateMed(med.id, { form: e.target.value })}
                    options={FORM_OPTIONS}
                  />
                  <Select
                    label="Schedule Frequency"
                    value={med.frequency}
                    onChange={(e) => handleUpdateMed(med.id, { frequency: e.target.value as any })}
                    options={FREQUENCY_OPTIONS}
                  />
                </div>

                <Input
                  label="Instructions / Food Directions"
                  value={med.instructions}
                  onChange={(e) => handleUpdateMed(med.id, { instructions: e.target.value })}
                  placeholder="e.g. Take after meals"
                />

                {/* Display Scheduled Times */}
                <div className="mt-3 flex items-center gap-2 text-xs text-neutral-500">
                  <span className="font-semibold text-neutral-700">Scheduled Times:</span>
                  {med.times.map((t, tIdx) => (
                    <span
                      key={tIdx}
                      className="px-2 py-0.5 rounded-full bg-neutral-100 font-mono text-neutral-800 font-bold"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            fullWidth
            size="sm"
            onClick={handleAddBlankMed}
            className="text-xs"
          >
            <Plus className="w-4 h-4 mr-1 text-neutral-500" />
            Add Another Medicine
          </Button>

          {/* Action Row */}
          <div className="flex items-center justify-between pt-4 border-t border-neutral-100 gap-3">
            <Button
              type="button"
              variant="ghost"
              size="md"
              onClick={() => setStep('upload')}
            >
              Back to Upload
            </Button>

            <Button
              type="button"
              variant="green"
              size="lg"
              onClick={handleConfirmImport}
              disabled={selectedCount === 0}
              className="gap-2 font-bold px-6"
            >
              <span>Approve &amp; Import ({selectedCount})</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Importing */}
      {step === 'importing' && (
        <div className="py-12 text-center space-y-4">
          <LoadingSpinner size="lg" text="Creating prescriptions, schedules, and daily dose events..." />
        </div>
      )}
    </Modal>
  );
}
