-- Snapshot purchased package terms so live package_variants can be edited
-- without changing what existing customers already bought.
-- Also drop XAG from price_cache (XAU-only ticker).

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS variant_snapshot jsonb;

ALTER TABLE public.user_packages
  ADD COLUMN IF NOT EXISTS variant_snapshot jsonb;

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
      variant_snapshot
    )
    VALUES (
      v_payment.user_id,
      v_payment.package_variant_id,
      'active',
      now(),
      now() + interval '30 days',
      v_snapshot
    );

    v_desc := format(
      'Package activated: %s %s, %s',
      v_package_name,
      initcap(v_variant.risk_tier::text),
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

  ELSIF v_kind = 'balance' THEN
    INSERT INTO public.wallet_balances (user_id, available_usd, pending_usd)
    VALUES (v_payment.user_id, v_payment.amount_usd, 0)
    ON CONFLICT (user_id) DO UPDATE
    SET
      available_usd = public.wallet_balances.available_usd + EXCLUDED.available_usd,
      updated_at = now();

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
      format('Balance top-up confirmed: %s %s', v_payment.amount_usd, v_payment.currency::text)
    );

  ELSIF v_kind = 'signal' THEN
    INSERT INTO public.user_signal_access (user_id, status, purchased_at, expires_at)
    VALUES (
      v_payment.user_id,
      'active',
      now(),
      now() + interval '30 days'
    )
    ON CONFLICT (user_id) DO UPDATE
    SET
      status = 'active',
      purchased_at = now(),
      expires_at = now() + interval '30 days';

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

-- Freeze current live terms onto existing rows so later edits cannot rewrite history.
UPDATE public.user_packages up
SET variant_snapshot = jsonb_build_object(
  'id', pv.id,
  'package_id', pv.package_id,
  'package_name', p.name,
  'risk_tier', pv.risk_tier,
  'price_usd', pv.price_usd,
  'max_lot_size', pv.max_lot_size,
  'profit_target_pct', pv.profit_target_pct,
  'max_drawdown_pct', pv.max_drawdown_pct,
  'roadmap', pv.roadmap
)
FROM public.package_variants pv
JOIN public.packages p ON p.id = pv.package_id
WHERE up.package_variant_id = pv.id
  AND up.variant_snapshot IS NULL;

UPDATE public.payments pay
SET variant_snapshot = jsonb_build_object(
  'id', pv.id,
  'package_id', pv.package_id,
  'package_name', p.name,
  'risk_tier', pv.risk_tier,
  'price_usd', pv.price_usd,
  'max_lot_size', pv.max_lot_size,
  'profit_target_pct', pv.profit_target_pct,
  'max_drawdown_pct', pv.max_drawdown_pct,
  'roadmap', pv.roadmap
)
FROM public.package_variants pv
JOIN public.packages p ON p.id = pv.package_id
WHERE pay.package_variant_id = pv.id
  AND pay.kind = 'package'
  AND pay.variant_snapshot IS NULL;

DROP POLICY IF EXISTS "package_variants_update_admin" ON public.package_variants;
CREATE POLICY "package_variants_update_admin"
  ON public.package_variants FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

GRANT UPDATE ON public.package_variants TO authenticated;

DELETE FROM public.price_cache WHERE pair = 'XAGUSD';
ALTER TABLE public.price_cache DROP CONSTRAINT IF EXISTS price_cache_pair_check;
ALTER TABLE public.price_cache
  ADD CONSTRAINT price_cache_pair_check CHECK (pair = 'XAUUSD');
