import { formatDate } from "./format";

export interface WeeklyOffSchedule {
  id: string;
  day_of_week: number;
  effective_from: string;
  effective_until: string | null;
}

export interface NextWeeklyOffResult {
  dayLabel: string;
  nextDate: string;
  dateFormatted: string;
  scheduleId: string;
}

const DAYS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

/**
 * Calculates the next actual calendar date that is a weekly off,
 * respecting the effective date ranges of the employee's schedules.
 */
export function calculateNextWeeklyOff(
  todayIso: string,
  schedules: WeeklyOffSchedule[],
): NextWeeklyOffResult | null {
  const today = new Date(`${todayIso}T00:00:00Z`);
  const candidates: { date: Date; dayLabel: string; scheduleId: string }[] = [];

  schedules.forEach((sched) => {
    const effectiveFrom = new Date(`${sched.effective_from}T00:00:00Z`);
    const effectiveUntil = sched.effective_until
      ? new Date(`${sched.effective_until}T00:00:00Z`)
      : null;

    // Find the first date that is >= max(today, effective_from)
    const searchStart = new Date(Math.max(today.getTime(), effectiveFrom.getTime()));

    // Calculate how many days to add to reach the next day_of_week
    const currentDay = searchStart.getUTCDay();
    const targetDay = sched.day_of_week;

    let daysUntil = (targetDay - currentDay + 7) % 7;
    const nextOccurence = new Date(searchStart);
    nextOccurence.setUTCDate(nextOccurence.getUTCDate() + daysUntil);

    // Validate that this occurrence falls within the schedule's range
    // [effective_from, effective_until)
    const isValid = (
      nextOccurence.getTime() >= effectiveFrom.getTime() &&
      (effectiveUntil === null || nextOccurence.getTime() < effectiveUntil.getTime())
    );

    if (isValid) {
      candidates.push({
        date: nextOccurence,
        dayLabel: DAYS.find(d => d.value === sched.day_of_week)?.label || `Day ${sched.day_of_week}`,
        scheduleId: sched.id
      });
    }
  });

  if (candidates.length === 0) return null;

  // Select the earliest valid date
  candidates.sort((a, b) => a.date.getTime() - b.date.getTime());
  const best = candidates[0];

  if (!best) return null;

  const dateIso = best.date.toISOString().split("T")[0] || "";

  return {
    dayLabel: best.dayLabel,
    nextDate: dateIso,
    dateFormatted: formatDate(dateIso),
    scheduleId: best.scheduleId,
  };
}
