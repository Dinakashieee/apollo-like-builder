import type { CSSProperties } from "react";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Block, interpolate, renderBlock } from "@/lib/landingBlocks";
import { THEME_ACCENT } from "@/lib/landingThemes";
import oceanImage from "@/assets/landing-ocean.jpg";
import { BrandColors, hexToHsl } from '@/lib/landingCampaignDesign';

type ThemedPage = {
  template: string; title: string; blocks: Block[]; logo_url: string | null; accent_color: string | null;
  prospect_name: string | null; prospect_company: string | null;
  headline: string | null; subheadline: string | null; body: string | null;
  ctas: { label: string; url: string; style: "primary" | "secondary" | "outline" }[];
  cta_label: string | null; cta_url: string | null;
  brand_colors?: BrandColors; hero_image_url?: string | null;
};

export function ThemedLandingPage({ page, preview = false, onCta }: { page: ThemedPage; preview?: boolean; onCta?: (url: string, index: number) => void }) {
  const vars = { name: page.prospect_name, company: page.prospect_company };
  const accent = /^#[0-9a-f]{6}$/i.test(page.accent_color || "") ? page.accent_color : THEME_ACCENT;
  const blocks: Block[] = page.blocks.length ? page.blocks : [
    { id: "headline", type: "heading", level: 1, text: page.headline || page.title },
    { id: "subheadline", type: "text", text: page.subheadline || "" },
    { id: "body", type: "text", text: page.body || "" },
    ...(page.ctas.length ? page.ctas : page.cta_label && page.cta_url ? [{ label: page.cta_label, url: page.cta_url, style: "primary" as const }] : []).map((cta, i) => ({ ...cta, id: `cta-${i}`, type: "cta" as const })),
  ];
  const sections: { block: Block; index: number }[][] = [[]];
  blocks.forEach((block, index) => {
    if ((block.type === "heading" && block.level !== 1 && sections[sections.length - 1].length) || block.type === "divider") {
      sections.push([]);
      if (block.type === "divider") return;
    }
    sections[sections.length - 1].push({ block, index });
  });
  const click = (url: string, index: number) => {
    if (preview) return;
    if (onCta) onCta(url, index);
  };
  const render = (block: Block, index: number) => {
    if (block.type === "heading") {
      const Tag = block.level === 1 ? "h1" : block.level === 3 ? "h3" : "h2";
      return <Tag className={block.align === "center" ? "text-center" : ""}>{interpolate(block.text, vars)}</Tag>;
    }
    if (block.type === "text") return <p className={`whitespace-pre-wrap ${block.align === "center" ? "text-center" : ""}`}>{interpolate(block.text, vars)}</p>;
    if (block.type === "cta") return <div className={`flex ${block.align === "center" ? "justify-center" : ""}`}><Button size="lg" variant={block.style === "outline" ? "outline" : block.style === "secondary" ? "secondary" : "default"} className="theme-cta h-auto min-h-11 max-w-full whitespace-normal text-left" onClick={() => click(block.url, index)}>{interpolate(block.label, vars)}<ArrowUpRight className="shrink-0" /></Button></div>;
    return renderBlock(block, { accent: accent || THEME_ACCENT, vars, onCta: click, ctaIndex: index });
  };
  const tokens = { '--theme-brand': accent,
    ...(hexToHsl(page.brand_colors?.background) ? { '--theme-paper': hexToHsl(page.brand_colors?.background) } : {}),
    ...(hexToHsl(page.brand_colors?.text) ? { '--theme-ocean': hexToHsl(page.brand_colors?.text) } : {}),
    ...(hexToHsl(page.brand_colors?.surface) ? { '--theme-mid': hexToHsl(page.brand_colors?.surface), '--theme-mint': hexToHsl(page.brand_colors?.surface) } : {}),
  } as CSSProperties;
  return <article className={`landing-theme landing-theme-${page.template} ${preview ? "theme-preview" : ""}`} style={tokens}>
    {sections.filter((section) => section.length).map((section, i) => <section key={i} className={`theme-section ${i === 0 ? "theme-hero" : "theme-content"}`}>
      {i === 0 && (page.template !== "tidal" || page.hero_image_url) && <><img src={page.hero_image_url || oceanImage} alt={page.hero_image_url ? page.title : "Contemporary waterfront office"} width={1536} height={1024} fetchPriority={preview ? "auto" : "high"} className="theme-hero-image" /><div className="theme-hero-shade" /></>}
      <div className="theme-inner relative">
        {i === 0 && <header className="theme-masthead">{page.logo_url ? <img src={page.logo_url} alt={page.title} className="max-h-12 max-w-48 object-contain" /> : <span className="font-display font-semibold">{page.title}</span>}</header>}
        <div className="theme-blocks">{section.map(({ block, index }) => <div key={block.id}>{render(block, index)}</div>)}</div>
      </div>
    </section>)}
  </article>;
}