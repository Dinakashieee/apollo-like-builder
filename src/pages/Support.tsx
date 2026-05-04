import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { LifeBuoy, Send } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { z } from "zod";

const schema = z.object({
  subject: z.string().trim().min(3).max(150),
  message: z.string().trim().min(10).max(2000),
});

const STATUS_STYLES = {
  open: "bg-warm/10 text-warm",
  in_progress: "bg-primary/10 text-primary",
  resolved: "bg-success/10 text-success",
} as const;

export default function Support() {
  const { user } = useAuth();
  const { current } = useWorkspace();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [tickets, setTickets] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("tickets")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setTickets(data ?? []);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ subject, message });
    if (!parsed.success) {
      toast({ title: "Invalid", description: parsed.error.errors[0].message, variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("tickets").insert({
      user_id: user!.id,
      workspace_id: current?.id ?? null,
      subject: parsed.data.subject,
      message: parsed.data.message,
    });
    setSubmitting(false);
    if (error) {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Ticket submitted", description: "We'll respond within 24h." });
    setSubject("");
    setMessage("");
    load();
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in max-w-3xl">
      <div>
        <h1 className="text-3xl lg:text-4xl font-display font-bold text-primary-deep flex items-center gap-2">
          <LifeBuoy className="h-7 w-7 text-primary" /> Support
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Get help from our team. Most tickets answered within 24h. You can also email us at{" "}
          <a href="mailto:support@engageiqlk.com" className="text-primary font-medium underline-offset-2 hover:underline">
            support@engageiqlk.com
          </a>{" "}or call{" "}
          <a href="tel:+94777263673" className="text-primary font-medium underline-offset-2 hover:underline">
            +94 77 726 3673
          </a>.
        </p>
        <p className="text-xs text-muted-foreground mt-1">EngageIQ · HQ: 275 New North Road, Islington #1772, London, N1 7AA, UK · R&amp;D: Colombo 10350, Sri Lanka</p>
      </div>

      <form onSubmit={submit} className="card-elevated p-6 space-y-4">
        <div>
          <Label>Subject</Label>
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} className="mt-1" required />
        </div>
        <div>
          <Label>Message</Label>
          <Textarea
            rows={5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="mt-1"
            placeholder="Describe what's happening..."
            required
          />
        </div>
        <Button type="submit" disabled={submitting} className="bg-gradient-primary shadow-glow">
          <Send className="h-4 w-4 mr-2" /> {submitting ? "Sending..." : "Submit ticket"}
        </Button>
      </form>

      {tickets.length > 0 && (
        <section>
          <h2 className="font-display font-bold text-lg text-primary-deep mb-3">Your tickets</h2>
          <div className="space-y-2">
            {tickets.map((t) => (
              <div key={t.id} className="card-elevated p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <p className="font-semibold text-sm text-primary-deep">{t.subject}</p>
                  <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${STATUS_STYLES[t.status as keyof typeof STATUS_STYLES]}`}>
                    {t.status.replace("_", " ")}
                  </span>
                </div>
                <p className="text-sm text-foreground/85">{t.message}</p>
                <p className="text-[11px] text-muted-foreground mt-2">
                  {formatDistanceToNow(new Date(t.created_at), { addSuffix: true })}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
