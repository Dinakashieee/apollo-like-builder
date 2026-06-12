
-- 1. Lock down landing_pages public SELECT — remove anon access; require workspace membership.
DROP POLICY IF EXISTS "Anyone can view published landing pages" ON public.landing_pages;
DROP POLICY IF EXISTS "Public can read published landing pages" ON public.landing_pages;
DROP POLICY IF EXISTS "Public can view published landing pages" ON public.landing_pages;
REVOKE SELECT ON public.landing_pages FROM anon;

-- 2. Secure RPC to fetch a single published landing page by slug.
CREATE OR REPLACE FUNCTION public.get_public_landing_page(_slug text)
RETURNS TABLE (
  id uuid,
  template text,
  title text,
  prospect_name text,
  prospect_company text,
  headline text,
  subheadline text,
  body text,
  cta_label text,
  cta_url text,
  ctas jsonb,
  logo_url text,
  accent_color text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, template, title, prospect_name, prospect_company,
         headline, subheadline, body, cta_label, cta_url, ctas,
         logo_url, accent_color
  FROM public.landing_pages
  WHERE slug = _slug AND published = true
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.get_public_landing_page(text) TO anon, authenticated;

-- 3. Drop permissive anon INSERT on landing_page_views.
DROP POLICY IF EXISTS "Anyone can log a view" ON public.landing_page_views;
DROP POLICY IF EXISTS "Public can insert views" ON public.landing_page_views;
DROP POLICY IF EXISTS "Anyone can insert views" ON public.landing_page_views;
REVOKE INSERT ON public.landing_page_views FROM anon;

-- 4. Secure RPC to log a view; validates the slug + published flag and returns the new view id.
CREATE OR REPLACE FUNCTION public.log_landing_view(
  _slug text,
  _visitor_id text,
  _referrer text DEFAULT NULL,
  _user_agent text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_page_id uuid;
  v_view_id uuid;
BEGIN
  SELECT id INTO v_page_id
  FROM public.landing_pages
  WHERE slug = _slug AND published = true
  LIMIT 1;

  IF v_page_id IS NULL THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.landing_page_views (page_id, visitor_id, referrer, user_agent)
  VALUES (v_page_id, _visitor_id, _referrer, _user_agent)
  RETURNING id INTO v_view_id;

  RETURN v_view_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.log_landing_view(text, text, text, text) TO anon, authenticated;
