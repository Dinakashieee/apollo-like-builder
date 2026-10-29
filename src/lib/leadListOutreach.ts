export type OutreachLead = { id: string; company_name: string; contact_name: string | null; email: string | null };
export type OutreachPage = { id: string; slug: string; title: string; published: boolean; custom_domain: string | null; custom_path: string | null };

export function landingLink(page: OutreachPage, origin: string) {
  if (!page.published) throw new Error("Publish the landing page first.");
  if (page.custom_domain) return `https://${page.custom_domain}`;
  return `${origin}/${page.custom_path || "p"}/${page.slug}`;
}

export function listRecipients(leads: OutreachLead[]) {
  const seen = new Set<string>();
  return leads.filter(lead => {
    const email = lead.email?.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || seen.has(email)) return false;
    seen.add(email);
    return true;
  });
}

export function outreachBody(body: string, lead: OutreachLead, pageLink?: string) {
  const text = body.split("{{name}}").join(lead.contact_name || lead.company_name).split("{{company}}").join(lead.company_name);
  return pageLink ? `${text.trim()}\n\n${pageLink}`.trim() : text;
}

export function mailDraftUrl(client: string, email: string, subject: string, body: string) {
  const to = encodeURIComponent(email.trim());
  const su = encodeURIComponent(subject);
  const bd = encodeURIComponent(body);
  if (client === "gmail") return `https://mail.google.com/mail/?view=cm&fs=1&to=${to}&su=${su}&body=${bd}`;
  if (client === "outlook") return `https://outlook.live.com/mail/0/deeplink/compose?to=${to}&subject=${su}&body=${bd}`;
  return `mailto:${to}?subject=${su}&body=${bd}`;
}