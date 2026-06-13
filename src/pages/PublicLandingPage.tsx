import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Block, renderBlock, interpolate, ctaStyle } from "@/lib/landingBlocks";

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
  blocks: Block[];
  logo_url: string | null;
  accent_color: string | null;
  slug: string;
  custom_path: string | null;
  custom_domain: string | null;
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

interface Props {
  byHost?: boolean;
}

export default function PublicLandingPage({ byHost = false }: Props) {
  const params = useParams<{ slug?: string; prefix?: string }>();
  const slug = byHost ? null : params.slug ?? null;
  const prefix = byHost ? null : params.prefix ?? "p";
  const host = byHost ? window.location.hostname : null;

  const [page, setPage] = useState<Page | null>(null);
  const [loading, setLoading] = useState(true);
  const viewIdRef = useRef<string | null>(null);
  const startRef = useRef<number>(Date.now());

  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc("get_public_landing_page", {
        _slug: slug,
        _host: host,
        _path: prefix,
      });
      const row = Array.isArray(data) ? data[0] : null;
      const p = row ? ({
        ...(row as any),
        ctas: Array.isArray((row as any).ctas) ? (row as any).ctas : [],
        blocks: Array.isArray((row as any).blocks) ? (row as any).blocks : [],
      } as Page) : null;
      setPage(p);
      setLoading(false);
      if (p) {
        document.title = p.title;
        const { data: viewId } = await supabase.rpc("log_landing_view", {
          _slug: p.slug,
          _visitor_id: visitorId(),
          _referrer: document.referrer || null,
          _user_agent: navigator.userAgent,
        });
        if (viewId) viewIdRef.current = viewId as unknown as string;
      }
    })();
  }, [slug, host, prefix]);

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

  const onCta = async (url: string, idx: number) => {
    if (viewIdRef.current) {
      await supabase.rpc("track_landing_view", {
        _view_id: viewIdRef.current,
        _visitor_id: visitorId(),
        _duration_ms: Date.now() - startRef.current,
        _cta_clicked: true,
        _cta_index: idx,
      });
    }
    if (url) window.open(url, "_blank");
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  if (!page) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Page not found</div>;

  const accent = page.accent_color || "#6366f1";
  const vars = { name: page.prospect_name, company: page.prospect_company };
  const onDark = page.template === "bold";

  const legacyCtas: CTA[] = page.ctas?.length
    ? page.ctas
    : page.cta_label && page.cta_url
    ? [{ label: page.cta_label, url: page.cta_url, style: "primary" }]
    : [];

  const hasBlocks = page.blocks && page.blocks.length > 0;

  const containerCls = page.template === "bold"
    ? "max-w-3xl mx-auto px-6 py-20 text-white"
    : "max-w-2xl mx-auto px-6 py-16";
  const wrapperCls = page.template === "bold"
    ? "min-h-screen"
    : "min-h-screen bg-background";
  const wrapperStyle: React.CSSProperties = page.template === "bold"
    ? { background: `linear-gradient(135deg, ${accent} 0%, #0f172a 100%)` }
    : {};

  if (page.template === "split" && !hasBlocks) {
    const headline = interpolate(page.headline, vars);
    const sub = interpolate(page.subheadline, vars);
    const body = interpolate(page.body, vars);
    return (
      <div className="min-h-screen grid md:grid-cols-2">
        <div className="p-12 flex flex-col justify-center" style={{ background: accent, color: "white" }}>
          {page.logo_url && <img src={page.logo_url} alt="" className="h-10 mb-8 brightness-0 invert" />}
          <h1 className="text-4xl md:text-5xl font-bold mb-4">{headline}</h1>
          <p className="text-lg text-white/85">{sub}</p>
        </div>
        <div className="p-12 flex flex-col justify-center bg-background">
          <div className="whitespace-pre-wrap text-foreground/80 leading-relaxed mb-8">{body}</div>
          <div className="flex flex-wrap gap-3">
            {legacyCtas.map((c, i) => (
              <button key={i} onClick={() => onCta(c.url, i)} className="px-6 py-3 rounded-md text-base font-medium hover:opacity-90" style={ctaStyle(c.style, accent, false)}>
                {interpolate(c.label, vars)}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={wrapperCls} style={wrapperStyle}>
      <div className={containerCls}>
        {page.logo_url && <img src={page.logo_url} alt="" className={`h-10 mb-10 ${onDark ? "brightness-0 invert" : ""}`} />}
        {hasBlocks ? (
          <div className="space-y-6">
            {page.blocks.map((b, i) => (
              <div key={b.id}>{renderBlock(b, { accent, onDark, vars, onCta, ctaIndex: i })}</div>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight" style={{ color: onDark ? "#fff" : accent }}>
              {interpolate(page.headline, vars)}
            </h1>
            <p className={`text-lg ${onDark ? "text-white/80" : "text-muted-foreground"}`}>{interpolate(page.subheadline, vars)}</p>
            <div className={`whitespace-pre-wrap leading-relaxed ${onDark ? "text-white/90" : "text-foreground/85"}`}>{interpolate(page.body, vars)}</div>
            <div className="flex flex-wrap gap-3">
              {legacyCtas.map((c, i) => (
                <button key={i} onClick={() => onCta(c.url, i)} className="px-6 py-3 rounded-md text-base font-medium hover:opacity-90" style={ctaStyle(c.style, accent, onDark)}>
                  {interpolate(c.label, vars)}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
