'use client';

// In-memory active timer handles indexed by mealId
const activeTimers: Map<string, number> = new Map();

export interface IntakeReminderEventDetail {
  mealId: string;
  mealTitle: string;
  loggedAt: string;
}

/**
 * Requests permission for Web Notifications API if supported.
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  if (Notification.permission === 'granted' || Notification.permission === 'denied') {
    return Notification.permission;
  }
  try {
    return await Notification.requestPermission();
  } catch (err) {
    console.warn('Notification permission request error:', err);
    return 'denied';
  }
}

/**
 * Triggers a system Web Notification and fires the in-app event.
 */
export function fireIntakeReminder(mealId: string, mealTitle: string, loggedAt: string): void {
  if (typeof window === 'undefined') return;

  // 1. Dispatch in-app custom event for UI banners
  const event = new CustomEvent<IntakeReminderEventDetail>('plate_pal_intake_reminder', {
    detail: { mealId, mealTitle, loggedAt },
  });
  window.dispatchEvent(event);

  // 2. Fire native Web Notification if allowed
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      const n = new Notification('Plate Pal: Record your actual intake 🥗', {
        body: `It has been 30 minutes since you logged "${mealTitle}". Tap to record how much you actually ate!`,
        icon: '/favicon.ico',
        tag: `intake-reminder-${mealId}`,
      });
      n.onclick = () => {
        window.focus();
        n.close();
      };
    } catch (e) {
      console.warn('Could not display Web Notification:', e);
    }
  }
}

/**
 * Schedules a 30-minute reminder timer for a meal with pending intake.
 */
export function scheduleIntakeReminder(
  mealId: string,
  mealTitle: string,
  loggedAt: string,
  overrideDelayMs?: number
): void {
  if (typeof window === 'undefined') return;

  // Cancel any existing timer for this meal first
  cancelIntakeReminder(mealId);

  const loggedTime = new Date(loggedAt).getTime();
  const thirtyMinutesMs = 30 * 60 * 1000;
  const elapsed = Date.now() - (isNaN(loggedTime) ? Date.now() : loggedTime);
  const remainingDelay = overrideDelayMs !== undefined
    ? overrideDelayMs
    : Math.max(0, thirtyMinutesMs - elapsed);

  if (remainingDelay === 0) {
    // Already 30 minutes overdue! Fire immediately
    fireIntakeReminder(mealId, mealTitle, loggedAt);
    return;
  }

  // Set timeout
  const timerId = window.setTimeout(() => {
    activeTimers.delete(mealId);
    fireIntakeReminder(mealId, mealTitle, loggedAt);
  }, remainingDelay);

  activeTimers.set(mealId, timerId);
}

/**
 * Cancels pending reminder timer for a meal (called once intake is confirmed).
 */
export function cancelIntakeReminder(mealId: string): void {
  if (typeof window === 'undefined') return;

  const timerId = activeTimers.get(mealId);
  if (timerId !== undefined) {
    window.clearTimeout(timerId);
    activeTimers.delete(mealId);
  }

  // Dispatch cancel event to dismiss any active in-app reminder banner
  const event = new CustomEvent<{ mealId: string }>('plate_pal_intake_reminder_cancelled', {
    detail: { mealId },
  });
  window.dispatchEvent(event);
}

/**
 * Testing & Evaluation Utility:
 * Simulates the 30-minute reminder firing immediately.
 */
export function simulate30MinReminder(mealId: string, mealTitle: string): void {
  fireIntakeReminder(mealId, mealTitle, new Date().toISOString());
}
