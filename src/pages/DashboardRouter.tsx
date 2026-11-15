import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePatient } from '@/contexts/PatientContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import * as patientService from '@/services/patientService';
import type { Patient } from '@/types';
import { User, Heart, Copy, CheckCircle2, KeyRound } from 'lucide-react';

const GENDER_OPTIONS = [
  { value: '', label: 'Select Gender (Optional)' },
  { value: 'Female', label: 'Female' },
  { value: 'Male', label: 'Male' },
  { value: 'Other', label: 'Other' },
  { value: 'Prefer not to say', label: 'Prefer not to say' },
];

const BLOOD_TYPE_OPTIONS = [
  { value: '', label: 'Select Blood Type (Optional)' },
  { value: 'A+', label: 'A+' },
  { value: 'A-', label: 'A-' },
  { value: 'B+', label: 'B+' },
  { value: 'B-', label: 'B-' },
  { value: 'AB+', label: 'AB+' },
  { value: 'AB-', label: 'AB-' },
  { value: 'O+', label: 'O+' },
  { value: 'O-', label: 'O-' },
];

export default function DashboardRouter() {
  const { user } = useAuth();
  const { currentPatient, currentMembership, loading, refreshPatients } = usePatient();
  const navigate = useNavigate();

  const [patientName, setPatientName] = useState('');
  const [patientEmail, setPatientEmail] = useState('');
  const [patientPin, setPatientPinState] = useState('1234');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('');
  const [bloodType, setBloodType] = useState('');
  const [allergiesText, setAllergiesText] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [emergencyRelationship, setEmergencyRelationship] = useState('');

  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [newlyCreatedPatient, setNewlyCreatedPatient] = useState<Patient | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="lg" text="Loading care overview..." />
      </div>
    );
  }

  // If patient selected, redirect to role-based dashboard
  if (currentPatient && currentMembership && !newlyCreatedPatient) {
    const role = currentMembership.role;
    if (role === 'elderly') return <Navigate to="/elderly" replace />;
    if (role === 'caretaker') return <Navigate to="/caretaker" replace />;
    return <Navigate to="/family" replace />;
  }

  // Create Patient Flow
  const handleCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !patientName.trim()) return;

    setCreating(true);
    setCreateError('');
    try {
      const allergies = allergiesText
        ? allergiesText.split(',').map((s) => s.trim()).filter(Boolean)
        : [];

      const emergencyContact = {
        name: emergencyName.trim() || 'Primary Caregiver',
        phone: emergencyPhone.trim() || '',
        relationship: emergencyRelationship.trim() || 'Family',
        email: patientEmail.trim() || undefined,
        patientPin: patientPin.trim() || '1234',
      };

      const created = await patientService.createPatient(
        {
          name: patientName.trim(),
          dateOfBirth: dateOfBirth || undefined,
          gender: gender || undefined,
          bloodType: bloodType || undefined,
          allergies,
          emergencyContact,
          patientPin: patientPin.trim() || '1234',
          primaryUserId: user.id,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
        },
        user.id,
      );

      setNewlyCreatedPatient(created);
      await refreshPatients();
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create patient profile.');
    } finally {
      setCreating(false);
    }
  };

  const handleCopyId = () => {
    if (!newlyCreatedPatient) return;
    const code = newlyCreatedPatient.uniquePatientId || `CARE-${newlyCreatedPatient.id.slice(0, 6).toUpperCase()}`;
    const pin = newlyCreatedPatient.patientPin || newlyCreatedPatient.emergencyContact?.patientPin || '1234';
    navigator.clipboard.writeText(`CareLoop Login for ${newlyCreatedPatient.name}:\nPatient ID: ${code}\nPIN: ${pin}\nWebsite: ${window.location.origin}/login`);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  return (
    <div className="max-w-xl mx-auto py-10 px-4">
      {/* Brand Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 mb-2">
          <span className="font-serif text-3xl font-bold tracking-tight text-neutral-900">
            CareLoop
          </span>
          <span className="w-2.5 h-2.5 rounded-full bg-[#22C55E]" />
        </div>
        <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">Create Patient Profile</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Set up a care profile to start managing medications, schedules, and care team members.
        </p>
      </div>

      {/* Profile Creation Card */}
      <div className="bg-white rounded-3xl p-7 sm:p-9 border border-neutral-200/80 shadow-[0_2px_16px_rgba(0,0,0,0.03)]">
        <form onSubmit={handleCreatePatient} className="space-y-4">
          {createError && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-xs font-medium" role="alert">
              {createError}
            </div>
          )}

          <Input
            label="Patient Full Name *"
            value={patientName}
            onChange={(e) => setPatientName(e.target.value)}
            placeholder="e.g. Eleanor Vance"
            required
            autoFocus
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Senior's Email / Gmail (Optional)"
              type="email"
              value={patientEmail}
              onChange={(e) => setPatientEmail(e.target.value)}
              placeholder="e.g. eleanor.vance@gmail.com"
              helperText="Allows login via either Gmail or Patient ID."
            />
            <Input
              label="Senior Login PIN / Password *"
              type="text"
              value={patientPin}
              onChange={(e) => setPatientPinState(e.target.value)}
              placeholder="e.g. 1234"
              helperText="Simple 4-6 digit PIN for senior login."
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Date of Birth"
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
            />
            <Select
              label="Gender"
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              options={GENDER_OPTIONS}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Blood Type"
              value={bloodType}
              onChange={(e) => setBloodType(e.target.value)}
              options={BLOOD_TYPE_OPTIONS}
            />
            <Input
              label="Allergies (comma-separated)"
              value={allergiesText}
              onChange={(e) => setAllergiesText(e.target.value)}
              placeholder="e.g. Penicillin, Peanuts"
            />
          </div>

          <div className="pt-3 border-t border-neutral-100">
            <p className="text-xs uppercase tracking-wider font-bold text-neutral-500 mb-3">
              Emergency Contact (Optional)
            </p>
            <div className="space-y-3">
              <Input
                label="Contact Name"
                value={emergencyName}
                onChange={(e) => setEmergencyName(e.target.value)}
                placeholder="e.g. David Vance"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Contact Phone"
                  type="tel"
                  value={emergencyPhone}
                  onChange={(e) => setEmergencyPhone(e.target.value)}
                  placeholder="e.g. +1 (555) 019-2834"
                />
                <Input
                  label="Relationship"
                  value={emergencyRelationship}
                  onChange={(e) => setEmergencyRelationship(e.target.value)}
                  placeholder="e.g. Son, Daughter, Spouse"
                />
              </div>
            </div>
          </div>

          <div className="pt-4">
            <Button
              type="submit"
              variant="primary"
              loading={creating}
              fullWidth
              size="lg"
            >
              Create Patient Profile & Generate Unique ID
            </Button>
          </div>
        </form>
      </div>

      {/* Success Modal Showing Unique Patient ID */}
      {newlyCreatedPatient && (
        <Modal
          isOpen={true}
          onClose={() => {
            setNewlyCreatedPatient(null);
            navigate('/family');
          }}
          title="Patient Created Successfully!"
          size="md"
        >
          <div className="space-y-5 text-center py-2">
            <div className="w-14 h-14 rounded-full bg-[#EBF7EE] text-[#22C55E] flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-neutral-900">
                {newlyCreatedPatient.name} is ready on CareLoop
              </h3>
              <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
                A secure Unique Patient ID has been generated for their easy login and dedicated voice-enabled dashboard.
              </p>
            </div>

            {/* Unique Patient ID & PIN Credentials Display */}
            <div className="bg-[#F9FAF7] border-2 border-[#22C55E]/40 rounded-2xl p-5 text-center space-y-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 flex items-center justify-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-[#22C55E]" />
                Senior Login Credentials
              </span>

              <div className="grid grid-cols-2 gap-3 text-left">
                <div className="bg-white rounded-xl p-3 border border-neutral-200">
                  <span className="text-[10px] uppercase font-bold text-neutral-400 block">
                    Patient ID
                  </span>
                  <span className="font-mono text-lg font-black text-neutral-900">
                    {newlyCreatedPatient.uniquePatientId || `CARE-${newlyCreatedPatient.id.slice(0, 6).toUpperCase()}`}
                  </span>
                </div>
                <div className="bg-white rounded-xl p-3 border border-neutral-200">
                  <span className="text-[10px] uppercase font-bold text-neutral-400 block">
                    Login PIN
                  </span>
                  <span className="font-mono text-lg font-black text-[#22C55E]">
                    {newlyCreatedPatient.patientPin || newlyCreatedPatient.emergencyContact?.patientPin || '1234'}
                  </span>
                </div>
              </div>

              <div className="flex justify-center pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyId}
                  className="rounded-full px-4 py-1.5 text-xs font-semibold"
                >
                  <Copy className="w-3.5 h-3.5 mr-1.5" />
                  {copiedId ? 'Copied Login Card!' : 'Copy Login Details for Senior'}
                </Button>
              </div>

              <p className="text-[11px] text-neutral-600">
                The senior can enter this <strong>Patient ID</strong> and <strong>PIN</strong> on the <strong>Senior Patient Login</strong> tab.
              </p>
            </div>

            <div className="pt-2">
              <Button
                variant="primary"
                fullWidth
                size="lg"
                onClick={() => {
                  setNewlyCreatedPatient(null);
                  navigate('/family');
                }}
              >
                Go to Family Admin Dashboard →
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
