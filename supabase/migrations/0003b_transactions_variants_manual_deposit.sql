-- 0003b: transactions ledger, deposit_addresses, package_variants,
-- payments/user_packages → package_variant_id only, updated RPCs.
--
-- Decisions: enum extend (1A, see 0003a); drop package_id use
-- package_variant_id (2A); soft reference_id + CHECK on reference_table (3).
--
-- NOTE: deposit_addresses seeds use PLACEHOLDER_* strings — replace in
-- /admin/settings/wallets before accepting real deposits.
-- NOTE: package_variants prices/lot/drawdown/roadmap are illustrative
-- placeholders — tune before launch.
-- NOTE: Soft reference_id has no FK. Do not hard-delete payments/payouts/
-- user_packages/signals rows or ledger orphans will accumulate; prefer
-- status flips.

-- ---------------------------------------------------------------------------
-- risk_tier + package_variants
-- ---------------------------------------------------------------------------
CREATE TYPE public.risk_tier AS ENUM ('conservative', 'standard', 'aggressive');

CREATE TABLE public.package_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id uuid NOT NULL REFERENCES public.packages (id) ON DELETE CASCADE,
  risk_tier public.risk_tier NOT NULL,
  price_usd numeric(12, 2) NOT NULL CHECK (price_usd > 0),
  max_lot_size numeric(12, 4) NOT NULL CHECK (max_lot_size > 0),
  -- Bot-target parameters only — never frame as user returns in UI copy.
  profit_target_pct numeric(8, 2) NOT NULL,
  max_drawdown_pct numeric(8, 2) NOT NULL,
  roadmap jsonb NOT NULL DEFAULT '[]'::jsonb,
  UNIQUE (package_id, risk_tier)
);

CREATE INDEX package_variants_package_id_idx ON public.package_variants (package_id);

ALTER TABLE public.package_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "package_variants_public_read"
  ON public.package_variants FOR SELECT
  USING (true);

INSERT INTO public.package_variants (
  package_id, risk_tier, price_usd, max_lot_size, profit_target_pct, max_drawdown_pct, roadmap
)
SELECT p.id, v.risk_tier, v.price_usd, v.max_lot_size, v.profit_target_pct, v.max_drawdown_pct, v.roadmap
FROM public.packages p
JOIN (
  VALUES
    (
      'Assay'::public.package_name,
      'conservative'::public.risk_tier,
      99.00::numeric, 0.01::numeric, 1.50::numeric, 5.00::numeric,
      '[{"step":1,"label":"Bot enters 0.01 lot positions on confirmed setups"},{"step":2,"label":"Bot targets 1.5% moves before scaling out"},{"step":3,"label":"Bot caps open risk near 5% drawdown band"}]'::jsonb
    ),
    (
      'Assay'::public.package_name,
      'standard'::public.risk_tier,
      129.00::numeric, 0.03::numeric, 2.50::numeric, 8.00::numeric,
      '[{"step":1,"label":"Bot enters up to 0.03 lot on confirmed setups"},{"step":2,"label":"Bot targets 2.5% moves at this tier"},{"step":3,"label":"Bot allows drawdown band up to 8%"}]'::jsonb
    ),
    (
      'Assay'::public.package_name,
      'aggressive'::public.risk_tier,
      159.00::numeric, 0.05::numeric, 4.00::numeric, 12.00::numeric,
      '[{"step":1,"label":"Bot risks up to 0.05 lots per trade"},{"step":2,"label":"Bot targets 4% moves at this tier"},{"step":3,"label":"Bot allows drawdown band up to 12%"}]'::jsonb
    ),
    (
      'Bullion'::public.package_name,
      'conservative'::public.risk_tier,
      249.00::numeric, 0.02::numeric, 2.00::numeric, 6.00::numeric,
      '[{"step":1,"label":"Bot enters 0.02 lot positions with indicator confirmation"},{"step":2,"label":"Bot targets 2% moves before partial exits"},{"step":3,"label":"Bot caps open risk near 6% drawdown band"}]'::jsonb
    ),
    (
      'Bullion'::public.package_name,
      'standard'::public.risk_tier,
      299.00::numeric, 0.05::numeric, 3.50::numeric, 10.00::numeric,
      '[{"step":1,"label":"Bot enters up to 0.05 lot on playbook setups"},{"step":2,"label":"Bot targets 3.5% moves at this tier"},{"step":3,"label":"Bot allows drawdown band up to 10%"}]'::jsonb
    ),
    (
      'Bullion'::public.package_name,
      'aggressive'::public.risk_tier,
      349.00::numeric, 0.10::numeric, 5.50::numeric, 15.00::numeric,
      '[{"step":1,"label":"Bot risks up to 0.10 lots per trade"},{"step":2,"label":"Bot targets 5.5% moves at this tier"},{"step":3,"label":"Bot allows drawdown band up to 15%"}]'::jsonb
    ),
    (
      'Vault'::public.package_name,
      'conservative'::public.risk_tier,
      499.00::numeric, 0.03::numeric, 2.50::numeric, 7.00::numeric,
      '[{"step":1,"label":"Bot follows vault playbook at 0.03 lot"},{"step":2,"label":"Bot targets 2.5% moves at this tier"},{"step":3,"label":"Bot caps open risk near 7% drawdown band"}]'::jsonb
    ),
    (
      'Vault'::public.package_name,
      'standard'::public.risk_tier,
      599.00::numeric, 0.08::numeric, 4.00::numeric, 12.00::numeric,
      '[{"step":1,"label":"Bot enters up to 0.08 lot with full terminal rules"},{"step":2,"label":"Bot targets 4% moves at this tier"},{"step":3,"label":"Bot allows drawdown band up to 12%"}]'::jsonb
    ),
    (
      'Vault'::public.package_name,
      'aggressive'::public.risk_tier,
      699.00::numeric, 0.15::numeric, 6.50::numeric, 18.00::numeric,
      '[{"step":1,"label":"Bot risks up to 0.15 lots per trade"},{"step":2,"label":"Bot targets 6.5% moves at this tier"},{"step":3,"label":"Bot allows drawdown band up to 18%"}]'::jsonb
    )
) AS v(package_name, risk_tier, price_usd, max_lot_size, profit_target_pct, max_drawdown_pct, roadmap)
  ON p.name = v.package_name;

