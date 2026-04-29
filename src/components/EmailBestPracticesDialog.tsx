import { useEffect, useState } from "react";
import { ShieldCheck, CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Link } from "react-router-dom";

const STORAGE_KEY = "engageiq:email-best-practices-ack-v1";

interface Props {
  /** When true, force-open regardless of localStorage (used by manual "Tips" button). */
  open?: boolean;
  onOpenChange?: (o: boolean) => void;
}

export function EmailBestPracticesDialog({ open: controlledOpen, onOpenChange }: Props) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [dontShow, setDontShow] = useState(true);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;

  useEffect(() => {
    if (isControlled) return;
    try {
      const acked = localStorage.getItem(STORAGE_KEY);
      if (!acked) setInternalOpen(true);
    } catch {
      setInternalOpen(true);
    }
  }, [isControlled]);

  const handleClose = (next: boolean) => {
    if (!next && dontShow && !isControlled) {
      try {
        localStorage.setItem(STORAGE_KEY, new Date().toISOString());
      } catch {}
    }
    if (isControlled) onOpenChange?.(next);
    else setInternalOpen(next);
  };

  const tips = [
    {
      title: "Include a clear unsubscribe option",
      body: "Every outreach email must contain a working, easy-to-find unsubscribe link or instructions. Required by CAN-SPAM, GDPR, CASL, and PECR.",
    },
    {
      title: "Identify yourself accurately",
      body: "Use your real name, real company, and a truthful subject line. Never use deceptive 'From' addresses or misleading subjects.",
    },
    {
      title: "Include a valid postal address",
      body: "CAN-SPAM and CASL require a physical mailing address (or PO box) in every commercial email.",
    },
    {
      title: "Have a lawful basis for contact",
      body: "Only email recipients with consent, an existing business relationship, or a documented legitimate-interest basis (GDPR/UK GDPR).",
    },
    {
      title: "Honour opt-outs immediately",
      body: "Process unsubscribe requests promptly (within 10 business days under CAN-SPAM) and never email that contact again for that purpose.",
    },
    {
      title: "Send one-to-one, not bulk blasts",
      body: "EngageIQ is a sales-enablement tool. Review and personalise every email — do not use it for unsolicited mass mailing.",
    },
    {
      title: "Keep your contact data accurate",
      body: "Only contact people you have the right to email. Remove bounced and complained addresses promptly.",
    },
    {
      title: "B2B only",
      body: "Do not send to consumers (B2C) without the explicit consent required in their jurisdiction.",
    },
  ];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <DialogTitle className="text-xl">Email best practices & compliance</DialogTitle>
          </div>
          <DialogDescription>
            Before you send, please follow these essentials. <strong>You</strong> are the data
            controller and are legally responsible for the messages you send through EngageIQ —
            see{" "}
            <Link to="/terms" className="underline" target="_blank" rel="noopener noreferrer">
              Terms §5
            </Link>
            .
          </DialogDescription>
        </DialogHeader>

        <ul className="space-y-3 mt-2">
          {tips.map((t) => (
            <li key={t.title} className="flex gap-3">
              <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm">{t.title}</p>
                <p className="text-sm text-muted-foreground">{t.body}</p>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-4 rounded-md border border-border/60 bg-muted/40 p-3 text-xs text-muted-foreground">
          Applicable laws include <strong>GDPR, UK GDPR, CAN-SPAM, CASL, ePrivacy/PECR, CCPA, PIPEDA, and LGPD</strong>.
          Violations can result in account suspension and personal liability.
        </div>

        <DialogFooter className="mt-4 flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {!isControlled && (
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <Checkbox
                checked={dontShow}
                onCheckedChange={(v) => setDontShow(v === true)}
              />
              Don't show this again
            </label>
          )}
          <Button onClick={() => handleClose(false)}>I understand</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
