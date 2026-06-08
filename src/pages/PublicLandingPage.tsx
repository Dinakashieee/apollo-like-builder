import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

type CTA = { label: string; url: string; style: "primary" | "secondary" | "outline" };
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
  ctas: CTA[];
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

function ctaStyle(s: CTA["style"], accent: string, onDark = false): React.CSSProperties {
  if (s === "primary") return { background: accent, color: "#fff", border: `1px solid ${accent}` };
  if (s === "secondary") return onDark
    ? { background: "#fff", color: "#0f172a", border: "1px solid #fff" }
    : { background: "#0f172a", color: "#fff", border: "1px solid #0f172a" };
  return { background: "transparent", color: onDark ? "#fff" : accent, border: `1px solid ${onDark ? "#fff" : accent}` };
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
        .select("id,template,title,prospect_name,prospect_company,headline,subheadline,body,cta_label,cta_url,ctas,logo_url,accent_color")
        .eq("slug", slug)
        .eq("published", true)
        .maybeSingle();
      const p = data ? ({ ...(data as any), ctas: Array.isArray((data as any).ctas) ? (data as any).ctas : [] } as Page) : null;
      setPage(p);
      setLoading(false);
      if (p) {
        document.title = p.title;
        const { data: view } = await supabase
          .from("landing_page_views")
          .insert({
            page_id: p.id,
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
      supabase.rpc("track_landing_view", {
        _view_id: viewIdRef.current,
        _visitor_id: visitorId(),
        _duration_ms: duration,
        _cta_clicked: null,
        _cta_index: null,
      });
    };
    window.addEventListener("beforeunload", send);
    const i = setInterval(send, 15000);
    return () => {
      window.removeEventListener("beforeunload", send);
      clearInterval(i);
      send();
    };
  }, []);

  const onCta = async (cta: CTA, idx: number) => {
    if (viewIdRef.current) {
      await supabase.rpc("track_landing_view", {
        _view_id: viewIdRef.current,
        _visitor_id: visitorId(),
        _duration_ms: Date.now() - startRef.current,
        _cta_clicked: true,
        _cta_index: idx,
      });
    }
    if (cta.url) window.open(cta.url, "_blank");
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  if (!page) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Page not found</div>;

  const accent = page.accent_color || "#6366f1";
  const headline = interpolate(page.headline, page);
  const sub = interpolate(page.subheadline, page);
  const body = interpolate(page.body, page);

  // Backwards-compat: if no ctas array but legacy single CTA exists
  const ctas: CTA[] = page.ctas?.length
    ? page.ctas
    : page.cta_label && page.cta_url
    ? [{ label: page.cta_label, url: page.cta_url, style: "primary" }]
    : [];

  const CtaRow = ({ onDark = false }: { onDark?: boolean }) => (
    <div className="flex flex-wrap gap-3">
      {ctas.map((c, i) => (
        <button
          key={i}
          onClick={() => onCta(c, i)}
          className="px-6 py-3 rounded-md text-base font-medium hover:opacity-90 transition-opacity"
          style={ctaStyle(c.style, accent, onDark)}
        >
          {interpolate(c.label, page)}
        </button>
      ))}
    </div>
  );

  if (page.template === "bold") {
    return (
      <div className="min-h-screen" style={{ background: `linear-gradient(135deg, ${accent} 0%, #0f172a 100%)` }}>
        <div className="max-w-3xl mx-auto px-6 py-24 text-white">
          {page.logo_url && <img src={page.logo_url} alt="" className="h-10 mb-12" />}
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">{headline}</h1>
          <p className="text-xl text-white/80 mb-8">{sub}</p>
          <div className="whitespace-pre-wrap text-white/90 mb-10 leading-relaxed">{body}</div>
          <CtaRow onDark />
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
          <CtaRow />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-6 py-20">
        {page.logo_url && <img src={page.logo_url} alt="" className="h-10 mb-10" />}
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4" style={{ color: accent }}>
          {headline}
        </h1>
        <p className="text-lg text-muted-foreground mb-8">{sub}</p>
        <div className="whitespace-pre-wrap text-foreground/85 leading-relaxed mb-10">{body}</div>
        <CtaRow />
      </div>
    </div>
  );
}
