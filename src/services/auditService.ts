import { supabase } from '@/config/supabase';
import type { AuditLog, AuditAction } from '@/types';
import { generateId } from '@/lib/utils';
import { mapAuditLogFromDb, mapAuditLogToDb } from '@/lib/mappers';

export async function logAction(
  data: Omit<AuditLog, 'id' | 'timestamp'>,
): Promise<AuditLog> {
  const id = generateId();
  const timestamp = new Date().toISOString();

  const entry: AuditLog = {
    ...data,
    id,
    timestamp,
  };

  const { error } = await supabase
    .from('audit_logs')
    .insert(mapAuditLogToDb(entry));

  if (error) {
    console.error('Failed to write immutable audit log:', error);
  }

  return entry;
}

export async function getAuditLogs(patientId: string, limitCount = 50): Promise<AuditLog[]> {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('*')
    .eq('patient_id', patientId)
    .order('timestamp', { ascending: false })
    .limit(limitCount);

  if (error) {
    console.error('Error fetching audit logs:', error);
    return [];
  }

  return (data || []).map(mapAuditLogFromDb);
}

export const getAuditLogsByPatient = getAuditLogs;

export async function getAuditLogsByActor(actorId: string, limitCount = 50): Promise<AuditLog[]> {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('*')
    .eq('actor_id', actorId)
    .order('timestamp', { ascending: false })
    .limit(limitCount);

  if (error) {
    console.error('Error fetching audit logs by actor:', error);
    return [];
  }

  return (data || []).map(mapAuditLogFromDb);
}

export async function createAuditEntry(
  actorId: string,
  actorName: string,
  action: AuditAction,
  targetType: string,
  targetId: string,
  patientId: string,
  details?: Record<string, unknown>,
): Promise<AuditLog> {
  return logAction({
    actorId,
    actorName,
    action,
    targetType,
    targetId,
    patientId,
    details,
  });
}
