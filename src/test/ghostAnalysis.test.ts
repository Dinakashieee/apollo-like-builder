import { describe, it, expect } from "vitest";
import { analyzeGhosting, noReplyScore, scoreMessage } from "@/lib/ghostAnalysis";

const lead = { id: "l1", company_name: "Acme", contact_name: "Nimal Perera", industry: "logistics", pain_points: ["manual invoicing"] };

describe("ghost analysis", () => {
  it("flags salesy urgency as pushy", () => {
    expect(scoreMessage("Act now! Limited time discount, buy now!!", lead).pushy).toBeGreaterThanOrEqual(75);
  });
  it("personalised relevant message scores low on generic and irrelevant", () => {
    const s = scoreMessage("Hi Nimal, Acme's logistics team still does manual invoicing — we cut that by 40% for a peer. Worth a look?", lead);
    expect(s.generic).toBe(0);
    expect(s.irrelevant).toBe(15);
  });
  it("unanswered messages raise no-reply risk; replies lower it", () => {
    expect(noReplyScore(3, 0)).toBe(100);
    expect(noReplyScore(3, 2)).toBe(10);
  });
  it("groups results per account", () => {
    const r = analyzeGhosting([lead], [{ lead_id: "l1", channel: "email", text: "Just checking in" }, { lead_id: null, channel: "whatsapp", text: "hi" }], { l1: 0 });
    expect(r.accounts.map((a) => a.company).sort()).toEqual(["Acme", "Unlinked contacts"]);
    expect(r.overall.sent).toBe(2);
  });
});
