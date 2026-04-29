// Lightweight country + region + compliance helpers.
// Used by AddLeadDialog, Composer, Leads, Dashboard.

export type Region =
  | "Europe"
  | "North America"
  | "United Kingdom"
  | "APAC"
  | "Latin America"
  | "Middle East & Africa"
  | "Oceania"
  | "Other";

export interface Country {
  code: string; // ISO-2
  name: string;
  region: Region;
  // Primary anti-spam / data-protection law for B2B email outreach.
  law: string;
  // Short, user-facing one-liner of what the law requires.
  lawSummary: string;
}

export const COUNTRIES: Country[] = [
  // Europe
  { code: "DE", name: "Germany", region: "Europe", law: "GDPR + ePrivacy/UWG", lawSummary: "Strict prior consent for B2B email; legitimate interest narrowly applied. Always include unsubscribe + identify sender." },
  { code: "FR", name: "France", region: "Europe", law: "GDPR + LCEN", lawSummary: "B2B requires soft opt-in / professional context. Mandatory unsubscribe and clear identification." },
  { code: "ES", name: "Spain", region: "Europe", law: "GDPR + LSSI-CE", lawSummary: "Consent or pre-existing relationship required. Include opt-out and identify the sender." },
  { code: "IT", name: "Italy", region: "Europe", law: "GDPR + Codice Privacy", lawSummary: "Consent generally required. Document lawful basis + provide easy unsubscribe." },
  { code: "NL", name: "Netherlands", region: "Europe", law: "GDPR + Telecommunications Act", lawSummary: "B2B soft opt-in allowed for similar products; always honour opt-out and identify sender." },
  { code: "SE", name: "Sweden", region: "Europe", law: "GDPR + Marketing Act", lawSummary: "B2B is opt-out friendly but still requires lawful basis + unsubscribe + sender identity." },
  { code: "IE", name: "Ireland", region: "Europe", law: "GDPR + ePrivacy Regs", lawSummary: "B2B permitted with legitimate interest; mandatory unsubscribe and physical address." },
  { code: "PL", name: "Poland", region: "Europe", law: "GDPR", lawSummary: "Consent or legitimate interest, with documented lawful basis and easy opt-out." },
  { code: "BE", name: "Belgium", region: "Europe", law: "GDPR", lawSummary: "B2B email allowed with legitimate interest; clear identification + unsubscribe required." },
  { code: "CH", name: "Switzerland", region: "Europe", law: "FADP / nFADP", lawSummary: "Similar to GDPR. Need lawful basis, transparency, and a working opt-out." },
  // UK
  { code: "GB", name: "United Kingdom", region: "United Kingdom", law: "UK GDPR + PECR", lawSummary: "B2B to corporate addresses allowed with legitimate interest; unsubscribe + sender identity mandatory." },
  // North America
  { code: "US", name: "United States", region: "North America", law: "CAN-SPAM Act", lawSummary: "Truthful headers, no deceptive subject lines, valid physical postal address, and a working unsubscribe processed within 10 business days." },
  { code: "CA", name: "Canada", region: "North America", law: "CASL", lawSummary: "Express or implied consent required. Identify yourself, include physical address, and provide an unsubscribe mechanism." },
  { code: "MX", name: "Mexico", region: "North America", law: "LFPDPPP", lawSummary: "Provide a privacy notice; honour ARCO + opt-out requests promptly." },
  // Oceania
  { code: "AU", name: "Australia", region: "Oceania", law: "Spam Act 2003", lawSummary: "Consent (express or inferred), accurate sender identification, and a functional unsubscribe." },
  { code: "NZ", name: "New Zealand", region: "Oceania", law: "Unsolicited Electronic Messages Act", lawSummary: "Consent required; clear sender identification + working unsubscribe." },
  // APAC
  { code: "IN", name: "India", region: "APAC", law: "DPDP Act 2023", lawSummary: "Consent + notice required; honour withdrawal of consent and grievance requests." },
  { code: "SG", name: "Singapore", region: "APAC", law: "PDPA + Spam Control Act", lawSummary: "Include unsubscribe, identify sender, and respect Do-Not-Call / opt-out registers." },
  { code: "JP", name: "Japan", region: "APAC", law: "Act on Specified Commercial Transactions", lawSummary: "Opt-in required for most marketing; sender identity + unsubscribe mandatory." },
  { code: "HK", name: "Hong Kong", region: "APAC", law: "PDPO + UEMO", lawSummary: "Provide unsubscribe, accurate sender info, and respect opt-outs within 10 working days." },
  { code: "AE", name: "United Arab Emirates", region: "Middle East & Africa", law: "PDPL (Federal Decree-Law 45/2021)", lawSummary: "Consent + clear opt-out. Honour data-subject rights and identify sender." },
  { code: "ZA", name: "South Africa", region: "Middle East & Africa", law: "POPIA", lawSummary: "Consent or existing customer relationship; provide opt-out at every contact." },
  { code: "BR", name: "Brazil", region: "Latin America", law: "LGPD", lawSummary: "Lawful basis + transparency. Provide privacy notice and honour data-subject rights." },
  { code: "AR", name: "Argentina", region: "Latin America", law: "PDPL 25.326", lawSummary: "Consent generally required; provide opt-out and identify the sender." },
];

export function findCountry(code?: string | null): Country | undefined {
  if (!code) return undefined;
  return COUNTRIES.find((c) => c.code === code.toUpperCase());
}

export function regionOf(code?: string | null): Region | "Unknown" {
  return findCountry(code)?.region ?? "Unknown";
}

// Best-effort guess of country from an email address (TLD only).
const TLD_TO_CODE: Record<string, string> = {
  de: "DE", fr: "FR", es: "ES", it: "IT", nl: "NL", se: "SE", ie: "IE", pl: "PL",
  be: "BE", ch: "CH", uk: "GB", au: "AU", nz: "NZ", in: "IN", sg: "SG", jp: "JP",
  hk: "HK", ae: "AE", za: "ZA", br: "BR", ar: "AR", ca: "CA", mx: "MX", us: "US",
};

export function guessCountryFromEmail(email?: string | null): string | undefined {
  if (!email) return undefined;
  const m = email.toLowerCase().match(/\.([a-z.]+)$/);
  if (!m) return undefined;
  const parts = m[1].split(".");
  // co.uk → uk, com.au → au
  const tld = parts[parts.length - 1];
  if (tld === "com" || tld === "org" || tld === "net" || tld === "io") return "US";
  return TLD_TO_CODE[tld];
}
