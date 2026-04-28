import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  TrendingUp,
  Users,
  Flame,
  Mail,
  Target,
  ArrowUpRight,
  Sparkles,
  Calendar,
  Plus,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { AddLeadDialog } from "@/components/AddLeadDialog";
import { ImportDialog } from "@/components/ImportDialog";

export default function Dashboard() {
  const { current } = useWorkspace();
  const { user } = useAuth();
  const [profileName, setProfileName] = useState<string>("");
  const [stats, setStats] = useState({ leads: 0, hot: 0, opps: 0, emails: 0 });
  const [recentLeads, setRecentLeads] = useState<any[]>([]);
  const [topLeads, setTopLeads] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    if (!current) return;
    setLoading(true);
    const [
      { count: leadsCount },
      { count: hotCount },
      { count: oppsCount },
      { data: recent },
      { data: top },
      { data: acts },
    ] = await Promise.all([
      supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", current.id),
      supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", current.id)
        .gte("score", 70),
      supabase
        .from("opportunities")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", current.id),
      supabase
        .from("leads")
        .select("id, company_name, contact_name, role, status, score, created_at")
        .eq("workspace_id", current.id)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("leads")
        .select("id, company_name, contact_name, role, status, score, industry, notes")
        .eq("workspace_id", current.id)
        .not("status", "in", "(won,lost)")
        .order("score", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("activities")
        .select("id, type, description, created_at")
        .eq("workspace_id", current.id)
        .order("created_at", { ascending: false })
        .limit(8),
    ]);
    setStats({
      leads: leadsCount ?? 0,
      hot: hotCount ?? 0,
      opps: oppsCount ?? 0,
      emails: 0,
    });
    setRecentLeads(recent ?? []);
    setTopLeads(top ?? []);
    setActivities(acts ?? []);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) =>
        setProfileName(data?.full_name?.split(" ")[0] ?? user.email?.split("@")[0] ?? "")
      );
  }, [user]);

  const kpis = [
    { label: "Total Leads", value: stats.leads, icon: Users, accent: "text-primary" },
    { label: "Hot Leads", value: stats.hot, icon: Flame, accent: "text-hot" },
    { label: "Opportunities", value: stats.opps, icon: Target, accent: "text-success" },
    { label: "Activities", value: activities.length, icon: Mail, accent: "text-warm" },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground font-medium mb-1">
            Welcome back{profileName ? `, ${profileName}` : ""} 👋
          </p>
          <h1 className="text-3xl lg:text-4xl font-display font-bold text-primary-deep">
            Dashboard
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <ImportDialog onImported={refresh} />
          <AddLeadDialog onCreated={refresh} />
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="card-elevated p-5">
            <div className={`h-10 w-10 rounded-xl bg-muted flex items-center justify-center ${kpi.accent} mb-3`}>
              <kpi.icon className="h-5 w-5" strokeWidth={2.2} />
            </div>
            <p className="text-xs text-muted-foreground font-medium mb-1">{kpi.label}</p>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <p className="text-3xl font-display font-bold text-primary-deep tracking-tight">
                {kpi.value}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Top 5 leads to focus on this week */}
      {topLeads.length > 0 && (
        <div className="rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/5 via-card to-warm/5 p-6 shadow-elevated relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-primary/15 blur-3xl rounded-full pointer-events-none" />
          <div className="relative flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
                <Zap className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
                  AI recommendation · This week
                </p>
                <h3 className="font-display font-bold text-lg text-primary-deep leading-tight">
                  Top 5 leads to work on right now
                </h3>
              </div>
            </div>
            <Link to="/app/leads">
              <Button variant="ghost" size="sm" className="text-primary text-xs h-8">
                See all leads <ArrowUpRight className="h-3 w-3 ml-1" />
              </Button>
            </Link>
          </div>

          <div className="relative grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            {topLeads.map((lead, idx) => (
              <Link
                key={lead.id}
                to="/app/composer"
                className="group rounded-xl bg-card border border-border/60 p-4 hover:border-primary/50 hover:shadow-glow transition-all relative"
              >
                <div className="absolute -top-2 -left-2 h-7 w-7 rounded-full bg-gradient-primary text-primary-foreground text-xs font-bold flex items-center justify-center shadow-soft">
                  {idx + 1}
                </div>
                <div className="flex items-center justify-between mb-2 mt-1">
                  <div className="h-9 w-9 rounded-lg bg-secondary flex items-center justify-center text-[11px] font-bold text-secondary-foreground">
                    {lead.company_name?.slice(0, 2).toUpperCase()}
                  </div>
                  <span className="text-xs font-bold text-primary">{lead.score ?? 0}</span>
                </div>
                <p className="font-semibold text-sm text-primary-deep truncate">
                  {lead.contact_name || lead.company_name}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {lead.role ? `${lead.role} · ` : ""}{lead.company_name}
                </p>
                {lead.industry && (
                  <p className="text-[10px] text-muted-foreground/80 mt-1 truncate">{lead.industry}</p>
                )}
                <div className="mt-3 flex items-center gap-1 text-[10px] font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  <Sparkles className="h-3 w-3" /> Draft email
                </div>
              </Link>
            ))}
          </div>

          <p className="relative text-[11px] text-muted-foreground mt-4 flex items-center gap-1.5">
            <Sparkles className="h-3 w-3 text-primary" />
            Ranked by AI score, fit & recency. Updated as you add leads and intelligence.
          </p>
        </div>
      )}

      {stats.leads === 0 && !loading && (
        <div className="card-elevated p-8 text-center">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <h3 className="font-display font-bold text-lg text-primary-deep mb-1">
            No leads yet
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Add your first lead manually or import a CSV/Excel file.
          </p>
          <div className="flex gap-2 justify-center">
            <ImportDialog onImported={refresh} />
            <AddLeadDialog onCreated={refresh} />
          </div>
        </div>
      )}

      {/* Recent leads + activity */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="card-elevated p-6 lg:col-span-3">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-display font-bold text-lg text-primary-deep">Recent Leads</h3>
            <Link to="/app/leads">
              <Button variant="ghost" size="sm" className="text-primary text-xs h-8">
                View all <ArrowUpRight className="h-3 w-3 ml-1" />
              </Button>
            </Link>
          </div>
          {recentLeads.length === 0 && !loading && (
            <p className="text-sm text-muted-foreground text-center py-6">
              No leads yet.
            </p>
          )}
          <div className="space-y-2">
            {recentLeads.map((lead) => (
              <div
                key={lead.id}
                className="flex items-center gap-3 p-3 -mx-3 rounded-xl hover:bg-muted/50 transition-colors"
              >
                <div className="h-10 w-10 rounded-xl bg-gradient-primary flex items-center justify-center text-primary-foreground text-sm font-semibold shadow-soft shrink-0">
                  {lead.company_name?.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm text-primary-deep truncate">
                    {lead.contact_name || lead.company_name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {lead.role ? `${lead.role} · ` : ""}{lead.company_name}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="card-elevated p-6 lg:col-span-2">
          <h3 className="font-display font-bold text-lg text-primary-deep mb-5">
            Recent Activity
          </h3>
          {activities.length === 0 && !loading && (
            <p className="text-sm text-muted-foreground text-center py-6">
              No activity yet.
            </p>
          )}
          <div className="space-y-4">
            {activities.map((a) => (
              <div key={a.id} className="flex gap-3">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground/90 leading-snug">{a.description}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
