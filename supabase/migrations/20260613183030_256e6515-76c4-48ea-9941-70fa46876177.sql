
ALTER TABLE public.landing_pages
  ADD COLUMN IF NOT EXISTS custom_domain text,
  ADD COLUMN IF NOT EXISTS custom_path text;

CREATE OR REPLACE FUNCTION public.tg_landing_pages_normalize()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.custom_domain IS NOT NULL THEN
    NEW.custom_domain := lower(trim(NEW.custom_domain));
    IF NEW.custom_domain = '' THEN NEW.custom_domain := NULL; END IF;
  END IF;
  IF NEW.custom_path IS NOT NULL THEN
    NEW.custom_path := lower(trim(both '/' from trim(NEW.custom_path)));
    IF NEW.custom_path = '' OR NEW.custom_path = 'p' THEN NEW.custom_path := NULL; END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_landing_pages_normalize ON public.landing_pages;
CREATE TRIGGER tg_landing_pages_normalize
  BEFORE INSERT OR UPDATE ON public.landing_pages
  FOR EACH ROW EXECUTE FUNCTION public.tg_landing_pages_normalize();

CREATE UNIQUE INDEX IF NOT EXISTS landing_pages_custom_domain_uq
  ON public.landing_pages (custom_domain) WHERE custom_domain IS NOT NULL;

DROP FUNCTION IF EXISTS public.get_public_landing_page(text);
DROP FUNCTION IF EXISTS public.get_public_landing_page(text, text, text);

CREATE OR REPLACE FUNCTION public.get_public_landing_page(
  _slug text DEFAULT NULL,
  _host text DEFAULT NULL,
  _path text DEFAULT NULL
)
RETURNS TABLE(
  id uuid, template text, title text,
  prospect_name text, prospect_company text,
  headline text, subheadline text, body text,
  cta_label text, cta_url text, ctas jsonb, blocks jsonb,
  logo_url text, accent_color text,
  slug text, custom_path text, custom_domain text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM (
    (SELECT id, template, title, prospect_name, prospect_company,
            headline, subheadline, body, cta_label, cta_url, ctas, blocks,
            logo_url, accent_color, slug, custom_path, custom_domain
     FROM public.landing_pages
     WHERE published = true
       AND _host IS NOT NULL
       AND custom_domain = lower(trim(_host))
     LIMIT 1)
    UNION ALL
    (SELECT id, template, title, prospect_name, prospect_company,
            headline, subheadline, body, cta_label, cta_url, ctas, blocks,
            logo_url, accent_color, slug, custom_path, custom_domain
     FROM public.landing_pages
     WHERE published = true
       AND _slug IS NOT NULL
       AND slug = _slug
       AND (
         _path IS NULL
         OR (custom_path IS NULL AND _path IN ('p',''))
         OR custom_path = _path
       )
     LIMIT 1)
  ) s
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_landing_page(text, text, text) TO anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.consume_signalhire_credit(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_signalhire_credit(uuid, integer) TO service_role;

REVOKE EXECUTE ON FUNCTION public.grant_signalhire_credits(uuid, integer, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.grant_signalhire_credits(uuid, integer, text, text) TO service_role;

REVOKE EXECUTE ON FUNCTION public.grant_signalhire_credits(uuid, uuid, integer, numeric, text, text, boolean, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.grant_signalhire_credits(uuid, uuid, integer, numeric, text, text, boolean, text) TO service_role;

REVOKE EXECUTE ON FUNCTION public.increment_ai_emails(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_ai_emails(uuid) TO service_role;

REVOKE EXECUTE ON FUNCTION public.get_current_ai_emails(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_current_ai_emails(uuid) TO service_role;

REVOKE EXECUTE ON FUNCTION public.current_lead_count(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_lead_count(uuid) TO service_role;
