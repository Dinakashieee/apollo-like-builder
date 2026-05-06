import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, MessageCircle, Send, Sparkles, ExternalLink, AlertTriangle, Check } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

interface Lead {
  id: string;
  contact_name: string | null;
  phone: string | null;
  whatsapp_phone: string | null;
}

interface WAMsg {
  id: string;
  direction: "inbound" | "outbound";
  phone: string;
  body: string;
  phone_matches_lead: boolean;
  sent_via: string | null;
  sent_at: string;
}

const norm = (p: string) => (p ?? "").replace(/[^\d+]/g, "");

export function WhatsAppPanel({ leadId }: { leadId: string }) {
  const [lead, setLead] = useState<Lead | null>(null);
  const [msgs, setMsgs] = useState<WAMsg[]>([]);
  const [phone, setPhone] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [savingPhone, setSavingPhone] = useState(false);

  const refresh = async () => {
    const { data: l } = await supabase
      .from("leads")
      .select("id, contact_name, phone, whatsapp_phone")
      .eq("id", leadId)
      .maybeSingle();
    setLead(l as any);
    setPhone((l as any)?.whatsapp_phone || (l as any)?.phone || "");
    const { data: m } = await supabase
      .from("whatsapp_messages")
      .select("id, direction, phone, body, phone_matches_lead, sent_via, sent_at")
      .eq("lead_id", leadId)
      .order("sent_at", { ascending: true });
    setMsgs((m as any) ?? []);
  };

  useEffect(() => {
    refresh();
    const ch = supabase
      .channel(`wa-${leadId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "whatsapp_messages" }, () => refresh())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadId]);

  const savePhone = async () => {
    setSavingPhone(true);
    await supabase.from("leads").update({ whatsapp_phone: phone }).eq("id", leadId);
    setSavingPhone(false);
    toast({ title: "WhatsApp number saved" });
    refresh();
  };

  const lastInbound = [...msgs].reverse().find((m) => m.direction === "inbound");
  const suggest = async () => {
    setSuggesting(true);
    const { data, error } = await supabase.functions.invoke("suggest-reply", {
      body: { channel: "whatsapp", leadId, context: lastInbound?.body || `Lead: ${lead?.contact_name}` },
    });
    setSuggesting(false);
    if (error) return toast({ title: "Failed to suggest", description: error.message, variant: "destructive" });
    if (data?.suggestion?.body) setBody(data.suggestion.body);
  };

  const targetMatches = (() => {
    if (!phone) return false;
    const t = norm(phone);
    const stored = [norm(lead?.whatsapp_phone || ""), norm(lead?.phone || "")].filter(Boolean);
    return stored.some((s) => s === t || s.endsWith(t.slice(-9)) || t.endsWith(s.slice(-9)));
  })();

  const sendVia = async (mode: "twilio" | "click_to_chat") => {
    if (!phone || !body) return toast({ title: "Phone & message required", variant: "destructive" });
    setSending(true);
    const { data, error } = await supabase.functions.invoke("whatsapp-send", {
      body: { leadId, phone, body, mode },
    });
    setSending(false);
    if (error) return toast({ title: "Send failed", description: error.message, variant: "destructive" });
    if (mode === "click_to_chat") {
      const wa = `https://wa.me/${norm(phone).replace(/^\+/, "")}?text=${encodeURIComponent(body)}`;
      window.open(wa, "_blank");
    }
    toast({ title: data?.sent_via === "twilio" ? "WhatsApp sent" : "Logged & opened in WhatsApp" });
    setBody("");
    refresh();
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border p-3 space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Lead WhatsApp number</p>
        <div className="flex gap-2">
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 555 123 4567" />
          <Button size="sm" variant="outline" onClick={savePhone} disabled={savingPhone}>Save</Button>
        </div>
        <p className="text-[11px] text-muted-foreground">
          We only confirm a WhatsApp chat if the number you send to matches the number on file for this lead.
        </p>
      </div>

      <div className="rounded-xl border max-h-[300px] overflow-y-auto divide-y">
        {msgs.length === 0 && (
          <div className="p-6 text-center text-sm text-muted-foreground">
            <MessageCircle className="h-6 w-6 mx-auto mb-2 opacity-50" />
            No WhatsApp messages yet.
          </div>
        )}
        {msgs.map((m) => (
          <div key={m.id} className={`p-3 text-sm ${m.direction === "outbound" ? "bg-primary/5" : ""}`}>
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-[11px] text-muted-foreground">
                {m.direction} · {m.phone} · {formatDistanceToNow(new Date(m.sent_at), { addSuffix: true })}
              </span>
              {m.phone_matches_lead ? (
                <Badge variant="outline" className="text-[10px] text-success border-success/30"><Check className="h-3 w-3 mr-1" />verified</Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] text-warm border-warm/30"><AlertTriangle className="h-3 w-3 mr-1" />unverified number</Badge>
              )}
            </div>
            <p className="whitespace-pre-line">{m.body}</p>
          </div>
        ))}
      </div>

      <div className="rounded-lg border p-3 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Compose</p>
          <Button size="sm" variant="ghost" onClick={suggest} disabled={suggesting}>
            {suggesting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
            <span className="ml-1 text-xs">Suggest best reply</span>
          </Button>
        </div>
        <Textarea rows={4} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Type your WhatsApp message…" />
        {!targetMatches && phone && (
          <p className="text-[11px] text-warm flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" /> This number doesn't match the lead's saved number — send anyway?
          </p>
        )}
        <div className="flex gap-2">
          <Button size="sm" onClick={() => sendVia("twilio")} disabled={sending}>
            <Send className="h-3 w-3 mr-1" /> Send via Twilio
          </Button>
          <Button size="sm" variant="outline" onClick={() => sendVia("click_to_chat")}>
            <ExternalLink className="h-3 w-3 mr-1" /> Open in WhatsApp
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground">
          Twilio sending requires the WhatsApp Business API add-on (paid). Without it, use "Open in WhatsApp" — we still log the message.
        </p>
      </div>
    </div>
  );
}
