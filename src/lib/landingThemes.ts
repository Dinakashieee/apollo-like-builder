import type { Block } from "./landingBlocks";

export const LANDING_THEMES = [
  { id: "ocean", name: "Ocean Studio", desc: "Architectural imagery · teal accents" },
  { id: "tidal", name: "Tidal Editorial", desc: "Bright canvas · bold navy typography" },
  { id: "deep", name: "Deep Current", desc: "Dark ocean · high-contrast sections" },
] as const;

export const LEGACY_THEMES = [
  { id: "minimal", name: "Minimal", desc: "Light, focused" },
  { id: "bold", name: "Bold Gradient", desc: "Dark, dramatic" },
  { id: "split", name: "Split", desc: "Two-column" },
];

export const THEME_ACCENT = "#2d8a9e";
export function isLandingTheme(id: string) {
  return LANDING_THEMES.some((theme) => theme.id === id);
}

export function themeStarterBlocks(): Block[] {
  const id = () => crypto.randomUUID();
  return [
    { id: id(), type: "heading", level: 1, text: "A new chapter for {company}", align: "left" },
    { id: id(), type: "text", text: "Hi {name}, let’s build what comes next. A partnership designed around your business, your priorities, and your people." },
    { id: id(), type: "cta", label: "Let’s talk", url: "https://", style: "primary" },
    { id: id(), type: "heading", level: 2, text: "Built around your ambitions" },
    { id: id(), type: "text", text: "Introduce your products, services, and the challenges you help solve. Make the opportunity clear, specific, and relevant to your prospect." },
    { id: id(), type: "heading", level: 2, text: "The right expertise. The right partnership." },
    { id: id(), type: "text", text: "Share your approach, customer stories, or a tailored proposal here." },
    { id: id(), type: "cta", label: "Start a conversation", url: "https://", style: "outline" },
  ];
}