import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planLabel?: string;
}

export function JoinWaitlistDialog({ open, onOpenChange, planLabel }: Props) {
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    business_name: "",
    designation: "",
    email: "",
    mobile: "",
    notes: "",
  });

  useEffect(() => {
    if (open) {
      setDone(false);
      setForm((f) => ({
        ...f,
        email: f.email || user?.email || "",
        full_name: f.full_name || (user?.user_metadata as any)?.full_name || "",
        notes: planLabel ? `Interested in: ${planLabel}` : f.notes,
      }));
    }
  }, [open, user, planLabel]);

  const update = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name || !form.business_name || !form.designation || !form.email || !form.mobile) {
      toast.error("Please fill in all required fields.");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("waitlist_signups").insert({
      full_name: form.full_name.trim(),
      business_name: form.business_name.trim(),
      designation: form.designation.trim(),
      email: form.email.trim().toLowerCase(),
      mobile: form.mobile.trim(),
      notes: form.notes.trim() || null,
    });
    setSubmitting(false);
    if (error) {
      toast.error("Could not join waitlist. Please try again.");
      return;
    }
    setDone(true);
    toast.success("You're on the waitlist!");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Join the waitlist</DialogTitle>
          <DialogDescription>
            Subscriptions are temporarily invite-only. Drop your details and we'll reach out as soon as a spot opens
            {planLabel ? ` for ${planLabel}` : ""}.
          </DialogDescription>
        </DialogHeader>

        {done ? (
          <div className="py-6 text-center space-y-3">
            <CheckCircle2 className="h-12 w-12 text-primary mx-auto" />
            <p className="font-semibold">You're on the list.</p>
            <p className="text-sm text-muted-foreground">We'll email you as soon as a seat opens up.</p>
            <Button onClick={() => onOpenChange(false)} className="mt-2">Close</Button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="wl-name">Full name *</Label>
                <Input id="wl-name" value={form.full_name} onChange={update("full_name")} required />
              </div>
              <div>
                <Label htmlFor="wl-title">Designation *</Label>
                <Input id="wl-title" value={form.designation} onChange={update("designation")} required />
              </div>
            </div>
            <div>
              <Label htmlFor="wl-biz">Business name *</Label>
              <Input id="wl-biz" value={form.business_name} onChange={update("business_name")} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="wl-email">Email *</Label>
                <Input id="wl-email" type="email" value={form.email} onChange={update("email")} required />
              </div>
              <div>
                <Label htmlFor="wl-mobile">Mobile *</Label>
                <Input id="wl-mobile" value={form.mobile} onChange={update("mobile")} required />
              </div>
            </div>
            <div>
              <Label htmlFor="wl-notes">Notes</Label>
              <Textarea id="wl-notes" value={form.notes} onChange={update("notes")} rows={2} />
            </div>
            <Button type="submit" disabled={submitting} className="w-full bg-gradient-primary">
              {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Join the waitlist
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
