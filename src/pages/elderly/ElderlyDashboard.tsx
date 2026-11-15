import { useState, useMemo } from 'react';
import { usePatient } from '@/contexts/PatientContext';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import LanguageSelector from '@/components/ui/LanguageSelector';
import ElderlyVoiceAssistant from '@/components/voice/ElderlyVoiceAssistant';
import { useMedicationEvents } from '@/hooks/useMedicationEvents';
import { useMedications } from '@/hooks/useMedications';
import { useAppointments } from '@/hooks/useAppointments';
import * as auditService from '@/services/auditService';
import * as notificationService from '@/services/notificationService';
import * as emailService from '@/services/emailService';
import { supabase } from '@/config/supabase';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { formatTime, formatDate } from '@/lib/utils';
import {
  Check,
  CheckCircle2,
  Pill,
  Calendar,
  Clock,
  MessageSquareHeart,
  Send,
  KeyRound,
  Copy,
  Sparkles,
  Heart,
  AlertCircle,
} from 'lucide-react';

const FEELING_OPTIONS = [
  { label: 'Feeling Well 😊', value: 'Feeling Well' },
  { label: 'Mild Headache 🤕', value: 'Headache / Pain' },
  { label: 'Feeling Dizzy 🌀', value: 'Feeling Dizzy' },
  { label: 'Need Medicine Refill 💊', value: 'Need Refill' },
  { label: 'Just Saying Hello 👋', value: 'Checking In' },
];

