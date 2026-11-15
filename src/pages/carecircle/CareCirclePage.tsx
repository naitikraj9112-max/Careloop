import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePatient } from '@/contexts/PatientContext';
import { supabase } from '@/config/supabase';
import * as membershipService from '@/services/membershipService';
import * as auditService from '@/services/auditService';
import * as emailService from '@/services/emailService';
import * as patientService from '@/services/patientService';
import type { CaregiverMembership, UserRole, Permission, UserProfile } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatDateTime } from '@/lib/utils';
import {
  Users,
  UserPlus,
  Shield,
  Trash2,
  Copy,
  CheckCircle2,
  Clock,
  Mail,
  KeyRound,
  Eye,
  EyeOff,
} from 'lucide-react';

const ROLE_OPTIONS = [
  { value: 'family_admin', label: 'Family Admin (Full Access)' },
  { value: 'caretaker', label: 'Caretaker (Dose Recording & Tasks)' },
  { value: 'elderly', label: 'Elderly Person (Daily Pill View)' },
];

const DEFAULT_PERMISSIONS: Record<string, Permission[]> = {
  family_admin: [
    'view_schedule',
    'manage_medications',
    'record_dose',
    'view_adherence',
    'manage_appointments',
    'manage_members',
    'view_audit_log',
    'manage_patient_profile',
  ],
  caretaker: [
    'view_schedule',
    'record_dose',
    'view_adherence',
    'manage_appointments',
  ],
  elderly: [
    'view_schedule',
    'record_dose',
    'view_adherence',
    'manage_appointments',
  ],
};

interface MemberWithUser extends CaregiverMembership {
  userProfile?: {
    displayName: string;
    email: string;
  };
}

