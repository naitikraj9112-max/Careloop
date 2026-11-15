import { usePatient } from '@/contexts/PatientContext';
import { useAuditLog } from '@/hooks/useAuditLog';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatDateTime } from '@/lib/utils';
import { Activity, Pill, Users, Calendar, Shield, ClipboardList } from 'lucide-react';

const actionIcons: Record<string, typeof Pill> = {
  medication_created: Pill, medication_updated: Pill, medication_deleted: Pill,
  schedule_created: ClipboardList,
  dose_taken: Pill, dose_skipped: Pill, dose_missed: Pill, dose_escalated: Pill,
  member_invited: Users, member_accepted: Users, member_revoked: Users,
  appointment_created: Calendar, appointment_updated: Calendar, appointment_cancelled: Calendar,
  patient_created: Shield, permission_changed: Shield,
};

const actionVariants: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  dose_taken: 'success', dose_skipped: 'warning', dose_missed: 'danger', dose_escalated: 'danger',
  member_revoked: 'danger', appointment_cancelled: 'danger',
  medication_created: 'info', schedule_created: 'info', member_invited: 'info',
  appointment_created: 'info', patient_created: 'info',
};

export default function ActivityLog() {
  const { currentPatient } = usePatient();
  const { logs, loading } = useAuditLog(currentPatient?.id);

  if (loading) return <LoadingSpinner size="lg" text="Loading activity log..." />;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
        <Activity className="w-7 h-7 text-blue-600" /> Activity Log
      </h1>

      {logs.length === 0 ? (
        <EmptyState icon={Activity} title="No activity yet" description="Actions and events will be recorded here." />
      ) : (
        <div className="space-y-2">
          {logs.map((log) => {
            const Icon = actionIcons[log.action] || Activity;
            const variant = actionVariants[log.action] || 'neutral';
            return (
              <Card key={log.id} className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-gray-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <p className="font-medium text-gray-900">{log.actorName}</p>
                      <p className="text-xs text-gray-500">{formatDateTime(log.timestamp)}</p>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={variant} size="sm">
                        {log.action.replace(/_/g, ' ')}
                      </Badge>
                      <span className="text-sm text-gray-500">{log.targetType}</span>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