export default function ElderlyDashboard() {
  const { user } = useAuth();
  const { currentPatient } = usePatient();
  const { t } = useLanguage();
  const { todayEvents, loading: eventsLoading, updateEventStatus } = useMedicationEvents(currentPatient?.id);
  const { medications } = useMedications(currentPatient?.id);
  const { upcomingAppointments } = useAppointments(currentPatient?.id);

  const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending');
  const [selectedFeeling, setSelectedFeeling] = useState<string>('');
  const [commentText, setCommentText] = useState('');
  const [sendingComment, setSendingComment] = useState(false);
  const [commentSent, setCommentSent] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  // Date and Time formatting for the header
  const now = new Date();
  const formattedDate = useMemo(() => {
    return now.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  }, [now]);

  const formattedTime = useMemo(() => {
    return now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  }, [now]);

  // Days of the current week for "Your week" strip
  const weekDays = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const currentDayIdx = now.getDay();
    return days.map((label, idx) => ({
      label,
      isPast: idx < currentDayIdx,
      isToday: idx === currentDayIdx,
      isFuture: idx > currentDayIdx,
    }));
  }, [now]);

  const pendingDoses = todayEvents.filter((e) =>
    ['scheduled', 'reminder_sent', 'acknowledged'].includes(e.status)
  );

  const completedDoses = todayEvents.filter((e) =>
    ['taken_self_reported', 'taken_caregiver_reported'].includes(e.status)
  );

  const totalDoses = todayEvents.length;
  const takenCount = completedDoses.length;
  const progressPercent = totalDoses > 0 ? Math.round((takenCount / totalDoses) * 100) : 100;

  const getMedication = (medId: string) => medications.find((m) => m.id === medId);

  const patientCode =
    currentPatient?.uniquePatientId ||
    (currentPatient?.id ? `CARE-${currentPatient.id.slice(0, 6).toUpperCase()}` : 'CARE-000000');

  const handleCopyId = () => {
    navigator.clipboard.writeText(patientCode);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleTake = async (eventId: string) => {
    await updateEventStatus(eventId, 'taken_self_reported', user?.id, 'self_report');

    if (currentPatient && user) {
      const event = todayEvents.find((e) => e.id === eventId);
      const med = event ? getMedication(event.medicationId) : null;
      await auditService.logAction({
        actorId: user.id,
        actorName: user.displayName,
        action: 'dose_taken',
        targetType: 'medication_event',
        targetId: eventId,
        patientId: currentPatient.id,
      });

      // Verification alert via EmailJS & Notification Center
      await notificationService.createNotification({
        recipientId: currentPatient.primaryUserId,
        patientId: currentPatient.id,
        type: 'dose_reminder',
        title: `Dose Verified: ${med?.name || 'Medication'}`,
        message: `${currentPatient.name} verified and recorded taking ${med?.name || 'medication'} (${med?.dosage || ''}) at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
        referenceId: eventId,
        referenceType: 'medication_event',
        isRead: false,
      });
    }
  };

  const handleSkip = async (eventId: string) => {
    await updateEventStatus(eventId, 'skipped', user?.id, 'self_report');

    if (currentPatient && user) {
      const event = todayEvents.find((e) => e.id === eventId);
      const med = event ? getMedication(event.medicationId) : null;
      await auditService.logAction({
        actorId: user.id,
        actorName: user.displayName,
        action: 'dose_skipped',
        targetType: 'medication_event',
        targetId: eventId,
        patientId: currentPatient.id,
      });

      // Skip escalation alert via EmailJS & Notification Center
      await notificationService.createNotification({
        recipientId: currentPatient.primaryUserId,
        patientId: currentPatient.id,
        type: 'escalation',
        title: `Dose Skipped: ${med?.name || 'Medication'}`,
        message: `${currentPatient.name} marked ${med?.name || 'medication'} (${med?.dosage || ''}) as skipped. Caregiver review recommended.`,
        referenceId: eventId,
        referenceType: 'medication_event',
        isRead: false,
      });
    }
  };

  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() && !selectedFeeling) return;
    if (!currentPatient) return;

    setSendingComment(true);
    try {
      const fullMessage = selectedFeeling
        ? `[Status: ${selectedFeeling}] ${commentText.trim()}`
        : commentText.trim();

      const isUrgent =
        selectedFeeling.includes('Dizzy') ||
        selectedFeeling.includes('Pain') ||
        selectedFeeling.includes('Refill');

      // 1. Create in-app alert for Primary Family Admin
      await notificationService.createNotification({
        recipientId: currentPatient.primaryUserId,
        patientId: currentPatient.id,
        type: isUrgent ? 'escalation' : 'system',
        title: `Note from ${currentPatient.name}: ${selectedFeeling || 'Health Update'}`,
        message: fullMessage,
        referenceId: currentPatient.id,
        referenceType: 'patient',
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
          title: `Senior Note: ${selectedFeeling || 'Health Update'} from ${currentPatient.name}`,
          message: `${currentPatient.name} submitted a new note:\n\n"${fullMessage}"\n\nPlease check in or review on your CareLoop dashboard.`,
          actionUrl: `${window.location.origin}/family`,
          actionLabel: 'Open Family Dashboard',
        });
      }

      setCommentSent(true);
      setCommentText('');
      setSelectedFeeling('');
      setTimeout(() => setCommentSent(false), 5000);
    } catch (err) {
      console.error('Failed to dispatch senior comment:', err);
    } finally {
      setSendingComment(false);
    }
  };

  if (eventsLoading) {
    return (
      <div className="py-20 flex justify-center">
        <LoadingSpinner size="lg" text="Loading today's schedule..." />
      </div>
    );
  }

  const displayedEvents = activeTab === 'pending' ? pendingDoses : completedDoses;

  return (
    <div className="max-w-xl mx-auto space-y-6 pb-16 px-3 sm:px-0">
      {/* Brand & Language Header */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-2">
          <span className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900">
            CareLoop
          </span>
          <span className="w-2.5 h-2.5 rounded-full bg-[#22C55E]" />
        </div>
        <LanguageSelector variant="pill" />
      </div>

      {/* Date & Greeting */}
      <div className="pt-1 flex items-start justify-between flex-wrap gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900">
              {t('welcome') || 'Hello'} {currentPatient?.name ? `, ${currentPatient.name.split(' ')[0]}` : ''}
            </h1>
            <span className="text-2xl" role="img" aria-label="wave">👋</span>
          </div>
          <p className="text-sm font-semibold text-neutral-400 mt-0.5 tracking-tight">
            {formattedDate} • {formattedTime}
          </p>
        </div>
      </div>

      {/* Unique Patient ID Badge Card */}
      {currentPatient && (
        <div className="bg-white rounded-3xl p-4 border border-neutral-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-[#EBF7EE] text-[#22C55E] flex items-center justify-center font-bold shrink-0">
              <KeyRound className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider truncate">
                {t('uniquePatientId') || 'Unique Patient ID'}
              </p>
              <p className="font-mono font-bold text-base text-neutral-900 tracking-wider truncate">
                {patientCode}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyId}
            className="rounded-full text-xs font-semibold shrink-0"
          >
            <Copy className="w-3.5 h-3.5 mr-1" />
            {copiedId ? 'Copied' : 'Copy'}
          </Button>
        </div>
      )}

      {/* DeepSeek Voice Assistant Section */}
      {currentPatient && (
        <ElderlyVoiceAssistant
          patientName={currentPatient.name}
          activeMedications={medications}
        />
      )}

      {/* 1. Your Week Strip */}
      <div className="bg-white rounded-3xl p-5 border border-neutral-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
        <h3 className="text-base font-bold text-neutral-900 mb-4 tracking-tight">
          {t('yourWeek') || 'Your week'}
        </h3>
        <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center">
          {weekDays.map((day) => (
            <div key={day.label} className="flex flex-col items-center gap-2">
              {day.isPast && (
                <div className="w-9 h-9 rounded-full bg-[#234E32] flex items-center justify-center text-white shadow-xs">
                  <Check className="w-5 h-5 stroke-[2.5]" />
                </div>
              )}
              {day.isToday && (
                <div className="w-9 h-9 rounded-full bg-[#EBF7EE] ring-2 ring-[#84CC16] flex items-center justify-center">
                  <div className="w-4 h-4 rounded-full bg-[#84CC16]" />
                </div>
              )}
              {day.isFuture && (
                <div className="w-9 h-9 rounded-full border-2 border-[#84CC16]/60 bg-white" />
              )}
              <span className={`text-xs font-semibold ${day.isToday ? 'text-neutral-900' : 'text-neutral-500'}`}>
                {day.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Pill Tracker Progress Section */}
      <div className="bg-white rounded-3xl p-5 border border-neutral-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-3">
        <h3 className="text-base font-bold text-neutral-900 tracking-tight">
          {t('pillTracker') || 'Pill tracker'}
        </h3>

        {/* Progress Bar */}
        <div className="w-full h-3 bg-neutral-100 rounded-full overflow-hidden p-0.5">
          <div
            className="h-full bg-[#22C55E] rounded-full transition-all duration-500 ease-out"
            style={{ width: `${totalDoses > 0 ? progressPercent : 100}%` }}
          />
        </div>

        {/* Labels under progress bar */}
        <div className="flex justify-between items-center text-xs font-bold text-neutral-700">
          <span>{takenCount}/{totalDoses} {t('pillsTaken') || 'pills taken'}</span>
          <span>{progressPercent}%</span>
        </div>
      </div>

      {/* 3. Today Section with Pill Selector Tabs */}
      <div className="space-y-4">
        <h3 className="text-xl font-bold text-neutral-900 tracking-tight">
          {t('today') || 'Today'}
        </h3>

        {/* Pill filter buttons */}
        <div className="flex items-center gap-3 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveTab('pending')}
            className={`inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-150 ${
              activeTab === 'pending'
                ? 'bg-[#18181B] text-white shadow-sm'
                : 'border border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-50'
            }`}
          >
            <span>{t('pillsToTake') || 'Pills to take'}</span>
            <span
              className={`w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center ${
                activeTab === 'pending' ? 'bg-white text-neutral-900' : 'bg-neutral-800 text-white'
              }`}
            >
              {pendingDoses.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('completed')}
            className={`inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-150 ${
              activeTab === 'completed'
                ? 'bg-[#18181B] text-white shadow-sm'
                : 'border border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-50'
            }`}
          >
            <span>{t('pillsHaveTaken') || 'Pills have taken'}</span>
            <span
              className={`w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center ${
                activeTab === 'completed' ? 'bg-white text-neutral-900' : 'bg-neutral-800 text-white'
              }`}
            >
              {completedDoses.length}
            </span>
          </button>
        </div>

        {/* Medication Cards List */}
        {displayedEvents.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 border border-neutral-200/80 text-center space-y-2">
            <CheckCircle2 className="w-10 h-10 text-[#22C55E] mx-auto mb-2" />
            <h4 className="font-bold text-neutral-900 text-base">
              {activeTab === 'pending'
                ? (t('pillTakenSuccess') || 'All pills taken for today!')
                : 'No pills recorded taken yet today'}
            </h4>
            <p className="text-xs text-neutral-500 max-w-xs mx-auto">
              {activeTab === 'pending'
                ? 'Great job keeping up with your health schedule!'
                : 'Pills marked as taken will show up here.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3.5">
            {displayedEvents.map((event) => {
              const med = getMedication(event.medicationId);
              const isTaken = ['taken_self_reported', 'taken_caregiver_reported'].includes(event.status);

              return (
                <div
                  key={event.id}
                  className="bg-white rounded-3xl p-4 sm:p-5 border border-neutral-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    {/* Visual Pill Thumbnail */}
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#F5F6F3] border border-neutral-200/60 flex items-center justify-center shrink-0">
                      <Pill className="w-8 h-8 text-[#22C55E]" />
                    </div>

                    {/* Pill Details */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-1">
                        {isTaken ? (
                          <CheckCircle2 className="w-4 h-4 text-[#22C55E] shrink-0" />
                        ) : (
                          <Clock className="w-4 h-4 text-neutral-400 shrink-0" />
                        )}
                        <h4 className="font-bold text-base sm:text-lg text-neutral-900 truncate tracking-tight">
                          {med?.name || 'Medication'}
                        </h4>
                      </div>

                      <p className="text-xs sm:text-sm font-medium text-neutral-500">
                        {formatTime(event.scheduledAt)} • {med?.dosage || '1 dose'}
                      </p>

                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-semibold px-3 py-1 rounded-full bg-neutral-100 text-neutral-700">
                          {med?.instructions?.slice(0, 30) || t('afterMeal') || 'After meal'}
                        </span>
                        {isTaken && (
                          <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#EBF7EE] text-[#1E3A2F]">
                            ✓ Confirmed
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions for Pending Doses */}
                  {!isTaken && (
                    <div className="flex sm:flex-col gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-neutral-100">
                      <Button
                        variant="green"
                        size="sm"
                        onClick={() => handleTake(event.id)}
                        className="flex-1 sm:flex-initial"
                      >
                        ✓ {t('takePill') || 'Take Pill'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSkip(event.id)}
                        className="text-xs text-neutral-500 hover:text-neutral-800"
                      >
                        {t('skipDose') || 'Skip'}
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. "How are you feeling? / Tell Family" Card */}
      <div className="bg-white rounded-3xl p-6 border border-neutral-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-[#EBF7EE] text-[#22C55E] flex items-center justify-center">
            <MessageSquareHeart className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-neutral-900 tracking-tight">
              {t('addComment') || 'How are you feeling?'}
            </h3>
            <p className="text-xs text-neutral-500">
              Send a quick update or message to your family & caregivers
            </p>
          </div>
        </div>

        {/* Quick Feeling Chips */}
        <div className="flex flex-wrap gap-2">
          {FEELING_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setSelectedFeeling(selectedFeeling === opt.value ? '' : opt.value)}
              className={`text-xs px-3.5 py-2 rounded-full font-semibold transition-all ${
                selectedFeeling === opt.value
                  ? 'bg-[#18181B] text-white shadow-xs'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200/70'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSendComment} className="space-y-3">
          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            rows={2}
            placeholder={
              t('commentPlaceholder') ||
              'Tell your family how you are feeling or if you need medicines or help...'
            }
            className="w-full text-sm rounded-2xl border border-neutral-200 p-3.5 focus:outline-none focus:ring-2 focus:ring-[#22C55E] bg-[#F9FAF7] resize-none"
          />

          {commentSent && (
            <div className="bg-[#EBF7EE] border border-[#22C55E]/40 text-[#1E3A2F] rounded-2xl p-3 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#22C55E] shrink-0" />
              <span>{t('commentSent') || 'Alert sent to your family and caregivers!'}</span>
            </div>
          )}

          <div className="flex justify-end">
            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={sendingComment}
              disabled={!commentText.trim() && !selectedFeeling}
              className="rounded-full px-5 text-sm font-semibold"
            >
              <Send className="w-4 h-4 mr-1.5 text-[#22C55E]" />
              {t('sendComment') || 'Send Alert to Family'}
            </Button>
          </div>
        </form>
      </div>

      {/* 5. Upcoming Appointments Section */}
      {upcomingAppointments.length > 0 && (
        <div className="space-y-4 pt-2">
          <h3 className="text-xl font-bold text-neutral-900 tracking-tight flex items-center gap-2">
            <Calendar className="w-5 h-5 text-neutral-700" />
            {t('appointments') || 'Upcoming Appointments'}
          </h3>

          <div className="space-y-3">
            {upcomingAppointments.slice(0, 2).map((apt) => (
              <div
                key={apt.id}
                className="bg-white rounded-3xl p-5 border border-neutral-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-base text-neutral-900">{apt.title}</h4>
                  <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#EBF7EE] text-[#1E3A2F]">
                    Scheduled
                  </span>
                </div>
                <p className="text-xs font-semibold text-neutral-500">
                  {formatDate(apt.scheduledAt)} at {formatTime(apt.scheduledAt)}
                </p>
                {apt.doctorName && (
                  <p className="text-xs text-neutral-600">{apt.doctorName}</p>
                )}
                {apt.location && (
                  <p className="text-xs text-neutral-400">{apt.location}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
