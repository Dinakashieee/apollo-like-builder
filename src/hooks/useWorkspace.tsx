import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface Workspace {
  id: string;
  name: string;
  owner_id: string;
  role: "owner" | "member";
}

interface WorkspaceCtx {
  workspaces: Workspace[];
  current: Workspace | null;
  loading: boolean;
  setCurrent: (w: Workspace) => void;
  refresh: () => Promise<void>;
}

const Ctx = createContext<WorkspaceCtx>({
  workspaces: [],
  current: null,
  loading: true,
  setCurrent: () => {},
  refresh: async () => {},
});

const STORAGE_KEY = "engageiq.workspaceId";

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [current, setCurrentState] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setWorkspaces([]);
      setCurrentState(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("workspace_members")
      .select("role, workspace:workspaces(id, name, owner_id)")
      .eq("user_id", user.id);

    if (error) {
      console.error("workspace fetch", error);
      setLoading(false);
      return;
    }
    const list: Workspace[] = (data ?? [])
      .filter((r: any) => r.workspace)
      .map((r: any) => ({
        id: r.workspace.id,
        name: r.workspace.name,
        owner_id: r.workspace.owner_id,
        role: r.role,
      }));
    setWorkspaces(list);
    const savedId = localStorage.getItem(STORAGE_KEY);
    const found = list.find((w) => w.id === savedId) ?? list[0] ?? null;
    setCurrentState(found);
    if (found) localStorage.setItem(STORAGE_KEY, found.id);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Auto-seed demo data once per workspace (only for the owner, only if never seeded)
  useEffect(() => {
    if (!current || current.role !== "owner") return;
    let cancelled = false;
    (async () => {
      const { data: ws } = await supabase
        .from("workspaces")
        .select("demo_seeded_at")
        .eq("id", current.id)
        .maybeSingle();
      if (cancelled || !ws || ws.demo_seeded_at) return;
      // Fire-and-forget — function is idempotent server-side too
      supabase.functions
        .invoke("seed-demo-data", { body: { workspaceId: current.id } })
        .catch((e) => console.warn("auto-seed failed", e));
    })();
    return () => {
      cancelled = true;
    };
  }, [current?.id, current?.role]);

  const setCurrent = (w: Workspace) => {
    setCurrentState(w);
    localStorage.setItem(STORAGE_KEY, w.id);
  };

  return (
    <Ctx.Provider value={{ workspaces, current, loading, setCurrent, refresh }}>
      {children}
    </Ctx.Provider>
  );
}

export const useWorkspace = () => useContext(Ctx);
