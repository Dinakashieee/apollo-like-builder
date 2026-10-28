import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";

export function useLeadLists() {
  const { current } = useWorkspace();
  const workspaceId = current?.id;
  const client = useQueryClient();
  const key = ["lead-lists", workspaceId];
  const query = useQuery({
    queryKey: key,
    enabled: !!workspaceId,
    queryFn: async () => {
      if (!workspaceId) return { lists: [], members: [] };
      const [lists, members] = await Promise.all([
        supabase.from("lead_lists").select("id, name").eq("workspace_id", workspaceId).order("name"),
        supabase.from("lead_list_members").select("list_id, lead_id").eq("workspace_id", workspaceId),
      ]);
      if (lists.error) throw lists.error;
      if (members.error) throw members.error;
      return { lists: lists.data, members: members.data };
    },
  });
  const mutation = useMutation({
    mutationFn: async (action: { kind: "create"; name: string } | { kind: "delete"; id: string } | { kind: "add" | "remove"; id: string; leadIds: string[] }) => {
      if (!workspaceId) throw new Error("Select a workspace first.");
      if (action.kind === "create") {
        const { error } = await supabase.from("lead_lists").insert({ workspace_id: workspaceId, name: action.name.trim() });
        if (error) throw error;
      } else if (action.kind === "delete") {
        const { error } = await supabase.from("lead_lists").delete().eq("workspace_id", workspaceId).eq("id", action.id);
        if (error) throw error;
      } else if (action.kind === "add") {
        const { error } = await supabase.from("lead_list_members").upsert(action.leadIds.map(lead_id => ({ workspace_id: workspaceId, list_id: action.id, lead_id })), { onConflict: "list_id,lead_id", ignoreDuplicates: true });
        if (error) throw error;
      } else {
        const { error } = await supabase.from("lead_list_members").delete().eq("workspace_id", workspaceId).eq("list_id", action.id).in("lead_id", action.leadIds);
        if (error) throw error;
      }
    },
    onSuccess: () => client.invalidateQueries({ queryKey: key }),
  });
  return { ...query, lists: query.data?.lists ?? [], members: query.data?.members ?? [], save: mutation.mutateAsync, saving: mutation.isPending };
}