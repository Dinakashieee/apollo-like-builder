CREATE TABLE public.target_generation_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid,
  mode text NOT NULL DEFAULT 'generate',
  status text NOT NULL DEFAULT 'pending',
  progress integer NOT NULL DEFAULT 0,
  message text,
  result jsonb,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  CONSTRAINT target_generation_jobs_status_check CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  CONSTRAINT target_generation_jobs_progress_check CHECK (progress >= 0 AND progress <= 100)
);

GRANT SELECT ON public.target_generation_jobs TO authenticated;
GRANT ALL ON public.target_generation_jobs TO service_role;

ALTER TABLE public.target_generation_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read target generation jobs"
ON public.target_generation_jobs
FOR SELECT
TO authenticated
USING (public.is_workspace_member(workspace_id, auth.uid()));

CREATE INDEX idx_target_generation_jobs_workspace_created
ON public.target_generation_jobs (workspace_id, created_at DESC);

CREATE INDEX idx_target_generation_jobs_status_created
ON public.target_generation_jobs (status, created_at DESC);

CREATE TRIGGER target_generation_jobs_updated_at
BEFORE UPDATE ON public.target_generation_jobs
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();