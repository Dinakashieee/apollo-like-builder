import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Calendar as CalendarIcon, Sparkles, Clock, Users, ShieldCheck, Globe } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Logo } from "@/components/Logo";
import { SeoHead } from "@/components/SeoHead";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const teamSizes = ["Just me", "2–10", "11–50", "51–200", "201–1000", "1000+"];

const perks = [
  { icon: Sparkles, title: "Tailored walkthrough", desc: "We'll show how EngageIQ fits your exact outbound motion." },
  { icon: Clock, title: "30 minutes, zero fluff", desc: "Live product tour with real data, no slideware." },
  { icon: Users, title: "Bring your team", desc: "Invite ops, SDRs, and leadership — we cover every angle." },
  { icon: ShieldCheck, title: "No hard sell", desc: "We answer questions, you decide. Simple." },
];

// 30-min slots from 09:00 to 17:30
const timeSlots = Array.from({ length: 18 }, (_, i) => {
  const h = 9 + Math.floor(i / 2);
  const m = i % 2 === 0 ? "00" : "30";
  return `${String(h).padStart(2, "0")}:${m}`;
});

const POPULAR_TIMEZONES = [
  "Pacific/Honolulu",
  "America/Los_Angeles",
  "America/Denver",
  "America/Chicago",
  "America/New_York",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Istanbul",
  "Africa/Johannesburg",
  "Asia/Dubai",
  "Asia/Karachi",
  "Asia/Kolkata",
  "Asia/Colombo",
  "Asia/Bangkok",
  "Asia/Singapore",
  "Asia/Hong_Kong",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Pacific/Auckland",
  "UTC",
];

function getBrowserTz() {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"; } catch { return "UTC"; }
}

