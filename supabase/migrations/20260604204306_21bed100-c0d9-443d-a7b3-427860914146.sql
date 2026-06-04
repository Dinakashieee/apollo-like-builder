
CREATE TABLE public.landing_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  created_by uuid NOT NULL,
  slug text NOT NULL UNIQUE,
  template text NOT NULL DEFAULT 'minimal',
  title text NOT NULL,
  prospect_name text,
  prospect_company text,
  headline text,
  subheadline text,
  body text,
  cta_label text,
  cta_url text,
  logo_url text,
  accent_color text DEFAULT '#6366f1',
  published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_landing_pages_workspace ON public.landing_pages(workspace_id);
CREATE INDEX idx_landing_pages_slug ON public.landing_pages(slug);

GRANT SELECT ON public.landing_pages TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.landing_pages TO authenticated;
GRANT ALL ON public.landing_pages TO service_role;

ALTER TABLE public.landing_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view published pages"
  ON public.landing_pages FOR SELECT
  USING (published = true);

CREATE POLICY "Members can view workspace pages"
  ON public.landing_pages FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "Members can insert pages"
  ON public.landing_pages FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()) AND created_by = auth.uid());

CREATE POLICY "Members can update workspace pages"
  ON public.landing_pages FOR UPDATE TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "Members can delete workspace pages"
  ON public.landing_pages FOR DELETE TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));

CREATE TRIGGER landing_pages_updated_at
  BEFORE UPDATE ON public.landing_pages
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


CREATE TABLE public.landing_page_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id uuid NOT NULL REFERENCES public.landing_pages(id) ON DELETE CASCADE,
  visitor_id text,
  referrer text,
  user_agent text,
  country text,
  duration_ms integer DEFAULT 0,
  cta_clicked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_landing_page_views_page ON public.landing_page_views(page_id);
CREATE INDEX idx_landing_page_views_created ON public.landing_page_views(created_at DESC);

GRANT INSERT ON public.landing_page_views TO anon;
GRANT INSERT, UPDATE ON public.landing_page_views TO anon;
GRANT SELECT, INSERT, UPDATE ON public.landing_page_views TO authenticated;
GRANT ALL ON public.landing_page_views TO service_role;

ALTER TABLE public.landing_page_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can log a view"
  ON public.landing_page_views FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update own view by id"
  ON public.landing_page_views FOR UPDATE TO anon, authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Members can read views for workspace pages"
  ON public.landing_page_views FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.landing_pages p
    WHERE p.id = landing_page_views.page_id
      AND public.is_workspace_member(p.workspace_id, auth.uid())
  ));
