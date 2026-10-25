import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function useSignalHireProviderCredits() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['signalhire-provider-credits', user?.id],
    enabled: !!user,
    staleTime: 60000,
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('signalhire-test');
      if (error) throw new Error('SignalHire balance unavailable. Please retry.');
      if (!data?.ok) throw new Error(data?.error || 'SignalHire balance unavailable');
      if (typeof data.providerCredits !== 'number') throw new Error('SignalHire returned an unreadable balance');
      return data.providerCredits as number;
    },
  });
}