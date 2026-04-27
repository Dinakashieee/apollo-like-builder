import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { CheckCircle2, Loader2 } from "lucide-react";
import { z } from "zod";

const schema = z.object({
  full_name: z.string().trim().min(2, "Name is required").max(120),
  business_name: z.string().trim().min(2, "Business name is required").max(160),
  designation: z.string().trim().min(2, "Designation is required").max(120),
  email: z.string().trim().email("Enter a valid office email").max(180),
  mobile: z
    .string()
    .trim()
    .min(7, "Mobile number is required")
    .max(25, "Mobile number is too long")
    .regex(/^[+\d][\d\s().-]*$/, "Use digits, spaces, +, -, ()"),
  notes: z.string().trim().max(1000).optional(),
});

interface WaitlistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WaitlistDialog({ open, onOpenChange }: WaitlistDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    business_name: "",
    designation: "",
    email: "",
    mobile: "",
    notes: "",
  });

  const reset = () => {
    setForm({
      full_name: "",
      business_name: "",
      designation: "",
      email: "",
      mobile: "",
      notes: "",
    });
    setSuccess(false);
  };

  const handleClose = (next: boolean) => {
    if (!next) {
      // Reset shortly after close so the dialog content doesn't flash
      setTimeout(reset, 200);
    }
    onOpenChange(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast({
        title: "Please check the form",
        description: parsed.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("waitlist_signups").insert({
      full_name: parsed.data.full_name,
      business_name: parsed.data.business_name,
      designation: parsed.data.designation,
      email: parsed.data.email.toLowerCase(),
      mobile: parsed.data.mobile,
      notes: parsed.data.notes || null,
    });
    setSubmitting(false);
    if (error) {
      toast({
        title: "Could not submit",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    setSuccess(true);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        {success ? (
          <div className="py-6 text-center space-y-4">
            <div className="mx-auto h-14 w-14 rounded-full bg-success/10 flex items-center justify-center">
              <CheckCircle2 className="h-7 w-7 text-success" />
            </div>
            <DialogHeader>
              <DialogTitle className="text-center text-2xl font-display">
                You're on the list!
              </DialogTitle>
              <DialogDescription className="text-center">
                Thanks for your interest in EngageIQ. Our team will reach out
                shortly with next steps.
              </DialogDescription>
            </DialogHeader>
            <Button onClick={() => handleClose(false)} className="bg-gradient-primary">
              Close
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl font-display">Join the waitlist</DialogTitle>
              <DialogDescription>
                Tell us a bit about you. We'll grant access in the order requests come in.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="wl-name">Full name *</Label>
                  <Input
                    id="wl-name"
                    value={form.full_name}
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                    placeholder="Jane Doe"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="wl-business">Business name *</Label>
                  <Input
                    id="wl-business"
                    value={form.business_name}
                    onChange={(e) => setForm({ ...form, business_name: e.target.value })}
                    placeholder="Acme Inc."
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="wl-designation">Designation *</Label>
                <Input
                  id="wl-designation"
                  value={form.designation}
                  onChange={(e) => setForm({ ...form, designation: e.target.value })}
                  placeholder="VP of Sales"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="wl-email">Office email *</Label>
                  <Input
                    id="wl-email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="jane@acme.com"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="wl-mobile">Mobile number *</Label>
                  <Input
                    id="wl-mobile"
                    type="tel"
                    value={form.mobile}
                    onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                    placeholder="+1 555 123 4567"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="wl-notes">Notes (optional)</Label>
                <Textarea
                  id="wl-notes"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={3}
                  placeholder="Team size, what you're trying to solve, current tools..."
                />
              </div>

              <DialogFooter>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-gradient-primary shadow-glow w-full sm:w-auto"
                >
                  {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Request access
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
