import { describe, it, expect } from "vitest";
import { canManageLeads, canManageRoles, leadsPerCampaign, normalizePlatform, parseLeadCsv } from "@/lib/campaignLeads";

describe("campaign lead rules", () => {
  it("only admin and marketing can edit and assign leads; sales cannot", () => {
    expect(canManageLeads("admin")).toBe(true);
    expect(canManageLeads("marketing")).toBe(true);
    expect(canManageLeads("sales")).toBe(false);
  });
  it("only admin can change team roles", () => {
    expect(canManageRoles("admin")).toBe(true);
    expect(canManageRoles("marketing")).toBe(false);
  });
  it("maps ad sources to platforms", () => {
    expect(normalizePlatform("Meta Lead Ads")).toBe("facebook");
    expect(normalizePlatform("Google Ads")).toBe("google");
    expect(normalizePlatform("TikTok")).toBe("tiktok");
  });
  it("parses CSV with quoted values and campaign columns", () => {
    const rows = parseLeadCsv('First Name,Last Name,Email,Campaign,Platform\nNimal,Perera,n@x.lk,"Q4, Launch",LinkedIn\n,,,,\n');
    expect(rows).toEqual([{ full_name: "Nimal Perera", email: "n@x.lk", phone: undefined, company: undefined, message: undefined, campaign: "Q4, Launch", platform: "linkedin" }]);
  });
  it("counts leads per campaign", () => {
    const r = leadsPerCampaign([{ id: "a", name: "A", platform: "google" }], [{ campaign_id: "a", status: "won" }, { campaign_id: "a", status: "new" }]);
    expect(r[0]).toMatchObject({ leads: 2, won: 1 });
  });
});
