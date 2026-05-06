import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Sparkles,
  Mail,
  Workflow,
  Settings,
  HelpCircle,
  Building2,
  Target,
  LifeBuoy,
  ShieldCheck,
  Bell,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import { Logo } from "./Logo";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/hooks/useWorkspace";
import { usePlatformAdmin } from "@/hooks/usePlatformAdmin";

const mainItems = [
  { title: "Dashboard", url: "/app", icon: LayoutDashboard, end: true },
  { title: "Leads", url: "/app/leads", icon: Users },
  
  { title: "AI Insights", url: "/app/intelligence", icon: Sparkles, badge: "AI" },
  { title: "Targets", url: "/app/targets", icon: Target },
  { title: "Email Composer", url: "/app/composer", icon: Mail },
  { title: "Automation", url: "/app/automation", icon: Workflow },
  { title: "Follow-ups", url: "/app/reminders", icon: Bell },
];

const secondaryItems = [
  { title: "Company", url: "/app/company", icon: Building2 },
  { title: "Settings", url: "/app/settings", icon: Settings },
  { title: "Help", url: "/app/help", icon: HelpCircle },
  { title: "Support", url: "/app/support", icon: LifeBuoy },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();
  const { current } = useWorkspace();
  const { isAdmin } = usePlatformAdmin();
  const accountItems = isAdmin
    ? [...secondaryItems, { title: "Admin", url: "/app/admin", icon: ShieldCheck }]
    : secondaryItems;

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="px-4 py-5">
        {collapsed ? <Logo showText={false} /> : <Logo variant="light" />}
      </SidebarHeader>

      <SidebarContent className="px-2">
        {!collapsed && current && (
          <div className="px-3 pb-3 mb-1">
            <p className="text-[10px] uppercase tracking-widest text-sidebar-foreground/50 font-semibold">
              Workspace
            </p>
            <p className="text-sm font-semibold text-sidebar-accent-foreground truncate">
              {current.name}
            </p>
          </div>
        )}

        <SidebarGroup>
          {!collapsed && (
            <SidebarGroupLabel className="text-sidebar-foreground/50 uppercase text-[10px] tracking-widest font-semibold px-3">
              Workspace
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {mainItems.map((item) => {
                const active = item.end
                  ? pathname === item.url
                  : pathname.startsWith(item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      className="h-10 px-3 data-[active=true]:bg-sidebar-accent"
                    >
                      <NavLink to={item.url} end={item.end}>
                        <item.icon
                          className={cn(
                            "h-[18px] w-[18px] shrink-0 transition-colors",
                            active ? "text-sidebar-primary" : "text-sidebar-foreground/70"
                          )}
                        />
                        {!collapsed && (
                          <>
                            <span
                              className={cn(
                                "text-sm font-medium",
                                active
                                  ? "text-sidebar-accent-foreground"
                                  : "text-sidebar-foreground/90"
                              )}
                            >
                              {item.title}
                            </span>
                            {item.badge && (
                              <span className="ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-gradient-primary text-primary-foreground">
                                {item.badge}
                              </span>
                            )}
                          </>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-6">
          {!collapsed && (
            <SidebarGroupLabel className="text-sidebar-foreground/50 uppercase text-[10px] tracking-widest font-semibold px-3">
              Account
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {accountItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="h-10 px-3">
                    <NavLink to={item.url}>
                      <item.icon className="h-[18px] w-[18px] text-sidebar-foreground/70" />
                      {!collapsed && (
                        <span className="text-sm font-medium text-sidebar-foreground/90">
                          {item.title}
                        </span>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
