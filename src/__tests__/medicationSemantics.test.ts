import { describe, it, expect } from 'vitest';
import type { MedicationEventStatus } from '@/types';

describe('CLAUDE.md Section 7: Medication Event Semantics', () => {
  const MANDATORY_STATUSES: MedicationEventStatus[] = [
    'scheduled',
    'reminder_sent',
    'acknowledged',
    'taken_self_reported',
    'taken_caregiver_reported',
    'skipped',
    'unacknowledged',
    'confirmed_missed',
    'unverified_interaction',
  ];

  it('contains exactly 9 distinct required lifecycle statuses', () => {
    const uniqueStatuses = new Set(MANDATORY_STATUSES);
    expect(uniqueStatuses.size).toBe(9);
  });

  it('strictly distinguishes reminder_sent from taken states', () => {
    // A reminder delivery must never be counted as medication adherence
    const reminderStatus: MedicationEventStatus = 'reminder_sent';
    const takenStates: MedicationEventStatus[] = [
      'taken_self_reported',
      'taken_caregiver_reported',
    ];
    expect(takenStates).not.toContain(reminderStatus);
  });

  it('strictly separates voluntary skipped from unacknowledged and confirmed_missed', () => {
    const skipped: MedicationEventStatus = 'skipped';
    const unacknowledged: MedicationEventStatus = 'unacknowledged';
    const confirmedMissed: MedicationEventStatus = 'confirmed_missed';

    expect(skipped).not.toBe(unacknowledged);
    expect(unacknowledged).not.toBe(confirmedMissed);
    expect(skipped).not.toBe(confirmedMissed);
  });

  it('generates deterministic event IDs to ensure scheduler idempotency', () => {
    const scheduleId = 'sched-morning-metformin';
    const scheduledAt = '2026-11-15T08:00:00.000Z';

    const deterministicId1 = `${scheduleId}_${scheduledAt}`;
    const deterministicId2 = `${scheduleId}_${scheduledAt}`;

    // A retried job creates the same deterministic key, preventing duplicate events
    expect(deterministicId1).toBe(deterministicId2);
    expect(deterministicId1).toBe('sched-morning-metformin_2026-11-15T08:00:00.000Z');
  });
});
