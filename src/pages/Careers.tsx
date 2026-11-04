import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, MapPin, Laptop, Send, Loader2 } from "lucide-react";
import { Logo } from "@/components/Logo";
import { SeoHead } from "@/components/SeoHead";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import poster from "@/assets/engageiq_internship.asset.json";
import { applicationSchema, internship } from "@/lib/careers";
import { CareerCvUpload } from "@/components/CareerCvUpload";
import { CV_BUCKET, cvContentType, validateCv } from "@/lib/careerCv";

export default function Careers() {
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [cv, setCv] = useState<File | null>(null);
  const [uploadedCv, setUploadedCv] = useState<{ file: File; path: string } | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    const parsed = applicationSchema.safeParse({ ...Object.fromEntries(form.entries()), consent: form.get("consent") === "on" });
    if (!parsed.success) { setError("Please complete all required fields, use a valid email and HTTPS profile link, and write at least 20 characters about yourself."); return; }
    if (cv) { const problem = validateCv(cv); if (problem) { setError(problem); return; } }
    setBusy(true); setError("");
    try {
      const { full_name, email, phone, location, profile_url, introduction } = parsed.data;
      let cvPath: string | null = null;
      if (cv) {
        if (uploadedCv?.file === cv) cvPath = uploadedCv.path;
        else {
          cvPath = `${crypto.randomUUID()}.${cv.name.split(".").pop()?.toLowerCase()}`;
          const upload = await supabase.storage.from(CV_BUCKET).upload(cvPath, cv, { contentType: cvContentType(cv.name), upsert: false });
          if (upload.error) throw upload.error;
          setUploadedCv({ file: cv, path: cvPath });
        }
      }
      const result = await supabase.from("career_applications").insert({ full_name: full_name ?? "", email: email ?? "", phone: phone ?? "", location: location ?? "", profile_url, introduction: introduction ?? "", consent: true, cv_path: cvPath, cv_name: cv ? cv.name.slice(0,255) : null });
      if (result.error) throw result.error;
      setSent(true);
    } catch { setError("Your application could not be saved. Please try again; your details are still here."); }
    finally { setBusy(false); }
  }
  return <div className="min-h-screen bg-background text-foreground">
    <SeoHead title="Careers — Lead Generation Internship | EngageIQ.lk" description="Apply for the fully remote Lead Generation Internship in Sri Lanka. LKR 20,000 per month plus LKR 5,000 performance bonus." path="/careers" />
    <header className="border-b"><div className="container px-6 py-5 flex items-center justify-between gap-4"><Logo /><Link to="/" className="text-sm text-muted-foreground">Home</Link></div></header>
    <main className="container px-6 py-12 md:py-16 max-w-6xl">
      <p className="text-primary text-sm font-semibold mb-3">CAREERS AT ENGAGEIQ.LK</p>
      <h1 className="font-display text-4xl md:text-5xl font-bold mb-5">{internship.title}</h1>
      <p className="text-muted-foreground max-w-2xl text-lg">Get hands-on experience in B2B lead generation with EngageIQ.lk, our AI-powered sales automation platform.</p>
      <div className="flex flex-wrap gap-6 text-sm mt-6"><span className="flex items-center gap-2"><Laptop className="w-4 h-4 text-primary" />Fully remote</span><span className="flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" />Based in Sri Lanka</span></div>
      <div className="mt-7 flex flex-wrap items-center gap-6"><Button asChild><a href="#apply">Apply now <ArrowRight className="ml-2 h-4 w-4" /></a></Button><p className="font-semibold">LKR {internship.monthlyPay.toLocaleString()} / month <span className="block text-sm text-muted-foreground font-normal">+ LKR {internship.performanceBonus.toLocaleString()} performance bonus</span></p></div>
      <div className="grid md:grid-cols-2 gap-10 lg:gap-16 mt-12 border-t pt-10 items-start">
        <div className="space-y-9">
          <img src={poster.url} alt="EngageIQ.lk Lead Generation Intern vacancy poster: remote in Sri Lanka, LKR 20,000 per month plus LKR 5,000 performance bonus" className="w-full h-auto rounded-lg" width={768} height={768} />
          <section><h2 className="font-display text-2xl font-bold mb-4">What you’ll do</h2><ul className="space-y-3 text-muted-foreground">{["Find and identify B2B leads.", "Send LinkedIn direct messages to prospects.", "Comment and engage on LinkedIn about EngageIQ.lk.", "Monitor LinkedIn paid campaign engagement and follow up with interested prospects."].map(t => <li key={t} className="flex gap-3"><CheckCircle2 className="w-5 h-5 shrink-0 text-primary mt-0.5" />{t}</li>)}</ul></section>
          <section><h2 className="font-display text-2xl font-bold mb-4">Who we’re looking for</h2><ul className="list-disc pl-5 space-y-2 text-muted-foreground"><li>Good English communication.</li><li>An interest in sales and technology.</li><li>Based in Sri Lanka.</li></ul><p className="text-sm text-muted-foreground mt-4">Fully remote — no travelling costs. Female applicants preferred, as advertised.</p></section>
        </div>
        <section id="apply" className="scroll-mt-6">
          <h2 className="font-display text-2xl font-bold mb-2">Apply for the internship</h2>
          {sent ? <div role="status" className="py-10 space-y-3"><CheckCircle2 className="w-10 h-10 text-primary" /><h3 className="text-xl font-semibold">Application received</h3><p className="text-muted-foreground">Thank you for applying to EngageIQ.lk. Your application has been saved for our team to review.</p><Button variant="outline" asChild><Link to="/">Back to home</Link></Button></div> : <form onSubmit={submit} className="mt-6 space-y-5">
            {[{name:"full_name", label:"Full name", type:"text", max:120}, {name:"email",label:"Email address",type:"email",max:254}, {name:"phone",label:"Phone number",type:"tel",max:30}, {name:"location",label:"City / location in Sri Lanka",type:"text",max:120}, {name:"profile_url",label:"LinkedIn profile or CV link (optional)",type:"url",max:1000}].map(f => <div key={f.name} className="space-y-2"><Label htmlFor={f.name}>{f.label}</Label><Input id={f.name} name={f.name} type={f.type} maxLength={f.max} required={f.name !== "profile_url"} placeholder={f.name === "profile_url" ? "https://" : undefined} /></div>)}
            <div className="space-y-2"><Label htmlFor="introduction">Tell us about yourself and why you’re interested</Label><Textarea id="introduction" name="introduction" minLength={20} maxLength={4000} required rows={5} /></div>
            <CareerCvUpload file={cv} onChange={setCv} disabled={busy} />
            <label className="flex gap-3 text-sm text-muted-foreground items-start"><input name="consent" type="checkbox" required className="mt-1" /><span>I agree that EngageIQ.lk may use my application details for recruitment. <Link to="/privacy" className="text-primary underline">Privacy notice</Link></span></label>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={busy} className="w-full">{busy ? <Loader2 className="mr-2 w-4 h-4 animate-spin" /> : <Send className="mr-2 w-4 h-4" />}{busy ? "Submitting…" : "Submit application"}</Button>
          </form>}
        </section>
      </div>
    </main>
    <footer className="border-t"><div className="container px-6 py-7 flex flex-wrap gap-5 justify-between text-sm text-muted-foreground"><span>© 2026 EngageIQ.lk</span><Link to="/privacy">Privacy</Link></div></footer>
  </div>;
}