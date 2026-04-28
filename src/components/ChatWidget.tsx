import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";
import { toast } from "@/hooks/use-toast";

type Msg = { role: "user" | "assistant"; content: string };

type Props = {
  mode: "support" | "assistant";
};

const GREETINGS: Record<Props["mode"], string> = {
  support:
    "👋 Hi! I'm EngageIQ's assistant. Ask me about features, pricing, or how to get started.",
  assistant:
    "👋 Hey! I can help you prioritize leads, draft outreach ideas, and reason about your pipeline. What's on your mind?",
};

export function ChatWidget({ mode }: Props) {
  const { user } = useAuth();
  const { current } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: GREETINGS[mode] },
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open]);

  // Don't render assistant mode if no workspace/user
  if (mode === "assistant" && (!user || !current)) return null;

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
          ? { messages: next.filter((m) => m.role !== "assistant" || messages.indexOf(m) > 0) }
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
              {mode === "support" ? "Ask anything about the product" : "Powered by your workspace data"}
            </p>
          </div>

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
        </div>
      )}
    </>
  );
}
