import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePatient } from '@/contexts/PatientContext';
import { useMedicationEvents } from '@/hooks/useMedicationEvents';
import { useMedications } from '@/hooks/useMedications';
import { useAppointments } from '@/hooks/useAppointments';
import { useAuditLog } from '@/hooks/useAuditLog';
import { useNotifications } from '@/hooks/useNotifications';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { formatTime, formatDateTime } from '@/lib/utils';
import {
  AlertTriangle,
  Pill,
  Calendar,
  Plus,
  Activity,
  ClipboardList,
  UserPlus,
  ArrowRight,
  Heart,
  KeyRound,
  Copy,
  MessageSquareHeart,
  Send,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';

export default function FamilyDashboard() {
  const { user } = useAuth();
  const { currentPatient } = usePatient();
  const { todayEvents, loading: eventsLoading } = useMedicationEvents(currentPatient?.id);
  const { medications } = useMedications(currentPatient?.id);
  const { upcomingAppointments } = useAppointments(currentPatient?.id);
  const { logs } = useAuditLog(currentPatient?.id);
  const { notifications, markAsRead } = useNotifications(user?.id);
  const navigate = useNavigate();

  const [copiedId, setCopiedId] = useState(false);

  const unacknowledgedCount = todayEvents.filter(
    (e) =>
      ['unacknowledged', 'scheduled', 'reminder_sent'].includes(e.status) &&
      new Date(e.scheduledAt) < new Date()
  ).length;

  const getMedicationName = (medId: string) =>
    medications.find((m) => m.id === medId)?.name || 'Medication';

  const patientCode =
    currentPatient?.uniquePatientId ||
    (currentPatient?.id ? `CARE-${currentPatient.id.slice(0, 6).toUpperCase()}` : 'CARE-000000');

  const handleCopyId = () => {
    navigator.clipboard.writeText(patientCode);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  // Filter for escalation requests from Caretakers or Senior Notes
  const careRequests = notifications.filter(
    (n) => n.type === 'escalation' || n.type === 'system'
  );

  if (eventsLoading) return <LoadingSpinner size="lg" text="Loading care dashboard..." />;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Page Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#EBF7EE] text-[#1E3A2F] flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#22C55E]" /> Primary Family Admin
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900 tracking-tight">
            {currentPatient?.name}&apos;s Care Circle
          </h1>
          <p className="text-sm font-medium text-neutral-500 mt-0.5">
            Family administrator overview & patient management
          </p>
        </div>

        {/* Patient Unique ID Card Badge */}
        {currentPatient && (
          <div className="bg-white rounded-3xl p-3.5 px-5 border border-neutral-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex items-center gap-4">
            <div className="w-10 h-10 rounded-2xl bg-[#EBF7EE] text-[#22C55E] flex items-center justify-center font-bold">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                Senior Login Credentials
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="font-mono font-bold text-sm text-neutral-900 tracking-wider">
                  {patientCode}
                </span>
                <span className="text-neutral-300">•</span>
                <span className="text-xs font-semibold text-neutral-500">
                  PIN: <strong className="font-mono text-[#22C55E] font-bold">{currentPatient.patientPin || currentPatient.emergencyContact?.patientPin || '1234'}</strong>
                </span>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyId}
              className="rounded-full text-xs font-semibold ml-2 px-3 py-1"
            >
              <Copy className="w-3 h-3 mr-1" />
              {copiedId ? 'Copied Details' : 'Copy'}
            </Button>
          </div>
        )}
      </div>

      {/* Care Risk Alerts */}
      {unacknowledgedCount > 0 && (
        <div className="bg-amber-50/80 border border-amber-200/80 rounded-3xl p-5 flex items-start gap-4">
          <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
          <div className="flex-1">
            <h3 className="font-bold text-amber-900 text-sm">Attention Needed</h3>
            <p className="text-xs text-amber-800 mt-0.5">
              {unacknowledgedCount} dose{unacknowledgedCount > 1 ? 's' : ''} past scheduled time without recorded confirmation.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3 bg-white text-xs"
              onClick={() => navigate('/adherence')}
            >
              Review Adherence
            </Button>
          </div>
        </div>
      )}

      {/* CareCircle Action Requests & Senior Notes */}
      {careRequests.length > 0 && (
        <div className="bg-white rounded-3xl p-5 border border-neutral-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base text-neutral-900 flex items-center gap-2">
              <MessageSquareHeart className="w-5 h-5 text-[#22C55E]" />
              CareCircle Action Requests & Senior Notes
            </h3>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800">
              {careRequests.filter((r) => !r.isRead).length} Unread
            </span>
          </div>

          <div className="space-y-2.5">
            {careRequests.slice(0, 3).map((req) => (
              <div
                key={req.id}
                className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  req.isRead
                    ? 'bg-[#F9FAF7] border-neutral-200/60'
                    : 'bg-[#F4F9F5] border-[#22C55E]/40 shadow-xs'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-neutral-900">{req.title}</span>
                    <span className="text-[10px] text-neutral-400">
                      {formatDateTime(req.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-600 mt-1">{req.message}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      markAsRead(req.id);
                      navigate('/medications');
                    }}
                    className="text-xs font-semibold"
                  >
                    Review in Medications →
                  </Button>
                  {!req.isRead && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => markAsRead(req.id)}
                      className="text-xs text-neutral-500 hover:text-neutral-800"
                    >
                      Acknowledge
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Action Pills */}
      <div className="flex flex-wrap gap-3">
        <Button variant="secondary" size="md" onClick={() => navigate('/elderly')}>
          <Heart className="w-4 h-4 mr-1 text-red-500" /> Patient Screen (PillPop)
        </Button>
        <Button variant="primary" size="md" onClick={() => navigate('/medications')}>
          <Plus className="w-4 h-4 mr-1 text-[#22C55E]" /> Add Medication
        </Button>
        <Button variant="outline" size="md" onClick={() => navigate('/carecircle')}>
          <UserPlus className="w-4 h-4 mr-1 text-neutral-600" /> Invite Caregiver
        </Button>
        <Button variant="outline" size="md" onClick={() => navigate('/appointments')}>
          <Calendar className="w-4 h-4 mr-1 text-neutral-600" /> New Appointment
        </Button>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <Card className="p-5 text-center">
          <div className="w-9 h-9 rounded-2xl bg-neutral-100 flex items-center justify-center mx-auto mb-2 text-neutral-700">
            <Pill className="w-4 h-4 text-[#22C55E]" />
          </div>
          <p className="text-2xl font-bold text-neutral-900 tracking-tight">
            {medications.filter((m) => m.isActive).length}
          </p>
          <p className="text-xs font-semibold text-neutral-500 mt-0.5">Active Prescriptions</p>
        </Card>

        <Card className="p-5 text-center">
          <div className="w-9 h-9 rounded-2xl bg-neutral-100 flex items-center justify-center mx-auto mb-2 text-neutral-700">
            <ClipboardList className="w-4 h-4 text-[#22C55E]" />
          </div>
          <p className="text-2xl font-bold text-neutral-900 tracking-tight">
            {todayEvents.length}
          </p>
          <p className="text-xs font-semibold text-neutral-500 mt-0.5">Today&apos;s Doses</p>
        </Card>

        <Card className="p-5 text-center">
          <div className="w-9 h-9 rounded-2xl bg-neutral-100 flex items-center justify-center mx-auto mb-2 text-neutral-700">
            <Calendar className="w-4 h-4 text-neutral-700" />
          </div>
          <p className="text-2xl font-bold text-neutral-900 tracking-tight">
            {upcomingAppointments.length}
          </p>
          <p className="text-xs font-semibold text-neutral-500 mt-0.5">Appointments</p>
        </Card>

        <Card className="p-5 text-center">
          <div className="w-9 h-9 rounded-2xl bg-neutral-100 flex items-center justify-center mx-auto mb-2 text-neutral-700">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-neutral-900 tracking-tight">
            {unacknowledgedCount}
          </p>
          <p className="text-xs font-semibold text-neutral-500 mt-0.5">Attention Flag</p>
        </Card>
      </div>

      {/* Two Column Section */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Today's Schedule Card */}
        <Card className="p-6">
          <h2 className="text-base font-bold text-neutral-900 mb-4 flex items-center gap-2">
            <Pill className="w-4 h-4 text-[#22C55E]" />
            Today&apos;s Schedule
          </h2>
          {todayEvents.length === 0 ? (
            <p className="text-xs text-neutral-400 py-4">No doses scheduled for today.</p>
          ) : (
            <div className="divide-y divide-neutral-100">
              {todayEvents.map((event) => (
                <div key={event.id} className="py-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-bold text-sm text-neutral-900">
                      {getMedicationName(event.medicationId)}
                    </p>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      {formatTime(event.scheduledAt)}
                    </p>
                  </div>
                  <StatusBadge status={event.status} />
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Activity Timeline Card */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-neutral-900 flex items-center gap-2">
              <Activity className="w-4 h-4 text-neutral-700" />
              Recent Activity
            </h2>
            <button
              onClick={() => navigate('/activity')}
              className="text-xs font-semibold text-neutral-500 hover:text-neutral-900 flex items-center gap-1"
            >
              <span>View all</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {logs.length === 0 ? (
            <p className="text-xs text-neutral-400 py-4">No activity logged yet.</p>
          ) : (
            <div className="divide-y divide-neutral-100">
              {logs.slice(0, 4).map((log) => (
                <div key={log.id} className="py-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-neutral-900">{log.actorName}</span>
                    <span className="text-neutral-400">{formatDateTime(log.timestamp)}</span>
                  </div>
                  <p className="text-xs text-neutral-600 mt-0.5 capitalize">
                    {log.action.replace(/_/g, ' ')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