-- ---------------------------------------------------------------------------
-- deposit_addresses
-- ---------------------------------------------------------------------------
CREATE TABLE public.deposit_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  currency public.crypto_currency NOT NULL UNIQUE,
  address text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.deposit_addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deposit_addresses_select_authenticated"
  ON public.deposit_addresses FOR SELECT TO authenticated
  USING (is_active = true OR public.is_admin());

CREATE POLICY "deposit_addresses_insert_admin"
  ON public.deposit_addresses FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "deposit_addresses_update_admin"
  ON public.deposit_addresses FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- PLACEHOLDER seeds — replace via /admin/settings/wallets before go-live
INSERT INTO public.deposit_addresses (currency, address, is_active)
VALUES
  ('BTC', 'PLACEHOLDER_BTC_REPLACE_BEFORE_LIVE', true),
  ('ETH', 'PLACEHOLDER_ETH_REPLACE_BEFORE_LIVE', true),
  ('USDT', 'PLACEHOLDER_USDT_REPLACE_BEFORE_LIVE', true);

-- ---------------------------------------------------------------------------
-- transactions ledger
-- ---------------------------------------------------------------------------
CREATE TYPE public.transaction_type AS ENUM (
  'deposit',
  'payout',
  'package_purchase',
  'signal_settlement'
);

CREATE TABLE public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  type public.transaction_type NOT NULL,
  amount_usd numeric(12, 2) NOT NULL,
  reference_table text NOT NULL,
  reference_id uuid NOT NULL,
  status_at_time text NOT NULL,
  description text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT transactions_reference_table_check
    CHECK (reference_table IN ('payments', 'payouts', 'user_packages', 'signals'))
);

CREATE INDEX transactions_user_id_created_at_idx
  ON public.transactions (user_id, created_at DESC);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "transactions_select_own_or_admin"
  ON public.transactions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

-- ---------------------------------------------------------------------------
-- payments / user_packages → package_variant_id
-- ---------------------------------------------------------------------------
ALTER TABLE public.payments
  ADD COLUMN package_variant_id uuid REFERENCES public.package_variants (id),
  ADD COLUMN user_note text,
  ADD COLUMN submitted_at timestamptz,
  ADD COLUMN admin_note text;

ALTER TABLE public.user_packages
  ADD COLUMN package_variant_id uuid REFERENCES public.package_variants (id);

-- Existing Bullion payment → Bullion standard variant
UPDATE public.payments pay
SET package_variant_id = pv.id
FROM public.package_variants pv
WHERE pay.package_id IS NOT NULL
  AND pv.package_id = pay.package_id
  AND pv.risk_tier = 'standard'
  AND pay.package_variant_id IS NULL;

UPDATE public.user_packages up
SET package_variant_id = pv.id
FROM public.package_variants pv
WHERE up.package_id IS NOT NULL
  AND pv.package_id = up.package_id
  AND pv.risk_tier = 'standard'
  AND up.package_variant_id IS NULL;

DROP FUNCTION IF EXISTS public.create_waiting_payment(uuid, public.crypto_currency);
DROP FUNCTION IF EXISTS public.attach_nowpayments_payment_id(uuid, text);
DROP FUNCTION IF EXISTS public.confirm_payment_and_activate_package(uuid);

ALTER TABLE public.payments DROP COLUMN package_id;
ALTER TABLE public.user_packages DROP COLUMN package_id;

ALTER TABLE public.payments
  ALTER COLUMN package_variant_id SET NOT NULL;

ALTER TABLE public.user_packages
  ALTER COLUMN package_variant_id SET NOT NULL;

