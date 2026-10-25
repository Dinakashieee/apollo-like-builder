import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Users, Send, PenLine, Globe, CheckCircle2, RefreshCw, Activity } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SUMMARY_PERIODS, summaryRange, parsePersonalSummary, type SummaryPeriod } from "@/lib/personalSummary";

const metrics = [
  { key: "leads", label: "Leads added", icon: Users },
  { key: "emails_sent", label: "Emails delivered", icon: Send },
  { key: "emails_drafted", label: "Emails drafted", icon: PenLine },
  { key: "followups_completed", label: "Follow-ups completed", icon: CheckCircle2 },
  { key: "landing_pages", label: "Pages created", icon: Globe },
] as const;

export function PersonalDashboardSummary() {
  const { user } = useAuth();
  const { current } = useWorkspace();
  const [period, setPeriod] = useState<SummaryPeriod>("day");
  const query = useQuery({
    queryKey: ["personal-dashboard-summary", user?.id, current?.id, period],
    enabled: !!user && !!current,
    refetchInterval: 60_000,
    queryFn: async () => {
      if (!current) throw new Error("Choose a workspace");
      const range = summaryRange(period);
      const { data, error } = await supabase.rpc("personal_dashboard_summary", {
        _workspace_id: current.id, _start: range.start, _end: range.end,
      });
      if (error) throw error;
      return parsePersonalSummary(data);
    },
  });
  const range = summaryRange(period);
  const startLabel = new Date(range.start).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const endLabel = new Date(range.end).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  return (
    <section aria-label="Your activity summary" className="space-y-4 border-y border-border/60 py-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold text-primary-deep">Your activity summary</h2>
          <p className="text-xs text-muted-foreground mt-1">{startLabel} – {endLabel} · {Intl.DateTimeFormat().resolvedOptions().timeZone}</p>
        </div>
        <div className="flex items-center gap-2 max-w-full">
          <Tabs value={period} onValueChange={(value) => setPeriod(value as SummaryPeriod)}>
            <TabsList className="grid grid-cols-4">
              {SUMMARY_PERIODS.map(({ value, label }) => <TabsTrigger key={value} value={value} className="text-xs px-3">{label}</TabsTrigger>)}
            </TabsList>
          </Tabs>
          <Button size="icon" variant="ghost" aria-label="Refresh your summary" title="Refresh summary" disabled={query.isFetching} onClick={() => void query.refetch()}>
            <RefreshCw className={`h-4 w-4 ${query.isFetching ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>
      {query.isError ? (
        <div role="alert" className="flex items-center gap-3 text-sm text-destructive">
          Your summary couldn't load.
          <Button variant="outline" size="sm" onClick={() => void query.refetch()}>Try again</Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
            {metrics.map(({ key, label, icon: Icon }) => (
              <div key={key} className="rounded-lg border border-border/60 bg-card p-4">
                <div className="flex items-start justify-between gap-2 min-h-9">
                  <p className="text-xs font-medium text-muted-foreground">{label}</p>
                  <Icon className="h-4 w-4 shrink-0 text-primary" />
                </div>
                <p className="font-display text-2xl font-bold tabular-nums text-primary-deep">{query.isLoading ? "—" : (query.data?.[key] ?? 0).toLocaleString()}</p>
              </div>
            ))}
          </div>
          <div className="pt-1">
            <h3 className="text-xs font-semibold flex items-center gap-2 mb-2"><Activity className="h-3.5 w-3.5 text-primary" />Recent activity</h3>
            {query.isLoading ? <p className="text-xs text-muted-foreground">Loading your activity…</p> : !query.data?.activities.length ? (
              <p className="text-xs text-muted-foreground">No recorded activity in this period.</p>
            ) : (
              <ul className="divide-y divide-border/50">
                {query.data.activities.map((activity) => (
                  <li key={activity.id} className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1 py-2 text-xs">
                    <span className="min-w-0 break-words flex-1">{activity.description}</span>
                    <time className="text-muted-foreground shrink-0" dateTime={activity.created_at}>{new Date(activity.created_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</time>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </section>
  );
}