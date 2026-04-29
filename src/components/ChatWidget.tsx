import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";
import { toast } from "@/hooks/use-toast";

type Msg = { role: "user" | "assistant"; content: string };

type Props = {
  mode: "support" | "assistant";
};

type VisitorInfo = {
  name: string;
  business: string;
  email: string;
};

const VISITOR_KEY = "engageiq_support_visitor";

const visitorSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Max 100 characters"),
  business: z.string().trim().min(1, "Business name is required").max(150, "Max 150 characters"),
  email: z.string().trim().email("Enter a valid email").max(255, "Max 255 characters"),
});

const greeting = (mode: Props["mode"], visitor?: VisitorInfo) => {
  if (mode === "assistant") {
    return "👋 Hey! I can help you prioritize leads, draft outreach ideas, and reason about your pipeline. What's on your mind?";
  }
  if (visitor) {
    return `👋 Hi ${visitor.name}! Thanks for reaching out from ${visitor.business}. Ask me anything about EngageIQ — features, pricing, or getting started.`;
  }
  return "👋 Hi! I'm EngageIQ's assistant. Ask me about features, pricing, or how to get started.";
};

export function ChatWidget({ mode }: Props) {
  const { user } = useAuth();
  const { current } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  // Pre-chat form (support mode only)
  const [visitor, setVisitor] = useState<VisitorInfo | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem(VISITOR_KEY);
      return raw ? (JSON.parse(raw) as VisitorInfo) : null;
    } catch {
      return null;
    }
  });
  const [form, setForm] = useState<VisitorInfo>({ name: "", business: "", email: "" });
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof VisitorInfo, string>>>({});

  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: greeting(mode, visitor ?? undefined) },
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open]);

  // Don't render assistant mode if no workspace/user
  if (mode === "assistant" && (!user || !current)) return null;

  const showPreChatForm = mode === "support" && !visitor;

  const submitPreChat = (e: React.FormEvent) => {
    e.preventDefault();
    const result = visitorSchema.safeParse(form);
    if (!result.success) {
      const errs: Partial<Record<keyof VisitorInfo, string>> = {};
      result.error.issues.forEach((i) => {
        const k = i.path[0] as keyof VisitorInfo;
        if (!errs[k]) errs[k] = i.message;
      });
      setFormErrors(errs);
      return;
    }
    const v: VisitorInfo = {
      name: result.data.name,
      business: result.data.business,
      email: result.data.email,
    };
    setVisitor(v);
    try {
      localStorage.setItem(VISITOR_KEY, JSON.stringify(v));
    } catch {
      /* ignore */
    }
    setMessages([{ role: "assistant", content: greeting("support", v) }]);
    setFormErrors({});
  };

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    const userMsg: Msg = { role: "user", content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setBusy(true);

    try {
      const url =
        mode === "support"
          ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/support-chat`
          : `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/assistant-chat`;

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      };
      if (mode === "assistant") {
        const { data } = await import("@/integrations/supabase/client").then((m) =>
          m.supabase.auth.getSession()
        );
        if (data.session?.access_token) {
          headers.Authorization = `Bearer ${data.session.access_token}`;
        }
      }

      const body =
        mode === "support"
          ? {
              messages: next.filter((m) => m.role !== "assistant" || messages.indexOf(m) > 0),
              visitor: visitor ?? undefined,
            }
          : { messages: next, workspace_id: current?.id };

      const resp = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });

      if (!resp.ok) {
        let errMsg = `Error ${resp.status}`;
        try {
          const j = await resp.json();
          errMsg = j.error ?? errMsg;
        } catch {
          /* ignore */
        }
        if (resp.status === 402) {
          toast({
            title: "AI quota reached",
            description: errMsg + " Upgrade in Settings → Billing.",
            variant: "destructive",
          });
        } else {
          toast({ title: "Chat error", description: errMsg, variant: "destructive" });
        }
        setMessages((prev) => [...prev, { role: "assistant", content: `⚠️ ${errMsg}` }]);
        return;
      }

      if (!resp.body) throw new Error("No stream");
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assistantText = "";
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, nl);
          buffer = buffer.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") break;
          try {
            const parsed = JSON.parse(json);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              assistantText += delta;
              setMessages((prev) =>
                prev.map((m, i) =>
                  i === prev.length - 1 ? { ...m, content: assistantText } : m
                )
              );
            }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }
    } catch (e: any) {
      toast({ title: "Chat failed", description: e?.message ?? "Try again", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-5 right-5 z-50 h-14 w-14 rounded-full bg-gradient-primary shadow-glow flex items-center justify-center text-primary-foreground hover:scale-105 transition-transform"
        aria-label="Open chat"
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>

      {open && (
        <div className="fixed bottom-24 right-5 z-50 w-[360px] max-w-[calc(100vw-2.5rem)] h-[520px] max-h-[calc(100vh-8rem)] bg-card border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden animate-fade-in">
          <div className="px-4 py-3 border-b border-border bg-gradient-primary text-primary-foreground">
            <p className="font-display font-bold text-sm">
              {mode === "support" ? "EngageIQ Support" : "AI Assistant"}
            </p>
            <p className="text-xs opacity-80">
              {mode === "support"
                ? visitor
                  ? `Chatting as ${visitor.name}`
                  : "Tell us a bit about you to start"
                : "Powered by your workspace data"}
            </p>
          </div>

          {showPreChatForm ? (
            <form onSubmit={submitPreChat} className="flex-1 overflow-y-auto p-4 space-y-3">
              <p className="text-sm text-muted-foreground">
                Before we start, please share a few details so we can help you better.
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="pc-name">Your name</Label>
                <Input
                  id="pc-name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Jane Doe"
                  maxLength={100}
                  autoComplete="name"
                />
                {formErrors.name && (
                  <p className="text-xs text-destructive">{formErrors.name}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pc-business">Business name</Label>
                <Input
                  id="pc-business"
                  value={form.business}
                  onChange={(e) => setForm((f) => ({ ...f, business: e.target.value }))}
                  placeholder="Acme Inc."
                  maxLength={150}
                  autoComplete="organization"
                />
                {formErrors.business && (
                  <p className="text-xs text-destructive">{formErrors.business}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pc-email">Business email</Label>
                <Input
                  id="pc-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="jane@acme.com"
                  maxLength={255}
                  autoComplete="email"
                />
                {formErrors.email && (
                  <p className="text-xs text-destructive">{formErrors.email}</p>
                )}
              </div>
              <Button type="submit" className="w-full">
                Start chat
              </Button>
              <p className="text-[11px] text-muted-foreground text-center">
                We use this only to follow up on your inquiry.
              </p>
            </form>
          ) : (
            <>
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((m, i) => (
                  <div
                    key={i}
                    className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                        m.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground"
                      }`}
                    >
                      {m.role === "assistant" ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1">
                          <ReactMarkdown>{m.content || "…"}</ReactMarkdown>
                        </div>
                      ) : (
                        m.content
                      )}
                    </div>
                  </div>
                ))}
                {busy && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" /> thinking…
                  </div>
                )}
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  send();
                }}
                className="p-3 border-t border-border flex gap-2"
              >
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={mode === "support" ? "Ask about pricing, features…" : "Ask about your leads…"}
                  disabled={busy}
                  className="flex-1"
                />
                <Button type="submit" size="icon" disabled={busy || !input.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </>
          )}
        </div>
      )}
    </>
  );
}
