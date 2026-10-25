import { describe, expect, it } from "vitest";
import { companyEmailContext } from "@/lib/emailContext";
describe("company email context", () => {
  it("fills all four fields from the company profile", () => {
    const saved = { meeting_type: "coffee / lunch meeting", meeting_attendees: "Sales director", meeting_description: "Booth 42", awards: "ISO 27001" };
    expect(companyEmailContext(saved)).toEqual(saved);
  });
  it("uses existing factual positioning as credentials for older profiles", () => {
    expect(companyEmailContext({}, "SAP partner").awards).toBe("SAP partner");
  });
  it("never invents missing meeting details or credentials", () => {
    expect(companyEmailContext(null)).toEqual({ meeting_type: "not_specified", meeting_attendees: "", meeting_description: "", awards: "" });
  });
});