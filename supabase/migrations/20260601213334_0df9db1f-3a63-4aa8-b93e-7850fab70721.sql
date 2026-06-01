-- Credit audit ledger: records every grant and consumption event for AI credits and SignalHire credits.

CREATE TABLE public.credit_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  user_id uuid,
  credit_type text NOT NULL CHECK (credit_type IN ('ai_email','signalhire')),
  delta integer NOT NULL,
  balance_after integer,
  reason text NOT NULL,
  ref_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_credit_ledger_ws_created ON public.credit_ledger (workspace_id, created_at DESC);
CREATE INDEX idx_credit_ledger_type ON public.credit_ledger (workspace_id, credit_type, created_at DESC);

GRANT SELECT ON public.credit_ledger TO authenticated;
GRANT ALL ON public.credit_ledger TO service_role;

ALTER TABLE public.credit_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members read credit ledger"
ON public.credit_ledger FOR SELECT
TO authenticated
USING (public.is_workspace_member(workspace_id, auth.uid()));

-- Update increment_ai_emails to also write a ledger row
CREATE OR REPLACE FUNCTION public.increment_ai_emails(_workspace_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_count integer;
  period date := date_trunc('month', now())::date;
BEGIN
  INSERT INTO public.usage_counters (workspace_id, period_start, ai_emails_used)
  VALUES (_workspace_id, period, 1)
  ON CONFLICT (workspace_id, period_start)
  DO UPDATE SET ai_emails_used = public.usage_counters.ai_emails_used + 1,
                updated_at = now()
  RETURNING ai_emails_used INTO new_count;

  INSERT INTO public.credit_ledger (workspace_id, credit_type, delta, balance_after, reason)
  VALUES (_workspace_id, 'ai_email', -1, new_count, 'ai_usage');

  RETURN new_count;
END;
$$;

-- Update grant_signalhire_credits to write ledger row
CREATE OR REPLACE FUNCTION public.grant_signalhire_credits(
  _workspace_id uuid,
  _credits integer,
  _source text,
  _external_id text
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_balance integer;
  inserted_count integer;
BEGIN
  INSERT INTO public.signalhire_credit_purchases (workspace_id, credits, source, external_id)
  VALUES (_workspace_id, _credits, _source, _external_id)
  ON CONFLICT (source, external_id) DO NOTHING;

  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  IF inserted_count = 0 THEN
    SELECT balance INTO new_balance FROM public.workspace_signalhire_credits WHERE workspace_id = _workspace_id;
    RETURN COALESCE(new_balance, 0);
  END IF;

  INSERT INTO public.workspace_signalhire_credits (workspace_id, balance, lifetime_purchased, updated_at)
  VALUES (_workspace_id, _credits, _credits, now())
  ON CONFLICT (workspace_id)
  DO UPDATE SET
    balance = workspace_signalhire_credits.balance + EXCLUDED.balance,
    lifetime_purchased = workspace_signalhire_credits.lifetime_purchased + EXCLUDED.lifetime_purchased,
    updated_at = now()
  RETURNING balance INTO new_balance;

  INSERT INTO public.credit_ledger (workspace_id, credit_type, delta, balance_after, reason, ref_id, metadata)
  VALUES (_workspace_id, 'signalhire', _credits, new_balance, 'purchase', _external_id, jsonb_build_object('source', _source));

  RETURN new_balance;
END;
$$;

-- Update consume_signalhire_credit to write ledger row
CREATE OR REPLACE FUNCTION public.consume_signalhire_credit(
  _workspace_id uuid,
  _amount integer DEFAULT 1
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_balance integer;
BEGIN
  IF _amount IS NULL OR _amount <= 0 THEN
    RAISE EXCEPTION 'amount must be positive';
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
$$;