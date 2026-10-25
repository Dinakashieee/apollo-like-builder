import { supabase } from '@/integrations/supabase/client';
import type { BrandColors } from './landingCampaignDesign';

export type MatchedPalette = { accent: string; colors: Required<BrandColors> };

export function isValidCompanyUrl(value: string): boolean {
  const candidate = /^https?:\/\//i.test(value.trim()) ? value.trim() : `https://${value.trim()}`;
  try {
    const url = new URL(candidate);
    return url.hostname.includes('.') && !url.hostname.startsWith('.');
  } catch { return false; }
}

export function isMatchedPalette(value: unknown): value is MatchedPalette {
  const hex = /^#[0-9a-f]{6}$/i;
  const palette = value as MatchedPalette | null;
  return !!palette && hex.test(palette.accent || '') &&
    hex.test(palette.colors?.background || '') && hex.test(palette.colors?.text || '') && hex.test(palette.colors?.surface || '');
}

export async function matchBrandColors(workspaceId: string, companyUrl: string): Promise<MatchedPalette> {
  if (!isValidCompanyUrl(companyUrl)) throw new Error('Enter a valid company website, like acme.com.');
  const { data, error } = await supabase.functions.invoke('landing-brand-colors', {
    body: { workspace_id: workspaceId, company_url: companyUrl.trim() },
  });
  if (error) throw new Error('We could not match colors from that website. Try again.');
  if (!isMatchedPalette(data)) throw new Error((data as { error?: string })?.error || 'We could not match colors from that website.');
  return data;
}
