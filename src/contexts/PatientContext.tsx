import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Patient, CaregiverMembership, Permission } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import * as patientService from '@/services/patientService';
import * as membershipService from '@/services/membershipService';

interface PatientContextType {
  currentPatient: Patient | null;
  patients: Patient[];
  memberships: CaregiverMembership[];
  currentMembership: CaregiverMembership | null;
  loading: boolean;
  error: string | null;
  selectPatient: (patientId: string) => void;
  hasPermission: (permission: Permission) => boolean;
  refreshPatients: () => Promise<void>;
}

const PatientContext = createContext<PatientContextType | undefined>(undefined);

export function PatientProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [memberships, setMemberships] = useState<CaregiverMembership[]>([]);
  const [currentPatient, setCurrentPatient] = useState<Patient | null>(null);
  const [currentMembership, setCurrentMembership] = useState<CaregiverMembership | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPatients = useCallback(async () => {
    if (!user) {
      setPatients([]);
      setMemberships([]);
      setCurrentPatient(null);
      setCurrentMembership(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // If signed in as senior patient directly
      if (user.defaultRole === 'elderly') {
        const directPatient = await patientService.getPatient(user.id);
        if (directPatient) {
          setPatients([directPatient]);
          setCurrentPatient(directPatient);
          const seniorMembership: CaregiverMembership = {
            id: `mem-${directPatient.id}`,
            patientId: directPatient.id,
            userId: user.id,
            role: 'elderly',
            permissions: [
              'view_schedule',
              'record_dose',
              'view_adherence',
              'manage_appointments',
            ],
            status: 'active',
            invitedBy: directPatient.primaryUserId,
            invitedAt: directPatient.createdAt,
            createdAt: directPatient.createdAt,
            updatedAt: directPatient.updatedAt,
          };
          setMemberships([seniorMembership]);
          setCurrentMembership(seniorMembership);
          setLoading(false);
          return;
        }
      }

      // Fetch memberships for the current user
      const userMemberships = await membershipService.getMembershipsByUser(user.id);
      const activeMemberships = userMemberships.filter((m) => m.status === 'active');
      setMemberships(activeMemberships);

      // Fetch patient data for each membership
      const patientPromises = activeMemberships.map((m) =>
        patientService.getPatient(m.patientId)
      );
      const patientResults = await Promise.all(patientPromises);
      const validPatients = patientResults.filter(Boolean) as Patient[];
      setPatients(validPatients);

      // Auto-select first patient if none selected
      if (validPatients.length > 0 && !currentPatient) {
        const first = validPatients[0];
        setCurrentPatient(first);
        setCurrentMembership(
          activeMemberships.find((m) => m.patientId === first.id) || null
        );
      }
    } catch (err: any) {
      console.error('Failed to fetch patients:', err);
      setError(err.message || 'Failed to load patients');
    } finally {
      setLoading(false);
    }
  }, [user, currentPatient]);

  useEffect(() => {
    fetchPatients();
  }, [user]); // Re-fetch when user changes, but don't include fetchPatients to avoid loops

  const selectPatient = useCallback(
    (patientId: string) => {
      const patient = patients.find((p) => p.id === patientId);
      const membership = memberships.find((m) => m.patientId === patientId);
      setCurrentPatient(patient || null);
      setCurrentMembership(membership || null);
    },
    [patients, memberships]
  );

  const hasPermission = useCallback(
    (permission: Permission): boolean => {
      if (!currentMembership) return false;
      return currentMembership.permissions.includes(permission);
    },
    [currentMembership]
  );

  const refreshPatients = useCallback(async () => {
    await fetchPatients();
  }, [fetchPatients]);

  return (
    <PatientContext.Provider
      value={{
        currentPatient,
        patients,
        memberships,
        currentMembership,
        loading,
        error,
        selectPatient,
        hasPermission,
        refreshPatients,
      }}
    >
      {children}
    </PatientContext.Provider>
  );
}

export function usePatient() {
  const context = useContext(PatientContext);
  if (!context) throw new Error('usePatient must be used within PatientProvider');
  return context;
}
