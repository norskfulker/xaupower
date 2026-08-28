-- Per-bot account balances on user_packages + combined package + deposit purchase

ALTER TABLE public.user_packages
  ADD COLUMN IF NOT EXISTS account_code text,
  ADD COLUMN IF NOT EXISTS available_usd numeric(12, 2) NOT NULL DEFAULT 0 CHECK (available_usd >= 0),
  ADD COLUMN IF NOT EXISTS pending_usd numeric(12, 2) NOT NULL DEFAULT 0 CHECK (pending_usd >= 0);

CREATE UNIQUE INDEX IF NOT EXISTS user_packages_account_code_idx
  ON public.user_packages (account_code)
  WHERE account_code IS NOT NULL;

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS initial_deposit_usd numeric(12, 2) NOT NULL DEFAULT 0 CHECK (initial_deposit_usd >= 0),
  ADD COLUMN IF NOT EXISTS user_package_id uuid REFERENCES public.user_packages (id) ON DELETE SET NULL;

ALTER TABLE public.payouts
  ADD COLUMN IF NOT EXISTS user_package_id uuid REFERENCES public.user_packages (id) ON DELETE SET NULL;

UPDATE public.packages
SET price_usd = round(price_usd, 0);

UPDATE public.package_variants
SET price_usd = round(price_usd, 0);

CREATE OR REPLACE FUNCTION public.generate_bot_account_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_code text;
BEGIN
  LOOP
    v_code := 'XAU-' || upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 6));
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.user_packages WHERE account_code = v_code
    );
  END LOOP;
  RETURN v_code;
END;
$$;

REVOKE ALL ON FUNCTION public.generate_bot_account_code() FROM PUBLIC, anon, authenticated;

-- Backfill account codes and migrate wallet balance to active bot accounts
UPDATE public.user_packages up
SET
  account_code = public.generate_bot_account_code(),
  available_usd = COALESCE(wb.available_usd, 0),
  pending_usd = COALESCE(wb.pending_usd, 0)
FROM public.wallet_balances wb
WHERE up.user_id = wb.user_id
  AND up.status = 'active'
  AND up.account_code IS NULL;

UPDATE public.user_packages
SET account_code = public.generate_bot_account_code()
WHERE account_code IS NULL
  AND status IN ('active', 'expired');

DROP FUNCTION IF EXISTS public.submit_manual_payment(
  public.payment_kind,
  public.crypto_currency,
  text,
  uuid,
  numeric,
  text
);

