-- Buying a new bot must not expire other active bots.

CREATE OR REPLACE FUNCTION public.approve_payment_and_activate(p_payment_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment public.payments%ROWTYPE;
  v_variant public.package_variants%ROWTYPE;
  v_package public.packages%ROWTYPE;
  v_package_name text;
  v_snapshot jsonb;
  v_desc text;
  v_kind public.payment_kind;
  v_user_package_id uuid;
  v_credit numeric;
  v_term_days integer;
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
  v_term_days := 21;

  IF v_kind = 'package' THEN
    SELECT * INTO v_variant
    FROM public.package_variants
    WHERE id = v_payment.package_variant_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'package variant not found';
    END IF;

    SELECT * INTO v_package
    FROM public.packages
    WHERE id = v_variant.package_id;

    v_package_name := v_package.name::text;
    v_term_days := COALESCE(
      (to_jsonb(v_package)->>'access_term_days')::integer,
      21
    );

    v_snapshot := jsonb_build_object(
      'id', v_variant.id,
      'package_id', v_variant.package_id,
      'package_name', v_package_name,
      'risk_tier', v_variant.risk_tier,
      'strategy_label', to_jsonb(v_variant)->>'strategy_label',
      'price_usd', v_variant.price_usd,
      'max_lot_size', v_variant.max_lot_size,
      'profit_target_pct', v_variant.profit_target_pct,
      'max_drawdown_pct', v_variant.max_drawdown_pct,
      'roadmap', v_variant.roadmap,
      'access_term_days', v_term_days,
      'daily_return_min_pct', to_jsonb(v_package)->>'daily_return_min_pct',
      'daily_return_max_pct', to_jsonb(v_package)->>'daily_return_max_pct'
    );
  END IF;

  UPDATE public.payments
  SET
    status = 'confirmed',
    confirmed_at = now(),
    variant_snapshot = COALESCE(v_snapshot, variant_snapshot)
  WHERE id = p_payment_id;

  IF v_kind = 'package' THEN
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
      now() + (v_term_days * interval '1 day'),
      v_snapshot,
      public.generate_bot_account_code(),
      v_credit,
      0
    )
    RETURNING id INTO v_user_package_id;

    v_desc := format(
      'Package activated: %s (bot %s), %s',
      v_package_name,
      (SELECT account_code FROM public.user_packages WHERE id = v_user_package_id),
      v_payment.currency::text
    );

    INSERT INTO public.transactions (
      user_id, type, amount_usd, reference_table, reference_id, status_at_time, description
    )
    VALUES (
      v_payment.user_id,
      'package_purchase',
      v_payment.amount_usd,
      'payments',
      p_payment_id,
      'confirmed',
      v_desc
    );
  ELSIF v_kind = 'balance' THEN
    IF v_payment.user_package_id IS NULL THEN
      RAISE EXCEPTION 'balance payment missing bot account';
    END IF;

    UPDATE public.user_packages
    SET available_usd = available_usd + v_credit
    WHERE id = v_payment.user_package_id
      AND user_id = v_payment.user_id;

    v_desc := format(
      'Balance deposit to bot %s, %s',
      (SELECT account_code FROM public.user_packages WHERE id = v_payment.user_package_id),
      v_payment.currency::text
    );

    INSERT INTO public.transactions (
      user_id, type, amount_usd, reference_table, reference_id, status_at_time, description
    )
    VALUES (
      v_payment.user_id,
      'deposit',
      v_payment.amount_usd,
      'payments',
      p_payment_id,
      'confirmed',
      v_desc
    );
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.approve_payment_and_activate(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_payment_and_activate(uuid) TO authenticated;
