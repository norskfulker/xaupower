-- Payment create helpers (authenticated) + payout webhook helpers (service_role)

CREATE OR REPLACE FUNCTION public.create_waiting_payment(
  p_package_id uuid,
  p_currency public.crypto_currency
)
RETURNS public.payments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_price numeric;
  v_payment public.payments%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT price_usd INTO v_price
  FROM public.packages
  WHERE id = p_package_id AND is_active = true;

  IF v_price IS NULL THEN
    RAISE EXCEPTION 'package not found';
  END IF;

  INSERT INTO public.payments (
    user_id, package_id, currency, amount_usd, status
  )
  VALUES (
    v_user_id, p_package_id, p_currency, v_price, 'waiting'
  )
  RETURNING * INTO v_payment;

  RETURN v_payment;
END;
$$;

REVOKE ALL ON FUNCTION public.create_waiting_payment(uuid, public.crypto_currency) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_waiting_payment(uuid, public.crypto_currency) TO authenticated;

CREATE OR REPLACE FUNCTION public.attach_nowpayments_payment_id(
  p_payment_id uuid,
  p_nowpayments_payment_id text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  UPDATE public.payments
  SET nowpayments_payment_id = p_nowpayments_payment_id
  WHERE id = p_payment_id
    AND user_id = auth.uid()
    AND status = 'waiting'
    AND nowpayments_payment_id IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'payment not updatable';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.attach_nowpayments_payment_id(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.attach_nowpayments_payment_id(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.complete_payout_sent(
  p_payout_id uuid,
  p_tx_hash text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payout public.payouts%ROWTYPE;
BEGIN
  SELECT * INTO v_payout FROM public.payouts WHERE id = p_payout_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'payout not found';
  END IF;

  UPDATE public.payouts
  SET status = 'sent', tx_hash = COALESCE(p_tx_hash, tx_hash)
  WHERE id = p_payout_id;

  UPDATE public.wallet_balances
  SET
    pending_usd = GREATEST(0, pending_usd - v_payout.amount_usd),
    updated_at = now()
  WHERE user_id = v_payout.user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_payout_sent(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_payout_sent(uuid, text) TO service_role;

CREATE OR REPLACE FUNCTION public.fail_payout_and_restore(
  p_payout_id uuid,
  p_note text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payout public.payouts%ROWTYPE;
BEGIN
  SELECT * INTO v_payout FROM public.payouts WHERE id = p_payout_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'payout not found';
  END IF;

  IF v_payout.status IN ('sent', 'rejected', 'failed') THEN
    RETURN;
  END IF;

  UPDATE public.payouts
  SET status = 'failed', admin_note = COALESCE(p_note, admin_note)
  WHERE id = p_payout_id;

  UPDATE public.wallet_balances
  SET
    pending_usd = GREATEST(0, pending_usd - v_payout.amount_usd),
    available_usd = available_usd + v_payout.amount_usd,
    updated_at = now()
  WHERE user_id = v_payout.user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.fail_payout_and_restore(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fail_payout_and_restore(uuid, text) TO service_role;

CREATE OR REPLACE FUNCTION public.attach_nowpayments_payout_id(
  p_payout_id uuid,
  p_nowpayments_payout_id text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  UPDATE public.payouts
  SET nowpayments_payout_id = p_nowpayments_payout_id
  WHERE id = p_payout_id
    AND status = 'processing';
END;
$$;

REVOKE ALL ON FUNCTION public.attach_nowpayments_payout_id(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.attach_nowpayments_payout_id(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.mark_payout_provider_failed(
  p_payout_id uuid,
  p_note text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payout public.payouts%ROWTYPE;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  SELECT * INTO v_payout FROM public.payouts WHERE id = p_payout_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'payout not found';
  END IF;

  UPDATE public.payouts
  SET
    status = 'failed',
    admin_note = p_note,
    reviewed_by = auth.uid(),
    reviewed_at = now()
  WHERE id = p_payout_id;

  UPDATE public.wallet_balances
  SET
    pending_usd = GREATEST(0, pending_usd - v_payout.amount_usd),
    available_usd = available_usd + v_payout.amount_usd,
    updated_at = now()
  WHERE user_id = v_payout.user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_payout_provider_failed(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_payout_provider_failed(uuid, text) TO authenticated;
