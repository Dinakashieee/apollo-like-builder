import { describe, it, expect } from "vitest";
import { applicationSchema, internship } from "@/lib/careers";
import { CV_MAX_BYTES, CV_MIME_TYPES, validateCv } from "@/lib/careerCv";
describe("internship application rules", () => {
  it.each(["pdf", "doc", "docx"])("accepts %s CV files", extension => {
    expect(validateCv({name: `cv.${extension}`,size: 200,type: CV_MIME_TYPES[extension]})).toBeNull();
  });
  it("rejects non PDF/Word documents", () => expect(validateCv({name:"cv.exe",size:200,type:"application/octet-stream"})).not.toBeNull());
  it("rejects mismatched file types", () => expect(validateCv({name:"cv.pdf",size:200,type:"text/html"})).not.toBeNull());
  it("limits CVs to 5 MB", () => {
    expect(CV_MAX_BYTES).toBe(5242880);
    expect(validateCv({name:"cv.pdf",size:5242880,type:"application/pdf"})).toBeNull();
    expect(validateCv({name:"cv.pdf",size:5242881,type:"application/pdf"})).not.toBeNull();
  });
  it("rejects empty CVs", () => expect(validateCv({name:"cv.docx",size:0,type:CV_MIME_TYPES.docx})).not.toBeNull());
  it("retains the advertised monthly pay", () => expect(internship.monthlyPay).toBe(20000));
  it("retains the advertised performance bonus", () => expect(internship.performanceBonus).toBe(5000));
  it("requires consent and rejects unsafe profile links", () => {
    const application = { full_name: "Example Applicant", email: "applicant@example.com", phone: "0771234567", location: "Colombo", introduction: "Interested in B2B sales and technology.", consent: true, profile_url: "https://example.com/cv" };
    expect(applicationSchema.safeParse(application).success).toBe(true);
    expect(applicationSchema.safeParse({...application,consent:false}).success).toBe(false);
    expect(applicationSchema.safeParse({...application,profile_url:"javascript:alert(1)"}).success).toBe(false);
  });
});