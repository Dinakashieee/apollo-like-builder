import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function usePersonalSignatures() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["personal-signatures", user?.id], enabled: !!user,
    queryFn: async () => {
      if (!user) throw new Error("Sign in first");
      const [signatures, profile] = await Promise.all([
        supabase.from("email_signatures").select("id,name,content").eq("user_id", user.id).order("created_at"),
        supabase.from("profiles").select("email_signature,default_email_signature_id").eq("id", user.id).maybeSingle(),
      ]);
      if (signatures.error) throw signatures.error;
      if (profile.error) throw profile.error;
      return { signatures: signatures.data, defaultId: profile.data?.default_email_signature_id ?? "legacy", legacy: profile.data?.email_signature ?? "" };
    },
  });
}