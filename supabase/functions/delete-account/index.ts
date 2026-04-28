import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: userData, error: userErr } = await admin.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = userData.user.id;

    // 1. Find workspaces the user owns
    const { data: ownedWorkspaces } = await admin
      .from('workspaces')
      .select('id')
      .eq('owner_id', userId);

    const wsIds = (ownedWorkspaces ?? []).map((w) => w.id);

    if (wsIds.length > 0) {
      // 2. Best-effort wipe of workspace data (cascade isn't defined for these)
      const tables = [
        'leads', 'opportunities', 'activities', 'notifications',
        'company_profiles', 'products', 'sequences', 'sequence_enrollments',
        'sequence_steps', 'sequence_step_status', 'usage_counters',
        'workspace_invites', 'workspace_members',
      ];
      for (const t of tables) {
        await admin.from(t).delete().in('workspace_id', wsIds);
      }
      await admin.from('workspaces').delete().in('id', wsIds);
    }

    // 3. User-owned data outside workspaces
    await admin.from('user_api_keys').delete().eq('user_id', userId);
    await admin.from('tickets').delete().eq('user_id', userId);
    await admin.from('subscriptions').delete().eq('user_id', userId);
    await admin.from('profiles').delete().eq('id', userId);

    // 4. Delete the auth user
    const { error: delErr } = await admin.auth.admin.deleteUser(userId);
    if (delErr) {
      console.error('auth.admin.deleteUser failed:', delErr);
      return new Response(JSON.stringify({ error: 'Account data wiped, but auth deletion failed', detail: delErr.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('delete-account error:', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
