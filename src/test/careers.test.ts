import { describe, it, expect } from "vitest";
import { applicationSchema, internship } from "@/lib/careers";
describe("internship application rules", () => {
  it("retains the advertised monthly pay", () => expect(internship.monthlyPay).toBe(20000));
  it("retains the advertised performance bonus", () => expect(internship.performanceBonus).toBe(5000));
  it("requires consent and rejects unsafe profile links", () => {
    const application = { full_name: "Example Applicant", email: "applicant@example.com", phone: "0771234567", location: "Colombo", introduction: "Interested in B2B sales and technology.", consent: true, profile_url: "https://example.com/cv" };
    expect(applicationSchema.safeParse(application).success).toBe(true);
    expect(applicationSchema.safeParse({...application,consent:false}).success).toBe(false);
    expect(applicationSchema.safeParse({...application,profile_url:"javascript:alert(1)"}).success).toBe(false);
  });
});