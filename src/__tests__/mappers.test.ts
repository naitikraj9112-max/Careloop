import { describe, it, expect } from 'vitest';
import {
  mapUserFromDb,
  mapUserToDb,
  mapPatientFromDb,
  mapPatientToDb,
  mapMedicationFromDb,
  mapMedicationToDb,
  mapScheduleFromDb,
  mapScheduleToDb,
  mapEventFromDb,
  mapEventToDb,
} from '@/lib/mappers';
import type { MedicationEvent, MedicationSchedule } from '@/types';

describe('Database Mappers', () => {
  it('correctly maps user profiles to and from DB format', () => {
    const dbRow = {
      id: 'usr-123',
      email: 'test@example.com',
      display_name: 'Jane Doe',
      phone: '+15551234567',
      photo_url: 'https://example.com/avatar.jpg',
      default_role: 'family_admin',
      timezone: 'America/New_York',
      created_at: '2026-11-15T00:00:00.000Z',
      updated_at: '2026-11-15T00:00:00.000Z',
    };

    const model = mapUserFromDb(dbRow);
    expect(model.id).toBe('usr-123');
    expect(model.displayName).toBe('Jane Doe');
    expect(model.photoURL).toBe('https://example.com/avatar.jpg');
    expect(model.defaultRole).toBe('family_admin');

    const mappedBack = mapUserToDb(model);
    expect(mappedBack.display_name).toBe('Jane Doe');
    expect(mappedBack.photo_url).toBe('https://example.com/avatar.jpg');
    expect(mappedBack.default_role).toBe('family_admin');
  });

  it('correctly maps patient records with JSON fields', () => {
    const dbRow = {
      id: 'pat-456',
      name: 'Eleanor Vance',
      date_of_birth: '1948-03-12',
      gender: 'Female',
      blood_type: 'O+',
      allergies: ['Penicillin', 'Sulfa'],
      emergency_contact: { name: 'David', phone: '555-0199', relationship: 'Son' },
      primary_user_id: 'usr-123',
      timezone: 'America/Chicago',
      created_at: '2026-11-15T00:00:00.000Z',
      updated_at: '2026-11-15T00:00:00.000Z',
    };

    const patient = mapPatientFromDb(dbRow);
    expect(patient.name).toBe('Eleanor Vance');
    expect(patient.allergies).toHaveLength(2);
    expect(patient.emergencyContact?.relationship).toBe('Son');

    const mappedBack = mapPatientToDb(patient);
    expect(mappedBack.date_of_birth).toBe('1948-03-12');
    expect(mappedBack.primary_user_id).toBe('usr-123');
  });

  it('correctly maps medication and schedules', () => {
    const sched: Partial<MedicationSchedule> = {
      patientId: 'pat-1',
      medicationId: 'med-1',
      frequency: 'twice_daily',
      times: ['08:00', '20:00'],
      gracePeriodMinutes: 30,
      escalationDelayMinutes: 60,
      isActive: true,
    };

    const dbSched = mapScheduleToDb(sched);
    expect(dbSched.patient_id).toBe('pat-1');
    expect(dbSched.medication_id).toBe('med-1');
    expect(dbSched.grace_period_minutes).toBe(30);
    expect(dbSched.times).toEqual(['08:00', '20:00']);

    const back = mapScheduleFromDb({
      id: 'sched-1',
      patient_id: 'pat-1',
      medication_id: 'med-1',
      frequency: 'twice_daily',
      times: ['08:00', '20:00'],
      grace_period_minutes: 30,
      escalation_delay_minutes: 60,
      is_active: true,
      created_by: 'usr-1',
      created_at: '2026-11-15T00:00:00.000Z',
      updated_at: '2026-11-15T00:00:00.000Z',
    });
    expect(back.gracePeriodMinutes).toBe(30);
    expect(back.escalationDelayMinutes).toBe(60);
  });

  it('correctly maps dose events with confirmation details', () => {
    const event: Partial<MedicationEvent> = {
      id: 'sched-1_2026-11-15T08:00:00.000Z',
      patientId: 'pat-1',
      medicationId: 'med-1',
      scheduleId: 'sched-1',
      scheduledAt: '2026-11-15T08:00:00.000Z',
      status: 'taken_self_reported',
      confirmationMethod: 'self_report',
      confirmedBy: 'usr-1',
      confirmedAt: '2026-11-15T08:04:12.000Z',
      notes: 'Taken with breakfast',
    };

    const dbRow = mapEventToDb(event);
    expect(dbRow.confirmation_method).toBe('self_report');
    expect(dbRow.confirmed_by).toBe('usr-1');
    expect(dbRow.confirmed_at).toBe('2026-11-15T08:04:12.000Z');

    const back = mapEventFromDb(dbRow);
    expect(back.status).toBe('taken_self_reported');
    expect(back.confirmationMethod).toBe('self_report');
  });
});
