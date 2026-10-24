import type { BrandColors } from './landingCampaignDesign';

export const LANDING_PALETTES = [
  { id: 'ocean', name: 'Ocean & Teal', accent: '#2d8a9e', colors: { background: '#f5fafa', text: '#0c2340', surface: '#1a4a6e' } },
  { id: 'tidal', name: 'Tidal Mint', accent: '#1a4a6e', colors: { background: '#e6f5f4', text: '#0c2340', surface: '#2d8a9e' } },
  { id: 'deep', name: 'Deep Ocean', accent: '#5cbdb9', colors: { background: '#0c2340', text: '#f5fafa', surface: '#1a4a6e' } },
  { id: 'coastal', name: 'Coastal Light', accent: '#2d8a9e', colors: { background: '#ffffff', text: '#1a4a6e', surface: '#5cbdb9' } },
] as const;

export function matchingLandingPalette(accent: string | null, colors?: BrandColors): string | undefined {
  return LANDING_PALETTES.find(p => p.accent.toLowerCase() === accent?.toLowerCase() &&
    (['background', 'text', 'surface'] as const).every(role => p.colors[role].toLowerCase() === colors?.[role]?.toLowerCase()))?.id;
}