import { z } from "zod";

export const internship = { title: "Lead Generation Intern", monthlyPay: 20000, performanceBonus: 5000, currency: "LKR", location: "Sri Lanka", remote: true };
export const applicationSchema = z.object({
  full_name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().min(7).max(30),
  location: z.string().trim().min(2).max(120),
  profile_url: z.string().trim().max(1000).refine(v => !v || (v.startsWith("https://") && URL.canParse(v)), "Use a valid https:// link").transform(v => v || null),
  introduction: z.string().trim().min(20).max(4000),
  consent: z.literal(true),
});