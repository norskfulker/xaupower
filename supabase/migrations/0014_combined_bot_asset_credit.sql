-- Plan price + optional extra = one bot asset credited in full on approval

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
  v_extra numeric;
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
    v_extra := GREATEST(COALESCE(p_initial_deposit_usd, 0), 0);
    v_price := round(v_price + v_extra, 2);
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
    v_extra := 0;
  ELSIF p_kind = 'signal' THEN
    v_price := 49.00;
    v_extra := 0;
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
    CASE WHEN p_kind = 'package' THEN v_extra ELSE 0 END,
    'pending_review',
    trim(p_tx_hash),
    NULLIF(trim(COALESCE(p_user_note, '')), ''),
    now()
  )
  RETURNING * INTO v_payment;

  RETURN v_payment;
END;
$$;

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
  v_credit numeric;
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
  v_credit := v_payment.amount_usd;

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
      v_credit,
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

    INSERT INTO public.transactions (
      user_id, type, amount_usd, reference_table, reference_id, status_at_time, description
    )
    VALUES (
      v_payment.user_id,
      'deposit',
      v_credit,
      'user_packages',
      v_user_package_id,
      'confirmed',
      format(
        'Bot asset credited to %s (%s)',
        (SELECT account_code FROM public.user_packages WHERE id = v_user_package_id),
        v_credit
      )
    );

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
