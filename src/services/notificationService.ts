import { supabase } from '@/config/supabase';
import type { Notification } from '@/types';
import { generateId } from '@/lib/utils';
import { mapNotificationFromDb, mapNotificationToDb } from '@/lib/mappers';
import * as emailService from '@/services/emailService';

export async function createNotification(
  data: Omit<Notification, 'id' | 'createdAt'>,
): Promise<Notification> {
  const id = generateId();
  const now = new Date().toISOString();

  const notification: Notification = {
    ...data,
    id,
    createdAt: now,
  };

  const { error } = await supabase
    .from('notifications')
    .insert(mapNotificationToDb(notification));

  if (error) {
    throw error;
  }

  // Automated EmailJS dispatch to recipient
  try {
    if (emailService.isEmailConfigured() && data.recipientId) {
      const { data: userData } = await supabase
        .from('users')
        .select('email, display_name')
        .eq('id', data.recipientId)
        .maybeSingle();

      if (userData?.email) {
        const { data: patientData } = await supabase
          .from('patients')
          .select('name')
          .eq('id', data.patientId)
          .maybeSingle();

        await emailService.sendGenericNotificationEmail({
          toEmail: userData.email,
          recipientName: userData.display_name,
          patientName: patientData?.name || 'Loved One',
          title: data.title,
          message: data.message,
        });
      }
    }
  } catch (err) {
    console.warn('[Notification] EmailJS dispatch skipped or failed:', err);
  }

  return notification;
}

export async function getNotifications(userId: string): Promise<Notification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('recipient_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }

  return (data || []).map(mapNotificationFromDb);
}

export const getNotificationsByUser = getNotifications;

export async function getUnreadCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('recipient_id', userId)
    .eq('is_read', false);

  if (error) {
    console.error('Error fetching unread count:', error);
    return 0;
  }

  return count ?? 0;
}

export async function markAsRead(notificationId: string): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('notifications')
    .update({
      is_read: true,
      read_at: now,
    })
    .eq('id', notificationId);

  if (error) {
    throw error;
  }
}

export async function markAllAsRead(userId: string): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('notifications')
    .update({
      is_read: true,
      read_at: now,
    })
    .eq('recipient_id', userId)
    .eq('is_read', false);

  if (error) {
    throw error;
  }
}
