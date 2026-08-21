-- Payment kinds: package (VPS bot), balance (wallet top-up), signal (TradingView).
-- Admin approve/reject credits the matching entitlement.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'payment_kind'
  ) THEN
    CREATE TYPE public.payment_kind AS ENUM ('package', 'balance', 'signal');
  END IF;
END $$;

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS kind public.payment_kind NOT NULL DEFAULT 'package';

ALTER TABLE public.payments
  ALTER COLUMN package_variant_id DROP NOT NULL;

ALTER TABLE public.payments
  DROP CONSTRAINT IF EXISTS payments_kind_variant_check;

ALTER TABLE public.payments
  ADD CONSTRAINT payments_kind_variant_check CHECK (
    (kind = 'package' AND package_variant_id IS NOT NULL)
    OR (kind IN ('balance', 'signal'))
  );

CREATE TABLE IF NOT EXISTS public.user_signal_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES public.profiles (id) ON DELETE CASCADE,
  status public.user_package_status NOT NULL DEFAULT 'active',
  purchased_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz
);

ALTER TABLE public.user_signal_access ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_signal_access_select_own_or_admin"
  ON public.user_signal_access;

CREATE POLICY "user_signal_access_select_own_or_admin"
  ON public.user_signal_access FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

CREATE INDEX IF NOT EXISTS payments_kind_status_idx
  ON public.payments (kind, status);

-- ---------------------------------------------------------------------------
-- submit_manual_payment — kind-aware
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.submit_manual_payment(uuid, public.crypto_currency, text, text);

CREATE OR REPLACE FUNCTION public.submit_manual_payment(
  p_kind public.payment_kind,
  p_currency public.crypto_currency,
  p_tx_hash text,
  p_package_variant_id uuid DEFAULT NULL,
  p_amount_usd numeric DEFAULT NULL,
  p_user_note text DEFAULT NULL
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
  v_has_package boolean;
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
  ELSIF p_kind = 'balance' THEN
    SELECT EXISTS (
      SELECT 1 FROM public.user_packages
      WHERE user_id = v_user_id AND status = 'active'
    ) INTO v_has_package;
    IF NOT v_has_package THEN
      RAISE EXCEPTION 'active package required to update balance';
    END IF;
    IF p_amount_usd IS NULL OR p_amount_usd < 10 THEN
      RAISE EXCEPTION 'minimum top-up is 10';
    END IF;
    v_price := round(p_amount_usd, 2);
  ELSIF p_kind = 'signal' THEN
    v_price := 49.00;
  ELSE
    RAISE EXCEPTION 'invalid payment kind';
  END IF;

  INSERT INTO public.payments (
    user_id,
    package_variant_id,
    kind,
    currency,
    amount_usd,
    status,
    tx_hash,
    user_note,
    submitted_at
  )
  VALUES (
    v_user_id,
    CASE WHEN p_kind = 'package' THEN p_package_variant_id ELSE NULL END,
    p_kind,
    p_currency,
    v_price,
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
  public.payment_kind, public.crypto_currency, text, uuid, numeric, text
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_manual_payment(
  public.payment_kind, public.crypto_currency, text, uuid, numeric, text
) TO authenticated;

-- ---------------------------------------------------------------------------
-- approve_payment_and_activate — package / balance / signal
-- ---------------------------------------------------------------------------
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

  UPDATE public.payments
  SET
    status = 'confirmed',
    confirmed_at = now()
  WHERE id = p_payment_id;

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

    UPDATE public.user_packages
    SET status = 'expired'
    WHERE user_id = v_payment.user_id
      AND status = 'active';

    INSERT INTO public.user_packages (
      user_id,
      package_variant_id,
      status,
      purchased_at,
      expires_at
    )
    VALUES (
      v_payment.user_id,
      v_payment.package_variant_id,
      'active',
      now(),
      now() + interval '30 days'
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
