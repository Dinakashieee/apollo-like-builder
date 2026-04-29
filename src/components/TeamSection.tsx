import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useEntitlements } from "@/hooks/useEntitlements";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Users, UserPlus, Trash2, Crown, Mail } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Member {
  id: string;
  user_id: string;
  role: "owner" | "member";
  profile?: { full_name: string | null; email: string; avatar_url: string | null } | null;
}

interface Invite {
  id: string;
  email: string;
  role: "owner" | "member";
  created_at: string;
  accepted_at: string | null;
}

export function TeamSection() {
  const { user } = useAuth();
  const { current } = useWorkspace();
  const { tier } = useEntitlements();
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [sending, setSending] = useState(false);

  const SEAT_LIMITS: Record<string, number> = {
    free: 1,
    starter: 3,
    growth: 10,
    pro: Infinity,
  };
  const seatLimit = SEAT_LIMITS[tier] ?? 1;
  const seatsUsed = members.length + invites.filter((i) => !i.accepted_at).length;
  const seatsLeft = seatLimit === Infinity ? Infinity : Math.max(0, seatLimit - seatsUsed);
  const isOwner = current?.role === "owner";

  const refresh = useCallback(async () => {
    if (!current) return;
    const [membersRes, invitesRes] = await Promise.all([
      supabase
        .from("workspace_members")
        .select("id, user_id, role")
        .eq("workspace_id", current.id),
      supabase
        .from("workspace_invites")
        .select("id, email, role, created_at, accepted_at")
        .eq("workspace_id", current.id)
        .is("accepted_at", null)
        .order("created_at", { ascending: false }),
    ]);

    const memberRows = (membersRes.data ?? []) as Member[];
    const userIds = memberRows.map((m) => m.user_id);
    let profilesMap = new Map<string, Member["profile"]>();
    if (userIds.length) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email, avatar_url")
        .in("id", userIds);
      (profiles ?? []).forEach((p: any) => profilesMap.set(p.id, p));
    }
    setMembers(
      memberRows.map((m) => ({ ...m, profile: profilesMap.get(m.user_id) ?? null }))
    );
    setInvites((invitesRes.data ?? []) as Invite[]);
  }, [current]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const sendInvite = async () => {
    if (!current || !user) return;
    const email = inviteEmail.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      toast({ title: "Invalid email", variant: "destructive" });
      return;
    }
    if (seatsLeft <= 0) {
      toast({
        title: "Seat limit reached",
        description: `Your ${tier} plan allows ${seatLimit} seat${seatLimit === 1 ? "" : "s"}. Upgrade to invite more.`,
        variant: "destructive",
      });
      return;
    }
    setSending(true);
    const { error } = await supabase.from("workspace_invites").insert({
      workspace_id: current.id,
      email,
      role: "member",
      invited_by: user.id,
    });
    setSending(false);
    if (error) {
      toast({ title: "Could not invite", description: error.message, variant: "destructive" });
      return;
    }
    setInviteEmail("");
    toast({ title: "Invite sent", description: `${email} can now join when they sign up.` });
    refresh();
  };

  const revokeInvite = async (id: string) => {
    const { error } = await supabase.from("workspace_invites").delete().eq("id", id);
    if (error) {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
      return;
    }
    refresh();
  };

  const removeMember = async (memberId: string, memberUserId: string) => {
    if (memberUserId === current?.owner_id) {
      toast({ title: "Cannot remove the workspace owner", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("workspace_members").delete().eq("id", memberId);
    if (error) {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
      return;
    }
    refresh();
  };

  return (
    <section className="card-elevated p-6 space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-display font-bold text-lg text-primary-deep flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" /> Team & seats
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Invite teammates to collaborate in this workspace.
          </p>
        </div>
        <Badge variant="secondary" className="text-xs">
          {seatsUsed} / {seatLimit === Infinity ? "∞" : seatLimit} seats used
          <span className="ml-1.5 text-muted-foreground capitalize">· {tier} plan</span>
        </Badge>
      </div>

      {isOwner && (
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <Label htmlFor="invite-email">Invite by email</Label>
            <Input
              id="invite-email"
              type="email"
              placeholder="teammate@company.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="mt-1"
              disabled={seatsLeft <= 0}
            />
          </div>
          <Button
            onClick={sendInvite}
            disabled={sending || seatsLeft <= 0 || !inviteEmail}
            className="bg-gradient-primary"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            {sending ? "Sending..." : "Invite"}
          </Button>
        </div>
      )}

      {seatsLeft <= 0 && isOwner && (
        <div className="text-xs p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300">
          You've used all available seats on the <span className="font-semibold capitalize">{tier}</span> plan. Upgrade your plan to add more teammates.
        </div>
      )}

      <div className="space-y-2">
        <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Members</p>
        {members.map((m) => (
          <div
            key={m.id}
            className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/40"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-9 w-9 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground text-sm font-semibold shrink-0 overflow-hidden">
                {m.profile?.avatar_url ? (
                  <img src={m.profile.avatar_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  (m.profile?.full_name || m.profile?.email || "?").charAt(0).toUpperCase()
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">
                  {m.profile?.full_name || m.profile?.email || "Unknown user"}
                  {m.user_id === user?.id && (
                    <span className="ml-2 text-xs text-muted-foreground">(you)</span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground truncate">{m.profile?.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {m.role === "owner" ? (
                <Badge className="bg-primary/15 text-primary border-primary/30">
                  <Crown className="h-3 w-3 mr-1" /> Owner
                </Badge>
              ) : (
                <Badge variant="secondary">Member</Badge>
              )}
              {isOwner && m.user_id !== current?.owner_id && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => removeMember(m.id, m.user_id)}
                  className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {invites.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
            Pending invites
          </p>
          {invites.map((inv) => (
            <div
              key={inv.id}
              className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-dashed border-border/60"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{inv.email}</p>
                  <p className="text-xs text-muted-foreground">
                    Invited {new Date(inv.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              {isOwner && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => revokeInvite(inv.id)}
                  className="h-8 px-2 text-destructive hover:bg-destructive/10"
                >
                  Revoke
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
