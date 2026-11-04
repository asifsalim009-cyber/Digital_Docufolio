import { LocalNotifications, PermissionStatus } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { StoredDocument, Task, DocumentType } from './types';
import { createCalendarEvent, updateCalendarEvent } from './googleCalendar';

// Helper to convert string to numeric 32-bit integer for notification ID
function hashStringToId(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 2147483647;
}

let notificationClickListenerInitialized = false;

/**
 * Register listener for Android System Notification clicks
 */
export function initNotificationClickListener(onNavigate: (type: 'expiry' | 'task', extra?: any) => void): void {
  if (notificationClickListenerInitialized) return;
  notificationClickListenerInitialized = true;

  try {
    LocalNotifications.addListener('localNotificationActionPerformed', (notificationAction) => {
      console.log('User tapped system notification:', notificationAction);
      const extra = notificationAction.notification?.extra || {};
      if (extra.docId) {
        onNavigate('expiry', extra);
      } else if (extra.taskId) {
        onNavigate('task', extra);
      } else {
        onNavigate('expiry', extra);
      }
    });
  } catch (err) {
    console.warn('Error adding localNotificationActionPerformed listener:', err);
  }
}

/**
 * Request notification permissions from Android / iOS / Web
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    const status: PermissionStatus = await LocalNotifications.checkPermissions();
    if (status.display === 'granted') {
      return true;
    }
    const request = await LocalNotifications.requestPermissions();
    return request.display === 'granted';
  } catch (err) {
    console.warn('LocalNotifications permission request warning:', err);
    // Fallback to Web Notification API if on browser
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const res = await window.Notification.requestPermission();
      return res === 'granted';
    }
    return false;
  }
}

/**
 * Ensure Notification Channel is created on Android
 */
export async function setupNotificationChannel(): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    try {
      await LocalNotifications.createChannel({
        id: 'docufolio_reminders',
        name: 'Digital DocuFolio Alerts',
        description: 'System notifications for document expirations and scheduled tasks',
        importance: 5, // High importance
        visibility: 1, // Public
        sound: 'res_custom_notification',
        vibration: true,
        lights: true,
        lightColor: '#D97706',
      });
    } catch (err) {
      console.warn('Could not create notification channel:', err);
    }
  }
}

/**
 * Schedule System Notifications for Expiring and Already Expired Documents
 */
