import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Copy, Loader2, Megaphone, Plus, Upload, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import {
  AD_PLATFORMS, LEAD_STATUSES, canManageLeads, canManageRoles, leadsPerCampaign, parseLeadCsv,
  type AdPlatform, type TeamRole,
} from "@/lib/campaignLeads";

interface Campaign { id: string; name: string; platform: AdPlatform; auto_created: boolean; created_at: string }
interface Lead { id: string; campaign_id: string; full_name: string | null; email: string | null; phone: string | null; company: string | null; assigned_to: string | null; status: string; created_at: string }
interface Member { user_id: string; name: string; role: TeamRole; isOwner: boolean }

const intakeUrl = (token: string) => `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/campaign-lead-intake?token=${token}`;
const platformLabel = (p: string) => AD_PLATFORMS.find((x) => x.key === p)?.label ?? p;
const copy = async (text: string, what: string) => { await navigator.clipboard.writeText(text); toast({ title: `${what} copied` }); };

export default function CampaignLeads() {
  const { current } = useWorkspace();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<TeamRole | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [wsToken, setWsToken] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [newName, setNewName] = useState("");
  const [newPlatform, setNewPlatform] = useState<AdPlatform>("facebook");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const manage = canManageLeads(role);

  const load = useCallback(async () => {
    if (!current || !user) return;
    const ws = current.id;
    const { data: r } = await supabase.rpc("team_role_of", { _workspace_id: ws, _user_id: user.id });
    const myRole = (r as TeamRole | null) ?? "sales";
    setRole(myRole);
    const [c, l, m, tr] = await Promise.all([
      supabase.from("ad_campaigns").select("id, name, platform, auto_created, created_at").eq("workspace_id", ws).order("created_at", { ascending: false }),
      supabase.from("ad_campaign_leads").select("id, campaign_id, full_name, email, phone, company, assigned_to, status, created_at").eq("workspace_id", ws).order("created_at", { ascending: false }).limit(1000),
      supabase.from("workspace_members").select("user_id, role").eq("workspace_id", ws),
      supabase.from("workspace_team_roles").select("user_id, role").eq("workspace_id", ws),
    ]);
    const ids = (m.data ?? []).map((x) => x.user_id);
    const { data: profiles } = ids.length ? await supabase.from("profiles").select("id, full_name, email").in("id", ids) : { data: [] };
    const pm = new Map((profiles ?? []).map((p) => [p.id, p.full_name || p.email]));
    const rm = new Map((tr.data ?? []).map((x) => [x.user_id, x.role as TeamRole]));
    setMembers((m.data ?? []).map((x) => ({ user_id: x.user_id, name: pm.get(x.user_id) ?? "Teammate", isOwner: x.role === "owner", role: x.role === "owner" ? "admin" : rm.get(x.user_id) ?? "sales" })));
    setCampaigns((c.data ?? []) as Campaign[]);
    setLeads((l.data ?? []) as Lead[]);
    if (canManageLeads(myRole)) {
      let { data: t } = await supabase.from("workspace_lead_intake").select("token").eq("workspace_id", ws).maybeSingle();
      if (!t) ({ data: t } = await supabase.from("workspace_lead_intake").insert({ workspace_id: ws }).select("token").single());
      setWsToken(t?.token ?? null);
    }
    setLoading(false);
  }, [current?.id, user?.id]);

  useEffect(() => { load(); }, [load]);

  const nameOf = (id: string | null) => members.find((m) => m.user_id === id)?.name ?? "Unassigned";
  const shown = filter === "all" ? leads : leads.filter((l) => l.campaign_id === filter);
  const perCampaign = useMemo(() => leadsPerCampaign(campaigns, leads), [campaigns, leads]);
  const campaignOf = (id: string) => campaigns.find((c) => c.id === id);

  const updateLead = async (id: string, patch: Partial<Lead>) => {
    const { error } = await supabase.from("ad_campaign_leads").update(patch).eq("id", id);
    if (error) return toast({ title: "Could not update lead", description: error.message, variant: "destructive" });
    setLeads((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  };

  const addCampaign = async () => {
    if (!current || !newName.trim()) return;
    const { error } = await supabase.from("ad_campaigns").insert({ workspace_id: current.id, name: newName.trim(), platform: newPlatform, created_by: user?.id });
    if (error) return toast({ title: "Could not create campaign", description: error.message.includes("duplicate") ? "A campaign with that name already exists on this platform." : error.message, variant: "destructive" });
    setNewName(""); load();
  };

  const copyCampaignLink = async (id: string) => {
    const { data, error } = await supabase.rpc("campaign_intake_token", { _campaign_id: id });
    if (error || !data) return toast({ title: "Could not get link", variant: "destructive" });
    copy(intakeUrl(data as string), "Lead link");
  };

  const importCsv = async (file: File) => {
    if (!current) return;
    if (file.size > 2_000_000) return toast({ title: "File too large", description: "Keep CSV files under 2 MB.", variant: "destructive" });
    setBusy(true);
    try {
      const rows = parseLeadCsv(await file.text(), file.name.replace(/\.csv$/i, ""));
      if (!rows.length) return toast({ title: "No leads found", description: "Include a header row with name, email or phone." });
      const map = new Map(campaigns.map((c) => [`${c.platform}|${c.name.trim().toLowerCase()}`, c.id]));
      for (const r of rows) {
        const k = `${r.platform}|${r.campaign.trim().toLowerCase()}`;
        if (!map.has(k)) {
          const { data, error } = await supabase.from("ad_campaigns").insert({ workspace_id: current.id, name: r.campaign.trim(), platform: r.platform, auto_created: true, created_by: user?.id }).select("id").single();
          if (error) throw error;
          map.set(k, data.id);
        }
      }
      const payload = rows.map((r) => ({ workspace_id: current.id, campaign_id: map.get(`${r.platform}|${r.campaign.trim().toLowerCase()}`)!, full_name: r.full_name, email: r.email, phone: r.phone, company: r.company, message: r.message }));
      for (let i = 0; i < payload.length; i += 500) {
        const { error } = await supabase.from("ad_campaign_leads").insert(payload.slice(i, i + 500));
        if (error) throw error;
      }
      toast({ title: `${rows.length} leads imported` });
      load();
    } catch (e) {
      toast({ title: "Import failed", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    } finally { setBusy(false); if (fileRef.current) fileRef.current.value = ""; }
  };

  const setMemberRole = async (userId: string, r: TeamRole) => {
    if (!current) return;
    const { error } = await supabase.from("workspace_team_roles").upsert({ workspace_id: current.id, user_id: userId, role: r, updated_at: new Date().toISOString() });
    if (error) return toast({ title: "Could not change role", description: error.message, variant: "destructive" });
    setMembers((ms) => ms.map((m) => (m.user_id === userId ? { ...m, role: r } : m)));
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold"><Megaphone className="h-6 w-6" /> Campaign Leads</h1>
          <p className="text-sm text-muted-foreground">Leads from LinkedIn, Facebook, TikTok and Google Search campaigns in one place.{!manage && " You see the leads assigned to you."}</p>
        </div>
        <Badge variant="outline" className="capitalize">Your role: {role}</Badge>
      </div>

      <div className="grid gap-3 sm:grid-cols-5">
        {AD_PLATFORMS.map((p) => (
          <div key={p.key} className="rounded-lg border bg-card p-3">
            <div className="text-xs text-muted-foreground">{p.label}</div>
            <div className="text-2xl font-bold">{leads.filter((l) => campaignOf(l.campaign_id)?.platform === p.key).length}</div>
          </div>
        ))}
      </div>

      {perCampaign.length > 0 && (
        <div className="rounded-lg border bg-card p-4">
          <h2 className="mb-3 font-semibold">Leads per campaign</h2>
          <ResponsiveContainer width="100%" height={Math.max(160, perCampaign.length * 36)}>
            <BarChart data={perCampaign} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="leads" name="Leads" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              <Bar dataKey="won" name="Won" fill="hsl(var(--accent))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {manage && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3 rounded-lg border bg-card p-4">
            <h2 className="font-semibold">Bring leads in automatically</h2>
            <p className="text-sm text-muted-foreground">Paste this link into Zapier, Make or your ad tool's webhook. Send <code>campaign</code> and <code>platform</code> with each lead — new campaigns are created automatically.</p>
            {wsToken && (
              <div className="flex gap-2"><Input readOnly value={intakeUrl(wsToken)} className="text-xs" /><Button variant="outline" size="icon" onClick={() => copy(intakeUrl(wsToken), "Link")}><Copy className="h-4 w-4" /></Button></div>
            )}
            <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => e.target.files?.[0] && importCsv(e.target.files[0])} />
            <Button variant="outline" disabled={busy} onClick={() => fileRef.current?.click()}>{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}Upload CSV export</Button>
            <p className="text-xs text-muted-foreground">Direct LinkedIn, Facebook, TikTok and Google account connections and launching ads from here are coming next.</p>
          </div>
          <div className="space-y-3 rounded-lg border bg-card p-4">
            <h2 className="font-semibold">Campaigns</h2>
            <div className="flex gap-2">
              <Input placeholder="Campaign name" value={newName} onChange={(e) => setNewName(e.target.value)} maxLength={200} />
              <Select value={newPlatform} onValueChange={(v) => setNewPlatform(v as AdPlatform)}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>{AD_PLATFORMS.map((p) => <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>)}</SelectContent>
              </Select>
              <Button onClick={addCampaign}><Plus className="h-4 w-4" /></Button>
            </div>
            <div className="max-h-56 divide-y overflow-auto">
              {campaigns.map((c) => (
                <div key={c.id} className="flex items-center gap-2 py-2 text-sm">
                  <span className="flex-1 truncate">{c.name}</span>
                  <Badge variant="secondary">{platformLabel(c.platform)}</Badge>
                  {c.auto_created && <Badge variant="outline">Auto</Badge>}
                  <Button variant="ghost" size="sm" onClick={() => copyCampaignLink(c.id)}><Copy className="mr-1 h-3 w-3" />Link</Button>
                </div>
              ))}
              {!campaigns.length && <p className="py-2 text-sm text-muted-foreground">No campaigns yet.</p>}
            </div>
          </div>
        </div>
      )}

      <div className="rounded-lg border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b p-4">
          <h2 className="font-semibold">Leads ({shown.length})</h2>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All campaigns</SelectItem>
              {campaigns.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground"><tr className="border-b"><th className="p-3">Lead</th><th className="p-3">Campaign</th><th className="p-3">Assigned to</th><th className="p-3">Status</th></tr></thead>
            <tbody>
              {shown.map((l) => (
                <tr key={l.id} className="border-b last:border-0">
                  <td className="p-3"><div className="font-medium">{l.full_name || l.email || l.phone}</div><div className="text-xs text-muted-foreground">{[l.company, l.email, l.phone].filter(Boolean).join(" · ")}</div></td>
                  <td className="p-3"><div>{campaignOf(l.campaign_id)?.name}</div><div className="text-xs text-muted-foreground">{platformLabel(campaignOf(l.campaign_id)?.platform ?? "")}</div></td>
                  <td className="p-3">
                    {manage ? (
                      <Select value={l.assigned_to ?? "none"} onValueChange={(v) => updateLead(l.id, { assigned_to: v === "none" ? null : v })}>
                        <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="none">Unassigned</SelectItem>{members.map((m) => <SelectItem key={m.user_id} value={m.user_id}>{m.name}</SelectItem>)}</SelectContent>
                      </Select>
                    ) : nameOf(l.assigned_to)}
                  </td>
                  <td className="p-3">
                    {manage ? (
                      <Select value={l.status} onValueChange={(v) => updateLead(l.id, { status: v })}>
                        <SelectTrigger className="w-32 capitalize"><SelectValue /></SelectTrigger>
                        <SelectContent>{LEAD_STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
                      </Select>
                    ) : <Badge variant="outline" className="capitalize">{l.status}</Badge>}
                  </td>
                </tr>
              ))}
              {!shown.length && <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">{manage ? "No leads yet. Connect the link above or upload a CSV." : "No leads have been assigned to you yet."}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {canManageRoles(role) && (
        <div className="rounded-lg border bg-card p-4">
          <h2 className="mb-1 flex items-center gap-2 font-semibold"><Users className="h-4 w-4" /> Team roles</h2>
          <p className="mb-3 text-sm text-muted-foreground">Admin and Marketing can add campaigns, edit and assign leads. Sales can only view leads assigned to them.</p>
          <div className="divide-y">
            {members.map((m) => (
              <div key={m.user_id} className="flex items-center justify-between py-2 text-sm">
                <span>{m.name}{m.isOwner && <span className="text-muted-foreground"> (owner)</span>}</span>
                {m.isOwner ? <Badge>Admin</Badge> : (
                  <Select value={m.role} onValueChange={(v) => setMemberRole(m.user_id, v as TeamRole)}>
                    <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="admin">Admin</SelectItem><SelectItem value="marketing">Marketing</SelectItem><SelectItem value="sales">Sales</SelectItem></SelectContent>
                  </Select>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
