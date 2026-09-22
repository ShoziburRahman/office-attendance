import { LocalNotifications } from '@capacitor/local-notifications';
import { getBusinessDate } from './date-utils';

export const CHECKOUT_REMINDER_PRIMARY = 101;
export const CHECKOUT_REMINDER_SECONDARY = 102;
export const NOTIFICATION_CHANNEL_ID = 'checkout-reminders';

/**
 * Combines today's business date and a shift end time string into a JS Date object.
 * The resulting Date is treated as being in Asia/Dhaka (+06:00).
 */
export function calculateShiftEnd(endTimeStr: string): Date {
  const businessDate = getBusinessDate(); // YYYY-MM-DD
  // Construct ISO string: 2026-09-22T18:00:00+06:00
  // This ensures the Date object is correctly anchored to Dhaka time regardless of device locale.
  const isoString = `${businessDate}T${endTimeStr}+06:00`;
  return new Date(isoString);
}

/**
 * Schedules the primary (at shift end) and secondary (shift end + 30m) reminders.
 */
export async function scheduleCheckoutReminders(schedule: { end_time: string }) {
  try {
    const shiftEnd = calculateShiftEnd(schedule.end_time);
    const shiftEndPlus30 = new Date(shiftEnd.getTime() + 30 * 60 * 1000);
    const now = new Date();

    const notifications: any[] = [];

    if (shiftEnd > now) {
      notifications.push({
        id: CHECKOUT_REMINDER_PRIMARY,
        title: 'Checkout Reminder',
        body: "Your shift has ended. Don't forget to check out.",
        schedule: { at: shiftEnd },
      });
    }

    if (shiftEndPlus30 > now) {
      notifications.push({
        id: CHECKOUT_REMINDER_SECONDARY,
        title: 'Checkout Reminder',
        body: "You haven't checked out yet. Please check out to complete today's attendance.",
        schedule: { at: shiftEndPlus30 },
      });
    }

    if (notifications.length > 0) {
      console.log(`[CHECKOUT REMINDER] Scheduling reminders for ${schedule.end_time}`);
      await LocalNotifications.schedule({
        notifications: notifications.map(n => ({
          ...n,
          channelId: NOTIFICATION_CHANNEL_ID,
        })),
      });
    } else {
      console.log('[CHECKOUT REMINDER] Shift end has already passed; skipping scheduling');
    }
  } catch (e) {
    console.error('[CHECKOUT REMINDER] Error scheduling reminders:', e);
  }
}

/**
 * Cancels all checkout reminders.
 */
export async function cancelCheckoutReminders() {
  try {
    console.log('[CHECKOUT REMINDER] Cancelling reminders');
    await LocalNotifications.cancel({
      notifications: [
        { id: CHECKOUT_REMINDER_PRIMARY },
        { id: CHECKOUT_REMINDER_SECONDARY },
      ],
    });
  } catch (e) {
    console.error('[CHECKOUT REMINDER] Error cancelling reminders:', e);
  }
}

/**
 * Ensures notifications are in sync with current attendance state.
 */
export async function reconcileCheckoutReminders(activeSession: any | null, schedule: any | null) {
  try {
    if (activeSession && schedule) {
      await scheduleCheckoutReminders(schedule);
    } else {
      await cancelCheckoutReminders();
    }
  } catch (e) {
    console.error('[CHECKOUT REMINDER] Error reconciling reminders:', e);
  }
}

/**
 * Requests notification permissions and creates the required Android channel.
 */
export async function requestNotificationPermissions() {
  try {
    const permission = await LocalNotifications.requestPermissions();
    if (permission.display !== 'granted') {
      console.warn('[CHECKOUT REMINDER] Notification permission denied');
      return false;
    }

    await LocalNotifications.createChannel({
      id: NOTIFICATION_CHANNEL_ID,
      name: 'Checkout Reminders',
      importance: 5, // High
      description: 'Reminders to check out at the end of the shift',
      sound: 'default',
      visibility: 1, // Public
      vibration: true,
    });

    return true;
  } catch (e) {
    console.error('[CHECKOUT REMINDER] Error requesting permissions:', e);
    return false;
  }
}
