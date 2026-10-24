import type { Block } from './landingBlocks';

export type BrandColors = { background?: string; text?: string; surface?: string };
export const CAMPAIGN_STYLES = [
  { id: 'outreach', name: 'Personal introduction', template: 'ocean', heading: 'A partnership for {company}', cta: 'Book a conversation' },
  { id: 'launch', name: 'Product launch', template: 'deep', heading: 'Meet your next advantage', cta: 'Explore the product' },
  { id: 'demo', name: 'Demo invitation', template: 'tidal', heading: 'See it in action', cta: 'Reserve your demo' },
  { id: 'proposal', name: 'Tailored proposal', template: 'tidal', heading: 'A plan built for {company}', cta: 'Discuss your proposal' },
] as const;

export function campaignBlocks(subject: string, body: string, styleId: string): Block[] {
  const style = CAMPAIGN_STYLES.find(s => s.id === styleId) ?? CAMPAIGN_STYLES[0];
  // Campaigns are text templates, not trusted HTML or brand-color definitions.
  return [
    { id: crypto.randomUUID(), type: 'heading', level: 1, text: subject.trim() || style.heading },
    { id: crypto.randomUUID(), type: 'text', text: body.trim() },
    { id: crypto.randomUUID(), type: 'cta', label: style.cta, url: 'https://', style: 'primary' },
  ];
}

export function hexToHsl(value: string | undefined): string | undefined {
  if (!value || !/^#[0-9a-f]{6}$/i.test(value)) return undefined;
  const [r, g, b] = [1, 3, 5].map(i => parseInt(value.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min, l = (max + min) / 2;
  const s = d ? d / (1 - Math.abs(2 * l - 1)) : 0;
  const h = !d ? 0 : max === r ? ((g - b) / d + (g < b ? 6 : 0)) * 60 : max === g ? ((b - r) / d + 2) * 60 : ((r - g) / d + 4) * 60;
  return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export function canUsePaidDesign(loading: boolean, allowed: boolean): boolean { return !loading && allowed; }
export function validateLandingImage(file: Pick<File, 'size' | 'type'>): string | null {
  if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif'].includes(file.type)) return 'Choose a PNG, JPEG, WebP, GIF, or AVIF image.';
  if (file.size > 15 * 1024 * 1024) return 'Maximum image size is 15MB.';
  return null;
}