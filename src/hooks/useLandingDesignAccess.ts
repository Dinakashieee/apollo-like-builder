import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { canUsePaidDesign } from '@/lib/landingCampaignDesign';

export function useLandingDesignAccess(workspaceId?: string) {
  const [state, setState] = useState({ workspaceId: '', allowed: false, loading: true });
  useEffect(() => {
    let active = true;
    if (!workspaceId) return;
    setState({ workspaceId, allowed: false, loading: true });
    supabase.rpc('can_customize_landing', { _workspace_id: workspaceId }).then(({ data, error }) => {
      if (active) setState({ workspaceId, allowed: !error && data === true, loading: false });
    });
    return () => { active = false; };
  }, [workspaceId]);
  const loading = state.loading || state.workspaceId !== workspaceId;
  return { loading, allowed: canUsePaidDesign(loading, state.allowed) };
}