import { localWorkDate } from '@/lib/dailyWorkUpdates';

export type SummaryPeriod = "day" | "week" | "month" | "quarter";
export const SUMMARY_PERIODS: { value: SummaryPeriod; label: string }[] = [
  { value: "day", label: "Today" }, { value: "week", label: "Week" },
  { value: "month", label: "Month" }, { value: "quarter", label: "Quarter" },
];

/** Calendar-to-date periods in the user's local timezone; weeks start Monday. */
export function summaryRange(period: SummaryPeriod, now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (period === "week") start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  if (period === "month") start.setDate(1);
  if (period === "quarter") {
    start.setMonth(Math.floor(start.getMonth() / 3) * 3, 1);
  }
  return { start: start.toISOString(), end: now.toISOString() };
}

export function summaryWorkDates(period: SummaryPeriod, now = new Date()) {
  const range = summaryRange(period, now);
  return { start: localWorkDate(new Date(range.start)), end: localWorkDate(now) };
}

export type PersonalSummary = {
  leads: number; emails_sent: number; emails_drafted: number;
  landing_pages: number; followups_completed: number;
  activities: { id: string; type: string; description: string; created_at: string }[];
};

export function parsePersonalSummary(value: unknown): PersonalSummary {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Summary unavailable");
  const data = value as Record<string, unknown>;
  const number = (key: string) => typeof data[key] === "number" ? data[key] as number : 0;
  return {
    leads: number("leads"), emails_sent: number("emails_sent"), emails_drafted: number("emails_drafted"),
    landing_pages: number("landing_pages"), followups_completed: number("followups_completed"),
    activities: Array.isArray(data.activities) ? data.activities as PersonalSummary["activities"] : [],
  };
}