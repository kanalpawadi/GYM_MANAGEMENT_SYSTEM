import { describe, expect, it } from 'vitest';
import { ageFromDob, applyDiscount, attendanceStreak, toCsv } from './gym';
import { parseMealTime } from '../utils/reminders';
import { todaysWorkoutDay } from '../components/engagement/TodayPlanPopup';

describe('gym helpers', () => {
  it('works out age from date of birth', () => {
    const now = new Date('2026-10-22T10:00:00');
    expect(ageFromDob('1995-05-01', now)).toBe(31);
    expect(ageFromDob('1995-12-01', now)).toBe(30);
    expect(ageFromDob(null, now)).toBeNull();
    expect(ageFromDob('not a date', now)).toBeNull();
  });

  it('applies the discount the same way as the database (rounded, 0-90%)', () => {
    expect(applyDiscount(7500, { enabled: true, percent: 10, label: '' })).toBe(6750);
    expect(applyDiscount(1500, { enabled: true, percent: 15, label: '' })).toBe(1275);
    expect(applyDiscount(1500, { enabled: false, percent: 50, label: '' })).toBe(1500);
    expect(applyDiscount(1000, { enabled: true, percent: 99, label: '' })).toBe(100);
  });

  it('counts consecutive check-in days', () => {
    const now = new Date('2026-10-22T12:00:00');
    const day = (d: string) => ({ check_in: new Date(`${d}T09:00:00`).toISOString() });
    expect(attendanceStreak([day('2026-10-22'), day('2026-10-21'), day('2026-10-20'), day('2026-10-18')], now)).toBe(3);
    expect(attendanceStreak([day('2026-10-21'), day('2026-10-20')], now)).toBe(2);
    expect(attendanceStreak([day('2026-10-19')], now)).toBe(0);
  });

  it('reads meal times for reminders', () => {
    expect(parseMealTime('8:00 AM')).toBe(480);
    expect(parseMealTime('1:30 pm')).toBe(810);
    expect(parseMealTime('12 AM')).toBe(0);
    expect(parseMealTime('20:15')).toBe(1215);
    expect(parseMealTime('after gym')).toBeNull();
  });

  it("picks today's training day by weekday name, else rotates", () => {
    const plan: any = { schedule: [{ day: 'Monday – Chest', exercises: 'Bench' }, { day: 'Thursday – Legs', exercises: 'Squat' }] };
    expect(todaysWorkoutDay(plan, new Date('2026-10-22T10:00:00'))).toBeTruthy(); // Thursday? 22 Oct 2026 is a Thursday
    expect(todaysWorkoutDay(plan, new Date('2026-10-22T10:00:00'))?.exercises).toBe('Squat');
    expect(todaysWorkoutDay({ schedule: [] } as any)).toBeNull();
  });

  it('builds CSV with quoting', () => {
    expect(toCsv([{ name: 'Asha, P', note: 'say "hi"' }])).toBe('name,note\n"Asha, P","say ""hi"""');
  });
});
