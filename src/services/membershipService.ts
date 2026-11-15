import { supabase } from '@/config/supabase';
import type { CaregiverMembership, UserRole, Permission } from '@/types';
import { generateId } from '@/lib/utils';
import { mapMembershipFromDb, mapMembershipToDb } from '@/lib/mappers';

/**
 * Invite a member to a patient's CareCircle.
 * Creates a membership with status 'invited' and a 7-day invitation token.
 */
export async function inviteMember(
  patientId: string,
  _email: string,
  role: UserRole,
  permissions: Permission[],
  invitedBy: string,
): Promise<CaregiverMembership> {
  const membershipId = generateId();
  const invitationToken = generateId();
  const now = new Date().toISOString();

  const tokenExpiry = new Date();
  tokenExpiry.setDate(tokenExpiry.getDate() + 7);

  const membership: CaregiverMembership = {
    id: membershipId,
    patientId,
    userId: '', // Populated when invitation is accepted
    role,
    permissions,
    status: 'invited',
    invitedBy,
    invitedAt: now,
    invitationToken,
    tokenExpiresAt: tokenExpiry.toISOString(),
    createdAt: now,
    updatedAt: now,
  };

  const { error } = await supabase
    .from('memberships')
    .insert(mapMembershipToDb(membership));

  if (error) {
    throw error;
  }

  return membership;
}

/**
 * Accept an invitation by token. Validates token and checks expiry.
 */
export async function acceptInvitation(
  token: string,
  userId: string,
): Promise<CaregiverMembership> {
  const { data, error } = await supabase
    .from('memberships')
    .select('*')
    .eq('invitation_token', token)
    .eq('status', 'invited')
    .maybeSingle();

  if (error || !data) {
    throw new Error('Invalid or already-used invitation token.');
  }

  const membership = mapMembershipFromDb(data);

  if (membership.tokenExpiresAt && new Date(membership.tokenExpiresAt) < new Date()) {
    throw new Error('Invitation token has expired.');
  }

  const now = new Date().toISOString();
  const updates: Partial<CaregiverMembership> = {
    userId,
    status: 'active',
    acceptedAt: now,
    updatedAt: now,
  };

  const { error: updateError } = await supabase
    .from('memberships')
    .update(mapMembershipToDb(updates))
    .eq('id', membership.id);

  if (updateError) {
    throw updateError;
  }

  return { ...membership, ...updates };
}

/**
 * Revoke a membership.
 */
export async function revokeMembership(membershipId: string): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('memberships')
    .update(mapMembershipToDb({
      status: 'revoked',
      revokedAt: now,
      updatedAt: now,
    }))
    .eq('id', membershipId);

  if (error) {
    throw error;
  }
}

/**
 * Get a single membership by ID.
 */
export async function getMembership(
  membershipId: string,
): Promise<CaregiverMembership | null> {
  const { data, error } = await supabase
    .from('memberships')
    .select('*')
    .eq('id', membershipId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapMembershipFromDb(data);
}

/**
 * Get all memberships for a patient.
 */
export async function getMembershipsByPatient(
  patientId: string,
): Promise<CaregiverMembership[]> {
  const { data, error } = await supabase
    .from('memberships')
    .select('*')
    .eq('patient_id', patientId);

  if (error) {
    console.error('Error fetching memberships for patient:', error);
    return [];
  }

  return (data || []).map(mapMembershipFromDb);
}

/**
 * Get all memberships for a user.
 */
export async function getMembershipsByUser(
  userId: string,
): Promise<CaregiverMembership[]> {
  const { data, error } = await supabase
    .from('memberships')
    .select('*')
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching memberships for user:', error);
    return [];
  }

  return (data || []).map(mapMembershipFromDb);
}

/**
 * Get the active membership for a specific user+patient pair.
 */
export async function getUserMembershipForPatient(
  userId: string,
  patientId: string,
): Promise<CaregiverMembership | null> {
  const { data, error } = await supabase
    .from('memberships')
    .select('*')
    .eq('user_id', userId)
    .eq('patient_id', patientId)
    .eq('status', 'active')
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapMembershipFromDb(data);
}

/**
 * Update the permissions array on a membership.
 */
export async function updatePermissions(
  membershipId: string,
  permissions: Permission[],
): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('memberships')
    .update(mapMembershipToDb({
      permissions,
      updatedAt: now,
    }))
    .eq('id', membershipId);

  if (error) {
    throw error;
  }
}

/**
 * Check if a user has a specific permission for a patient.
 */
export async function checkPermission(
  userId: string,
  patientId: string,
  permission: Permission,
): Promise<boolean> {
  const membership = await getUserMembershipForPatient(userId, patientId);
  if (!membership) return false;
  return membership.permissions.includes(permission);
}
