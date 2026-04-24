import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Bell, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function AppLayout() {
  return (
    <SidebarProvider defaultOpen>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-16 flex items-center gap-3 border-b border-border/60 bg-card/50 backdrop-blur-xl px-4 sticky top-0 z-30">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
            <div className="hidden md:flex relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search leads, companies, deals..."
                className="pl-9 h-9 bg-muted/40 border-border/60 focus-visible:ring-1"
              />
              <kbd className="hidden lg:inline-flex absolute right-3 top-1/2 -translate-y-1/2 items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground bg-background border border-border/60 rounded">
                ⌘K
              </kbd>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Button variant="ghost" size="icon" className="relative h-9 w-9">
                <Bell className="h-[18px] w-[18px] text-muted-foreground" />
                <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-hot ring-2 ring-card" />
              </Button>
              <div className="h-9 w-9 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground text-sm font-semibold shadow-glow">
                NE
              </div>
            </div>
          </header>
          <main className="flex-1 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
