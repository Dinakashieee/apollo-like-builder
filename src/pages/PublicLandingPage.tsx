import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

type Page = {
  id: string;
  template: string;
  title: string;
  prospect_name: string | null;
  prospect_company: string | null;
  headline: string | null;
  subheadline: string | null;
  body: string | null;
  cta_label: string | null;
  cta_url: string | null;
  logo_url: string | null;
  accent_color: string | null;
};

function visitorId() {
  const k = "lp_visitor_id";
  let v = localStorage.getItem(k);
  if (!v) {
    v = crypto.randomUUID();
    localStorage.setItem(k, v);
  }
  return v;
}

function interpolate(s: string | null, p: Page) {
  if (!s) return "";
  return s
    .replace(/\{name\}/gi, p.prospect_name || "there")
    .replace(/\{company\}/gi, p.prospect_company || "your company");
}

export default function PublicLandingPage() {
  const { slug } = useParams<{ slug: string }>();
  const [page, setPage] = useState<Page | null>(null);
  const [loading, setLoading] = useState(true);
  const viewIdRef = useRef<string | null>(null);
  const startRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const { data } = await supabase
        .from("landing_pages")
        .select("id,template,title,prospect_name,prospect_company,headline,subheadline,body,cta_label,cta_url,logo_url,accent_color")
        .eq("slug", slug)
        .eq("published", true)
        .maybeSingle();
      setPage(data as Page | null);
      setLoading(false);
      if (data) {
        document.title = (data as Page).title;
        const { data: view } = await supabase
          .from("landing_page_views")
          .insert({
            page_id: (data as Page).id,
            visitor_id: visitorId(),
            referrer: document.referrer || null,
            user_agent: navigator.userAgent,
          })
          .select("id")
          .maybeSingle();
        if (view) viewIdRef.current = (view as any).id;
      }
    })();
  }, [slug]);

  useEffect(() => {
    const send = () => {
      if (!viewIdRef.current) return;
      const duration = Date.now() - startRef.current;
      supabase
        .from("landing_page_views")
        .update({ duration_ms: duration })
        .eq("id", viewIdRef.current);
    };
    window.addEventListener("beforeunload", send);
    const i = setInterval(send, 15000);
    return () => {
      window.removeEventListener("beforeunload", send);
      clearInterval(i);
      send();
    };
  }, []);

  const onCta = async () => {
    if (viewIdRef.current) {
      await supabase
        .from("landing_page_views")
        .update({ cta_clicked: true, duration_ms: Date.now() - startRef.current })
        .eq("id", viewIdRef.current);
    }
    if (page?.cta_url) window.open(page.cta_url, "_blank");
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  if (!page) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Page not found</div>;

  const accent = page.accent_color || "#6366f1";
  const headline = interpolate(page.headline, page);
  const sub = interpolate(page.subheadline, page);
  const body = interpolate(page.body, page);

  if (page.template === "bold") {
    return (
      <div className="min-h-screen" style={{ background: `linear-gradient(135deg, ${accent} 0%, #0f172a 100%)` }}>
        <div className="max-w-3xl mx-auto px-6 py-24 text-white">
          {page.logo_url && <img src={page.logo_url} alt="" className="h-10 mb-12" />}
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">{headline}</h1>
          <p className="text-xl text-white/80 mb-8">{sub}</p>
          <div className="whitespace-pre-wrap text-white/90 mb-10 leading-relaxed">{body}</div>
          {page.cta_label && (
            <Button size="lg" onClick={onCta} className="bg-white text-slate-900 hover:bg-white/90">
              {page.cta_label}
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (page.template === "split") {
    return (
      <div className="min-h-screen grid md:grid-cols-2">
        <div className="p-12 flex flex-col justify-center" style={{ background: accent, color: "white" }}>
          {page.logo_url && <img src={page.logo_url} alt="" className="h-10 mb-8 brightness-0 invert" />}
          <h1 className="text-4xl md:text-5xl font-bold mb-4">{headline}</h1>
          <p className="text-lg text-white/85">{sub}</p>
        </div>
        <div className="p-12 flex flex-col justify-center bg-background">
          <div className="whitespace-pre-wrap text-foreground/80 leading-relaxed mb-8">{body}</div>
          {page.cta_label && (
            <Button size="lg" onClick={onCta} style={{ background: accent }} className="text-white hover:opacity-90 w-fit">
              {page.cta_label}
            </Button>
          )}
        </div>
      </div>
    );
  }

  // minimal default
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-6 py-20">
        {page.logo_url && <img src={page.logo_url} alt="" className="h-10 mb-10" />}
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4" style={{ color: accent }}>
          {headline}
        </h1>
        <p className="text-lg text-muted-foreground mb-8">{sub}</p>
        <div className="whitespace-pre-wrap text-foreground/85 leading-relaxed mb-10">{body}</div>
        {page.cta_label && (
          <Button size="lg" onClick={onCta} style={{ background: accent }} className="text-white hover:opacity-90">
            {page.cta_label}
          </Button>
        )}
      </div>
    </div>
  );
}
