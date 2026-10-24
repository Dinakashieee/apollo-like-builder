import { describe, expect, it } from 'vitest';
import { campaignBlocks, canUsePaidDesign, hexToHsl, validateLandingImage } from '@/lib/landingCampaignDesign';

describe('campaign landing design', () => {
  it('only enables paid design after a confirmed entitlement', () => {
    expect(canUsePaidDesign(false, true)).toBe(true);
    expect(canUsePaidDesign(false, false)).toBe(false);
    expect(canUsePaidDesign(true, true)).toBe(false);
  });
  it('preserves company campaign subject and body as text', () => {
    const blocks = campaignBlocks('Acme product', '<script>not HTML</script>', 'launch');
    expect(blocks[0]).toMatchObject({ type: 'heading', text: 'Acme product' });
    expect(blocks[1]).toMatchObject({ type: 'text', text: '<script>not HTML</script>' });
    expect(blocks[2]).toMatchObject({ type: 'cta', label: 'Explore the product' });
  });
  it('maps chosen colors into scoped theme tokens', () => {
    expect(hexToHsl('#ff0000')).toBe('0 100% 50%');
    expect(hexToHsl('url(bad)')).toBeUndefined();
  });
  it('accepts image uploads, not arbitrary files', () => {
    expect(validateLandingImage({ size: 100, type: 'image/png' })).toBeNull();
    expect(validateLandingImage({ size: 100, type: 'text/html' })).not.toBeNull();
  });
});