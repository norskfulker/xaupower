-- Package display fields live in Supabase (no app-side static plan maps).

ALTER TABLE public.packages
  ADD COLUMN IF NOT EXISTS access_term_days integer NOT NULL DEFAULT 21
    CHECK (access_term_days > 0),
  ADD COLUMN IF NOT EXISTS trades_per_day integer
    CHECK (trades_per_day IS NULL OR trades_per_day > 0),
  ADD COLUMN IF NOT EXISTS daily_return_min_pct numeric(8, 2)
    CHECK (daily_return_min_pct IS NULL OR daily_return_min_pct >= 0),
  ADD COLUMN IF NOT EXISTS daily_return_max_pct numeric(8, 2)
    CHECK (daily_return_max_pct IS NULL OR daily_return_max_pct >= 0),
  ADD COLUMN IF NOT EXISTS max_loss_pct numeric(8, 2)
    CHECK (max_loss_pct IS NULL OR max_loss_pct > 0);

ALTER TABLE public.package_variants
  ADD COLUMN IF NOT EXISTS strategy_label text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS is_default boolean NOT NULL DEFAULT false;

-- One default variant per package
CREATE UNIQUE INDEX IF NOT EXISTS package_variants_one_default_per_package
  ON public.package_variants (package_id)
  WHERE is_default;

UPDATE public.packages
SET
  access_term_days = 21,
  trades_per_day = CASE name
    WHEN 'Assay' THEN 7
    WHEN 'Bullion' THEN 20
    WHEN 'Vault' THEN 40
    ELSE trades_per_day
  END,
  daily_return_min_pct = CASE name
    WHEN 'Assay' THEN 5
    WHEN 'Bullion' THEN 6
    WHEN 'Vault' THEN 7
    ELSE daily_return_min_pct
  END,
  daily_return_max_pct = CASE name
    WHEN 'Assay' THEN 8
    WHEN 'Bullion' THEN 12
    WHEN 'Vault' THEN 14
    ELSE daily_return_max_pct
  END,
  max_loss_pct = CASE name
    WHEN 'Assay' THEN 30
    WHEN 'Bullion' THEN 40
    WHEN 'Vault' THEN 50
    ELSE max_loss_pct
  END,
  price_usd = CASE name
    WHEN 'Assay' THEN 99
    WHEN 'Bullion' THEN 399
    WHEN 'Vault' THEN 999
    ELSE price_usd
  END;

UPDATE public.package_variants pv
SET
  is_default = false,
  strategy_label = CASE pv.risk_tier
    WHEN 'conservative' THEN 'Nominal'
    WHEN 'standard' THEN 'Standard'
    WHEN 'aggressive' THEN 'Aggressive'
    ELSE pv.strategy_label
  END;

UPDATE public.package_variants pv
SET
  is_default = true,
  strategy_label = 'Nominal',
  max_drawdown_pct = 5
FROM public.packages p
WHERE p.name = 'Assay'
  AND pv.package_id = p.id
  AND pv.risk_tier = 'conservative';

UPDATE public.package_variants pv
SET
  is_default = true,
  strategy_label = 'Conservative',
  max_drawdown_pct = 8
FROM public.packages p
WHERE p.name = 'Bullion'
  AND pv.package_id = p.id
  AND pv.risk_tier = 'standard';

UPDATE public.package_variants pv
SET
  is_default = true,
  strategy_label = 'Aggressive',
  max_drawdown_pct = 15
FROM public.packages p
WHERE p.name = 'Vault'
  AND pv.package_id = p.id
  AND pv.risk_tier = 'aggressive';

UPDATE public.package_variants pv
SET price_usd = p.price_usd
FROM public.packages p
WHERE pv.package_id = p.id;

DROP POLICY IF EXISTS "packages_update_admin" ON public.packages;
CREATE POLICY "packages_update_admin"
  ON public.packages FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

GRANT UPDATE ON public.packages TO authenticated;

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

    SELECT * INTO v_package
    FROM public.packages
    WHERE id = v_variant.package_id;

    v_package_name := v_package.name::text;

    v_snapshot := jsonb_build_object(
      'id', v_variant.id,
      'package_id', v_variant.package_id,
      'package_name', v_package_name,
      'risk_tier', v_variant.risk_tier,
      'strategy_label', v_variant.strategy_label,
      'price_usd', v_variant.price_usd,
      'max_lot_size', v_variant.max_lot_size,
      'profit_target_pct', v_variant.profit_target_pct,
      'max_drawdown_pct', v_variant.max_drawdown_pct,
      'roadmap', v_variant.roadmap,
      'access_term_days', v_package.access_term_days,
      'daily_return_min_pct', v_package.daily_return_min_pct,
      'daily_return_max_pct', v_package.daily_return_max_pct
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
      now() + (v_package.access_term_days * interval '1 day'),
      v_snapshot,
      public.generate_bot_account_code(),
      v_credit,
      0
    )
    RETURNING id INTO v_user_package_id;

    v_desc := format(
      'Package activated: %s %s (bot %s), %s',
      v_package_name,
      COALESCE(v_variant.strategy_label, initcap(v_variant.risk_tier::text)),
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
    -- balance branch unchanged from 0014
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
    SELECT up.id, up.user_id, up.variant_snapshot
    FROM public.user_packages up
    WHERE up.status = 'active'
      AND up.expires_at > now()
      AND NOT EXISTS (
        SELECT 1
        FROM public.transactions t
        WHERE t.reference_table = 'user_packages'
          AND t.reference_id = up.id
          AND t.type = 'bot_return'
          AND (t.created_at AT TIME ZONE 'UTC')::date = v_today
      )
  LOOP
    v_package_name := COALESCE(r.variant_snapshot->>'package_name', 'Plan');

    v_min_pct := COALESCE((r.variant_snapshot->>'daily_return_min_pct')::numeric, 5);
    v_max_pct := COALESCE((r.variant_snapshot->>'daily_return_max_pct')::numeric, 8);

    IF v_max_pct < v_min_pct THEN
      v_max_pct := v_min_pct;
    END IF;

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

    INSERT INTO public.wallet_balances (user_id, available_usd, pending_usd)
    VALUES (r.user_id, v_amount, 0)
    ON CONFLICT (user_id) DO UPDATE
    SET
      available_usd = public.wallet_balances.available_usd + EXCLUDED.available_usd,
      updated_at = now();

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
        'Daily bot return: %s%% on %s plan (%s)',
        v_pct,
        v_package_name,
        v_today
      )
    );
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.approve_payment_and_activate(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_payment_and_activate(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.credit_daily_bot_returns() FROM PUBLIC, anon, authenticated;
