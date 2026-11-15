import { useState, useEffect, useCallback } from 'react';
import { Medication } from '@/types';
import * as medicationService from '@/services/medicationService';

interface UseMedicationsReturn {
  medications: Medication[];
  loading: boolean;
  error: string | null;
  createMedication: (data: Omit<Medication, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Medication>;
  updateMedication: (id: string, data: Partial<Medication>) => Promise<void>;
  deleteMedication: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useMedications(patientId: string | undefined): UseMedicationsReturn {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMedications = useCallback(async () => {
    if (!patientId) {
      setMedications([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await medicationService.getMedications(patientId);
      setMedications(data);
    } catch (err: any) {
      console.error('Failed to fetch medications:', err);
      setError(err.message || 'Failed to load medications');
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    fetchMedications();
  }, [fetchMedications]);

  const createMedication = useCallback(
    async (data: Omit<Medication, 'id' | 'createdAt' | 'updatedAt'>): Promise<Medication> => {
      const newMedication = await medicationService.createMedication(data);
      setMedications((prev) => [...prev, newMedication]);
      return newMedication;
    },
    []
  );

  const updateMedication = useCallback(
    async (id: string, data: Partial<Medication>): Promise<void> => {
      await medicationService.updateMedication(id, data);
      setMedications((prev) =>
        prev.map((m) => (m.id === id ? { ...m, ...data, updatedAt: new Date().toISOString() } : m))
      );
    },
    []
  );

  const deleteMedication = useCallback(
    async (id: string): Promise<void> => {
      await medicationService.deleteMedication(id);
      setMedications((prev) => prev.filter((m) => m.id !== id));
    },
    []
  );

  return {
    medications,
    loading,
    error,
    createMedication,
    updateMedication,
    deleteMedication,
    refresh: fetchMedications,
  };
}
