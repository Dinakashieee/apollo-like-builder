
-- 1. Hide verification_code from the client; only service_role can read it
REVOKE SELECT ON public.email_sender_settings FROM authenticated, anon;
GRANT SELECT (id, workspace_id, mode, from_name, from_email, reply_to, verified, last_verification_sent_at, created_at, updated_at)
  ON public.email_sender_settings TO authenticated;

-- 2. Trigger: clients can NEVER directly elevate `verified`
-- - builtin mode → always verified
-- - custom mode → verified resets to false whenever from_email changes / on insert
-- - service_role bypasses (the verify-sender-code edge function uses it)
CREATE OR REPLACE FUNCTION public.tg_email_sender_settings_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_user = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF NEW.mode = 'builtin' THEN
    NEW.verified := true;
    NEW.verification_code := NULL;
    RETURN NEW;
  END IF;

  -- custom mode: do not let the client set verified/verification_code/last_verification_sent_at directly
  IF TG_OP = 'INSERT' THEN
    NEW.verified := false;
    NEW.verification_code := NULL;
    NEW.last_verification_sent_at := NULL;
  ELSE
    NEW.verification_code := OLD.verification_code;
    NEW.last_verification_sent_at := OLD.last_verification_sent_at;
    IF NEW.from_email IS DISTINCT FROM OLD.from_email THEN
      NEW.verified := false;
    ELSE
      NEW.verified := OLD.verified;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS email_sender_settings_guard ON public.email_sender_settings;
CREATE TRIGGER email_sender_settings_guard
BEFORE INSERT OR UPDATE ON public.email_sender_settings
FOR EACH ROW EXECUTE FUNCTION public.tg_email_sender_settings_guard();
