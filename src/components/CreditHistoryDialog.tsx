import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { formatDistanceToNow } from "date-fns";
import { ArrowDown, ArrowUp, Loader2 } from "lucide-react";

type Entry = {
  id: string;
  credit_type: "ai_email" | "signalhire";
  delta: number;
  balance_after: number | null;
  reason: string;
  ref_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

const REASON_LABEL: Record<string, string> = {
  ai_usage: "AI generation",
  reveal: "Contact reveal",
  purchase: "Credit purchase",
};

export function CreditHistoryDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { workspace } = useWorkspace();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !workspace?.id) return;
    let active = true;
    setLoading(true);
    supabase
      .from("credit_ledger")
      .select("id, credit_type, delta, balance_after, reason, ref_id, metadata, created_at")
      .eq("workspace_id", workspace.id)
      .order("created_at", { ascending: false })
      .limit(200)
      .then(({ data }) => {
        if (active) {
          setEntries((data as Entry[]) ?? []);
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [open, workspace?.id]);

  const renderList = (filter: "all" | "ai_email" | "signalhire") => {
    const rows = filter === "all" ? entries : entries.filter((e) => e.credit_type === filter);
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
      );
    }
    if (rows.length === 0) {
      return (
        <div className="text-center py-12 text-sm text-muted-foreground">
          No credit activity yet.
        </div>
      );
    }
    return (
      <ScrollArea className="h-[420px] pr-3">
        <ul className="divide-y divide-border">
          {rows.map((e) => {
            const positive = e.delta > 0;
            return (
              <li key={e.id} className="flex items-center gap-3 py-3">
                <div
                  className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                    positive
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {positive ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">
                      {REASON_LABEL[e.reason] ?? e.reason}
                    </p>
                    <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                      {e.credit_type === "ai_email" ? "AI" : "SignalHire"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(e.created_at), { addSuffix: true })}
                    {e.balance_after != null && ` · Balance: ${e.balance_after}`}
                  </p>
                </div>
                <div
                  className={`text-sm font-semibold tabular-nums ${
                    positive ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"
                  }`}
                >
                  {positive ? "+" : ""}
                  {e.delta}
                </div>
              </li>
            );
          })}
        </ul>
      </ScrollArea>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Credit history</DialogTitle>
          <DialogDescription>
            Audit log of every credit grant and usage in this workspace.
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="all">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="ai_email">AI</TabsTrigger>
            <TabsTrigger value="signalhire">SignalHire</TabsTrigger>
          </TabsList>
          <TabsContent value="all" className="mt-4">{renderList("all")}</TabsContent>
          <TabsContent value="ai_email" className="mt-4">{renderList("ai_email")}</TabsContent>
          <TabsContent value="signalhire" className="mt-4">{renderList("signalhire")}</TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
