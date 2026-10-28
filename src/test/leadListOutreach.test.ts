import { describe, it, expect } from "vitest";
import { landingLink, listRecipients, outreachBody, mailDraftUrl } from "@/lib/leadListOutreach";
const alice = { id: "a", company_name: "Acme", contact_name: "Alice", email: "alice@acme.com" };
const page = { id: "p", slug: "offer", title: "Offer", published: true, custom_domain: null, custom_path: null };
describe("lead list outreach", () => {
  it("uses the same landing page link for every recipient in shared mode", () => {
    const link = landingLink(page, "https://www.engageiqlk.com");
    expect(outreachBody("Hi", alice, link)).toBe("Hi\n\nhttps://www.engageiqlk.com/p/offer");
    expect(outreachBody("Hi", { ...alice, id: "b" }, link)).toBe("Hi\n\nhttps://www.engageiqlk.com/p/offer");
  });
  it("keeps individually selected page links distinct", () => {
    expect(outreachBody("Hi", alice, landingLink({ ...page, slug: "alice" }, "https://www.engageiqlk.com"))).toBe("Hi\n\nhttps://www.engageiqlk.com/p/alice");
    expect(outreachBody("Hi", alice, landingLink({ ...page, slug: "bob" }, "https://www.engageiqlk.com"))).toBe("Hi\n\nhttps://www.engageiqlk.com/p/bob");
  });
  it("does not share unpublished pages", () => { expect(() => landingLink({ ...page, published: false }, "https://example.com")).toThrow(); });
  it("excludes missing emails and deduplicates recipients", () => {
    expect(listRecipients([alice, { ...alice, id: "b", email: "ALICE@ACME.COM" }, { ...alice, id: "c", email: null }]).map(l => l.id)).toEqual(["a"]);
  });
  it("opens a private single-recipient draft, not a list in To or CC", () => {
    expect(mailDraftUrl("default", alice.email, "Hello", "Offer")).toBe("mailto:alice%40acme.com?subject=Hello&body=Offer");
  });
});