import { Link } from 'react-router-dom';
import { Linkedin, ShieldCheck, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface DecisionMaker {
  full_name: string;
  role: string;
  linkedin_url: string;
  why_selected?: string;
  source_url?: string;
  publication_year?: number | null;
}

export function DecisionMakerPreview({ contacts, company }: { contacts: DecisionMaker[]; company: string }) {
  return <div className="space-y-3">
    <p className="text-xs text-warning flex items-start gap-2"><ShieldCheck className="h-4 w-4 shrink-0" /> Verify the person’s identity, current role and company on LinkedIn before approaching. Contact details are not yet claimed.</p>
    {contacts.length === 0 && <p className="text-xs text-muted-foreground">Decision-makers not found in the sources checked.</p>}
    {contacts.map((contact) => <div key={contact.linkedin_url} className="border-b border-border pb-3 space-y-1.5">
      <p className="text-sm font-semibold">{contact.full_name}</p>
      <p className="text-xs text-muted-foreground">{contact.role} · {company}</p>
      <p className="text-xs"><span className="font-semibold">Why considered: </span>{contact.why_selected || 'Suggested role match; current authority has not been verified.'}</p>
      <div className="flex flex-wrap items-center gap-3">
        <a href={contact.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary inline-flex items-center gap-1"><Linkedin className="h-3 w-3" /> Verify on LinkedIn</a>
        {contact.source_url && <a href={contact.source_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary">Role source · {contact.publication_year ?? 'Year unavailable'}</a>}
        <Button size="sm" variant="outline" asChild><Link to={`/app/signalhire?${new URLSearchParams({ name: contact.full_name, company, role: contact.role, linkedin: contact.linkedin_url })}`}><ExternalLink className="mr-1 h-3 w-3" /> Claim details with SignalHire</Link></Button>
      </div>
    </div>)}
  </div>;
}