import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShieldAlert, Loader2, Mail, Inbox, Users, RefreshCw } from "lucide-react";
import { usePlatformAdmin } from "@/hooks/usePlatformAdmin";
import { toast } from "sonner";
import { format } from "date-fns";

type Waitlist = {
  id: string;
  full_name: string;
  business_name: string;
  designation: string;
  email: string;
  mobile: string;
  status: string;
  notes: string | null;
  created_at: string;
};

type Ticket = {
  id: string;
  user_id: string;
  subject: string;
  message: string;
  status: string;
  created_at: string;
  updated_at: string;
};

const WAITLIST_STATUSES = ["waiting", "contacted", "approved", "rejected"];
const TICKET_STATUSES = ["open", "in_progress", "resolved", "closed"];

export default function Admin() {
  const { isAdmin, loading: adminLoading } = usePlatformAdmin();
  const [waitlist, setWaitlist] = useState<Waitlist[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ticketEmails, setTicketEmails] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [wRes, tRes] = await Promise.all([
      supabase.from("waitlist_signups").select("*").order("created_at", { ascending: false }),
      supabase.from("tickets").select("*").order("created_at", { ascending: false }),
    ]);
    if (wRes.error) toast.error("Failed to load waitlist");
    else setWaitlist((wRes.data as Waitlist[]) ?? []);
    if (tRes.error) toast.error("Failed to load tickets");
    else {
      const list = (tRes.data as Ticket[]) ?? [];
      setTickets(list);
      const ids = Array.from(new Set(list.map((t) => t.user_id)));
      if (ids.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id,email")
          .in("id", ids);
        const map: Record<string, string> = {};
        (profs ?? []).forEach((p: any) => (map[p.id] = p.email));
        setTicketEmails(map);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin]);

  const updateWaitlist = async (id: string, status: string) => {
    const { error } = await supabase
      .from("waitlist_signups")
      .update({ status: status as any })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Updated");
    setWaitlist((prev) => prev.map((w) => (w.id === id ? { ...w, status } : w)));
  };

  const updateTicket = async (id: string, status: string) => {
    const { error } = await supabase
      .from("tickets")
      .update({ status: status as any })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Updated");
    setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
  };

  if (adminLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="p-6 lg:p-8 max-w-2xl">
        <Card className="p-8 text-center space-y-3">
          <ShieldAlert className="h-10 w-10 text-destructive mx-auto" />
          <h2 className="font-display text-2xl font-bold">Restricted area</h2>
          <p className="text-sm text-muted-foreground">
            This page is only available to platform administrators.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 animate-fade-in max-w-6xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl lg:text-4xl font-display font-bold text-primary-deep">Admin</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Platform-wide view of waitlist signups and support tickets.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="waitlist">
        <TabsList>
          <TabsTrigger value="waitlist">
            <Users className="h-4 w-4 mr-2" /> Waitlist ({waitlist.length})
          </TabsTrigger>
          <TabsTrigger value="tickets">
            <Inbox className="h-4 w-4 mr-2" /> Support tickets ({tickets.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="waitlist" className="space-y-3 mt-4">
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : waitlist.length === 0 ? (
            <Card className="p-8 text-center text-sm text-muted-foreground">
              No waitlist signups yet.
            </Card>
          ) : (
            waitlist.map((w) => (
              <Card key={w.id} className="p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-primary-deep">{w.full_name}</p>
                      <Badge variant="secondary">{w.designation}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">{w.business_name}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
                      <a href={`mailto:${w.email}`} className="flex items-center gap-1 hover:text-primary">
                        <Mail className="h-3 w-3" /> {w.email}
                      </a>
                      <span>{w.mobile}</span>
                      <span>{format(new Date(w.created_at), "PP p")}</span>
                    </div>
                    {w.notes && <p className="text-xs mt-2 text-foreground/75">{w.notes}</p>}
                  </div>
                  <Select value={w.status} onValueChange={(v) => updateWaitlist(w.id, v)}>
                    <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {WAITLIST_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="tickets" className="space-y-3 mt-4">
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : tickets.length === 0 ? (
            <Card className="p-8 text-center text-sm text-muted-foreground">
              No support tickets yet.
            </Card>
          ) : (
            tickets.map((t) => {
              const email = ticketEmails[t.user_id];
              return (
                <Card key={t.id} className="p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-primary-deep">{t.subject}</p>
                      <p className="text-sm text-foreground/85 mt-1 whitespace-pre-wrap">{t.message}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
                        {email && (
                          <a href={`mailto:${email}?subject=Re: ${encodeURIComponent(t.subject)}`} className="flex items-center gap-1 hover:text-primary">
                            <Mail className="h-3 w-3" /> {email}
                          </a>
                        )}
                        <span>{format(new Date(t.created_at), "PP p")}</span>
                      </div>
                    </div>
                    <Select value={t.status} onValueChange={(v) => updateTicket(t.id, v)}>
                      <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TICKET_STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
