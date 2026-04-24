import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Sparkles,
  Mail,
  Workflow,
  Settings,
  HelpCircle,
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
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Logo } from "./Logo";
import { cn } from "@/lib/utils";

const mainItems = [
  { title: "Dashboard", url: "/app", icon: LayoutDashboard, end: true },
  { title: "Leads", url: "/app/leads", icon: Users, badge: "258" },
  { title: "AI Intelligence", url: "/app/intelligence", icon: Sparkles, badge: "AI" },
  { title: "Email Composer", url: "/app/composer", icon: Mail },
  { title: "Automation", url: "/app/automation", icon: Workflow },
];

const secondaryItems = [
  { title: "Settings", url: "/app/settings", icon: Settings },
  { title: "Help & Docs", url: "/app/help", icon: HelpCircle },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="px-4 py-5">
        {collapsed ? (
          <Logo showText={false} />
        ) : (
          <Logo variant="light" />
        )}
      </SidebarHeader>

      <SidebarContent className="px-2">
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
                    <SidebarMenuButton asChild className="h-10 px-3 data-[active=true]:bg-sidebar-accent">
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
                                active ? "text-sidebar-accent-foreground" : "text-sidebar-foreground/90"
                              )}
                            >
                              {item.title}
                            </span>
                            {item.badge && (
                              <span
                                className={cn(
                                  "ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded-md",
                                  item.badge === "AI"
                                    ? "bg-gradient-primary text-primary-foreground"
                                    : "bg-sidebar-accent text-sidebar-foreground/70"
                                )}
                              >
                                {item.badge}
                              </span>
                            )}
                          </>
                        )}
                        {active && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-r-full bg-sidebar-primary" />
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
              {secondaryItems.map((item) => (
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

      {!collapsed && (
        <SidebarFooter className="p-3">
          <div className="rounded-xl bg-gradient-to-br from-sidebar-accent to-sidebar-accent/40 p-4 border border-sidebar-border">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-sidebar-primary" />
              <span className="text-xs font-semibold text-sidebar-accent-foreground">
                Pro Plan
              </span>
            </div>
            <p className="text-[11px] text-sidebar-foreground/70 mb-3 leading-snug">
              You've used 71% of your AI credits this month.
            </p>
            <div className="h-1.5 rounded-full bg-sidebar-background overflow-hidden">
              <div className="h-full w-[71%] bg-gradient-primary rounded-full" />
            </div>
          </div>
        </SidebarFooter>
      )}
    </Sidebar>
  );
}
