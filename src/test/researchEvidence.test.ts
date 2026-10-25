import { describe, expect, it } from 'vitest';
import { evidenceReferences, publicationYear, supportedQuote, type CheckedSource } from '../../supabase/functions/_shared/research-evidence';

const source: CheckedSource = { title: 'Acme report', url: 'https://acme.com/report', snippet: 'Acme deployed SAP ERP in its finance division in 2024.', type: 'web', publication_year: 2024, checked_at: '2026-10-25T00:00:00Z', verification: 'page_checked' };
describe('Sourced company recommendations', () => {
  it('retains the publication year instead of the retrieval year', () => {
    expect(evidenceReferences([{ url: source.url }], [source])[0].publication_year).toBe(2024);
    expect(publicationYear(undefined)).toBeNull();
  });
  it('rejects invented references', () => {
    expect(evidenceReferences([{ url: 'https://invented.com/report' }], [source])).toEqual([]);
  });
  it('only supports a system claim using checked text for the same company', () => {
    expect(supportedQuote(source, 'Acme deployed SAP ERP in its finance division', 'Acme')).toBe(true);
    expect(supportedQuote({ ...source, verification: 'search_only' }, 'Acme deployed SAP ERP in its finance division', 'Acme')).toBe(false);
    expect(supportedQuote(source, 'Acme deployed Oracle in its finance division', 'Acme')).toBe(false);
    expect(supportedQuote(source, source.snippet, 'Other company')).toBe(false);
  });
});