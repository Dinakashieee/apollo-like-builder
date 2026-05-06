import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useWorkspace } from "@/hooks/useWorkspace";
import { Bell, CalendarClock, Check, Loader2, X, Mail } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "@/hooks/use-toast";

interface Reminder {
  id: string;
  due_at: string;
  note: string | null;
  status: string;
  source: string;
  lead_id: string | null;
  source_message_id: string | null;
}

interface Scheduled {
  id: string;
  to_email: string;
  subject: string | null;
  scheduled_for: string;
  status: string;
}

export default function Reminders() {
  const { current } = useWorkspace();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [scheduled, setScheduled] = useState<Scheduled[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    if (!current) return;
    setLoading(true);
    const [r, s] = await Promise.all([
      supabase.from("follow_up_reminders").select("*").eq("workspace_id", current.id).order("due_at"),
      supabase.from("scheduled_emails").select("id, to_email, subject, scheduled_for, status").eq("workspace_id", current.id).order("scheduled_for"),
    ]);
    setReminders((r.data as any) ?? []);
    setScheduled((s.data as any) ?? []);
    setLoading(false);
  };

  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [current?.id]);

  const update = async (id: string, status: string) => {
    await supabase.from("follow_up_reminders").update({ status }).eq("id", id);
    toast({ title: status === "done" ? "Marked done" : "Dismissed" });
    refresh();
  };

  const cancel = async (id: string) => {
    await supabase.from("scheduled_emails").update({ status: "canceled" }).eq("id", id);
    refresh();
  };

  if (loading) return <div className="p-8 flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <header>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Bell className="h-6 w-6" /> Follow-ups & Scheduled</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Reminders auto-detected from inbound replies (e.g. "get back to me on the 25th") and emails you've scheduled to send later.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Follow-up reminders</h2>
        {reminders.length === 0 && <Card className="p-6 text-sm text-muted-foreground">No reminders yet.</Card>}
        {reminders.map((r) => {
          const overdue = new Date(r.due_at) < new Date() && r.status === "pending";
          return (
            <Card key={r.id} className="p-4 flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <CalendarClock className="h-4 w-4 text-primary" />
                  <span className="font-medium text-sm">{format(new Date(r.due_at), "PPP p")}</span>
                  {overdue && <Badge variant="destructive" className="text-[10px]">Overdue</Badge>}
                  {r.status !== "pending" && <Badge variant="outline" className="text-[10px] capitalize">{r.status}</Badge>}
                  {r.source === "auto" && <Badge variant="outline" className="text-[10px]">AI-detected</Badge>}
                </div>
                <p className="text-sm text-foreground/80">{r.note}</p>
                <p className="text-[11px] text-muted-foreground">{formatDistanceToNow(new Date(r.due_at), { addSuffix: true })}</p>
              </div>
              {r.status === "pending" && (
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => update(r.id, "done")}><Check className="h-3 w-3" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => update(r.id, "dismissed")}><X className="h-3 w-3" /></Button>
                </div>
              )}
            </Card>
          );
        })}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Scheduled emails</h2>
        {scheduled.length === 0 && <Card className="p-6 text-sm text-muted-foreground">No scheduled emails.</Card>}
        {scheduled.map((s) => (
          <Card key={s.id} className="p-4 flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Mail className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm truncate">{s.subject || "(no subject)"}</span>
                <Badge variant="outline" className="text-[10px] capitalize">{s.status}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">To: {s.to_email}</p>
              <p className="text-[11px] text-muted-foreground">Send {format(new Date(s.scheduled_for), "PPP p")}</p>
            </div>
            {s.status === "pending" && (
              <Button size="sm" variant="ghost" onClick={() => cancel(s.id)}>Cancel</Button>
            )}
          </Card>
        ))}
      </section>
    </div>
  );
}
