import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import DOMPurify from "dompurify";
import { Plus, Save, Trash2, PenLine, Check, Mail } from "lucide-react";
import { usePersonalSignatures } from "@/hooks/usePersonalSignatures";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";

export function PersonalSignatureManager() {
  const { user } = useAuth();
  const query = usePersonalSignatures();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["personal-signatures", user?.id] });
  const act = async (task: () => Promise<void>) => {
    setBusy(true);
    try { await task(); await invalidate(); } catch (e) { toast({ title: "Couldn't save signatures", description: e instanceof Error ? e.message : "Please try again.", variant: "destructive" }); }
    finally { setBusy(false); }
  };
  const setDefault = async (id: string | null) => {
    if (!user) return;
    const { error } = await supabase.from("profiles").update({ default_email_signature_id: id }).eq("id", user.id);
    if (error) throw error;
  };
  return <section id="email-signatures" className="space-y-4 border-y border-border py-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-display font-bold text-lg text-primary-deep flex items-center gap-2"><Mail className="h-4 w-4 text-primary" />Your email signatures</h2>
      <Button variant="outline" size="sm" disabled={busy} onClick={() => { setEditing("new"); setName(""); setContent(""); }}><Plus className="h-4 w-4 mr-2" />New signature</Button></div>
    {query.isError && <p role="alert" className="text-sm text-destructive">Your signatures couldn't load.</p>}
    {query.data?.signatures.map(s => <div key={s.id} className="flex flex-wrap items-center gap-2 border-b border-border/60 py-3">
      <p className="flex-1 min-w-0 text-sm font-semibold break-words">{s.name}{query.data.defaultId === s.id && <span className="ml-2 text-xs text-success">Default</span>}</p>
      <Button size="sm" variant="ghost" disabled={busy} onClick={() => void act(() => setDefault(s.id))}><Check className="h-3.5 w-3.5 mr-1.5" />Set default</Button>
      <Button size="icon" variant="ghost" aria-label={`Edit ${s.name}`} title="Edit signature" disabled={busy} onClick={() => { setEditing(s.id); setName(s.name); setContent(s.content); }}><PenLine className="h-4 w-4" /></Button>
      <Button size="icon" variant="ghost" aria-label={`Delete ${s.name}`} title="Delete signature" disabled={busy} onClick={() => {
        if (!window.confirm(`Delete signature “${s.name}”?`)) return;
        void act(async () => { if (!user) return; if (query.data?.defaultId === s.id) await setDefault(null); const { error } = await supabase.from("email_signatures").delete().eq("id", s.id).eq("user_id", user.id); if (error) throw error; if (editing === s.id) setEditing(null); });
      }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
    </div>)}
    {!query.isLoading && !query.data?.signatures.length && <p className="text-sm text-muted-foreground">No saved signatures yet.</p>}
    {editing && <div className="space-y-3">
      <div><Label htmlFor="signature-name">Signature name</Label><Input id="signature-name" value={name} maxLength={80} onChange={e => setName(e.target.value)} placeholder="Work, Sales, Events…" /></div>
      <div><Label htmlFor="signature-content">Signature text or HTML</Label><Textarea id="signature-content" value={content} maxLength={20000} onChange={e => setContent(e.target.value)} rows={6} placeholder="Your name, job title, company and contact details" /></div>
      <div><p className="text-xs font-semibold mb-2">Preview</p><div className="min-h-20 border-l-2 border-primary pl-4 text-sm whitespace-pre-wrap break-words" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content, { FORBID_TAGS: ["style", "iframe", "form", "input", "script"], FORBID_ATTR: ["style"] }) }} /></div>
      <div className="flex gap-2"><Button disabled={busy || !name.trim() || !content.trim()} onClick={() => void act(async () => {
        if (!user) return;
        const payload = { name: name.trim(), content: content.trim(), user_id: user.id };
        const result = editing === "new" ? await supabase.from("email_signatures").insert(payload).select("id").single() : await supabase.from("email_signatures").update(payload).eq("id", editing).eq("user_id", user.id).select("id").single();
        if (result.error) throw result.error;
        if (!query.data?.signatures.length) await setDefault(result.data.id);
        setEditing(null); toast({ title: "Signature saved" });
      })}><Save className="h-4 w-4 mr-2" />Save signature</Button><Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button></div>
    </div>}
  </section>;
}