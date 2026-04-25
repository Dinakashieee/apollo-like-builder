import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";
import { logActivity } from "@/lib/activities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Logo } from "@/components/Logo";
import { CheckCircle2, ArrowRight, Building2, Package, Sparkles } from "lucide-react";

const companySchema = z.object({
  company_name: z.string().trim().min(1, "Company name required").max(120),
  description: z.string().trim().max(1000).optional(),
  industries: z.string().trim().max(400).optional(),
  products_summary: z.string().trim().max(1000).optional(),
});

const productSchema = z.object({
  name: z.string().trim().min(1, "Product name required").max(120),
  description: z.string().trim().max(800).optional(),
  category: z.string().trim().max(80).optional(),
});

export default function Onboarding() {
  const { user } = useAuth();
  const { current, loading: wsLoading } = useWorkspace();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const [companyName, setCompanyName] = useState("");
  const [description, setDescription] = useState("");
  const [industries, setIndustries] = useState("");
  const [productsSummary, setProductsSummary] = useState("");

  const [productName, setProductName] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [productCategory, setProductCategory] = useState("");

  useEffect(() => {
    const check = async () => {
      if (!current) return;
      const { data } = await supabase
        .from("company_profiles")
        .select("company_name, description, industries, products_summary")
        .eq("workspace_id", current.id)
        .maybeSingle();
      if (data) {
        setCompanyName(data.company_name ?? "");
        setDescription(data.description ?? "");
        setIndustries((data.industries ?? []).join(", "));
        setProductsSummary(data.products_summary ?? "");
      }
    };
    check();
  }, [current]);

  if (wsLoading || !current) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  const saveCompany = async () => {
    const parsed = companySchema.safeParse({
      company_name: companyName,
      description,
      industries,
      products_summary: productsSummary,
    });
    if (!parsed.success) {
      toast({ title: "Invalid input", description: parsed.error.errors[0].message, variant: "destructive" });
      return false;
    }
    setSubmitting(true);
    const industriesArray = industries
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const { data: existing } = await supabase
      .from("company_profiles")
      .select("id")
      .eq("workspace_id", current.id)
      .maybeSingle();
    const payload = {
      workspace_id: current.id,
      company_name: parsed.data.company_name,
      description: parsed.data.description ?? null,
      industries: industriesArray,
      products_summary: parsed.data.products_summary ?? null,
    };
    const { error } = existing
      ? await supabase.from("company_profiles").update(payload).eq("id", existing.id)
      : await supabase.from("company_profiles").insert(payload);
    setSubmitting(false);
    if (error) {
      toast({ title: "Could not save", description: error.message, variant: "destructive" });
      return false;
    }
    await logActivity(current.id, user?.id, "company_updated", `Company profile updated: ${parsed.data.company_name}`);
    return true;
  };

  const saveProduct = async () => {
    if (!productName.trim()) return true; // optional
    const parsed = productSchema.safeParse({
      name: productName,
      description: productDescription,
      category: productCategory,
    });
    if (!parsed.success) {
      toast({ title: "Invalid input", description: parsed.error.errors[0].message, variant: "destructive" });
      return false;
    }
    setSubmitting(true);
    const { error } = await supabase.from("products").insert({
      workspace_id: current.id,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      category: parsed.data.category ?? null,
    });
    setSubmitting(false);
    if (error) {
      toast({ title: "Could not save product", description: error.message, variant: "destructive" });
      return false;
    }
    await logActivity(current.id, user?.id, "product_added", `Product added: ${parsed.data.name}`);
    return true;
  };

  const next = async () => {
    if (step === 1) {
      const ok = await saveCompany();
      if (ok) setStep(2);
    } else if (step === 2) {
      const ok = await saveProduct();
      if (ok) setStep(3);
    } else {
      navigate("/app");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-soft">
      <header className="container mx-auto px-6 py-6">
        <Logo />
      </header>
      <main className="container mx-auto px-6 max-w-2xl py-8">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {[1, 2, 3].map((n) => (
            <div key={n} className="flex-1">
              <div
                className={`h-1.5 rounded-full ${
                  step >= n ? "bg-gradient-primary" : "bg-muted"
                }`}
              />
              <p
                className={`text-[11px] font-semibold mt-2 uppercase tracking-wider ${
                  step >= n ? "text-primary" : "text-muted-foreground"
                }`}
              >
                Step {n}
              </p>
            </div>
          ))}
        </div>

        <div className="card-elevated p-8">
          {step === 1 && (
            <>
              <div className="flex items-center gap-3 mb-1">
                <Building2 className="h-5 w-5 text-primary" />
                <h1 className="text-2xl font-display font-bold text-primary-deep">
                  Tell us about your company
                </h1>
              </div>
              <p className="text-muted-foreground mb-6">
                We'll use this to power AI-driven opportunity discovery.
              </p>
              <div className="space-y-4">
                <div>
                  <Label>Company name *</Label>
                  <Input
                    className="mt-1"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Acme Corp"
                  />
                </div>
                <div>
                  <Label>What does your company do?</Label>
                  <Textarea
                    className="mt-1"
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="We help SaaS teams reduce churn through AI-driven insights."
                  />
                </div>
                <div>
                  <Label>Target industries (comma-separated)</Label>
                  <Input
                    className="mt-1"
                    value={industries}
                    onChange={(e) => setIndustries(e.target.value)}
                    placeholder="SaaS, Fintech, Healthcare"
                  />
                </div>
                <div>
                  <Label>Products / services summary</Label>
                  <Textarea
                    className="mt-1"
                    rows={2}
                    value={productsSummary}
                    onChange={(e) => setProductsSummary(e.target.value)}
                    placeholder="A short paragraph about what you sell."
                  />
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="flex items-center gap-3 mb-1">
                <Package className="h-5 w-5 text-primary" />
                <h1 className="text-2xl font-display font-bold text-primary-deep">
                  Add your first product
                </h1>
              </div>
              <p className="text-muted-foreground mb-6">
                Optional — but it makes the AI insights way better.
              </p>
              <div className="space-y-4">
                <div>
                  <Label>Product name</Label>
                  <Input
                    className="mt-1"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    placeholder="ChurnGuard"
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    className="mt-1"
                    rows={3}
                    value={productDescription}
                    onChange={(e) => setProductDescription(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Category</Label>
                  <Input
                    className="mt-1"
                    value={productCategory}
                    onChange={(e) => setProductCategory(e.target.value)}
                    placeholder="Customer Success Platform"
                  />
                </div>
              </div>
            </>
          )}

          {step === 3 && (
            <div className="text-center py-6">
              <div className="h-16 w-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="h-8 w-8 text-success" />
              </div>
              <h1 className="text-2xl font-display font-bold text-primary-deep mb-2">
                You're all set!
              </h1>
              <p className="text-muted-foreground mb-6">
                Next: import your leads or let AI generate opportunities for you.
              </p>
              <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto text-left">
                <div className="p-3 rounded-lg bg-muted/50 border border-border/60 text-xs">
                  <Sparkles className="h-4 w-4 text-primary mb-1" />
                  <p className="font-semibold">AI Insights</p>
                  <p className="text-muted-foreground">Auto-generated</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 border border-border/60 text-xs">
                  <Package className="h-4 w-4 text-primary mb-1" />
                  <p className="font-semibold">Import leads</p>
                  <p className="text-muted-foreground">CSV / Excel</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between mt-8 pt-6 border-t border-border/60">
            <Button
              variant="ghost"
              onClick={() => (step > 1 ? setStep(step - 1) : navigate("/app"))}
              disabled={submitting}
            >
              {step > 1 ? "Back" : "Skip"}
            </Button>
            <Button
              onClick={next}
              disabled={submitting}
              className="bg-gradient-primary shadow-glow"
            >
              {step === 3 ? "Go to dashboard" : "Continue"}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
