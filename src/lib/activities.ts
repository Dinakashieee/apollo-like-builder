import { supabase } from "@/integrations/supabase/client";

export async function logActivity(
  workspaceId: string,
  userId: string | undefined,
  type: string,
  description: string,
  metadata: Record<string, unknown> = {}
) {
  await supabase.from("activities").insert({
    workspace_id: workspaceId,
    user_id: userId ?? null,
    type,
    description,
    metadata: metadata as any,
  });
}
