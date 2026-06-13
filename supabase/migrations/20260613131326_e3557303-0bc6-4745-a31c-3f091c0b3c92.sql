
ALTER TABLE public.landing_pages
  ADD COLUMN IF NOT EXISTS blocks jsonb NOT NULL DEFAULT '[]'::jsonb;

DROP FUNCTION IF EXISTS public.get_public_landing_page(text);

CREATE OR REPLACE FUNCTION public.get_public_landing_page(_slug text)
 RETURNS TABLE(id uuid, template text, title text, prospect_name text, prospect_company text, headline text, subheadline text, body text, cta_label text, cta_url text, ctas jsonb, blocks jsonb, logo_url text, accent_color text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT id, template, title, prospect_name, prospect_company,
         headline, subheadline, body, cta_label, cta_url, ctas, blocks,
         logo_url, accent_color
  FROM public.landing_pages
  WHERE slug = _slug AND published = true
  LIMIT 1;
$function$;
