CREATE TABLE public.daily_work_tasks (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 update_id uuid NOT NULL REFERENCES public.daily_work_updates(id) ON DELETE CASCADE,
 user_id uuid NOT NULL,
 workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
 note text NOT NULL CHECK (length(btrim(note)) BETWEEN 1 AND 4000),
 status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','done')),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(update_id, note)
);
GRANT SELECT ON public.daily_work_tasks TO authenticated;
GRANT UPDATE(status) ON public.daily_work_tasks TO authenticated;
GRANT ALL ON public.daily_work_tasks TO service_role;
ALTER TABLE public.daily_work_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read their daily tasks" ON public.daily_work_tasks FOR SELECT TO authenticated USING (user_id = auth.uid() AND public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "Users complete their daily tasks" ON public.daily_work_tasks FOR UPDATE TO authenticated USING (user_id = auth.uid() AND public.is_workspace_member(workspace_id, auth.uid())) WITH CHECK (user_id = auth.uid() AND public.is_workspace_member(workspace_id, auth.uid()));
CREATE TRIGGER daily_work_tasks_updated_at BEFORE UPDATE ON public.daily_work_tasks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE FUNCTION public.daily_next_step_lines(_text text) RETURNS TABLE(note text) LANGUAGE sql IMMUTABLE SET search_path = public AS $$
 SELECT DISTINCT btrim(regexp_replace(line, '^\s*([-*•]|[0-9]+[.)])\s+', '')) AS note
 FROM regexp_split_to_table(coalesce(_text,''), E'\r?\n') AS line
 WHERE btrim(regexp_replace(line, '^\s*([-*•]|[0-9]+[.)])\s+', '')) <> '';
$$;
CREATE FUNCTION public.sync_daily_work_tasks() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 INSERT INTO public.daily_work_tasks(update_id,user_id,workspace_id,note)
 SELECT NEW.id,NEW.user_id,NEW.workspace_id,note FROM public.daily_next_step_lines(NEW.next_steps)
 ON CONFLICT(update_id,note) DO NOTHING;
 DELETE FROM public.daily_work_tasks t WHERE t.update_id = NEW.id AND NOT EXISTS (SELECT 1 FROM public.daily_next_step_lines(NEW.next_steps) n WHERE n.note = t.note);
 RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.sync_daily_work_tasks() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER sync_daily_work_tasks AFTER INSERT OR UPDATE OF next_steps ON public.daily_work_updates FOR EACH ROW EXECUTE FUNCTION public.sync_daily_work_tasks();
INSERT INTO public.daily_work_tasks(update_id,user_id,workspace_id,note)
 SELECT u.id,u.user_id,u.workspace_id,n.note FROM public.daily_work_updates u CROSS JOIN LATERAL public.daily_next_step_lines(u.next_steps) n ON CONFLICT(update_id,note) DO NOTHING;
CREATE INDEX daily_work_tasks_owner_workspace ON public.daily_work_tasks(user_id,workspace_id);