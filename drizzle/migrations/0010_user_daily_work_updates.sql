CREATE TABLE public.daily_work_updates (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL DEFAULT auth.uid(),
 workspace_id uuid NOT NULL REFERENCES public.workspaces(id),
 work_date date NOT NULL,
 completed text NOT NULL CHECK (char_length(trim(completed)) BETWEEN 1 AND 4000),
 next_steps text NOT NULL DEFAULT '' CHECK (char_length(next_steps) <= 4000),
 blockers text NOT NULL DEFAULT '' CHECK (char_length(blockers) <= 4000),
 timezone text NOT NULL CHECK (char_length(timezone) BETWEEN 1 AND 100),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(user_id, workspace_id, work_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_work_updates TO authenticated;
GRANT ALL ON public.daily_work_updates TO service_role;
ALTER TABLE public.daily_work_updates ENABLE ROW LEVEL SECURITY;
CREATE POLICY daily_updates_select ON public.daily_work_updates FOR SELECT TO authenticated USING (user_id = auth.uid() AND public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY daily_updates_insert ON public.daily_work_updates FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY daily_updates_update ON public.daily_work_updates FOR UPDATE TO authenticated USING (user_id = auth.uid() AND public.is_workspace_member(workspace_id, auth.uid())) WITH CHECK (user_id = auth.uid() AND public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY daily_updates_delete ON public.daily_work_updates FOR DELETE TO authenticated USING (user_id = auth.uid() AND public.is_workspace_member(workspace_id, auth.uid()));
CREATE TRIGGER daily_work_updates_updated_at BEFORE UPDATE ON public.daily_work_updates FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();