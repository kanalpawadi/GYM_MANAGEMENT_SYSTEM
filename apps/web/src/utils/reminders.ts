// Browser notifications (like Google / app notifications) for meal and water reminders.
// They work while the website is open in a tab or installed on the phone's home screen.
import type { DietMeal } from '../services/portal';

const WATER_EVERY_MINUTES = 120;
const WATER_FROM_HOUR = 7;
const WATER_TO_HOUR = 21;
const PREF_KEY = 'rv_reminders_on';

export const notificationsSupported = () => typeof window !== 'undefined' && 'Notification' in window;

export function remindersEnabled(): boolean {
  try {
    return notificationsSupported() && Notification.permission === 'granted' && localStorage.getItem(PREF_KEY) === '1';
  } catch {
    return false;
  }
}

/** Asks the browser for permission; returns true when reminders are on. */
export async function enableReminders(): Promise<boolean> {
  if (!notificationsSupported()) return false;
  const permission = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
  try {
    localStorage.setItem(PREF_KEY, permission === 'granted' ? '1' : '0');
  } catch {
    // ignore
  }
  if (permission === 'granted' && 'serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => undefined);
  }
  return permission === 'granted';
}

export function disableReminders() {
  try {
    localStorage.setItem(PREF_KEY, '0');
  } catch {
    // ignore
  }
}

async function show(title: string, body: string, tag: string) {
  const options = { body, tag, icon: '/favicon.svg', badge: '/favicon.svg' };
  try {
    const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : undefined;
    if (reg) await reg.showNotification(title, options);
    else new Notification(title, options);
  } catch {
    // Notifications blocked or unsupported; nothing else to do.
  }
}

/** "8:00 AM" / "20:30" → minutes after midnight, or null. */
export function parseMealTime(text: string): number | null {
  const m = text.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2] ?? 0);
  const ap = m[3]?.toLowerCase();
  if (ap === 'pm' && h < 12) h += 12;
  if (ap === 'am' && h === 12) h = 0;
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

function onceToday(key: string): boolean {
  const day = new Date().toISOString().slice(0, 10);
  const k = `rv_reminded_${key}_${day}`;
  try {
    if (localStorage.getItem(k)) return false;
    localStorage.setItem(k, '1');
  } catch {
    // ignore
  }
  return true;
}

/** Starts checking every minute; returns a function that stops the reminders. */
export function startReminders(meals: DietMeal[]): () => void {
  const tick = () => {
    if (!remindersEnabled()) return;
    const now = new Date();
    const minutes = now.getHours() * 60 + now.getMinutes();
    for (const meal of meals) {
      const at = meal.time ? parseMealTime(meal.time) : null;
      if (at != null && minutes >= at && minutes < at + 10 && onceToday(`meal_${meal.name}_${at}`)) {
        show(`Time for ${meal.name}`, meal.items || 'Check your diet plan in the RV Fitness portal.', `meal-${at}`);
      }
    }
    const hour = now.getHours();
    if (hour >= WATER_FROM_HOUR && hour < WATER_TO_HOUR && minutes % WATER_EVERY_MINUTES === 0 && onceToday(`water_${minutes}`)) {
      show('Drink water 💧', 'Have a glass of water and log it in your water tracker.', 'water');
    }
  };
  tick();
  const id = window.setInterval(tick, 60_000);
  return () => window.clearInterval(id);
}
