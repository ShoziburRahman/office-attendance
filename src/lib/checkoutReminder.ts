import { LocalNotifications } from '@capacitor/local-notifications';
import { addMinutes, setHours, setMinutes, setSeconds, setMilliseconds, isAfter } from 'date-fns';

export const CHECKOUT_REMINDER_PRIMARY_ID = 1;
export const CHECKOUT_REMINDER_SECONDARY_ID = 2;

/**
 * Shift end is defined as 18:00 (6 PM) Asia/Dhaka time.
 * Asia/Dhaka is UTC+6.
 * 18:00 Dhaka = 12:00 UTC.
 */
export function calculateShiftEnd(): Date {
  const now = new Date();
  // Set to 12:00 UTC today
  const shiftEnd = setHours(setMinutes(setSeconds(setMilliseconds(new Date(), 0), 0), 0), 12);
  return shiftEnd;
}

/**
 * Schedules checkout reminders for the current active session.
 * Primary: at shift end (18:00 Dhaka / 12:00 UTC)
 * Secondary: at shift end + 30 minutes
 */
export async function scheduleCheckoutReminders() {
  try {
    const shiftEnd = calculateShiftEnd();
    const shiftEndPlus30 = addMinutes(shiftEnd, 30);

    const now = new Date();

    const notifications = [];

    if (isAfter(shiftEnd, now)) {
      notifications.push({
        id: CHECKOUT_REMINDER_PRIMARY_ID,
        title: 'Shift End Reminder',
        body: 'It is 6:00 PM. Please remember to check out if you are finished for the day.',
        schedule: { at: shiftEnd },
        channelId: 'checkout-reminders',
      });
    }

    if (isAfter(shiftEndPlus30, now)) {
      notifications.push({
        id: CHECKOUT_REMINDER_SECONDARY_ID,
        title: 'Checkout Required',
        body: 'You are still checked in 30 minutes after shift end. Please check out now.',
        schedule: { at: shiftEndPlus30 },
        channelId: 'checkout-reminders',
      });
    }

    if (notifications.length > 0) {
      await LocalNotifications.schedule({
        notifications,
      });
    }
  } catch (error) {
    console.error('Failed to schedule checkout reminders:', error);
  }
}

/**
 * Cancels all checkout reminders.
 */
export async function cancelCheckoutReminders() {
  try {
    await LocalNotifications.cancel({
      notifications: [
        { id: CHECKOUT_REMINDER_PRIMARY_ID },
        { id: CHECKOUT_REMINDER_SECONDARY_ID },
      ],
    });
  } catch (error) {
    console.error('Failed to cancel checkout reminders:', error);
  }
}

/**
 * Reconciles notifications based on current attendance state.
 * @param isCheckedIn Boolean indicating if the user is currently checked in.
 */
export async function reconcileCheckoutReminders(isCheckedIn: boolean) {
  if (isCheckedIn) {
    await scheduleCheckoutReminders();
  } else {
    await cancelCheckoutReminders();
  }
}

/**
 * Configures the Android notification channel.
 */
export async function setupNotificationChannels() {
  try {
    await LocalNotifications.createChannel({
      id: 'checkout-reminders',
      name: 'Checkout Reminders',
      description: 'Notifications to remind employees to check out at shift end.',
      importance: 3, // High importance
      visibility: 1, // Public
    });
  } catch (error) {
    console.error('Failed to setup notification channels:', error);
  }
}
