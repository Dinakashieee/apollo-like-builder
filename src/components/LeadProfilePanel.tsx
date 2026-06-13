import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  Mail, Phone, MessageCircle, Linkedin, Building2, MapPin, Briefcase,
  AlertTriangle, Server, Wrench, FileText, Sparkles, CheckCircle2,
  LayoutTemplate, Eye, MousePointerClick, ExternalLink,
} from "lucide-react";

interface Lead {
  id: string;
  company_name: string;
  contact_name?: string | null;
  role?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsapp_phone?: string | null;
  industry?: string | null;
  country?: string | null;
  notes?: string | null;
  pain_points?: string[] | null;
  systems_in_use?: string[] | null;
  tools?: string[] | null;
  linkedin_company_url?: string | null;
}

export function LeadProfilePanel({
  lead,
  ownedMatches,
  onOpenIntelligence,
}: {
  lead: Lead;
  ownedMatches: string[];
  onOpenIntelligence: () => void;
}) {
  const contactLinkedInSearch = lead.contact_name
    ? `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(
        `${lead.contact_name} ${lead.company_name}`,
      )}`
    : null;

  return (
    <div className="space-y-5">
      {/* Header card */}
      <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-semibold text-primary-deep">
              <Building2 className="h-4 w-4" />
              {lead.company_name}
            </div>
            {lead.contact_name && (
              <div className="text-sm text-foreground/90 mt-1">{lead.contact_name}</div>
            )}
            {lead.role && (
              <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <Briefcase className="h-3 w-3" /> {lead.role}
              </div>
            )}
          </div>
          {ownedMatches.length > 0 && (
            <Badge className="bg-success/15 text-success border border-success/30 hover:bg-success/15">
              <CheckCircle2 className="h-3 w-3 mr-1" /> Existing user
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
          {lead.industry && (
            <Info icon={Building2} label="Industry" value={lead.industry} />
          )}
          {lead.country && <Info icon={MapPin} label="Country" value={lead.country} />}
          {lead.email && <Info icon={Mail} label="Email" value={lead.email} />}
          {lead.phone && <Info icon={Phone} label="Phone" value={lead.phone} />}
          {lead.whatsapp_phone && (
            <Info icon={MessageCircle} label="WhatsApp" value={lead.whatsapp_phone} />
          )}
        </div>

        <div className="flex flex-wrap gap-2 mt-3">
          {lead.linkedin_company_url && (
            <a href={lead.linkedin_company_url} target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="outline" className="h-7 text-xs">
                <Linkedin className="h-3 w-3 mr-1" /> Company LinkedIn
              </Button>
            </a>
          )}
          {contactLinkedInSearch && (
            <a href={contactLinkedInSearch} target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="outline" className="h-7 text-xs">
                <Linkedin className="h-3 w-3 mr-1" /> Find contact on LinkedIn
              </Button>
            </a>
          )}
        </div>
      </div>

      {/* Existing user of YOUR products */}
      {ownedMatches.length > 0 && (
        <Section
          icon={CheckCircle2}
          title="Already using your products / systems"
          tone="success"
        >
          <div className="flex flex-wrap gap-1.5">
            {ownedMatches.map((m) => (
              <Badge key={m} className="bg-success/15 text-success border border-success/30 hover:bg-success/15">
                {m}
              </Badge>
            ))}
          </div>
        </Section>
      )}

      {/* Pain points */}
      <Section icon={AlertTriangle} title="Pain points">
        {lead.pain_points && lead.pain_points.length > 0 ? (
          <ul className="space-y-1.5">
            {lead.pain_points.map((p, i) => (
              <li key={i} className="text-sm text-foreground/90 flex gap-2">
                <span className="text-primary mt-1">•</span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
        ) : (
          <Empty text="No pain points recorded. Generate intelligence to discover likely pains." />
        )}
      </Section>

      {/* Systems in use */}
      <Section icon={Server} title="Systems they use today">
        {lead.systems_in_use && lead.systems_in_use.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {lead.systems_in_use.map((s) => (
              <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
            ))}
          </div>
        ) : (
          <Empty text="No systems on file." />
        )}
      </Section>

      {/* Other tools */}
      {lead.tools && lead.tools.length > 0 && (
        <Section icon={Wrench} title="Other tools / tags">
          <div className="flex flex-wrap gap-1.5">
            {lead.tools.map((t) => (
              <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
            ))}
          </div>
        </Section>
      )}

      {/* Notes */}
      {lead.notes && (
        <Section icon={FileText} title="Notes">
          <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
            {lead.notes}
          </p>
        </Section>
      )}

      {/* Landing pages linked to this lead */}
      <LandingPagesForLead leadId={lead.id} />

      {/* Talking points CTA → Intelligence tab */}
      <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
        <div className="flex items-start gap-2">
          <Sparkles className="h-4 w-4 text-primary mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-primary-deep">
              Talking points & ICP fit
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              See AI-generated opening angles, contact fit, and what to say when emailing
              this lead.
            </p>
            <Button size="sm" className="mt-3 h-7 text-xs" onClick={onOpenIntelligence}>
              <Sparkles className="h-3 w-3 mr-1" /> Open Intelligence
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Info({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-start gap-1.5 min-w-0">
      <Icon className="h-3 w-3 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="text-xs text-foreground/90 truncate">{value}</div>
      </div>
    </div>
  );
}

function Section({
  icon: Icon, title, tone, children,
}: { icon: any; title: string; tone?: "success"; children: React.ReactNode }) {
  return (
    <div>
      <p className={`text-[11px] font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5 ${tone === "success" ? "text-success" : "text-muted-foreground"}`}>
        <Icon className="h-3.5 w-3.5" /> {title}
      </p>
      {children}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-xs text-muted-foreground italic">{text}</p>;
}

function LandingPagesForLead({ leadId }: { leadId: string }) {
  const [items, setItems] = useState<Array<{ id: string; title: string; slug: string; published: boolean; views: number; clicks: number }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: pages } = await supabase
        .from("landing_pages")
        .select("id,title,slug,published")
        .eq("lead_id", leadId)
        .order("created_at", { ascending: false });
      if (cancelled) return;
      const list = pages || [];
      if (list.length === 0) {
        setItems([]); setLoading(false); return;
      }
      const ids = list.map((p: any) => p.id);
      const { data: views } = await supabase
        .from("landing_page_views")
        .select("page_id,cta_clicked")
        .in("page_id", ids);
      const counts = new Map<string, { v: number; c: number }>();
      (views || []).forEach((v: any) => {
        const cur = counts.get(v.page_id) || { v: 0, c: 0 };
        cur.v += 1;
        if (v.cta_clicked) cur.c += 1;
        counts.set(v.page_id, cur);
      });
      setItems(list.map((p: any) => ({
        ...p,
        views: counts.get(p.id)?.v || 0,
        clicks: counts.get(p.id)?.c || 0,
      })));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [leadId]);

  if (loading) return null;

  return (
    <Section icon={LayoutTemplate} title="Landing pages">
      {items.length === 0 ? (
        <Empty text="No personalized landing pages linked to this lead yet." />
      ) : (
        <div className="space-y-1.5">
          {items.map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-md border border-border/60 px-2.5 py-2 text-xs">
              <div className="min-w-0 flex-1">
                <div className="font-medium truncate">{p.title}</div>
                <div className="text-muted-foreground truncate">/p/{p.slug}</div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant={p.published ? "default" : "secondary"} className="h-5 text-[10px]">
                  {p.published ? "Live" : "Draft"}
                </Badge>
                <span className="flex items-center gap-0.5 text-muted-foreground" title="Views">
                  <Eye className="h-3 w-3" /> {p.views}
                </span>
                <span className="flex items-center gap-0.5 text-muted-foreground" title="CTA clicks">
                  <MousePointerClick className="h-3 w-3" /> {p.clicks}
                </span>
                <a href={`/p/${p.slug}`} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground">
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}
