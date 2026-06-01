-- 1. Balance table (one row per workspace)
CREATE TABLE public.workspace_signalhire_credits (
  workspace_id uuid PRIMARY KEY REFERENCES public.workspaces(id) ON DELETE CASCADE,
  balance integer NOT NULL DEFAULT 0,
  lifetime_purchased integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT balance_non_negative CHECK (balance >= 0)
);

GRANT SELECT ON public.workspace_signalhire_credits TO authenticated;
GRANT ALL ON public.workspace_signalhire_credits TO service_role;

ALTER TABLE public.workspace_signalhire_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view their credit balance"
  ON public.workspace_signalhire_credits
  FOR SELECT
  TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));

-- 2. Purchase ledger (idempotency by paypal order id)
CREATE TABLE public.signalhire_credit_purchases (
  paypal_order_id text PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  credits integer NOT NULL CHECK (credits > 0),
  amount_usd numeric(10,2) NOT NULL,
  plan_id text NOT NULL,
  is_subscription boolean NOT NULL DEFAULT false,
  paypal_subscription_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.signalhire_credit_purchases TO authenticated;
GRANT ALL ON public.signalhire_credit_purchases TO service_role;

ALTER TABLE public.signalhire_credit_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view their credit purchases"
  ON public.signalhire_credit_purchases
  FOR SELECT
  TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));

-- 3. Add credits (idempotent via order id)
CREATE OR REPLACE FUNCTION public.grant_signalhire_credits(
  _workspace_id uuid,
  _user_id uuid,
  _credits integer,
  _amount_usd numeric,
  _plan_id text,
  _paypal_order_id text,
  _is_subscription boolean DEFAULT false,
  _paypal_subscription_id text DEFAULT NULL
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inserted_count integer;
  new_balance integer;
BEGIN
  INSERT INTO public.signalhire_credit_purchases
    (paypal_order_id, workspace_id, user_id, credits, amount_usd, plan_id, is_subscription, paypal_subscription_id)
  VALUES
    (_paypal_order_id, _workspace_id, _user_id, _credits, _amount_usd, _plan_id, _is_subscription, _paypal_subscription_id)
  ON CONFLICT (paypal_order_id) DO NOTHING;

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

  RETURN new_balance;
END;
$$;

-- 4. Consume credits (called when a reveal happens)
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

  RETURN new_balance;
END;
$$;