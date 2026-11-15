import React from 'react';
import { Badge } from './Badge';
import type { MedicationEventStatus } from '@/types';

interface StatusBadgeProps {
  status: MedicationEventStatus;
}

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

const statusConfig: Record<MedicationEventStatus, { variant: BadgeVariant; label: string }> = {
  scheduled: { variant: 'info', label: 'Scheduled' },
  reminder_sent: { variant: 'info', label: 'Reminder Sent' },
  acknowledged: { variant: 'info', label: 'Acknowledged' },
  taken_self_reported: { variant: 'success', label: 'Taken (Self)' },
  taken_caregiver_reported: { variant: 'success', label: 'Taken (Caregiver)' },
  skipped: { variant: 'warning', label: 'Skipped' },
  unacknowledged: { variant: 'danger', label: 'Unacknowledged' },
  confirmed_missed: { variant: 'danger', label: 'Missed' },
  unverified_interaction: { variant: 'warning', label: 'Unverified' },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const config = statusConfig[status];

  return (
    <Badge variant={config.variant} size="md">
      {config.label}
    </Badge>
  );
};

export default StatusBadge;
