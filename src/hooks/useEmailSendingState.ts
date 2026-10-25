import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useEmailSendingState() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ["email-sending-state", user?.id];
  const query = useQuery({
    queryKey,
    enabled: !!user,
    refetchInterval: 15_000,
    queryFn: async () => {
      if (!user) return false;
      const { data, error } = await supabase.from("user_email_sending_state")
        .select("paused").eq("user_id", user.id).maybeSingle();
      if (error) throw error;
      return data?.paused ?? false;
    },
  });
  const mutation = useMutation({
    mutationFn: async (paused: boolean) => {
      if (!user) throw new Error("Sign in to change your sending status.");
      const { error } = await supabase.from("user_email_sending_state").upsert({
        user_id: user.id, paused, updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      return paused;
    },
    onSuccess: (paused) => {
      queryClient.setQueryData(queryKey, paused);
      void queryClient.invalidateQueries({ queryKey });
    },
  });
  return {
    paused: query.data ?? false,
    loading: query.isLoading,
    error: query.error,
    changing: mutation.isPending,
    setPaused: mutation.mutateAsync,
  };
}