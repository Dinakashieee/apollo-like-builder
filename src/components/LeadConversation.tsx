import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Mail, ArrowDownLeft, ArrowUpRight, Sparkles, Flame, Snowflake, Sun, Minus, Clock, CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { ScheduleReplyDialog } from "./ScheduleReplyDialog";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useAuth } from "@/hooks/useAuth";

interface Message {
  id: string;
  thread_id: string;
  direction: "inbound" | "outbound";
  from_email: string;
  from_name: string | null;
  to_emails: string[];
  subject: string | null;
  snippet: string | null;
  body_text: string | null;
  sent_at: string;
  reply_temperature: "hot" | "warm" | "cold" | "neutral" | null;
  reply_intent: string | null;
  reply_summary: string | null;
  suggested_next_step: string | null;
  analysis_confidence: number | null;
  analyzed_at: string | null;
}

interface Thread {
  id: string;
  subject: string | null;
  participants: string[];
  last_message_at: string;
}

const TEMP_STYLES: Record<string, { cls: string; icon: typeof Flame; label: string }> = {
  hot: { cls: "bg-hot/15 text-hot border-hot/30", icon: Flame, label: "Hot" },
  warm: { cls: "bg-warm/15 text-warm border-warm/30", icon: Sun, label: "Warm" },
  cold: { cls: "bg-primary/15 text-primary border-primary/30", icon: Snowflake, label: "Cold" },
  neutral: { cls: "bg-muted text-muted-foreground border-border", icon: Minus, label: "Neutral" },
};

