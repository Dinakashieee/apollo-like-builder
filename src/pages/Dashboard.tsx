import {
  TrendingUp,
  TrendingDown,
  Users,
  Flame,
  Mail,
  Target,
  ArrowUpRight,
  CheckCircle2,
  Calendar,
  MessageSquare,
} from "lucide-react";
import { BarChart, Bar, XAxis, ResponsiveContainer, Cell } from "recharts";
import { StatusBadge } from "@/components/StatusBadge";
import { AvatarBubble } from "@/components/AvatarBubble";
import { leads } from "@/data/leads";
import { Button } from "@/components/ui/button";

const kpis = [
  { label: "Total Leads", value: "320", change: "+12.4%", trend: "up", icon: Users, accent: "text-primary" },
  { label: "Hot Leads", value: "48", change: "+8.1%", trend: "up", icon: Flame, accent: "text-hot" },
  { label: "Emails Sent", value: "71%", change: "+3.2%", trend: "up", icon: Mail, accent: "text-warm" },
  { label: "Deals Closed", value: "25%", change: "-1.4%", trend: "down", icon: Target, accent: "text-success" },
];

const pipelineData = [
  { stage: "Leads", value: 320, color: "hsl(224 76% 48%)" },
  { stage: "Contacted", value: 248, color: "hsl(220 90% 60%)" },
  { stage: "Engaged", value: 174, color: "hsl(28 95% 55%)" },
  { stage: "Qualified", value: 92, color: "hsl(158 70% 38%)" },
  { stage: "Closed", value: 32, color: "hsl(217 78% 18%)" },
];

const keyMetrics = [
  { label: "Meetings Booked", value: "57", change: "+18%", trend: "up" },
  { label: "Hot Lead Conversion", value: "48%", change: "+6%", trend: "up" },
  { label: "Open Reply Rate", value: "71%", change: "+4%", trend: "up" },
  { label: "Reply Rate", value: "25%", change: "-2%", trend: "down" },
];

const activity = [
  {
    icon: Mail,
    text: "Follow-up email sent to",
    target: "Lisa Wong",
    time: "2m ago",
    badge: "Sent",
    badgeColor: "bg-success/10 text-success",
  },
  {
    icon: Calendar,
    text: "Demo booked with",
    target: "Marco Ferrari",
    time: "14m ago",
    badge: "Scheduled",
    badgeColor: "bg-warm/10 text-warm",
  },
  {
    icon: CheckCircle2,
    text: "Deal closed:",
    target: "DigiGrowth — $48k ARR",
    time: "1h ago",
    badge: "Won",
    badgeColor: "bg-primary/10 text-primary",
  },
  {
    icon: MessageSquare,
    text: "Reply received from",
    target: "Aiden Brooks",
    time: "3h ago",
    badge: "Replied",
    badgeColor: "bg-hot/10 text-hot",
  },
];

export default function Dashboard() {
  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground font-medium mb-1">Welcome back, Natalie 👋</p>
          <h1 className="text-3xl lg:text-4xl font-display font-bold text-primary-deep">
            Sales Dashboard
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="border-border/60">
            <Calendar className="h-4 w-4 mr-2" />
            Last 30 Days
          </Button>
          <Button size="sm" className="bg-gradient-primary shadow-glow hover:shadow-elevated">
            <ArrowUpRight className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <div
            key={kpi.label}
            className="card-elevated p-5 animate-fade-up hover:shadow-elevated transition-all"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="flex items-start justify-between mb-3">
              <div className={`h-10 w-10 rounded-xl bg-muted flex items-center justify-center ${kpi.accent}`}>
                <kpi.icon className="h-5 w-5" strokeWidth={2.2} />
              </div>
              <span
                className={`inline-flex items-center text-xs font-semibold gap-0.5 ${
                  kpi.trend === "up" ? "text-success" : "text-destructive"
                }`}
              >
                {kpi.trend === "up" ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {kpi.change}
              </span>
            </div>
            <p className="text-xs text-muted-foreground font-medium mb-1">{kpi.label}</p>
            <p className="text-3xl font-display font-bold text-primary-deep tracking-tight">
              {kpi.value}
            </p>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Key Metrics */}
        <div className="card-elevated p-6 animate-fade-up" style={{ animationDelay: "240ms" }}>
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-display font-bold text-lg text-primary-deep">Key Metrics</h3>
            <button className="text-xs font-medium text-primary hover:underline">View all</button>
          </div>
          <div className="space-y-4">
            {keyMetrics.map((m) => (
              <div key={m.label} className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
                <span className="text-sm text-foreground/80">{m.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-base font-semibold text-primary-deep">{m.value}</span>
                  <span
                    className={`text-[10px] font-bold ${
                      m.trend === "up" ? "text-success" : "text-destructive"
                    }`}
                  >
                    {m.trend === "up" ? "▲" : "▼"} {m.change}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pipeline chart */}
        <div className="card-elevated p-6 lg:col-span-2 animate-fade-up" style={{ animationDelay: "300ms" }}>
          <div className="flex items-start justify-between mb-5">
            <div>
              <h3 className="font-display font-bold text-lg text-primary-deep">Sales Pipeline</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Conversion across funnel stages</p>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-primary" /> Volume
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-hot" /> Engaged
              </span>
            </div>
          </div>
          <div className="h-[220px] -mx-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pipelineData} barCategoryGap={28}>
                <XAxis
                  dataKey="stage"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {pipelineData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-5 gap-2 mt-2 text-center">
            {pipelineData.map((d) => (
              <div key={d.stage}>
                <p className="text-base font-display font-bold text-primary-deep">{d.value}</p>
                <p className="text-[10px] text-muted-foreground">{Math.round((d.value / 320) * 100)}%</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom row: Top leads + activity */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="card-elevated p-6 lg:col-span-3 animate-fade-up" style={{ animationDelay: "360ms" }}>
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-display font-bold text-lg text-primary-deep">Top Lead Activity</h3>
            <Button variant="ghost" size="sm" className="text-primary text-xs h-8">
              View all leads <ArrowUpRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
          <div className="space-y-2">
            {leads.slice(0, 5).map((lead) => (
              <div
                key={lead.id}
                className="flex items-center gap-3 p-3 -mx-3 rounded-xl hover:bg-muted/50 transition-colors"
              >
                <AvatarBubble lead={lead} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm text-primary-deep truncate">{lead.name}</p>
                    <StatusBadge status={lead.status} />
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {lead.title} · {lead.company}
                  </p>
                </div>
                <div className="hidden sm:flex flex-wrap gap-1 max-w-[180px] justify-end">
                  {lead.tools.slice(0, 2).map((t) => (
                    <span key={t} className="text-[10px] font-medium bg-secondary text-secondary-foreground px-2 py-0.5 rounded-md">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card-elevated p-6 lg:col-span-2 animate-fade-up" style={{ animationDelay: "420ms" }}>
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-display font-bold text-lg text-primary-deep">Recent Activity</h3>
            <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
          </div>
          <div className="space-y-4">
            {activity.map((a, i) => (
              <div key={i} className="flex gap-3 group">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
                  <a.icon className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground/90 leading-snug">
                    {a.text}{" "}
                    <span className="font-semibold text-primary-deep">{a.target}</span>
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${a.badgeColor}`}>
                      {a.badge}
                    </span>
                    <span className="text-[11px] text-muted-foreground">{a.time}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
