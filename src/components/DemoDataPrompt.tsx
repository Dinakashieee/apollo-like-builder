import { useEffect, useState } from "react";
import { useWorkspace } from "@/hooks/useWorkspace";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

/**
 * Empty-state prompt shown on the dashboard when a workspace has no data
 * (neither real nor demo). Lets users one-click load sample data so the
 * product doesn't feel empty during a free trial.
 */
export function DemoDataPrompt() {
  const { current } = useWorkspace();
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!current?.id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { count } = await supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", current.id);
      if (cancelled) return;
      setShow((count ?? 0) === 0);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [current?.id]);

  const load = async () => {
    if (!current?.id) return;
    setWorking(true);
    const { error } = await supabase.functions.invoke("seed-demo-data", {
      body: { workspaceId: current.id, force: true },
    });
    setWorking(false);
    if (error) {
      toast({
        title: "Couldn't load sample data",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "Sample data loaded",
      description: "Explore the dashboard, leads, and inbox to see the look & feel.",
    });
    // Soft refresh so widgets pick up the new rows
    window.location.reload();
  };

  if (loading || !show) return null;

  return (
    <section className="rounded-2xl border-2 border-dashed border-primary/30 bg-gradient-to-br from-primary/5 via-background to-accent/5 p-6 lg:p-8">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="font-display font-bold text-xl text-primary-deep">
              Your workspace is empty
            </h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-xl">
              Load sample leads, opportunities, and AI-analyzed replies to explore the
              product. You can wipe everything in one click from{" "}
              <Link to="/settings" className="text-primary hover:underline font-medium">
                Settings → Demo data
              </Link>{" "}
              before you start importing real data.
            </p>
          </div>
        </div>
        <div className="flex gap-2 shrink-0 flex-wrap">
          <Button onClick={load} disabled={working} className="shadow-md">
            {working ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Loading…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" /> Load sample data
              </>
            )}
          </Button>
          <Button asChild variant="outline">
            <Link to="/settings">
              <Settings2 className="h-4 w-4 mr-2" /> Manage in Settings
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
