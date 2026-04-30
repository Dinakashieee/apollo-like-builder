import { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Search, LogOut, User as UserIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";
import { supabase } from "@/integrations/supabase/client";
import { NotificationBell } from "./NotificationBell";
import { PaymentTestModeBanner } from "./PaymentTestModeBanner";
import { ChatWidget } from "./ChatWidget";
import { CreditsPill } from "./CreditsPill";
import { EmailConfirmBanner } from "./EmailConfirmBanner";
import { PresenceIndicator } from "./PresenceIndicator";
import { ConnectInboxBanner } from "./ConnectInboxBanner";

export function AppLayout() {
  const { user, signOut } = useAuth();
  const { current } = useWorkspace();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<{ full_name: string | null; avatar_url: string | null } | null>(
    null
  );
  const [companyExists, setCompanyExists] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("full_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => setProfile(data ?? { full_name: null, avatar_url: null }));
  }, [user]);

  useEffect(() => {
    if (!current) return;
    supabase
      .from("company_profiles")
      .select("id")
      .eq("workspace_id", current.id)
      .maybeSingle()
      .then(({ data }) => {
        setCompanyExists(!!data);
        if (!data && window.location.pathname === "/app") navigate("/onboarding");
      });
  }, [current, navigate]);

  const initials =
    profile?.full_name
      ?.split(" ")
      .map((s) => s[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? "U";

  return (
    <SidebarProvider defaultOpen>
      <div className="min-h-screen flex w-full bg-background flex-col">
        <PaymentTestModeBanner />
        <EmailConfirmBanner />
        <ConnectInboxBanner />
        <div className="flex-1 flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-16 flex items-center gap-3 border-b border-border/60 bg-card/50 backdrop-blur-xl px-4 sticky top-0 z-30">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
            <div className="hidden md:flex relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search leads, companies..."
                className="pl-9 h-9 bg-muted/40 border-border/60 focus-visible:ring-1"
              />
            </div>
            <div className="ml-auto flex items-center gap-2">
              <PresenceIndicator />
              <CreditsPill />
              <NotificationBell />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="h-9 w-9 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground text-sm font-semibold shadow-glow overflow-hidden">
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt="avatar" className="h-full w-full object-cover" />
                    ) : (
                      initials
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <p className="text-sm font-semibold">{profile?.full_name ?? user?.email}</p>
                    <p className="text-xs text-muted-foreground font-normal truncate">{user?.email}</p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/app/settings")}>
                    <UserIcon className="h-4 w-4 mr-2" /> Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={async () => {
                      await signOut();
                      navigate("/auth");
                    }}
                  >
                    <LogOut className="h-4 w-4 mr-2" /> Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          <main className="flex-1 overflow-auto">
            <Outlet />
          </main>
        </div>
        </div>
        <ChatWidget mode="assistant" />
      </div>
    </SidebarProvider>
  );
}
