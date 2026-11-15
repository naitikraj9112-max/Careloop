import { useState, useEffect, useCallback } from 'react';
import { AuditLog } from '@/types';
import * as auditLogService from '@/services/auditLogService';

interface UseAuditLogReturn {
  logs: AuditLog[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useAuditLog(patientId: string | undefined): UseAuditLogReturn {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    if (!patientId) {
      setLogs([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await auditLogService.getAuditLogs(patientId);
      setLogs(data);
    } catch (err: any) {
      console.error('Failed to fetch audit logs:', err);
      setError(err.message || 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return {
    logs,
    loading,
    error,
    refresh: fetchLogs,
  };
}
