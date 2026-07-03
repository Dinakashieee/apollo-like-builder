
-- 1. consume_signalhire_credit: add membership guard
CREATE OR REPLACE FUNCTION public.consume_signalhire_credit(_workspace_id uuid, _amount integer DEFAULT 1)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_balance integer;
BEGIN
  IF _amount IS NULL OR _amount <= 0 THEN
    RAISE EXCEPTION 'amount must be positive';
  END IF;

  IF current_user <> 'service_role' THEN
    IF auth.uid() IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.workspace_members
      WHERE workspace_id = _workspace_id AND user_id = auth.uid()
    ) THEN
      RAISE EXCEPTION 'forbidden';
    END IF;
  END IF;

  UPDATE public.workspace_signalhire_credits
  SET balance = balance - _amount,
      updated_at = now()
  WHERE workspace_id = _workspace_id
    AND balance >= _amount
  RETURNING balance INTO new_balance;

  IF new_balance IS NULL THEN
    RAISE EXCEPTION 'insufficient_credits';
  END IF;

  INSERT INTO public.credit_ledger (workspace_id, credit_type, delta, balance_after, reason)
  VALUES (_workspace_id, 'signalhire', -_amount, new_balance, 'reveal');

  RETURN new_balance;
END;
$function$;

-- 2. Restrict grant_signalhire_credits overloads to service_role
REVOKE EXECUTE ON FUNCTION public.grant_signalhire_credits(uuid, integer, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.grant_signalhire_credits(uuid, integer, text, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.grant_signalhire_credits(uuid, integer, text, text) TO service_role;

REVOKE EXECUTE ON FUNCTION public.grant_signalhire_credits(uuid, uuid, integer, numeric, text, text, boolean, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.grant_signalhire_credits(uuid, uuid, integer, numeric, text, text, boolean, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.grant_signalhire_credits(uuid, uuid, integer, numeric, text, text, boolean, text) TO service_role;

-- 3. Restrict quota/lead counters to service_role
REVOKE EXECUTE ON FUNCTION public.increment_ai_emails(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.increment_ai_emails(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.increment_ai_emails(uuid) TO service_role;

REVOKE EXECUTE ON FUNCTION public.get_current_ai_emails(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_current_ai_emails(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_ai_emails(uuid) TO service_role;

REVOKE EXECUTE ON FUNCTION public.current_lead_count(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.current_lead_count(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.current_lead_count(uuid) TO service_role;

-- 4. demo_requests: explicit deny-select policy for non-service roles
DROP POLICY IF EXISTS "No client reads on demo_requests" ON public.demo_requests;
CREATE POLICY "No client reads on demo_requests"
ON public.demo_requests
FOR SELECT
TO anon, authenticated
USING (false);

-- 5. email_accounts: revoke OAuth tokens from authenticated
REVOKE SELECT (refresh_token, access_token, access_token_expires_at, ms_subscription_id, ms_tenant_id)
  ON public.email_accounts FROM authenticated;

-- 6. email_sender_settings: revoke verification_code from authenticated
REVOKE SELECT (verification_code) ON public.email_sender_settings FROM authenticated;

-- 7. user_api_keys: revoke api_key column from authenticated
REVOKE SELECT (api_key) ON public.user_api_keys FROM authenticated;
