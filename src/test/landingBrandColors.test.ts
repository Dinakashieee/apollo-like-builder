import { describe, expect, it } from 'vitest';
import { isMatchedPalette, isValidCompanyUrl } from '@/lib/landingBrandColors';

describe('AI brand color matching', () => {
  it('accepts bare domains and full URLs', () => {
    expect(isValidCompanyUrl('acme.com')).toBe(true);
    expect(isValidCompanyUrl('https://www.acme.com/about')).toBe(true);
    expect(isValidCompanyUrl('not a url')).toBe(false);
  });
  it('only accepts complete 6-digit hex palettes', () => {
    expect(isMatchedPalette({ accent: '#2d8a9e', colors: { background: '#f5fafa', text: '#0c2340', surface: '#1a4a6e' } })).toBe(true);
    expect(isMatchedPalette({ accent: '#2d8a9e', colors: { background: 'blue', text: '#0c2340', surface: '#1a4a6e' } })).toBe(false);
    expect(isMatchedPalette({ accent: '#2d8a9e', colors: { background: '#f5fafa', text: '#0c2340' } })).toBe(false);
    expect(isMatchedPalette(null)).toBe(false);
  });
});
