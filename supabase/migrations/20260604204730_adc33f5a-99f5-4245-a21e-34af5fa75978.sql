ALTER TABLE public.landing_pages ADD COLUMN ctas jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.landing_page_views ADD COLUMN cta_index integer;