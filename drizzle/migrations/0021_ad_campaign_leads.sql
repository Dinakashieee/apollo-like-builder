CREATE TYPE public.team_role AS ENUM ('admin','marketing','sales');

CREATE TABLE public.workspace_team_roles (
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role public.team_role NOT NULL DEFAULT 'sales',
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspace_team_roles TO authenticated;
GRANT ALL ON public.workspace_team_roles TO service_role;
ALTER TABLE public.workspace_team_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.team_role_of(_workspace_id uuid, _user_id uuid)
RETURNS public.team_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM public.workspaces WHERE id = _workspace_id AND owner_id = _user_id) THEN 'admin'::public.team_role
    WHEN NOT public.is_workspace_member(_workspace_id, _user_id) THEN NULL
    ELSE coalesce((SELECT role FROM public.workspace_team_roles WHERE workspace_id = _workspace_id AND user_id = _user_id), 'sales'::public.team_role)
  END;
$$;

CREATE OR REPLACE FUNCTION public.can_manage_campaign_leads(_workspace_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(public.team_role_of(_workspace_id, _user_id) IN ('admin','marketing'), false);
$$;

CREATE POLICY "members read team roles" ON public.workspace_team_roles FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "admins manage team roles" ON public.workspace_team_roles FOR ALL TO authenticated
  USING (public.team_role_of(workspace_id, auth.uid()) = 'admin')
  WITH CHECK (public.team_role_of(workspace_id, auth.uid()) = 'admin' AND public.is_workspace_member(workspace_id, user_id));

CREATE TABLE public.ad_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  platform text NOT NULL DEFAULT 'other',
  intake_token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(18), 'hex'),
  auto_created boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ad_campaigns_platform_chk CHECK (platform IN ('linkedin','facebook','tiktok','google','other')),
  CONSTRAINT ad_campaigns_name_chk CHECK (length(btrim(name)) BETWEEN 1 AND 200)
);
CREATE UNIQUE INDEX ad_campaigns_ws_name_platform ON public.ad_campaigns (workspace_id, lower(btrim(name)), platform);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ad_campaigns TO authenticated;
GRANT ALL ON public.ad_campaigns TO service_role;
ALTER TABLE public.ad_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read campaigns" ON public.ad_campaigns FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "marketing inserts campaigns" ON public.ad_campaigns FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_campaign_leads(workspace_id, auth.uid()));
CREATE POLICY "marketing updates campaigns" ON public.ad_campaigns FOR UPDATE TO authenticated
  USING (public.can_manage_campaign_leads(workspace_id, auth.uid()))
  WITH CHECK (public.can_manage_campaign_leads(workspace_id, auth.uid()));
CREATE POLICY "marketing deletes campaigns" ON public.ad_campaigns FOR DELETE TO authenticated
  USING (public.can_manage_campaign_leads(workspace_id, auth.uid()));

CREATE TABLE public.ad_campaign_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES public.ad_campaigns(id) ON DELETE CASCADE,
  full_name text,
  email text,
  phone text,
  company text,
  message text,
  raw jsonb NOT NULL DEFAULT '{}'::jsonb,
  assigned_to uuid,
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ad_campaign_leads_status_chk CHECK (status IN ('new','contacted','qualified','won','lost'))
);
CREATE INDEX ad_campaign_leads_ws_idx ON public.ad_campaign_leads (workspace_id, created_at DESC);
CREATE INDEX ad_campaign_leads_assignee_idx ON public.ad_campaign_leads (assigned_to);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ad_campaign_leads TO authenticated;
GRANT ALL ON public.ad_campaign_leads TO service_role;
ALTER TABLE public.ad_campaign_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "marketing or assignee reads leads" ON public.ad_campaign_leads FOR SELECT TO authenticated
  USING (public.can_manage_campaign_leads(workspace_id, auth.uid()) OR (assigned_to = auth.uid() AND public.is_workspace_member(workspace_id, auth.uid())));
CREATE POLICY "marketing inserts leads" ON public.ad_campaign_leads FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_campaign_leads(workspace_id, auth.uid())
    AND EXISTS (SELECT 1 FROM public.ad_campaigns c WHERE c.id = campaign_id AND c.workspace_id = ad_campaign_leads.workspace_id)
    AND (assigned_to IS NULL OR public.is_workspace_member(workspace_id, assigned_to)));
CREATE POLICY "marketing updates leads" ON public.ad_campaign_leads FOR UPDATE TO authenticated
  USING (public.can_manage_campaign_leads(workspace_id, auth.uid()))
  WITH CHECK (public.can_manage_campaign_leads(workspace_id, auth.uid())
    AND EXISTS (SELECT 1 FROM public.ad_campaigns c WHERE c.id = campaign_id AND c.workspace_id = ad_campaign_leads.workspace_id)
    AND (assigned_to IS NULL OR public.is_workspace_member(workspace_id, assigned_to)));
CREATE POLICY "marketing deletes leads" ON public.ad_campaign_leads FOR DELETE TO authenticated
  USING (public.can_manage_campaign_leads(workspace_id, auth.uid()));
CREATE TRIGGER ad_campaign_leads_updated_at BEFORE UPDATE ON public.ad_campaign_leads FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.workspace_lead_intake (
  workspace_id uuid PRIMARY KEY REFERENCES public.workspaces(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(18), 'hex'),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.workspace_lead_intake TO authenticated;
GRANT ALL ON public.workspace_lead_intake TO service_role;
ALTER TABLE public.workspace_lead_intake ENABLE ROW LEVEL SECURITY;
CREATE POLICY "marketing reads intake" ON public.workspace_lead_intake FOR SELECT TO authenticated
  USING (public.can_manage_campaign_leads(workspace_id, auth.uid()));
CREATE POLICY "marketing creates intake" ON public.workspace_lead_intake FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_campaign_leads(workspace_id, auth.uid()));

CREATE OR REPLACE FUNCTION public.hide_campaign_intake_token()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$ BEGIN RETURN NEW; END; $$;
DROP FUNCTION public.hide_campaign_intake_token();
REVOKE SELECT (intake_token) ON public.ad_campaigns FROM authenticated;
GRANT SELECT (id, workspace_id, name, platform, auto_created, created_by, created_at) ON public.ad_campaigns TO authenticated;

CREATE OR REPLACE FUNCTION public.campaign_intake_token(_campaign_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT intake_token FROM public.ad_campaigns c WHERE c.id = _campaign_id AND public.can_manage_campaign_leads(c.workspace_id, auth.uid());
$$;
REVOKE EXECUTE ON FUNCTION public.campaign_intake_token(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.campaign_intake_token(uuid) TO authenticated;