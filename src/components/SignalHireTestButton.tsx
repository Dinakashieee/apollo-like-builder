import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export function SignalHireTestButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<null | { ok: boolean; detail: string }>(null);

  const run = async () => {
    setLoading(true);
    setResult(null);
    const { data, error } = await supabase.functions.invoke("signalhire-test");
    setLoading(false);
    if (error) {
      setResult({ ok: false, detail: error.message });
      toast({ title: "SignalHire test failed", description: error.message, variant: "destructive" });
      return;
    }
    if ((data as any)?.ok) {
      const credits = JSON.stringify((data as any).credits);
      setResult({ ok: true, detail: `Connected. Credits: ${credits}` });
      toast({ title: "SignalHire connected", description: credits });
    } else {
      const detail = JSON.stringify((data as any)?.error ?? data);
      setResult({ ok: false, detail });
      toast({ title: "SignalHire rejected the request", description: detail, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-2">
      <Button onClick={run} disabled={loading} variant="outline">
        {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />}
        Test SignalHire connection
      </Button>
      {result && (
        <div className={`text-xs flex items-start gap-2 rounded-md border p-2 ${result.ok ? "border-success/40 bg-success/5 text-success" : "border-destructive/40 bg-destructive/5 text-destructive"}`}>
          {result.ok ? <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0" /> : <XCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />}
          <span className="break-all">{result.detail}</span>
        </div>
      )}
    </div>
  );
}
