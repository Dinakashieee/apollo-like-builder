import { useEffect, useState } from "react";
import { useWorkspace } from "@/hooks/useWorkspace";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sparkles, Trash2, Loader2, RefreshCw } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function DemoDataCard() {
  const { current } = useWorkspace();
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [counts, setCounts] = useState({ leads: 0, opportunities: 0, replies: 0 });

  const refresh = async () => {
    if (!current?.id) return;
    setLoading(true);
    const [leads, opps, msgs] = await Promise.all([
      supabase.from("leads").select("id", { count: "exact", head: true }).eq("workspace_id", current.id).eq("is_demo", true),
      supabase.from("opportunities").select("id", { count: "exact", head: true }).eq("workspace_id", current.id).eq("is_demo", true),
      supabase.from("email_messages").select("id", { count: "exact", head: true }).eq("workspace_id", current.id).eq("is_demo", true).eq("direction", "inbound"),
    ]);
    setCounts({
      leads: leads.count ?? 0,
      opportunities: opps.count ?? 0,
      replies: msgs.count ?? 0,
    });
    setLoading(false);
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

  const total = counts.leads + counts.opportunities + counts.replies;

  const clear = async () => {
    if (!current?.id) return;
    setWorking(true);
    const { error } = await supabase.functions.invoke("clear-demo-data", {
      body: { workspaceId: current.id },
    });
    setWorking(false);
    if (error) {
      toast({ title: "Couldn't clear demo data", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Demo data cleared", description: "Your workspace is now empty and ready for real data." });
    refresh();
  };

  const reseed = async () => {
    if (!current?.id) return;
    setWorking(true);
    const { error } = await supabase.functions.invoke("seed-demo-data", {
      body: { workspaceId: current.id, force: true },
    });
    setWorking(false);
    if (error) {
      toast({ title: "Couldn't load demo data", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Demo data loaded", description: "Sample leads, replies, and opportunities are back." });
    refresh();
  };

  return (
    <section className="card-elevated p-6 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-display font-bold text-lg text-primary-deep flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> Demo data
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Your workspace was pre-filled with sample leads, opportunities, and AI-analyzed replies
            so you can explore the product. <strong>Clear this before importing real data.</strong>
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Checking demo data…
        </div>
      ) : total === 0 ? (
        <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
          No demo data in this workspace. {" "}
          <button onClick={reseed} disabled={working} className="text-primary hover:underline font-medium">
            Load sample data
          </button>{" "}
          if you'd like to explore the look & feel.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-border/60 p-3">
              <p className="text-2xl font-display font-bold text-primary-deep">{counts.leads}</p>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Demo leads</p>
            </div>
            <div className="rounded-lg border border-border/60 p-3">
              <p className="text-2xl font-display font-bold text-primary-deep">{counts.opportunities}</p>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Opportunities</p>
            </div>
            <div className="rounded-lg border border-border/60 p-3">
              <p className="text-2xl font-display font-bold text-primary-deep">{counts.replies}</p>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">AI replies</p>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap pt-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  className="text-destructive border-destructive/40 hover:bg-destructive/10"
                  disabled={working}
                >
                  {working ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-2" />
                  )}
                  Clear all demo data
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear demo data?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This permanently deletes the {counts.leads} demo leads, {counts.opportunities}{" "}
                    opportunities, sample sequences, the demo mailbox and its {counts.replies}{" "}
                    AI-analyzed replies, and demo activity feed entries. Your real data is not
                    touched. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={clear} className="bg-destructive hover:bg-destructive/90">
                    Clear demo data
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Button variant="ghost" onClick={reseed} disabled={working} className="text-muted-foreground">
              <RefreshCw className="h-4 w-4 mr-2" />
              Re-seed
            </Button>
          </div>
        </>
      )}
    </section>
  );
}
