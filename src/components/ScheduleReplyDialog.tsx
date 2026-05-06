import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Loader2, Sparkles } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  workspaceId: string;
  userId: string;
  leadId?: string;
  threadId?: string;
  defaultTo?: string;
  defaultSubject?: string;
  contextBody?: string;
}

export function ScheduleReplyDialog({ open, onOpenChange, workspaceId, userId, leadId, threadId, defaultTo, defaultSubject, contextBody }: Props) {
  const [to, setTo] = useState(defaultTo ?? "");
  const [subject, setSubject] = useState(defaultSubject ? `Re: ${defaultSubject}` : "");
  const [body, setBody] = useState("");
  const [sendVia, setSendVia] = useState("connected");
  const [whenLocal, setWhenLocal] = useState(() => {
    const d = new Date(Date.now() + 60 * 60 * 1000);
    d.setSeconds(0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [saving, setSaving] = useState(false);
  const [suggesting, setSuggesting] = useState(false);

  const suggest = async () => {
    setSuggesting(true);
    const { data, error } = await supabase.functions.invoke("suggest-reply", {
      body: { channel: "email", leadId, context: contextBody ?? subject },
    });
    setSuggesting(false);
    if (error) return toast({ title: "Suggest failed", description: error.message, variant: "destructive" });
    if (data?.suggestion?.subject) setSubject(data.suggestion.subject);
    if (data?.suggestion?.body) setBody(data.suggestion.body);
  };

  const save = async () => {
    if (!to || !body || !whenLocal) return toast({ title: "Fill all required fields", variant: "destructive" });
    setSaving(true);
    const { error } = await supabase.from("scheduled_emails").insert({
      workspace_id: workspaceId,
      user_id: userId,
      lead_id: leadId ?? null,
      thread_id: threadId ?? null,
      send_via: sendVia,
      to_email: to,
      subject,
      body,
      scheduled_for: new Date(whenLocal).toISOString(),
    });
    setSaving(false);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    toast({ title: "Reply scheduled" });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Schedule email reply</DialogTitle>
          <DialogDescription>Compose now, send later — automatically at the time you choose.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>To</Label>
            <Input value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div>
            <Label>Subject</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label>Message</Label>
              <Button size="sm" variant="ghost" onClick={suggest} disabled={suggesting}>
                {suggesting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                <span className="ml-1 text-xs">Suggest best reply</span>
              </Button>
            </div>
            <Textarea rows={6} value={body} onChange={(e) => setBody(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Send at</Label>
              <Input type="datetime-local" value={whenLocal} onChange={(e) => setWhenLocal(e.target.value)} />
            </div>
            <div>
              <Label>Send via</Label>
              <Select value={sendVia} onValueChange={setSendVia}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="connected">Connected mailbox (Gmail/Outlook)</SelectItem>
                  <SelectItem value="builtin">Built-in sender</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Schedule"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