export async function scheduleDocumentExpiryNotifications(documents: StoredDocument[]): Promise<void> {
  const granted = await requestNotificationPermissions();
  if (!granted) return;

  await setupNotificationChannel();

  const now = new Date();
  const notificationsToSchedule: any[] = [];

  for (const doc of documents) {
    if (!doc.expiryDate) continue;

    const expiry = new Date(doc.expiryDate + 'T09:00:00');
    if (isNaN(expiry.getTime())) continue;

    const docName = doc.customName || (doc.type === DocumentType.OTHER_DOCUMENT ? doc.customType : doc.type) || 'Document';
    const ownerInfo = doc.ownerName ? ` (${doc.ownerName})` : '';
    const config = doc.reminderConfig || { oneMonth: true, twoWeeks: true, oneWeek: true, threeDays: true };

    const diffTime = expiry.getTime() - now.getTime();
    const daysUntilExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Handle ALREADY EXPIRED or EXPIRES TODAY documents immediately
    if (daysUntilExpiry <= 0) {
      const sessionKey = `notif_expired_${doc.id}_${now.toDateString()}`;
      if (typeof window !== 'undefined' && !sessionStorage.getItem(sessionKey)) {
        sessionStorage.setItem(sessionKey, '1');
        const alertTitle = daysUntilExpiry === 0 ? `🚨 Document Expires Today: ${docName}` : `🚨 Document Expired: ${docName}`;
        const alertBody = `${docName}${ownerInfo} ${daysUntilExpiry === 0 ? 'expires TODAY' : 'has EXPIRED'} on ${doc.expiryDate}. Please renew or update your record.`;
        triggerImmediateNotification(alertTitle, alertBody, { docId: doc.id });
      }
      continue;
    }

    // Offsets in days before future expiry
    const offsets: { days: number; enabled: boolean; label: string }[] = [
      { days: 30, enabled: !!config.oneMonth, label: 'expires in 30 days' },
      { days: 14, enabled: !!config.twoWeeks, label: 'expires in 2 weeks' },
      { days: 7, enabled: !!config.oneWeek, label: 'expires in 1 week' },
      { days: 3, enabled: !!config.threeDays, label: 'expires in 3 days' },
      { days: 1, enabled: true, label: 'expires tomorrow!' },
    ];

    for (const offset of offsets) {
      if (!offset.enabled) continue;

      const triggerDate = new Date(expiry.getTime() - offset.days * 24 * 60 * 60 * 1000);

      // If the trigger time is in the future, schedule a system notification
      if (triggerDate > now) {
        const notifId = hashStringToId(`doc-${doc.id}-${offset.days}`);
        notificationsToSchedule.push({
          id: notifId,
          title: `⚠️ Document Expiry Warning: ${docName}`,
          body: `${docName}${ownerInfo} ${offset.label} on ${doc.expiryDate}. Please renew or update your record.`,
          schedule: { at: triggerDate },
          channelId: 'docufolio_reminders',
          sound: undefined,
          smallIcon: 'ic_launcher',
          iconColor: '#D97706',
          extra: { docId: doc.id, expiryDate: doc.expiryDate },
        });
      } else if (Math.abs(now.getTime() - triggerDate.getTime()) < 24 * 60 * 60 * 1000) {
        // If it triggered today within the last 24h, trigger immediate notification if not already shown
        const sessionKey = `notif_sent_${doc.id}_${offset.days}_${now.toDateString()}`;
        if (typeof window !== 'undefined' && !sessionStorage.getItem(sessionKey)) {
          sessionStorage.setItem(sessionKey, '1');
          triggerImmediateNotification(
            `⚠️ Document Expiry Warning: ${docName}`,
            `${docName}${ownerInfo} ${offset.label} on ${doc.expiryDate}.`,
            { docId: doc.id }
          );
        }
      }
    }
  }

  if (notificationsToSchedule.length > 0) {
    try {
      await LocalNotifications.schedule({ notifications: notificationsToSchedule.slice(0, 50) });
    } catch (err) {
      console.warn('Error scheduling document notifications:', err);
    }
  }
}

/**
 * Schedule System Notifications for Tasks & Journal Reminders
 */
export async function scheduleTaskNotifications(tasks: Task[]): Promise<void> {
  const granted = await requestNotificationPermissions();
  if (!granted) return;

  await setupNotificationChannel();

  const now = new Date();
  const taskNotifs: any[] = [];

  for (const task of tasks) {
    if (task.completed || !task.date) continue;

    const timeStr = task.time || '09:00';
    const taskDate = new Date(`${task.date}T${timeStr}:00`);
    if (isNaN(taskDate.getTime())) continue;

    const offsetMinutes = task.reminderOffsetMinutes || 15; // Remind 15 mins before by default
    const triggerDate = new Date(taskDate.getTime() - offsetMinutes * 60 * 1000);

    if (triggerDate > now) {
      const notifId = hashStringToId(`task-${task.id}`);
      taskNotifs.push({
        id: notifId,
        title: `⏰ Upcoming Task: ${task.title}`,
        body: `Scheduled for ${task.time} today (${task.date}).`,
        schedule: { at: triggerDate },
        channelId: 'docufolio_reminders',
        smallIcon: 'ic_launcher',
        iconColor: '#0EA5E9',
        extra: { taskId: task.id },
      });
    }
  }

  if (taskNotifs.length > 0) {
    try {
      await LocalNotifications.schedule({ notifications: taskNotifs.slice(0, 50) });
    } catch (err) {
      console.warn('Error scheduling task notifications:', err);
    }
  }
}

/**
 * Send an immediate System Notification
 */
export async function triggerImmediateNotification(title: string, body: string, extra: any = {}): Promise<void> {
  const granted = await requestNotificationPermissions();
  if (!granted) return;

  await setupNotificationChannel();

  const notifId = Math.floor(Math.random() * 1000000) + 1;

  try {
    if (Capacitor.isNativePlatform()) {
      await LocalNotifications.schedule({
        notifications: [
          {
            id: notifId,
            title,
            body,
            schedule: { at: new Date(Date.now() + 500) }, // 500ms delay for Android system
            channelId: 'docufolio_reminders',
            smallIcon: 'ic_launcher',
            iconColor: '#D97706',
            extra,
          },
        ],
      });
    } else if (typeof window !== 'undefined' && 'Notification' in window && window.Notification.permission === 'granted') {
      new window.Notification(title, { body, icon: '/logo.png' });
    }
  } catch (err) {
    console.warn('Error triggering immediate notification:', err);
  }
}

