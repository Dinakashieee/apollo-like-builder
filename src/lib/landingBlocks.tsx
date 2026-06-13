import DOMPurify from "dompurify";

export type BlockStyle = "primary" | "secondary" | "outline";

export type Block =
  | { id: string; type: "heading"; text: string; level?: 1 | 2 | 3; align?: "left" | "center" }
  | { id: string; type: "text"; text: string; align?: "left" | "center" }
  | { id: string; type: "image"; url: string; alt?: string; rounded?: boolean }
  | { id: string; type: "video"; url: string }
  | { id: string; type: "cta"; label: string; url: string; style: BlockStyle; align?: "left" | "center" }
  | { id: string; type: "html"; html: string }
  | { id: string; type: "divider" }
  | { id: string; type: "spacer"; size?: "sm" | "md" | "lg" };

export function newBlock(type: Block["type"]): Block {
  const id = crypto.randomUUID();
  switch (type) {
    case "heading": return { id, type, text: "New heading", level: 2, align: "left" };
    case "text": return { id, type, text: "Write something compelling here.", align: "left" };
    case "image": return { id, type, url: "", alt: "", rounded: true };
    case "video": return { id, type, url: "" };
    case "cta": return { id, type, label: "Get started", url: "https://", style: "primary", align: "left" };
    case "html": return { id, type, html: "<p>Custom HTML</p>" };
    case "divider": return { id, type };
    case "spacer": return { id, type, size: "md" };
  }
}

export function interpolate(s: string | undefined | null, vars: { name?: string | null; company?: string | null }) {
  if (!s) return "";
  return s
    .replace(/\{name\}/gi, vars.name || "there")
    .replace(/\{company\}/gi, vars.company || "your company");
}

export function ctaStyle(style: BlockStyle, accent: string, onDark = false): React.CSSProperties {
  if (style === "primary") return { background: accent, color: "#fff", border: `1px solid ${accent}` };
  if (style === "secondary") return onDark
    ? { background: "#fff", color: "#0f172a", border: "1px solid #fff" }
    : { background: "#0f172a", color: "#fff", border: "1px solid #0f172a" };
  return { background: "transparent", color: onDark ? "#fff" : accent, border: `1px solid ${onDark ? "#fff" : accent}` };
}

function toEmbed(url: string): string {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com")) {
      const id = u.searchParams.get("v");
      if (id) return `https://www.youtube.com/embed/${id}`;
    }
    if (u.hostname === "youtu.be") return `https://www.youtube.com/embed${u.pathname}`;
    if (u.hostname.includes("vimeo.com")) {
      const id = u.pathname.split("/").filter(Boolean).pop();
      if (id) return `https://player.vimeo.com/video/${id}`;
    }
    return url;
  } catch {
    return url;
  }
}

export function sanitize(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ["a","b","i","em","strong","u","p","br","ul","ol","li","span","div","h1","h2","h3","h4","img","blockquote","code","pre","hr","small","sup","sub","table","thead","tbody","tr","td","th"],
    ALLOWED_ATTR: ["href","src","alt","title","class","style","target","rel"],
    ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|tel:|#)/i,
  });
}

export function renderBlock(
  b: Block,
  opts: { accent: string; onDark?: boolean; vars: { name?: string | null; company?: string | null }; onCta?: (url: string, idx: number) => void; ctaIndex?: number }
): React.ReactNode {
  const { accent, onDark, vars } = opts;
  switch (b.type) {
    case "heading": {
      const cls = `font-bold tracking-tight ${b.align === "center" ? "text-center" : ""} ${b.level === 1 ? "text-4xl md:text-5xl" : b.level === 3 ? "text-xl md:text-2xl" : "text-2xl md:text-3xl"}`;
      const text = interpolate(b.text, vars);
      const style = { color: onDark ? "#fff" : accent };
      if (b.level === 1) return <h1 className={cls} style={style}>{text}</h1>;
      if (b.level === 3) return <h3 className={cls} style={style}>{text}</h3>;
      return <h2 className={cls} style={style}>{text}</h2>;
    }
    case "text":
      return <p className={`whitespace-pre-wrap leading-relaxed ${b.align === "center" ? "text-center" : ""} ${onDark ? "text-white/85" : "text-foreground/85"}`}>{interpolate(b.text, vars)}</p>;
    case "image":
      return b.url ? <img src={b.url} alt={b.alt || ""} className={`w-full h-auto ${b.rounded ? "rounded-lg" : ""}`} loading="lazy" /> : null;
    case "video":
      return b.url ? (
        <div className="relative w-full aspect-video">
          <iframe src={toEmbed(b.url)} title="video" className="absolute inset-0 w-full h-full rounded-lg" frameBorder={0} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
        </div>
      ) : null;
    case "cta": {
      const wrap = b.align === "center" ? "flex justify-center" : "flex";
      return (
        <div className={wrap}>
          <button
            type="button"
            onClick={() => opts.onCta?.(b.url, opts.ctaIndex ?? 0)}
            className="px-6 py-3 rounded-md text-base font-medium hover:opacity-90 transition-opacity"
            style={ctaStyle(b.style, accent, onDark)}
          >
            {interpolate(b.label, vars) || "Button"}
          </button>
        </div>
      );
    }
    case "html":
      return <div className={`prose prose-sm max-w-none ${onDark ? "prose-invert" : ""}`} dangerouslySetInnerHTML={{ __html: sanitize(b.html) }} />;
    case "divider":
      return <hr className={onDark ? "border-white/20" : "border-border"} />;
    case "spacer": {
      const h = b.size === "lg" ? "h-16" : b.size === "sm" ? "h-4" : "h-8";
      return <div className={h} />;
    }
  }
}

export const BLOCK_LABELS: Record<Block["type"], string> = {
  heading: "Heading",
  text: "Text",
  image: "Image",
  video: "Video",
  cta: "CTA button",
  html: "Custom HTML",
  divider: "Divider",
  spacer: "Spacer",
};