export default function CareCirclePage() {
  const { user } = useAuth();
  const { currentPatient, hasPermission, loading: patientLoading } = usePatient();
  const navigate = useNavigate();
  const canManage = hasPermission('manage_members');

  const [members, setMembers] = useState<MemberWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [revokeId, setRevokeId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [generatedInviteLink, setGeneratedInviteLink] = useState('');
  const [lastInvitedEmail, setLastInvitedEmail] = useState('');
  const [emailDispatched, setEmailDispatched] = useState<boolean | null>(null);
  const [emailError, setEmailError] = useState<string>('');
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<string>('caretaker');

  // Senior Credentials State
  const [showPinModal, setShowPinModal] = useState(false);
  const [newPin, setNewPin] = useState('1234');
  const [seniorEmail, setSeniorEmail] = useState('');
  const [showPinSecret, setShowPinSecret] = useState(false);
  const [savingPin, setSavingPin] = useState(false);
  const [pinSaved, setPinSaved] = useState(false);
  const [copiedSeniorCard, setCopiedSeniorCard] = useState(false);

  const handleCopySeniorCard = () => {
    if (!currentPatient) return;
    const code =
      currentPatient.uniquePatientId ||
      `CARE-${currentPatient.id.slice(0, 6).toUpperCase()}`;
    const pin =
      currentPatient.patientPin ||
      currentPatient.emergencyContact?.patientPin ||
      '1234';
    navigator.clipboard.writeText(
      `CareLoop Senior Login Details for ${currentPatient.name}:\nPatient ID: ${code}\nPIN: ${pin}\nWebsite: ${window.location.origin}/login (Select Senior Patient tab)`
    );
    setCopiedSeniorCard(true);
    setTimeout(() => setCopiedSeniorCard(false), 2000);
  };

  const handleSavePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPatient || !newPin.trim()) return;
    setSavingPin(true);
    try {
      await patientService.setPatientPin(
        currentPatient.id,
        newPin.trim(),
        seniorEmail.trim() || undefined
      );
      setPinSaved(true);
      setTimeout(() => {
        setShowPinModal(false);
        setPinSaved(false);
      }, 2000);
      fetchMembers();
    } catch (err) {
      console.error('Failed to set PIN:', err);
    } finally {
      setSavingPin(false);
    }
  };

  const fetchMembers = useCallback(async () => {
    if (!currentPatient) {
      setMembers([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // 1. Fetch memberships for patient
      const data = await membershipService.getMembershipsByPatient(currentPatient.id);

      // 2. Fetch profiles for user IDs in memberships to show actual Names & Emails
      const userIds = data.map((m) => m.userId).filter(Boolean);
      let userMap: Record<string, { displayName: string; email: string }> = {};

      if (userIds.length > 0) {
        const { data: usersData } = await supabase
          .from('users')
          .select('id, display_name, email')
          .in('id', userIds);

        if (usersData) {
          userMap = usersData.reduce((acc, u) => {
            acc[u.id] = { displayName: u.display_name || u.email, email: u.email };
            return acc;
          }, {} as Record<string, { displayName: string; email: string }>);
        }
      }

      const enriched: MemberWithUser[] = data.map((m) => ({
        ...m,
        userProfile: m.userId ? userMap[m.userId] : undefined,
      }));

      setMembers(enriched);
    } catch (err) {
      console.error('Failed to load care circle members:', err);
    } finally {
      setLoading(false);
    }
  }, [currentPatient]);

  useEffect(() => {
    if (!patientLoading) {
      fetchMembers();
    }
  }, [currentPatient?.id, patientLoading, fetchMembers]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPatient || !user) return;

    setSaving(true);
    try {
      const emailToInvite = inviteEmail.trim();
      const membership = await membershipService.inviteMember(
        currentPatient.id,
        emailToInvite,
        inviteRole as UserRole,
        DEFAULT_PERMISSIONS[inviteRole] || [],
        user.id,
      );

      await auditService.logAction({
        actorId: user.id,
        actorName: user.displayName,
        action: 'member_invited',
        targetType: 'membership',
        targetId: membership.id,
        patientId: currentPatient.id,
        details: { email: emailToInvite, role: inviteRole },
      });

      const link = `${window.location.origin}/invite/${membership.invitationToken}`;
      setGeneratedInviteLink(link);
      setLastInvitedEmail(emailToInvite);

      // Attempt automated email dispatch via EmailJS
      let dispatched = false;
      let errText = '';
      try {
        const result = await emailService.sendCareCircleInvitation({
          toEmail: emailToInvite,
          patientName: currentPatient.name,
          inviterName: user.displayName || user.email,
          role: inviteRole,
          inviteLink: link,
        });
        dispatched = result.success;
        errText = result.error || '';
      } catch (err: any) {
        errText = err?.text || err?.message || 'Email dispatch failed';
        console.error('Email dispatch attempt failed:', err);
      }
      setEmailDispatched(dispatched);
      setEmailError(errText);

      setInviteEmail('');
      setInviteRole('caretaker');
      fetchMembers();
    } catch (err) {
      console.error('Error creating invitation:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleRevoke = async () => {
    if (!revokeId || !user || !currentPatient) return;
    try {
      await membershipService.revokeMembership(revokeId);
      await auditService.logAction({
        actorId: user.id,
        actorName: user.displayName,
        action: 'member_revoked',
        targetType: 'membership',
        targetId: revokeId,
        patientId: currentPatient.id,
      });
      setRevokeId(null);
      fetchMembers();
    } catch (err) {
      console.error('Error revoking membership:', err);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedToken(id);
    setTimeout(() => setCopiedToken(null), 2500);
  };

  if (patientLoading || loading) {
    return (
      <div className="py-20 flex justify-center">
        <LoadingSpinner size="lg" text="Loading CareCircle..." />
      </div>
    );
  }

  // If no patient is active
  if (!currentPatient) {
    return (
      <div className="max-w-xl mx-auto py-12 text-center">
        <EmptyState
          icon={Users}
          title="No Care Profile Active"
          description="Create a patient profile or accept an invitation to manage and collaborate with your CareCircle."
          action={{
            label: 'Create Patient Profile',
            onClick: () => navigate('/dashboard'),
          }}
        />
      </div>
    );
  }

  const activeMembers = members.filter((m) => m.status === 'active');
  const pendingMembers = members.filter((m) => m.status === 'invited');

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900 tracking-tight">
            {currentPatient.name}&apos;s CareCircle
          </h1>
          <p className="text-sm font-medium text-neutral-500 mt-0.5">
            Manage authorized family members, caretakers, and role-based permissions
          </p>
        </div>
        {canManage && (
          <Button
            variant="primary"
            onClick={() => {
              setShowInvite(true);
              setGeneratedInviteLink('');
            }}
          >
            <UserPlus className="w-4 h-4 mr-1.5 text-[#22C55E]" />
            Invite Member
          </Button>
        )}
      </div>

      {/* Senior Patient Access & Login Credentials Card */}
      {currentPatient && (
        <div className="bg-white rounded-3xl p-6 border border-neutral-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#EBF7EE] text-[#22C55E] flex items-center justify-center font-bold shrink-0">
                <KeyRound className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-neutral-900 tracking-tight">
                  Senior Patient Login Credentials
                </h3>
                <p className="text-xs text-neutral-500">
                  Credentials for {currentPatient.name} to sign into their simple voice-enabled screen
                </p>
              </div>
            </div>

            {canManage && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopySeniorCard}
                  className="rounded-full text-xs font-semibold"
                >
                  <Copy className="w-3.5 h-3.5 mr-1" />
                  {copiedSeniorCard ? 'Copied Details!' : 'Copy Login Details'}
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setNewPin(
                      currentPatient.patientPin ||
                        currentPatient.emergencyContact?.patientPin ||
                        '1234'
                    );
                    setSeniorEmail(currentPatient.emergencyContact?.email || '');
                    setShowPinModal(true);
                  }}
                  className="rounded-full text-xs font-semibold"
                >
                  Change PIN / Password
                </Button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="p-3.5 bg-[#F9FAF7] rounded-2xl border border-neutral-200/60">
              <span className="text-[10px] uppercase font-bold text-neutral-400 block mb-1">
                Unique Patient ID
              </span>
              <span className="font-mono text-base font-bold text-neutral-900">
                {currentPatient.uniquePatientId ||
                  `CARE-${currentPatient.id.slice(0, 6).toUpperCase()}`}
              </span>
            </div>

            <div className="p-3.5 bg-[#F9FAF7] rounded-2xl border border-neutral-200/60 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-neutral-400 block mb-1">
                  Senior Login PIN
                </span>
                <span className="font-mono text-base font-bold text-[#22C55E]">
                  {showPinSecret
                    ? currentPatient.patientPin ||
                      currentPatient.emergencyContact?.patientPin ||
                      '1234'
                    : '••••'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowPinSecret(!showPinSecret)}
                className="text-neutral-400 hover:text-neutral-700 p-1"
                aria-label="Toggle PIN visibility"
              >
                {showPinSecret ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>

            <div className="p-3.5 bg-[#F9FAF7] rounded-2xl border border-neutral-200/60">
              <span className="text-[10px] uppercase font-bold text-neutral-400 block mb-1">
                Senior Email / Gmail
              </span>
              <span className="text-xs font-semibold text-neutral-800 truncate block">
                {currentPatient.emergencyContact?.email ||
                  'Optional (Use Patient ID)'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Active Members Section */}
      <div className="space-y-3">
        <h2 className="text-base font-bold text-neutral-900 tracking-tight flex items-center gap-2">
          <span>Active Members</span>
          <span className="w-5 h-5 rounded-full bg-neutral-100 text-neutral-700 text-xs font-bold flex items-center justify-center">
            {activeMembers.length}
          </span>
        </h2>

        {activeMembers.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 border border-neutral-200/80 text-center">
            <EmptyState
              icon={Users}
              title="No active members found"
              description="Invite family members or caretakers to join the care team."
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {activeMembers.map((m) => {
              const displayName = m.userProfile?.displayName || (m.userId === user?.id ? (user?.displayName || 'You') : 'Member');
              const email = m.userProfile?.email || (m.userId === user?.id ? user?.email : '');
              const isCurrentUser = m.userId === user?.id;

              return (
                <div
                  key={m.id}
                  className="bg-white rounded-3xl p-5 border border-neutral-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <Avatar name={displayName} size="md" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-sm text-neutral-900 truncate">
                          {displayName}
                        </p>
                        {isCurrentUser && (
                          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600">
                            You
                          </span>
                        )}
                      </div>
                      {email && (
                        <p className="text-xs text-neutral-500 truncate mt-0.5">{email}</p>
                      )}
                      <div className="mt-2 flex items-center gap-1.5">
                        <Badge
                          variant={
                            m.role === 'family_admin'
                              ? 'dark'
                              : m.role === 'elderly'
                              ? 'success'
                              : 'info'
                          }
                          size="sm"
                        >
                          <Shield className="w-3 h-3 mr-1" />
                          {m.role === 'family_admin'
                            ? 'Family Admin'
                            : m.role === 'elderly'
                            ? 'Elderly Person'
                            : 'Caretaker'}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {canManage && !isCurrentUser && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-neutral-400 hover:text-red-600 hover:bg-red-50/50 rounded-full"
                      onClick={() => setRevokeId(m.id)}
                      title="Revoke member access"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pending Invitations Section */}
      {pendingMembers.length > 0 && (
        <div className="space-y-3 pt-3">
          <h2 className="text-base font-bold text-neutral-900 tracking-tight flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-500" />
            <span>Pending Invitations</span>
            <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 text-xs font-bold flex items-center justify-center">
              {pendingMembers.length}
            </span>
          </h2>

          <div className="space-y-3">
            {pendingMembers.map((m) => {
              const inviteLink = `${window.location.origin}/invite/${m.invitationToken}`;
              const isCopied = copiedToken === m.id;

              return (
                <div
                  key={m.id}
                  className="bg-white rounded-3xl p-5 border border-amber-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-neutral-900">
                        {m.role.replace('_', ' ').toUpperCase()} INVITATION
                      </span>
                      <Badge variant="warning" size="sm">Pending Acceptance</Badge>
                    </div>
                    <p className="text-xs text-neutral-500">
                      Invited on {formatDateTime(m.invitedAt)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(inviteLink, m.id)}
                      className="text-xs"
                    >
                      {isCopied ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-[#22C55E]" />
                          Copied Link!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 mr-1" />
                          Copy Link
                        </>
                      )}
                    </Button>

                    <a
                      href={`mailto:?subject=${encodeURIComponent(`Invitation to join ${currentPatient.name}'s CareCircle on CareLoop`)}&body=${encodeURIComponent(`Hi,\n\nYou have been invited to join ${currentPatient.name}'s CareCircle on CareLoop.\n\nPlease open this secure link to join and access the care dashboard:\n${inviteLink}\n\nBest regards,\n${user?.displayName || 'CareLoop'}`)}`}
                      className="inline-flex"
                    >
                      <Button variant="outline" size="sm" className="text-xs gap-1">
                        <Mail className="w-3.5 h-3.5" />
                        Send Email
                      </Button>
                    </a>

                    {canManage && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-neutral-400 hover:text-red-600 rounded-full"
                        onClick={() => setRevokeId(m.id)}
                        title="Cancel invitation"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Invite Modal */}
      <Modal
        isOpen={showInvite}
        onClose={() => setShowInvite(false)}
        title="Invite CareCircle Member"
        size="md"
      >
        {generatedInviteLink ? (
          <div className="space-y-4 text-center py-2">
            <div className="w-12 h-12 rounded-full bg-[#EBF7EE] text-[#22C55E] flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg text-neutral-900">Invitation Ready!</h3>

            {emailDispatched ? (
              <div className="bg-[#EBF7EE] border border-[#22C55E]/40 rounded-2xl p-3 text-left">
                <p className="text-xs text-[#1e6f39] font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#22C55E] shrink-0" />
                  <span>Email sent automatically to {lastInvitedEmail} via EmailJS!</span>
                </p>
              </div>
            ) : !emailService.isEmailConfigured() ? (
              <div className="bg-neutral-50 border border-neutral-200/80 rounded-2xl p-3 text-left">
                <p className="text-[11px] text-neutral-600 leading-relaxed">
                  ℹ️ <strong>Direct Link Ready:</strong> Share the secure link below directly with the person, or click &ldquo;Send via Email&rdquo;. To send automatically from CareLoop, add your EmailJS keys to <code className="bg-neutral-200/80 px-1 py-0.5 rounded text-[10px]">.env</code>.
                </p>
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-left">
                <p className="text-[11px] text-amber-800 leading-relaxed font-medium">
                  ⚠️ Note: EmailJS returned: <em>&ldquo;{emailError || 'Dispatch did not complete'}&rdquo;</em>.
                </p>
                <p className="text-[10px] text-amber-700 mt-1">
                  You can copy the secure link below or click &ldquo;Send via Email&rdquo;.
                </p>
              </div>
            )}

            <p className="text-xs text-neutral-500 max-w-sm mx-auto">
              Share this secure invitation link directly with the person:
            </p>

            <div className="flex gap-2 items-center">
              <Input
                readOnly
                value={generatedInviteLink}
                className="text-xs font-mono bg-neutral-50"
              />
              <Button
                variant="primary"
                size="md"
                onClick={() => copyToClipboard(generatedInviteLink, 'modal')}
                className="shrink-0"
              >
                {copiedToken === 'modal' ? (
                  <CheckCircle2 className="w-4 h-4 text-white" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>

            <div className="pt-1 flex flex-col sm:flex-row gap-2">
              <a
                href={`mailto:${lastInvitedEmail}?subject=${encodeURIComponent(`Invitation to join ${currentPatient.name}'s CareCircle on CareLoop`)}&body=${encodeURIComponent(`Hi,\n\nYou have been invited to join ${currentPatient.name}'s CareCircle on CareLoop.\n\nPlease click the link below to accept your invitation and access the care dashboard:\n${generatedInviteLink}\n\nBest regards,\n${user?.displayName || 'CareLoop'}`)}`}
                className="flex-1"
              >
                <Button variant="outline" fullWidth size="md" className="gap-2 text-xs font-semibold">
                  <Mail className="w-4 h-4 text-[#22C55E]" />
                  <span>Send via Email {lastInvitedEmail ? `to ${lastInvitedEmail}` : ''}</span>
                </Button>
              </a>

              <Button
                variant="primary"
                onClick={() => copyToClipboard(generatedInviteLink, 'modal')}
                size="md"
                className="gap-2 text-xs font-semibold"
              >
                {copiedToken === 'modal' ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-[#22C55E]" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy Link</span>
                  </>
                )}
              </Button>
            </div>

            <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-3 text-left">
              <p className="text-[11px] text-amber-800 leading-relaxed">
                💡 <strong>How to test now:</strong> Copy the invite link above, open an incognito/private browser window, paste the link, and sign up or sign in as the invited member to test joining the CareCircle.
              </p>
            </div>

            <Button
              variant="ghost"
              fullWidth
              onClick={() => setShowInvite(false)}
              className="mt-1 text-xs"
            >
              Done
            </Button>
          </div>
        ) : (
          <form onSubmit={handleInvite} className="space-y-4">
            <Input
              label="Email Address"
              type="email"
              icon={Mail}
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="e.g. nurse.marcus@example.com"
              required
            />
            <Select
              label="Role in CareCircle"
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              options={ROLE_OPTIONS}
            />
            <p className="text-xs text-neutral-500 leading-relaxed bg-neutral-50 p-3 rounded-2xl border border-neutral-100">
              The invited person will receive an invitation token granting the selected role and permissions for this patient profile.
            </p>
            <div className="flex gap-3 pt-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowInvite(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                loading={saving}
                fullWidth
              >
                Generate Invitation
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Revoke Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!revokeId}
        onConfirm={handleRevoke}
        onCancel={() => setRevokeId(null)}
        title="Revoke Member Access"
        message="This member will immediately lose access to this patient profile and all health data."
        confirmLabel="Revoke Access"
        confirmVariant="danger"
      />

      {/* Set / Change Senior Login PIN Modal */}
      <Modal
        isOpen={showPinModal}
        onClose={() => {
          setShowPinModal(false);
          setPinSaved(false);
        }}
        title="Set Senior Login PIN / Password"
        size="md"
      >
        <form onSubmit={handleSavePin} className="space-y-4">
          {pinSaved ? (
            <div className="p-5 bg-[#EBF7EE] border border-[#22C55E]/40 text-[#1E3A2F] rounded-2xl text-center space-y-2">
              <CheckCircle2 className="w-10 h-10 text-[#22C55E] mx-auto" />
              <h4 className="font-bold text-base">PIN Updated Successfully!</h4>
              <p className="text-xs text-neutral-600">
                The senior can now sign in using their Patient ID and this new PIN.
              </p>
            </div>
          ) : (
            <>
              <p className="text-xs text-neutral-500">
                Choose a simple 4 to 6-digit PIN or password that {currentPatient?.name} can easily type on their tablet or phone.
              </p>

              <Input
                label="Senior Login PIN / Password *"
                type="text"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                placeholder="e.g. 1234 or care99"
                required
                autoFocus
              />

              <Input
                label="Senior Email / Gmail (Optional)"
                type="email"
                value={seniorEmail}
                onChange={(e) => setSeniorEmail(e.target.value)}
                placeholder="e.g. senior@gmail.com"
                helperText="If provided, the senior can also log in with this email."
              />

              <div className="flex gap-3 pt-3">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowPinModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  loading={savingPin}
                  fullWidth
                >
                  Save Senior PIN
                </Button>
              </div>
            </>
          )}
        </form>
      </Modal>
    </div>
  );
}
