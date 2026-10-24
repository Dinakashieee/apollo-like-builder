ALTER TABLE public.landing_pages ADD COLUMN IF NOT EXISTS brand_colors jsonb NOT NULL DEFAULT '{}'::jsonb, ADD COLUMN IF NOT EXISTS hero_image_url text, ADD COLUMN IF NOT EXISTS campaign_id uuid;
CREATE OR REPLACE FUNCTION public.can_customize_landing(_workspace_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT public.is_workspace_member(_workspace_id,auth.uid()) AND EXISTS (SELECT 1 FROM public.workspaces w JOIN public.subscriptions s ON s.user_id=w.owner_id WHERE w.id=_workspace_id AND s.product_id IN ('starter_plan','growth_plan','scale_plan','pro_plan') AND ((s.status IN ('active','trialing','past_due') AND (s.current_period_end IS NULL OR s.current_period_end>now())) OR (s.status='canceled' AND s.current_period_end>now()))); $$;
REVOKE ALL ON FUNCTION public.can_customize_landing(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.can_customize_landing(uuid) TO authenticated,service_role;
CREATE OR REPLACE FUNCTION public.guard_landing_design() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE old_order jsonb; new_order jsonb; BEGIN
IF auth.uid() IS NULL AND auth.role()='service_role' THEN RETURN NEW; END IF;
IF public.can_customize_landing(NEW.workspace_id) THEN RETURN NEW; END IF;
IF TG_OP='INSERT' THEN
 IF NEW.brand_colors<>'{}'::jsonb OR NEW.hero_image_url IS NOT NULL OR (NEW.accent_color IS NOT NULL AND NEW.accent_color NOT IN ('#2d8a9e','#6366f1')) THEN RAISE EXCEPTION 'A paid workspace plan is required for custom colors and images'; END IF;
ELSE
 IF NEW.brand_colors IS DISTINCT FROM OLD.brand_colors OR NEW.hero_image_url IS DISTINCT FROM OLD.hero_image_url OR NEW.accent_color IS DISTINCT FROM OLD.accent_color THEN RAISE EXCEPTION 'A paid workspace plan is required for custom colors and images'; END IF;
 SELECT coalesce(jsonb_agg(b->>'id' ORDER BY n),'[]'::jsonb) INTO old_order FROM jsonb_array_elements(OLD.blocks) WITH ORDINALITY t(b,n) WHERE EXISTS (SELECT 1 FROM jsonb_array_elements(NEW.blocks) x WHERE x->>'id'=b->>'id');
 SELECT coalesce(jsonb_agg(b->>'id' ORDER BY n),'[]'::jsonb) INTO new_order FROM jsonb_array_elements(NEW.blocks) WITH ORDINALITY t(b,n) WHERE EXISTS (SELECT 1 FROM jsonb_array_elements(OLD.blocks) x WHERE x->>'id'=b->>'id');
 IF old_order IS DISTINCT FROM new_order THEN RAISE EXCEPTION 'A paid workspace plan is required to reorder sections'; END IF;
END IF;
RETURN NEW; END; $$;
CREATE TRIGGER landing_design_entitlement BEFORE INSERT OR UPDATE ON public.landing_pages FOR EACH ROW EXECUTE FUNCTION public.guard_landing_design();
CREATE POLICY "Paid plan required for landing uploads" ON storage.objects AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (bucket_id <> 'landing-assets' OR public.can_customize_landing((storage.foldername(name))[1]::uuid));
CREATE POLICY "Paid plan required for landing replacements" ON storage.objects AS RESTRICTIVE FOR UPDATE TO authenticated USING (bucket_id <> 'landing-assets' OR public.can_customize_landing((storage.foldername(name))[1]::uuid)) WITH CHECK (bucket_id <> 'landing-assets' OR public.can_customize_landing((storage.foldername(name))[1]::uuid));
CREATE OR REPLACE FUNCTION public.get_public_landing_design(_page_id uuid) RETURNS TABLE(brand_colors jsonb, hero_image_url text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT brand_colors,hero_image_url FROM public.landing_pages WHERE id=_page_id AND published=true; $$;
REVOKE ALL ON FUNCTION public.get_public_landing_design(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_landing_design(uuid) TO anon,authenticated,service_role;