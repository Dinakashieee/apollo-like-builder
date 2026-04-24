export type LeadStatus = "Hot" | "Warm" | "Cold";

export interface Lead {
  id: string;
  name: string;
  initials: string;
  company: string;
  companyShort: string;
  title: string;
  status: LeadStatus;
  email: string;
  tools: string[];
  industry: string;
  color: string;
}

export const leads: Lead[] = [
  {
    id: "1",
    name: "Natalie Evans",
    initials: "NE",
    company: "JDGlobal",
    companyShort: "JD",
    title: "IT Director",
    status: "Hot",
    email: "natalie@jdglobal.com",
    tools: ["Microsoft 365", "Oracle ERP"],
    industry: "Logistics · Germany",
    color: "from-rose-400 to-orange-400",
  },
  {
    id: "2",
    name: "John Smith",
    initials: "JS",
    company: "ABC Manufacturing",
    companyShort: "ABC",
    title: "CIO",
    status: "Warm",
    email: "j.smith@abc-mfg.com",
    tools: ["Salesforce", "SAP"],
    industry: "Manufacturing · USA",
    color: "from-blue-400 to-indigo-500",
  },
  {
    id: "3",
    name: "Lisa Wong",
    initials: "LW",
    company: "BuildWorks",
    companyShort: "BW",
    title: "Build Director",
    status: "Hot",
    email: "lisa@buildworks.io",
    tools: ["HubSpot", "SAP"],
    industry: "Construction · Singapore",
    color: "from-emerald-400 to-teal-500",
  },
  {
    id: "4",
    name: "Greg Clark",
    initials: "GC",
    company: "Novatech",
    companyShort: "NV",
    title: "Director of Operations",
    status: "Cold",
    email: "greg.c@novatech.co",
    tools: ["IFS ERP"],
    industry: "Tech · Canada",
    color: "from-violet-400 to-purple-500",
  },
  {
    id: "5",
    name: "Megan Patel",
    initials: "MP",
    company: "DigiGrowth",
    companyShort: "DG",
    title: "Chief Marketing",
    status: "Cold",
    email: "megan@digigrowth.ai",
    tools: ["IFS"],
    industry: "Agency · UK",
    color: "from-pink-400 to-rose-500",
  },
  {
    id: "6",
    name: "Aiden Brooks",
    initials: "AB",
    company: "NorthPeak",
    companyShort: "NP",
    title: "VP Sales",
    status: "Warm",
    email: "aiden@northpeak.co",
    tools: ["Pipedrive", "Slack"],
    industry: "SaaS · USA",
    color: "from-cyan-400 to-blue-500",
  },
  {
    id: "7",
    name: "Sara Lee",
    initials: "SL",
    company: "Helio Labs",
    companyShort: "HL",
    title: "Head of Growth",
    status: "Hot",
    email: "sara@heliolabs.io",
    tools: ["Notion", "HubSpot"],
    industry: "AI · USA",
    color: "from-amber-400 to-orange-500",
  },
  {
    id: "8",
    name: "Marco Ferrari",
    initials: "MF",
    company: "Volta Group",
    companyShort: "VG",
    title: "CTO",
    status: "Warm",
    email: "marco@voltagroup.eu",
    tools: ["AWS", "Datadog"],
    industry: "Energy · Italy",
    color: "from-indigo-400 to-blue-600",
  },
];