CREATE OR REPLACE FUNCTION public.submit_manual_payment(
  p_kind public.payment_kind,
  p_currency public.crypto_currency,
  p_tx_hash text,
  p_package_variant_id uuid DEFAULT NULL,
  p_amount_usd numeric DEFAULT NULL,
  p_user_note text DEFAULT NULL,
  p_initial_deposit_usd numeric DEFAULT NULL,
  p_user_package_id uuid DEFAULT NULL
)
RETURNS public.payments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_price numeric;
  v_initial numeric;
  v_payment public.payments%ROWTYPE;
  v_pkg public.user_packages%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF p_tx_hash IS NULL OR length(trim(p_tx_hash)) < 8 THEN
    RAISE EXCEPTION 'tx hash required';
  END IF;

  IF p_kind = 'package' THEN
    IF p_package_variant_id IS NULL THEN
      RAISE EXCEPTION 'package variant required';
    END IF;
    SELECT price_usd INTO v_price
    FROM public.package_variants
    WHERE id = p_package_variant_id;
    IF v_price IS NULL THEN
      RAISE EXCEPTION 'package variant not found';
    END IF;
    v_initial := COALESCE(p_initial_deposit_usd, 0);
    IF v_initial < 10 THEN
      RAISE EXCEPTION 'minimum initial deposit is 10';
    END IF;
    v_price := round(v_price + v_initial, 2);
  ELSIF p_kind = 'balance' THEN
    IF p_user_package_id IS NULL THEN
      RAISE EXCEPTION 'bot account required';
    END IF;
    SELECT * INTO v_pkg
    FROM public.user_packages
    WHERE id = p_user_package_id
      AND user_id = v_user_id
      AND status = 'active';
    IF NOT FOUND THEN
      RAISE EXCEPTION 'active bot account not found';
    END IF;
    IF p_amount_usd IS NULL OR p_amount_usd < 10 THEN
      RAISE EXCEPTION 'minimum top-up is 10';
    END IF;
    v_price := round(p_amount_usd, 2);
    v_initial := 0;
  ELSIF p_kind = 'signal' THEN
    v_price := 49.00;
    v_initial := 0;
  ELSE
    RAISE EXCEPTION 'invalid payment kind';
  END IF;

  INSERT INTO public.payments (
    user_id,
    package_variant_id,
    user_package_id,
    kind,
    currency,
    amount_usd,
    initial_deposit_usd,
    status,
    tx_hash,
    user_note,
    submitted_at
  )
  VALUES (
    v_user_id,
    CASE WHEN p_kind = 'package' THEN p_package_variant_id ELSE NULL END,
    CASE WHEN p_kind = 'balance' THEN p_user_package_id ELSE NULL END,
    p_kind,
    p_currency,
    v_price,
    CASE WHEN p_kind = 'package' THEN COALESCE(p_initial_deposit_usd, 0) ELSE 0 END,
    'pending_review',
    trim(p_tx_hash),
    NULLIF(trim(COALESCE(p_user_note, '')), ''),
    now()
  )
  RETURNING * INTO v_payment;

  RETURN v_payment;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_manual_payment(
  public.payment_kind,
  public.crypto_currency,
  text,
  uuid,
  numeric,
  text,
  numeric,
  uuid
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_manual_payment(
  public.payment_kind,
  public.crypto_currency,
  text,
  uuid,
  numeric,
  text,
  numeric,
  uuid
) TO authenticated;

CREATE OR REPLACE FUNCTION public.approve_payment_and_activate(p_payment_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment public.payments%ROWTYPE;
  v_variant public.package_variants%ROWTYPE;
  v_package_name text;
  v_snapshot jsonb;
  v_desc text;
  v_kind public.payment_kind;
  v_user_package_id uuid;
  v_initial numeric;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  SELECT * INTO v_payment
  FROM public.payments
  WHERE id = p_payment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'payment not found';
  END IF;

  IF v_payment.status = 'confirmed' THEN
    RETURN;
  END IF;

  IF v_payment.status <> 'pending_review' THEN
    RAISE EXCEPTION 'payment cannot be approved from status %', v_payment.status;
  END IF;

  v_kind := COALESCE(v_payment.kind, 'package');
  v_snapshot := NULL;
  v_initial := COALESCE(v_payment.initial_deposit_usd, 0);

  IF v_kind = 'package' THEN
    SELECT * INTO v_variant
    FROM public.package_variants
    WHERE id = v_payment.package_variant_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'package variant not found';
    END IF;

    SELECT name::text INTO v_package_name
    FROM public.packages
    WHERE id = v_variant.package_id;

    v_snapshot := jsonb_build_object(
      'id', v_variant.id,
      'package_id', v_variant.package_id,
      'package_name', v_package_name,
      'risk_tier', v_variant.risk_tier,
      'price_usd', v_variant.price_usd,
      'max_lot_size', v_variant.max_lot_size,
      'profit_target_pct', v_variant.profit_target_pct,
      'max_drawdown_pct', v_variant.max_drawdown_pct,
      'roadmap', v_variant.roadmap
    );
  END IF;

  UPDATE public.payments
  SET
    status = 'confirmed',
    confirmed_at = now(),
    variant_snapshot = COALESCE(v_snapshot, variant_snapshot)
  WHERE id = p_payment_id;

  IF v_kind = 'package' THEN
    UPDATE public.user_packages
    SET status = 'expired'
    WHERE user_id = v_payment.user_id
      AND status = 'active';

    INSERT INTO public.user_packages (
      user_id,
      package_variant_id,
      status,
      purchased_at,
      expires_at,
      variant_snapshot,
      account_code,
      available_usd,
      pending_usd
    )
    VALUES (
      v_payment.user_id,
      v_payment.package_variant_id,
      'active',
      now(),
      now() + interval '21 days',
      v_snapshot,
      public.generate_bot_account_code(),
      v_initial,
      0
    )
    RETURNING id INTO v_user_package_id;

    v_desc := format(
      'Package activated: %s %s (bot %s), %s',
      v_package_name,
      initcap(v_variant.risk_tier::text),
      (SELECT account_code FROM public.user_packages WHERE id = v_user_package_id),
      v_payment.currency::text
    );

    INSERT INTO public.transactions (
      user_id, type, amount_usd, reference_table, reference_id, status_at_time, description
    )
    VALUES (
      v_payment.user_id,
      'package_purchase',
      -ABS(v_payment.amount_usd),
      'payments',
      v_payment.id,
      'confirmed',
      v_desc
    );

    IF v_initial > 0 THEN
      INSERT INTO public.transactions (
        user_id, type, amount_usd, reference_table, reference_id, status_at_time, description
      )
      VALUES (
        v_payment.user_id,
        'deposit',
        v_initial,
        'user_packages',
        v_user_package_id,
        'confirmed',
        format('Initial bot deposit credited to %s', (
          SELECT account_code FROM public.user_packages WHERE id = v_user_package_id
        ))
      );
    END IF;

  ELSIF v_kind = 'balance' THEN
    UPDATE public.user_packages
    SET available_usd = available_usd + v_payment.amount_usd
    WHERE id = v_payment.user_package_id
      AND user_id = v_payment.user_id
      AND status = 'active';

    IF NOT FOUND THEN
      RAISE EXCEPTION 'bot account not found or inactive';
    END IF;

    INSERT INTO public.transactions (
      user_id, type, amount_usd, reference_table, reference_id, status_at_time, description
    )
    VALUES (
      v_payment.user_id,
      'deposit',
      ABS(v_payment.amount_usd),
      'payments',
      v_payment.id,
      'confirmed',
      format(
        'Balance top-up to bot %s: %s %s',
        (SELECT account_code FROM public.user_packages WHERE id = v_payment.user_package_id),
        v_payment.amount_usd,
        v_payment.currency::text
      )
    );

  ELSIF v_kind = 'signal' THEN
    INSERT INTO public.user_signal_access (user_id, status, purchased_at, expires_at)
    VALUES (
      v_payment.user_id,
      'active',
      now(),
      now() + interval '21 days'
    )
    ON CONFLICT (user_id) DO UPDATE
    SET
      status = 'active',
      purchased_at = now(),
      expires_at = now() + interval '21 days';

    INSERT INTO public.transactions (
      user_id, type, amount_usd, reference_table, reference_id, status_at_time, description
    )
    VALUES (
      v_payment.user_id,
      'package_purchase',
      -ABS(v_payment.amount_usd),
      'payments',
      v_payment.id,
      'confirmed',
      format('Signal access (TradingView) confirmed: %s', v_payment.currency::text)
    );
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.approve_payment_and_activate(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_payment_and_activate(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.credit_daily_bot_returns()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  v_min_pct numeric;
  v_max_pct numeric;
  v_pct numeric;
  v_base numeric;
  v_amount numeric;
  v_package_name text;
  v_today date;
BEGIN
  v_today := (now() AT TIME ZONE 'UTC')::date;

  FOR r IN
    SELECT up.id, up.user_id, up.variant_snapshot, up.account_code
    FROM public.user_packages up
    WHERE up.status = 'active'
      AND up.expires_at > now()
      AND up.account_code IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM public.transactions t
        WHERE t.reference_table = 'user_packages'
          AND t.reference_id = up.id
          AND t.type = 'bot_return'
          AND (t.created_at AT TIME ZONE 'UTC')::date = v_today
      )
  LOOP
    v_package_name := COALESCE(r.variant_snapshot->>'package_name', 'Assay');

    CASE v_package_name
      WHEN 'Assay' THEN
        v_min_pct := 5;
        v_max_pct := 8;
      WHEN 'Bullion' THEN
        v_min_pct := 6;
        v_max_pct := 12;
      WHEN 'Vault' THEN
        v_min_pct := 7;
        v_max_pct := 14;
      ELSE
        v_min_pct := 5;
        v_max_pct := 8;
    END CASE;

    v_base := COALESCE((r.variant_snapshot->>'price_usd')::numeric, 0);
    IF v_base <= 0 THEN
      CONTINUE;
    END IF;

    v_pct := round(
      v_min_pct + (random() * (v_max_pct - v_min_pct))::numeric,
      2
    );
    v_amount := round(v_base * v_pct / 100, 2);

    IF v_amount <= 0 THEN
      CONTINUE;
    END IF;

    UPDATE public.user_packages
    SET available_usd = available_usd + v_amount
    WHERE id = r.id;

    INSERT INTO public.transactions (
      user_id,
      type,
      amount_usd,
      reference_table,
      reference_id,
      status_at_time,
      description
    )
    VALUES (
      r.user_id,
      'bot_return',
      v_amount,
      'user_packages',
      r.id,
      'confirmed',
      format(
        'Daily bot return: %s%% on %s (%s) — %s',
        v_pct,
        r.account_code,
        v_package_name,
        v_today
      )
    );
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.credit_daily_bot_returns() FROM PUBLIC, anon, authenticated;

DROP FUNCTION IF EXISTS public.request_payout(numeric, public.crypto_currency, text);

CREATE OR REPLACE FUNCTION public.request_payout(
  p_amount_usd numeric,
  p_currency public.crypto_currency,
  p_destination_address text,
  p_user_package_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_available numeric;
  v_payout_id uuid;
  v_pkg public.user_packages%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF p_amount_usd IS NULL OR p_amount_usd <= 0 THEN
    RAISE EXCEPTION 'invalid amount';
  END IF;

  IF p_destination_address IS NULL OR length(trim(p_destination_address)) < 10 THEN
    RAISE EXCEPTION 'invalid destination address';
  END IF;

  IF p_user_package_id IS NULL THEN
    RAISE EXCEPTION 'bot account required';
  END IF;

  SELECT * INTO v_pkg
  FROM public.user_packages
  WHERE id = p_user_package_id
    AND user_id = v_user_id
    AND status = 'active'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'active bot account not found';
  END IF;

  v_available := v_pkg.available_usd;

  IF p_amount_usd > v_available THEN
    RAISE EXCEPTION 'amount exceeds available balance';
  END IF;

  UPDATE public.user_packages
  SET
    available_usd = available_usd - p_amount_usd,
    pending_usd = pending_usd + p_amount_usd
  WHERE id = p_user_package_id;

  INSERT INTO public.payouts (
    user_id,
    user_package_id,
    amount_usd,
    currency,
    destination_address,
    status,
    requested_at
  )
  VALUES (
    v_user_id,
    p_user_package_id,
    p_amount_usd,
    p_currency,
    trim(p_destination_address),
    'requested',
    now()
  )
  RETURNING id INTO v_payout_id;

  RETURN v_payout_id;
END;
$$;

REVOKE ALL ON FUNCTION public.request_payout(numeric, public.crypto_currency, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_payout(numeric, public.crypto_currency, text, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.reject_payout(
  p_payout_id uuid,
  p_admin_note text
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

  SELECT * INTO v_payout
  FROM public.payouts
  WHERE id = p_payout_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'payout not found';
  END IF;

  IF v_payout.status NOT IN ('requested', 'pending_review') THEN
    RAISE EXCEPTION 'payout cannot be rejected from status %', v_payout.status;
  END IF;

  UPDATE public.payouts
  SET
    status = 'rejected',
    reviewed_by = auth.uid(),
    reviewed_at = now(),
    admin_note = NULLIF(trim(COALESCE(p_admin_note, '')), '')
  WHERE id = p_payout_id;

  IF v_payout.user_package_id IS NOT NULL THEN
    UPDATE public.user_packages
    SET
      available_usd = available_usd + v_payout.amount_usd,
      pending_usd = pending_usd - v_payout.amount_usd
    WHERE id = v_payout.user_package_id;
  ELSE
    UPDATE public.wallet_balances
    SET
      available_usd = available_usd + v_payout.amount_usd,
      pending_usd = pending_usd - v_payout.amount_usd,
      updated_at = now()
    WHERE user_id = v_payout.user_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.reject_payout(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reject_payout(uuid, text) TO authenticated;

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

  IF v_payout.user_package_id IS NOT NULL THEN
    UPDATE public.user_packages
    SET pending_usd = GREATEST(0, pending_usd - v_payout.amount_usd)
    WHERE id = v_payout.user_package_id;
  ELSE
    UPDATE public.wallet_balances
    SET
      pending_usd = GREATEST(0, pending_usd - v_payout.amount_usd),
      updated_at = now()
    WHERE user_id = v_payout.user_id;
  END IF;
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

  IF v_payout.user_package_id IS NOT NULL THEN
    UPDATE public.user_packages
    SET
      pending_usd = GREATEST(0, pending_usd - v_payout.amount_usd),
      available_usd = available_usd + v_payout.amount_usd
    WHERE id = v_payout.user_package_id;
  ELSE
    UPDATE public.wallet_balances
    SET
      pending_usd = GREATEST(0, pending_usd - v_payout.amount_usd),
      available_usd = available_usd + v_payout.amount_usd,
      updated_at = now()
    WHERE user_id = v_payout.user_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.fail_payout_and_restore(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fail_payout_and_restore(uuid, text) TO service_role;
