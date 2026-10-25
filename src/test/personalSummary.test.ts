import { describe, expect, it } from "vitest";
import { summaryRange } from "@/lib/personalSummary";

describe("personal summary calendar periods", () => {
  const now = new Date(2026, 9, 25, 22, 2);
  it("Today starts at the user's local midnight", () => {
    expect(summaryRange("day", now).start).toBe(new Date(2026, 9, 25).toISOString());
  });
  it("Week starts on Monday", () => {
    expect(summaryRange("week", now).start).toBe(new Date(2026, 9, 19).toISOString());
  });
  it("Month starts on the first day", () => {
    expect(summaryRange("month", now).start).toBe(new Date(2026, 9, 1).toISOString());
  });
  it("Quarter starts on the first day of the calendar quarter", () => {
    expect(summaryRange("quarter", now).start).toBe(new Date(2026, 9, 1).toISOString());
    expect(summaryRange("quarter", new Date(2026, 7, 15)).start).toBe(new Date(2026, 6, 1).toISOString());
  });
  it("periods end at the current time, not a future boundary", () => {
    expect(summaryRange("month", now).end).toBe(now.toISOString());
  });
});