CREATE INDEX payments_package_variant_id_idx ON public.payments (package_variant_id);
CREATE INDEX user_packages_package_variant_id_idx ON public.user_packages (package_variant_id);

-- ---------------------------------------------------------------------------
-- RPC: submit_manual_payment
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_manual_payment(
  p_package_variant_id uuid,
  p_currency public.crypto_currency,
  p_tx_hash text,
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
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF p_tx_hash IS NULL OR length(trim(p_tx_hash)) < 8 THEN
    RAISE EXCEPTION 'tx hash required';
  END IF;

  SELECT price_usd INTO v_price
  FROM public.package_variants
  WHERE id = p_package_variant_id;

  IF v_price IS NULL THEN
    RAISE EXCEPTION 'package variant not found';
  END IF;

  INSERT INTO public.payments (
    user_id,
    package_variant_id,
    currency,
    amount_usd,
    status,
    tx_hash,
    user_note,
    submitted_at
  )
  VALUES (
    v_user_id,
    p_package_variant_id,
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

REVOKE ALL ON FUNCTION public.submit_manual_payment(uuid, public.crypto_currency, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_manual_payment(uuid, public.crypto_currency, text, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- RPC: approve_payment_and_activate — atomic confirm + package + ledger
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

  SELECT * INTO v_variant
  FROM public.package_variants
  WHERE id = v_payment.package_variant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'package variant not found';
  END IF;

  SELECT name::text INTO v_package_name
  FROM public.packages
  WHERE id = v_variant.package_id;

  UPDATE public.payments
  SET
    status = 'confirmed',
    confirmed_at = now()
  WHERE id = p_payment_id;

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
    'Deposit confirmed: %s %s, %s',
    v_package_name,
    initcap(v_variant.risk_tier::text),
    v_payment.currency::text
  );

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
    v_payment.user_id,
    'package_purchase',
    -ABS(v_payment.amount_usd),
    'payments',
    v_payment.id,
    'confirmed',
    v_desc
  );
END;
$$;

REVOKE ALL ON FUNCTION public.approve_payment_and_activate(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_payment_and_activate(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- RPC: reject_payment
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reject_payment(
  p_payment_id uuid,
  p_admin_note text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment public.payments%ROWTYPE;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  IF p_admin_note IS NULL OR length(trim(p_admin_note)) = 0 THEN
    RAISE EXCEPTION 'admin_note required';
  END IF;

  SELECT * INTO v_payment
  FROM public.payments
  WHERE id = p_payment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'payment not found';
  END IF;

  IF v_payment.status <> 'pending_review' THEN
    RAISE EXCEPTION 'payment cannot be rejected from status %', v_payment.status;
  END IF;

  UPDATE public.payments
  SET
    status = 'rejected',
    admin_note = trim(p_admin_note)
  WHERE id = p_payment_id;
END;
$$;

REVOKE ALL ON FUNCTION public.reject_payment(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reject_payment(uuid, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- Payout RPCs: ledger on approve + reversal on reject-after-processing
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.approve_payout_start(p_payout_id uuid)
RETURNS public.payouts
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
    RAISE EXCEPTION 'payout cannot be approved from status %', v_payout.status;
  END IF;

  UPDATE public.payouts
  SET
    status = 'processing',
    reviewed_by = auth.uid(),
    reviewed_at = now()
  WHERE id = p_payout_id
  RETURNING * INTO v_payout;

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
    v_payout.user_id,
    'payout',
    -ABS(v_payout.amount_usd),
    'payouts',
    v_payout.id,
    'processing',
    format('Payout approved: %s %s', v_payout.amount_usd, v_payout.currency::text)
  );

  RETURN v_payout;
END;
$$;

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
  v_was_processing boolean;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  IF p_admin_note IS NULL OR length(trim(p_admin_note)) = 0 THEN
    RAISE EXCEPTION 'admin_note required';
  END IF;

  SELECT * INTO v_payout
  FROM public.payouts
  WHERE id = p_payout_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'payout not found';
  END IF;

  IF v_payout.status NOT IN ('requested', 'pending_review', 'processing') THEN
    RAISE EXCEPTION 'payout cannot be rejected from status %', v_payout.status;
  END IF;

  v_was_processing := (v_payout.status = 'processing');

  UPDATE public.payouts
  SET
    status = 'rejected',
    admin_note = trim(p_admin_note),
    reviewed_by = auth.uid(),
    reviewed_at = now()
  WHERE id = p_payout_id;

  UPDATE public.wallet_balances
  SET
    pending_usd = GREATEST(0, pending_usd - v_payout.amount_usd),
    available_usd = available_usd + v_payout.amount_usd,
    updated_at = now()
  WHERE user_id = v_payout.user_id;

  IF v_was_processing THEN
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
      v_payout.user_id,
      'payout',
      ABS(v_payout.amount_usd),
      'payouts',
      v_payout.id,
      'rejected',
      format('Payout rejected — balance restored: %s', trim(p_admin_note))
    );
  END IF;
END;
$$;