function formatTimeLabel(slot: string) {
  const [h, m] = slot.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export default function Demo() {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const browserTz = useMemo(getBrowserTz, []);
  const tzOptions = useMemo(() => {
    const set = new Set([browserTz, ...POPULAR_TIMEZONES]);
    return Array.from(set);
  }, [browserTz]);

  const [form, setForm] = useState({
    name: "",
    email: "",
    company: "",
    phone: "",
    team_size: "",
    message: "",
  });
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [time, setTime] = useState<string>("");
  const [tz, setTz] = useState<string>(browserTz);
  const [calOpen, setCalOpen] = useState(false);

  const update = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const minDate = useMemo(() => {
    const d = new Date(); d.setHours(0, 0, 0, 0); return d;
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      toast({ title: "Name and email are required", variant: "destructive" });
      return;
    }
    if (!date || !time) {
      toast({ title: "Pick a date and time", variant: "destructive" });
      return;
    }
    const preferred = `${format(date, "EEE, MMM d, yyyy")} at ${formatTimeLabel(time)} (${tz})`;
    setSubmitting(true);
    const { error } = await (supabase as any).from("demo_requests").insert({
      name: form.name.trim(),
      email: form.email.trim(),
      company: form.company.trim() || null,
      phone: form.phone.trim() || null,
      team_size: form.team_size || null,
      preferred_time: preferred,
      message: form.message.trim() || null,
      source: "landing",
    });
    setSubmitting(false);
    if (error) {
      toast({ title: "Could not submit", description: error.message, variant: "destructive" });
      return;
    }
    setDone(true);
  };


  return (
    <div className="min-h-screen bg-background text-foreground">
      <SeoHead
        title="Book a Free Demo — EngageIQ"
        description="See EngageIQ in action. Book a free 30-minute walkthrough tailored to your outbound workflow."
        path="/demo"
      />

      <header className="border-b border-border/40 bg-background/70 backdrop-blur-xl sticky top-0 z-40">
        <div className="container mx-auto h-16 flex items-center justify-between">
          <Logo />
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" /> Back home
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-6 py-16 grid md:grid-cols-2 gap-12 max-w-6xl">
        <section className="space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/60 px-3 py-1 text-xs font-medium text-muted-foreground">
            <CalendarIcon className="h-3.5 w-3.5" /> Free 30-minute demo
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            See EngageIQ run on <span className="bg-gradient-primary bg-clip-text text-transparent">your pipeline</span>
          </h1>
          <p className="text-lg text-muted-foreground">
            Walk through AI lead scoring, multi-step automation, and real-time pipeline analytics with one of our specialists. Bring questions — we'll bring answers.
          </p>

          <ul className="space-y-5">
            {perks.map((p) => (
              <li key={p.title} className="flex gap-4">
                <div className="h-10 w-10 shrink-0 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <p.icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-semibold">{p.title}</div>
                  <div className="text-sm text-muted-foreground">{p.desc}</div>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-border/60 bg-card/60 p-6 md:p-8 shadow-elegant h-fit">
          {done ? (
            <div className="text-center py-10 space-y-4">
              <div className="mx-auto h-14 w-14 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <h2 className="text-2xl font-semibold">You're on the list!</h2>
              <p className="text-muted-foreground">
                Thanks {form.name.split(" ")[0]}. We'll reach out at <span className="text-foreground font-medium">{form.email}</span> within one business day to schedule your demo.
              </p>
              <Link to="/">
                <Button variant="outline" className="mt-4">Back to home</Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <h2 className="text-xl font-semibold mb-2">Book your demo</h2>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Full name *</Label>
                  <Input id="name" value={form.name} onChange={update("name")} required maxLength={200} />
                </div>
                <div>
                  <Label htmlFor="email">Work email *</Label>
                  <Input id="email" type="email" value={form.email} onChange={update("email")} required maxLength={320} />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="company">Company</Label>
                  <Input id="company" value={form.company} onChange={update("company")} maxLength={200} />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" value={form.phone} onChange={update("phone")} maxLength={50} />
                </div>
              </div>

              <div>
                <Label htmlFor="team_size">Team size</Label>
                <Select value={form.team_size} onValueChange={(v) => setForm((f) => ({ ...f, team_size: v }))}>
                  <SelectTrigger id="team_size"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {teamSizes.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3 rounded-lg border border-border/60 bg-background/40 p-4">
                <Label className="text-sm font-semibold">Pick a date & time *</Label>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="date" className="text-xs text-muted-foreground">Date</Label>
                    <Popover open={calOpen} onOpenChange={setCalOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          id="date"
                          type="button"
                          variant="outline"
                          className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {date ? format(date, "EEE, MMM d, yyyy") : "Select a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 z-50" align="start">
                        <Calendar
                          mode="single"
                          selected={date}
                          onSelect={(d) => { setDate(d); setCalOpen(false); }}
                          disabled={(d) => d < minDate || d.getDay() === 0 || d.getDay() === 6}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <Label htmlFor="time" className="text-xs text-muted-foreground">Time</Label>
                    <Select value={time} onValueChange={setTime}>
                      <SelectTrigger id="time">
                        <Clock className="mr-2 h-4 w-4 opacity-60" />
                        <SelectValue placeholder="Select a time" />
                      </SelectTrigger>
                      <SelectContent className="max-h-72">
                        {timeSlots.map((s) => (
                          <SelectItem key={s} value={s}>{formatTimeLabel(s)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="tz" className="text-xs text-muted-foreground">Time zone</Label>
                  <Select value={tz} onValueChange={setTz}>
                    <SelectTrigger id="tz">
                      <Globe className="mr-2 h-4 w-4 opacity-60" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {tzOptions.map((z) => (
                        <SelectItem key={z} value={z}>{z.replace(/_/g, " ")}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="mt-1 text-[11px] text-muted-foreground">Detected: {browserTz}</p>
                </div>
              </div>

              <div>
                <Label htmlFor="message">What would you like to see?</Label>
                <Textarea
                  id="message"
                  rows={4}
                  placeholder="Tell us about your outbound workflow and the problems you'd like to solve."
                  value={form.message}
                  onChange={update("message")}
                  maxLength={4000}
                />
              </div>

              <Button type="submit" disabled={submitting} className="w-full bg-gradient-primary shadow-glow">
                {submitting ? "Submitting…" : "Book my free demo"}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                By submitting, you agree to be contacted about EngageIQ. We never share your info.
              </p>
            </form>
          )}
        </section>
      </main>
    </div>
  );
}