export function LeadConversation({ leadId }: { leadId: string }) {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [messagesByThread, setMessagesByThread] = useState<Record<string, Message[]>>({});
  const [loading, setLoading] = useState(true);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [extractingId, setExtractingId] = useState<string | null>(null);
  const [scheduleFor, setScheduleFor] = useState<Message | null>(null);
  const { current } = useWorkspace();
  const { user } = useAuth();

  const refresh = async () => {
    setLoading(true);
    const { data: t } = await supabase
      .from("email_threads")
      .select("id, subject, participants, last_message_at")
      .eq("lead_id", leadId)
      .order("last_message_at", { ascending: false });
    const ts = (t as Thread[]) ?? [];
    setThreads(ts);
    if (ts.length === 0) {
      setMessagesByThread({});
      setLoading(false);
      return;
    }
    const { data: m } = await supabase
      .from("email_messages")
      .select(
        "id, thread_id, direction, from_email, from_name, to_emails, subject, snippet, body_text, sent_at, reply_temperature, reply_intent, reply_summary, suggested_next_step, analysis_confidence, analyzed_at",
      )
      .in("thread_id", ts.map((x) => x.id))
      .order("sent_at", { ascending: true });
    const grouped: Record<string, Message[]> = {};
    for (const row of (m as Message[]) ?? []) {
      (grouped[row.thread_id] ??= []).push(row);
    }
    setMessagesByThread(grouped);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
    const channel = supabase
      .channel(`lead-conv-${leadId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "email_messages" },
        () => refresh(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadId]);

  const analyze = async (msg: Message) => {
    setAnalyzingId(msg.id);
    const { error } = await supabase.functions.invoke("analyze-reply", {
      body: { messageId: msg.id },
    });
    setAnalyzingId(null);
    if (error) {
      toast({ title: "Analysis failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Reply analyzed" });
    refresh();
  };

  const detectFollowup = async (msg: Message) => {
    setExtractingId(msg.id);
    const { data, error } = await supabase.functions.invoke("extract-followup-date", {
      body: { messageId: msg.id },
    });
    setExtractingId(null);
    if (error) return toast({ title: "Detection failed", description: error.message, variant: "destructive" });
    if ((data as any)?.found) toast({ title: "Reminder created", description: `Due ${new Date((data as any).due_at).toLocaleString()}` });
    else toast({ title: "No follow-up date found" });
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground p-4">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading conversation…
      </div>
    );
  }

  if (threads.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        <Mail className="h-6 w-6 mx-auto mb-2 opacity-50" />
        No emails with this lead yet. Once you connect a company mailbox or send via a sequence, the full thread (and any replies) will land here.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-[11px] text-primary-deep flex items-start gap-2">
        <Sparkles className="h-3.5 w-3.5 mt-0.5 text-primary shrink-0" />
        <span>
          <strong>Heads up:</strong> AI reply analysis (warm / cold / next step) only fills in
          after you click <em>Analyze</em> on an inbound reply, or once a real reply syncs in
          from a connected Gmail / Outlook mailbox. Until then those badges stay empty.
        </span>
      </div>
      {threads.map((th) => {
        const msgs = messagesByThread[th.id] ?? [];
        return (
          <div key={th.id} className="rounded-xl border border-border/60 overflow-hidden">
            <div className="px-4 py-3 bg-muted/40 border-b border-border/60">
              <p className="font-semibold text-sm text-primary-deep truncate">
                {th.subject || "(no subject)"}
              </p>
              <p className="text-[11px] text-muted-foreground truncate">
                {th.participants.join(", ")} · last activity{" "}
                {formatDistanceToNow(new Date(th.last_message_at), { addSuffix: true })}
              </p>
            </div>
            <div className="divide-y divide-border/60">
              {msgs.map((m) => {
                const inbound = m.direction === "inbound";
                const tempStyle = m.reply_temperature ? TEMP_STYLES[m.reply_temperature] : null;
                const TempIcon = tempStyle?.icon;
                return (
                  <div key={m.id} className={`p-4 space-y-2 ${inbound ? "bg-primary/[0.03]" : ""}`}>
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 text-xs">
                        {inbound ? (
                          <ArrowDownLeft className="h-3.5 w-3.5 text-success" />
                        ) : (
                          <ArrowUpRight className="h-3.5 w-3.5 text-primary" />
                        )}
                        <span className="font-medium text-primary-deep">
                          {m.from_name || m.from_email}
                        </span>
                        <span className="text-muted-foreground">
                          {inbound ? "replied" : "sent"} ·{" "}
                          {formatDistanceToNow(new Date(m.sent_at), { addSuffix: true })}
                        </span>
                      </div>
                      {inbound && tempStyle && TempIcon && (
                        <Badge variant="outline" className={`text-[10px] gap-1 ${tempStyle.cls}`}>
                          <TempIcon className="h-3 w-3" />
                          {tempStyle.label}
                          {m.reply_intent && (
                            <span className="opacity-70 normal-case">
                              · {m.reply_intent.replace(/_/g, " ")}
                            </span>
                          )}
                        </Badge>
                      )}
                    </div>
                    {m.subject && m.subject !== th.subject && (
                      <p className="text-xs font-medium">{m.subject}</p>
                    )}
                    <p className="text-sm whitespace-pre-line text-foreground/90 line-clamp-6">
                      {m.body_text || m.snippet || "(no content)"}
                    </p>

                    {inbound && (
                      <div className="mt-2 rounded-lg border border-primary/20 bg-gradient-to-br from-primary/5 to-warm/5 p-3 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-1">
                            <Sparkles className="h-3 w-3" /> AI reply analysis
                          </p>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 text-[11px]"
                            onClick={() => analyze(m)}
                            disabled={analyzingId === m.id}
                          >
                            {analyzingId === m.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : m.analyzed_at ? (
                              "Re-analyze"
                            ) : (
                              "Analyze"
                            )}
                          </Button>
                        </div>
                        {m.reply_summary ? (
                          <>
                            <p className="text-xs text-foreground/90">{m.reply_summary}</p>
                            {m.suggested_next_step && (
                              <p className="text-xs">
                                <span className="font-semibold text-primary-deep">Next step → </span>
                                <span className="text-foreground/80">{m.suggested_next_step}</span>
                              </p>
                            )}
                          </>
                        ) : (
                          <p className="text-xs text-muted-foreground italic">
                            Not analyzed yet — click "Analyze" to score this reply.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
