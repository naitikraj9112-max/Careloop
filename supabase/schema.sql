-- =============================================================================
-- CareLoop Supabase PostgreSQL Schema
-- Run this in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- =============================================================================

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users / User Profiles table
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY, -- matches Supabase auth.users id (UUID as text or UUID)
  email TEXT NOT NULL,
  display_name TEXT NOT NULL,
  phone TEXT,
  photo_url TEXT,
  default_role TEXT DEFAULT 'family_admin',
  timezone TEXT NOT NULL DEFAULT 'UTC',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Patients table
CREATE TABLE IF NOT EXISTS public.patients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  date_of_birth TEXT,
  gender TEXT,
  blood_type TEXT,
  allergies JSONB DEFAULT '[]'::jsonb,
  emergency_contact JSONB,
  primary_user_id TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Caregiver Memberships (CareCircle)
CREATE TABLE IF NOT EXISTS public.memberships (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  user_id TEXT,
  role TEXT NOT NULL, -- elderly, family_admin, caretaker, doctor
  permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'invited', -- invited, active, revoked, declined
  invited_by TEXT NOT NULL,
  invited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  invitation_token TEXT,
  token_expires_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_memberships_user_id ON public.memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_patient_id ON public.memberships(patient_id);
CREATE INDEX IF NOT EXISTS idx_memberships_token ON public.memberships(invitation_token);

-- 4. Medications table
CREATE TABLE IF NOT EXISTS public.medications (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  generic_name TEXT,
  dosage TEXT NOT NULL,
  form TEXT NOT NULL,
  instructions TEXT,
  side_effects TEXT,
  prescribed_by TEXT,
  start_date TEXT NOT NULL,
  end_date TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_medications_patient_id ON public.medications(patient_id);

-- 5. Medication Schedules
CREATE TABLE IF NOT EXISTS public.medication_schedules (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  medication_id TEXT NOT NULL REFERENCES public.medications(id) ON DELETE CASCADE,
  frequency TEXT NOT NULL,
  times JSONB NOT NULL DEFAULT '[]'::jsonb, -- e.g. ["08:00", "20:00"]
  days_of_week JSONB,
  grace_period_minutes INTEGER NOT NULL DEFAULT 30,
  escalation_delay_minutes INTEGER NOT NULL DEFAULT 60,
  escalation_contact_id TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_schedules_patient_id ON public.medication_schedules(patient_id);
CREATE INDEX IF NOT EXISTS idx_schedules_medication_id ON public.medication_schedules(medication_id);

-- 6. Medication Events (Deterministic ID for idempotency: scheduleId_scheduledAt)
CREATE TABLE IF NOT EXISTS public.medication_events (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  medication_id TEXT NOT NULL REFERENCES public.medications(id) ON DELETE CASCADE,
  schedule_id TEXT NOT NULL REFERENCES public.medication_schedules(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled',
  confirmation_method TEXT,
  confirmed_by TEXT,
  confirmed_at TIMESTAMPTZ,
  reported_outcome TEXT,
  notes TEXT,
  escalated_at TIMESTAMPTZ,
  escalated_to TEXT,
  reminder_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_events_patient_id ON public.medication_events(patient_id);
CREATE INDEX IF NOT EXISTS idx_events_schedule_id ON public.medication_events(schedule_id);
CREATE INDEX IF NOT EXISTS idx_events_scheduled_at ON public.medication_events(scheduled_at);

-- 7. Appointments
CREATE TABLE IF NOT EXISTS public.appointments (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  doctor_name TEXT,
  location TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  status TEXT NOT NULL DEFAULT 'scheduled',
  reminder_minutes_before INTEGER NOT NULL DEFAULT 60,
  notes TEXT,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON public.appointments(patient_id);

-- 8. Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id TEXT PRIMARY KEY,
  recipient_id TEXT NOT NULL,
  patient_id TEXT,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  reference_id TEXT,
  reference_type TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON public.notifications(recipient_id);

-- 9. Immutable Audit Logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id TEXT PRIMARY KEY,
  actor_id TEXT NOT NULL,
  actor_name TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  patient_id TEXT NOT NULL,
  details JSONB,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_patient ON public.audit_logs(patient_id);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON public.audit_logs(actor_id);

-- 10. Health Observations
CREATE TABLE IF NOT EXISTS public.health_observations (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  value TEXT NOT NULL,
  unit TEXT,
  recorded_by TEXT NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- Row Level Security (RLS) Setup
-- For quick setup and full accessibility with Supabase anon key:
-- =============================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medication_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medication_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_observations ENABLE ROW LEVEL SECURITY;

-- Allow authenticated and anon access for full CRUD during development/demo
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Public access policy" ON %I', tbl);
    EXECUTE format('CREATE POLICY "Public access policy" ON %I FOR ALL USING (true) WITH CHECK (true)', tbl);
  END LOOP;
END $$;
