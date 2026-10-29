import { useEffect, useState } from "react";
import { Send, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useEmailSendingState } from "@/hooks/useEmailSendingState";
import { landingLink, listRecipients, outreachBody, mailDraftUrl, type OutreachLead, type OutreachPage } from "@/lib/leadListOutreach";
import { toast } from "@/hooks/use-toast";

export function LeadListOutreach({ leads, subject, body, mailClient }: { leads: OutreachLead[]; subject: string; body: string; mailClient: string }) {
  const { current } = useWorkspace();
  const [pages, setPages] = useState<OutreachPage[]>([]);
  const [mode, setMode] = useState("email");
  const [sharedPage, setSharedPage] = useState("");
  const [individualPages, setIndividualPages] = useState<Record<string, string>>({});
  const [excluded, setExcluded] = useState<string[]>([]);
  const [opened, setOpened] = useState<string[]>([]);
  const [preview, setPreview] = useState<string | null>(null);
  const { paused } = useEmailSendingState();
  useEffect(() => {
    setPages([]);
    if (!current) return;
    let active = true;
    supabase.from("landing_pages").select("id, title, slug, published, custom_domain, custom_path").eq("workspace_id", current.id).eq("published", true).order("title").then(({ data, error }) => {
      if (!active) return;
      if (error) toast({ title: "Could not load landing pages", variant: "destructive" });
      else setPages(data ?? []);
    });
    return () => { active = false; };
  }, [current?.id]);
  const recipients = listRecipients(leads);
  const chosen = recipients.filter(l => !excluded.includes(l.id));
  const getPage = (id: string) => pages.find(page => page.id === id);
  const draftBody = (lead: OutreachLead) => {
    const page = getPage(mode === "shared" ? sharedPage : individualPages[lead.id]);
    return outreachBody(body, lead, mode !== "email" && page ? landingLink(page, window.location.origin) : undefined);
  };
  const ready = (lead: OutreachLead) => !!subject.trim() && !!body.trim() && !paused && (mode === "email" || !!getPage(mode === "shared" ? sharedPage : individualPages[lead.id]));
  function openDraft(lead: OutreachLead) {
    if (!lead.email || !ready(lead)) return;
    const url = mailDraftUrl(mailClient, lead.email, subject, draftBody(lead));
    if (mailClient === "default") window.location.href = url;
    else window.open(url, "_blank", "noopener,noreferrer");
    setOpened(ids => [...new Set([...ids, lead.id])]);
  }
  return <section className="border-t pt-6 space-y-4">
    <div className="flex justify-between gap-3 flex-wrap"><h2 className="font-semibold text-lg">List recipients · {chosen.length}</h2><Button asChild variant="outline" size="sm"><Link to="/app/pages"><ExternalLink className="h-4 w-4 mr-2" />Landing pages</Link></Button></div>
    <div className="grid sm:grid-cols-2 gap-3">
      <div><Label>Content</Label><Select value={mode} onValueChange={setMode}><SelectTrigger className="mt-1" aria-label="List outreach content"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="email">Email only</SelectItem><SelectItem value="shared">Same landing page for everyone</SelectItem><SelectItem value="individual">Individual landing pages</SelectItem></SelectContent></Select></div>
      {mode === "shared" && <div><Label>Published landing page</Label><Select value={sharedPage} onValueChange={setSharedPage}><SelectTrigger className="mt-1" aria-label="Shared landing page"><SelectValue placeholder="Select a page" /></SelectTrigger><SelectContent>{pages.map(page => <SelectItem key={page.id} value={page.id}>{page.title}</SelectItem>)}</SelectContent></Select></div>}
    </div>
    {mode !== "email" && pages.length === 0 && <p className="text-sm text-muted-foreground">No published landing pages available.</p>}
    <p className="text-sm text-muted-foreground">Drafts open individually in your mail client; delivery is not confirmed here. List outreach does not use app emails.</p>
    {leads.length !== recipients.length && <p className="text-sm text-warning">{leads.length - recipients.length} missing, invalid or duplicate email addresses excluded.</p>}
    {paused && <p className="text-sm text-destructive">Your sending break is active. Resume sending to open drafts.</p>}
    <div className="divide-y">
      {recipients.map(lead => <div key={lead.id} className="py-3 space-y-2">
        <div className="flex items-center gap-3 flex-wrap">
          <Checkbox aria-label={`Include ${lead.contact_name || lead.company_name}`} checked={!excluded.includes(lead.id)} onCheckedChange={checked => setExcluded(ids => checked ? ids.filter(id => id !== lead.id) : [...ids, lead.id])} />
          <div className="flex-1 min-w-0"><p className="text-sm font-semibold">{lead.contact_name || lead.company_name}</p><p className="text-xs text-muted-foreground break-all">{lead.email}</p></div>
          {mode === "individual" && <Select value={individualPages[lead.id] || ""} onValueChange={id => setIndividualPages(values => ({ ...values, [lead.id]: id }))}><SelectTrigger className="w-52" aria-label={`Landing page for ${lead.contact_name || lead.company_name}`}><SelectValue placeholder="Select a page" /></SelectTrigger><SelectContent>{pages.map(page => <SelectItem key={page.id} value={page.id}>{page.title}</SelectItem>)}</SelectContent></Select>}
          <Button variant="ghost" size="sm" onClick={() => setPreview(preview === lead.id ? null : lead.id)}>Preview</Button>
          <Button variant="outline" size="sm" disabled={!ready(lead) || excluded.includes(lead.id)} onClick={() => openDraft(lead)}><Send className="h-4 w-4 mr-2" />{opened.includes(lead.id) ? "Open again" : "Open draft"}</Button>
        </div>
        {preview === lead.id && <div className="bg-muted p-4 rounded-lg"><p className="font-semibold text-sm mb-2">{subject}</p><p className="text-sm whitespace-pre-wrap break-words">{draftBody(lead)}</p></div>}
      </div>)}
      {recipients.length === 0 && <p className="text-sm text-muted-foreground py-6">No recipients with an email address in this list.</p>}
    </div>
  </section>;
}