/**
 * Build a Google Calendar template URL for 1-click addition/syncing
 */
export function buildGoogleCalendarUrl(params: {
  title: string;
  description: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm
}): string {
  const timeStr = params.time || '09:00';
  const startObj = new Date(`${params.date}T${timeStr}:00`);
  const endObj = new Date(startObj.getTime() + 60 * 60 * 1000); // 1 hour duration

  const formatCalDate = (d: Date) => {
    return d.toISOString().replace(/-|:|\.\d\d\d/g, '');
  };

  const datesParam = `${formatCalDate(startObj)}/${formatCalDate(endObj)}`;

  const baseUrl = 'https://calendar.google.com/calendar/render';
  const query = new URLSearchParams({
    action: 'TEMPLATE',
    text: params.title,
    details: params.description,
    dates: datesParam,
  });

  return `${baseUrl}?${query.toString()}`;
}

/**
 * Open event in Google Calendar app or browser
 */
export function openGoogleCalendarUrl(params: {
  title: string;
  description: string;
  date: string;
  time?: string;
}): void {
  const url = buildGoogleCalendarUrl(params);
  if (typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

/**
 * Sync Document Expiry to Google Calendar via REST API or URL
 */
export async function syncDocumentToGoogleCalendar(
  doc: StoredDocument,
  accessToken?: string
): Promise<{ success: boolean; eventId?: string; url?: string }> {
  if (!doc.expiryDate) return { success: false };

  const title = `📄 Document Expiry: ${doc.customName || doc.type}`;
  const description = `Digital DocuFolio Expiry Alert for ${doc.ownerName}.\nDocument Number: ${doc.documentNumber || 'N/A'}\nType: ${doc.type}`;
  const date = doc.expiryDate;

  if (accessToken) {
    try {
      if (doc.googleCalendarEventId) {
        const res = await updateCalendarEvent(accessToken, doc.googleCalendarEventId, {
          title,
          description,
          date,
          time: '09:00',
          reminders: [{ days: 30 }, { days: 14 }, { days: 7 }, { days: 1 }],
        });
        return { success: true, eventId: res.id };
      } else {
        const res = await createCalendarEvent(accessToken, {
          title,
          description,
          date,
          time: '09:00',
          reminders: [{ days: 30 }, { days: 14 }, { days: 7 }, { days: 1 }],
        });
        return { success: true, eventId: res.id };
      }
    } catch (err) {
      console.warn('API Google Calendar sync failed, falling back to URL:', err);
    }
  }

  // Fallback to opening Google Calendar URL
  const calUrl = buildGoogleCalendarUrl({ title, description, date, time: '09:00' });
  openGoogleCalendarUrl({ title, description, date, time: '09:00' });
  return { success: true, url: calUrl };
}

/**
 * Sync Task / Reminder to Google Calendar
 */
export async function syncTaskToGoogleCalendar(
  task: Task,
  accessToken?: string
): Promise<{ success: boolean; eventId?: string; url?: string }> {
  if (!task.date) return { success: false };

  const title = `📌 Task: ${task.title}`;
  const description = `Digital DocuFolio Task scheduled for ${task.date} at ${task.time || '09:00'}.`;
  const date = task.date;
  const time = task.time || '09:00';

  if (accessToken) {
    try {
      if (task.googleCalendarEventId) {
        const res = await updateCalendarEvent(accessToken, task.googleCalendarEventId, {
          title,
          description,
          date,
          time,
          reminders: [{ minutes: task.reminderOffsetMinutes || 15 }],
        });
        return { success: true, eventId: res.id };
      } else {
        const res = await createCalendarEvent(accessToken, {
          title,
          description,
          date,
          time,
          reminders: [{ minutes: task.reminderOffsetMinutes || 15 }],
        });
        return { success: true, eventId: res.id };
      }
    } catch (err) {
      console.warn('API Google Calendar task sync failed, falling back to URL:', err);
    }
  }

  // Fallback to opening Google Calendar URL
  const calUrl = buildGoogleCalendarUrl({ title, description, date, time });
  openGoogleCalendarUrl({ title, description, date, time });
  return { success: true, url: calUrl };
}
