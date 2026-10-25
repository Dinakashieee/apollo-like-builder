export const MEETING_TYPES = [
  { value: "not_specified", label: "Not specified" },
  { value: "online virtual call (Zoom / Teams / Google Meet)", label: "Online / virtual call" },
  { value: "in-person meeting at the prospect's office", label: "In-person at prospect's office" },
  { value: "in-person meeting at our office", label: "In-person at our office" },
  { value: "booth / exhibition / trade show meet-up", label: "Booth / exhibition / trade show" },
  { value: "coffee / lunch meeting", label: "Coffee / lunch" },
  { value: "conference or industry event", label: "Conference / industry event" },
];
export type EmailContext = { meeting_type: string; meeting_attendees: string; meeting_description: string; awards: string };
export function companyEmailContext(value: unknown, positioning = ""): EmailContext {
  const data = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const text = (key: string) => typeof data[key] === "string" ? data[key] as string : "";
  return { meeting_type: MEETING_TYPES.some(t => t.value === text("meeting_type")) ? text("meeting_type") : "not_specified",
    meeting_attendees: text("meeting_attendees"), meeting_description: text("meeting_description"), awards: text("awards") || positioning };
}