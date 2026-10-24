DROP POLICY IF EXISTS "Paid plan required for landing uploads" ON storage.objects;
DROP POLICY IF EXISTS "Paid plan required for landing replacements" ON storage.objects;
CREATE OR REPLACE FUNCTION public.guard_landing_design() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE old_order jsonb; new_order jsonb; BEGIN
IF auth.uid() IS NULL AND auth.role()='service_role' THEN RETURN NEW; END IF;
IF public.can_customize_landing(NEW.workspace_id) THEN RETURN NEW; END IF;
IF TG_OP='INSERT' THEN
 IF NEW.brand_colors<>'{}'::jsonb OR (NEW.accent_color IS NOT NULL AND NEW.accent_color NOT IN ('#2d8a9e','#6366f1')) THEN RAISE EXCEPTION 'A paid workspace plan is required for custom colors'; END IF;
ELSE
 IF NEW.brand_colors IS DISTINCT FROM OLD.brand_colors OR NEW.accent_color IS DISTINCT FROM OLD.accent_color THEN RAISE EXCEPTION 'A paid workspace plan is required for custom colors'; END IF;
 SELECT coalesce(jsonb_agg(b->>'id' ORDER BY n),'[]'::jsonb) INTO old_order FROM jsonb_array_elements(OLD.blocks) WITH ORDINALITY t(b,n) WHERE EXISTS (SELECT 1 FROM jsonb_array_elements(NEW.blocks) x WHERE x->>'id'=b->>'id');
 SELECT coalesce(jsonb_agg(b->>'id' ORDER BY n),'[]'::jsonb) INTO new_order FROM jsonb_array_elements(NEW.blocks) WITH ORDINALITY t(b,n) WHERE EXISTS (SELECT 1 FROM jsonb_array_elements(OLD.blocks) x WHERE x->>'id'=b->>'id');
 IF old_order IS DISTINCT FROM new_order THEN RAISE EXCEPTION 'A paid workspace plan is required to reorder sections'; END IF;
END IF; RETURN NEW; END; $$;
CREATE OR REPLACE FUNCTION public.reserve_landing_image_credit(_workspace_id uuid) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE tier text; used integer; max_usage integer; BEGIN
IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'Forbidden'; END IF;
PERFORM pg_advisory_xact_lock(hashtextextended(_workspace_id::text,0));
tier := public.get_workspace_owner_tier(_workspace_id);
max_usage := CASE tier WHEN 'starter' THEN 2500 WHEN 'growth' THEN 10000 WHEN 'scale' THEN 25000 WHEN 'pro' THEN 2147483647 ELSE 25 END;
used := coalesce(public.get_current_ai_emails(_workspace_id),0);
IF used >= max_usage THEN RETURN false; END IF;
PERFORM public.increment_ai_emails(_workspace_id); RETURN true; END; $$;
REVOKE ALL ON FUNCTION public.reserve_landing_image_credit(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_landing_image_credit(uuid) TO service_role;