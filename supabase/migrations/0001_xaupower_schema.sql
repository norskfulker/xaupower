-- XAUPower schema: enums, tables, RLS, triggers, RPCs, seed packages

-- =============================================================================
-- Enums
-- =============================================================================
CREATE TYPE public.user_role AS ENUM ('user', 'admin');
CREATE TYPE public.package_name AS ENUM ('Assay', 'Bullion', 'Vault');
CREATE TYPE public.user_package_status AS ENUM ('pending', 'active', 'expired');
CREATE TYPE public.crypto_currency AS ENUM ('BTC', 'ETH', 'USDT');
CREATE TYPE public.payment_status AS ENUM (
  'waiting',
  'confirming',
  'confirmed',
  'partially_paid',
  'failed',
  'expired'
);
CREATE TYPE public.payout_status AS ENUM (
  'requested',
  'pending_review',
  'processing',
  'sent',
  'rejected',
  'failed'
);
CREATE TYPE public.signal_pair AS ENUM ('XAUUSD', 'XAGUSD');
CREATE TYPE public.signal_direction AS ENUM ('long', 'short');
CREATE TYPE public.signal_status AS ENUM ('open', 'closed', 'cancelled');

-- =============================================================================
-- 1. profiles
-- =============================================================================
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  role public.user_role NOT NULL DEFAULT 'user',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Helper: is_admin() — reads profiles.role, not JWT user_metadata
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own_or_admin"
  ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_admin());

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid() AND role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()));

-- =============================================================================
-- 2. packages
-- =============================================================================
CREATE TABLE public.packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name public.package_name NOT NULL UNIQUE,
  price_usd numeric(12, 2) NOT NULL,
  tagline text NOT NULL,
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_featured boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true
);

ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "packages_public_read"
  ON public.packages FOR SELECT
  USING (true);

-- =============================================================================
-- 3. user_packages
-- =============================================================================
CREATE TABLE public.user_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  package_id uuid NOT NULL REFERENCES public.packages (id),
  status public.user_package_status NOT NULL DEFAULT 'pending',
  purchased_at timestamptz,
  expires_at timestamptz
);

CREATE INDEX user_packages_user_id_idx ON public.user_packages (user_id);

ALTER TABLE public.user_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_packages_select_own_or_admin"
  ON public.user_packages FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

-- =============================================================================
-- 4. payments
-- =============================================================================
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  package_id uuid REFERENCES public.packages (id),
  currency public.crypto_currency NOT NULL,
  amount_usd numeric(12, 2) NOT NULL,
  nowpayments_payment_id text UNIQUE,
  status public.payment_status NOT NULL DEFAULT 'waiting',
  tx_hash text,
  created_at timestamptz NOT NULL DEFAULT now(),
  confirmed_at timestamptz
);

CREATE INDEX payments_user_id_idx ON public.payments (user_id);
CREATE INDEX payments_status_idx ON public.payments (status);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payments_select_own_or_admin"
  ON public.payments FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

-- Inserts/updates via service role only (no authenticated insert/update policies)

-- =============================================================================
-- 5. payouts
-- =============================================================================
CREATE TABLE public.payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  amount_usd numeric(12, 2) NOT NULL CHECK (amount_usd > 0),
  currency public.crypto_currency NOT NULL,
  destination_address text NOT NULL,
  nowpayments_payout_id text UNIQUE,
  status public.payout_status NOT NULL DEFAULT 'requested',
  requested_at timestamptz NOT NULL DEFAULT now(),
  reviewed_by uuid REFERENCES public.profiles (id),
  reviewed_at timestamptz,
  tx_hash text,
  admin_note text
);

CREATE INDEX payouts_user_id_idx ON public.payouts (user_id);
CREATE INDEX payouts_status_idx ON public.payouts (status);

ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payouts_select_own_or_admin"
  ON public.payouts FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "payouts_insert_own"
  ON public.payouts FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND status = 'requested'
  );

-- Users cannot UPDATE payouts (status changes via service role / RPCs)

-- =============================================================================
-- 6. wallet_balances
-- =============================================================================
CREATE TABLE public.wallet_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES public.profiles (id) ON DELETE CASCADE,
  available_usd numeric(12, 2) NOT NULL DEFAULT 0 CHECK (available_usd >= 0),
  pending_usd numeric(12, 2) NOT NULL DEFAULT 0 CHECK (pending_usd >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.wallet_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wallet_balances_select_own_or_admin"
  ON public.wallet_balances FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

-- =============================================================================
-- 7. signals
-- =============================================================================
CREATE TABLE public.signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pair public.signal_pair NOT NULL,
  direction public.signal_direction NOT NULL,
  entry_price numeric(18, 6) NOT NULL,
  stop_loss numeric(18, 6) NOT NULL,
  take_profit numeric(18, 6) NOT NULL,
  status public.signal_status NOT NULL DEFAULT 'open',
  pnl_usd numeric(12, 2),
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  created_by uuid NOT NULL REFERENCES public.profiles (id)
);

CREATE INDEX signals_status_idx ON public.signals (status);
CREATE INDEX signals_opened_at_idx ON public.signals (opened_at DESC);

ALTER TABLE public.signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "signals_select_authenticated"
  ON public.signals FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "signals_insert_admin"
  ON public.signals FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "signals_update_admin"
  ON public.signals FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "signals_delete_admin"
  ON public.signals FOR DELETE TO authenticated
  USING (public.is_admin());

-- =============================================================================
-- 8. portfolio_snapshots
-- =============================================================================
CREATE TABLE public.portfolio_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  value_usd numeric(12, 2) NOT NULL,
  snapshot_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX portfolio_snapshots_user_id_idx ON public.portfolio_snapshots (user_id, snapshot_at DESC);

ALTER TABLE public.portfolio_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "portfolio_snapshots_select_own_or_admin"
  ON public.portfolio_snapshots FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

-- =============================================================================
-- Auth trigger: profile + wallet on signup
-- =============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', NULL),
    'user'
  );

  INSERT INTO public.wallet_balances (user_id, available_usd, pending_usd)
  VALUES (NEW.id, 0, 0);

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- RPC: confirm_payment_and_activate_package
-- =============================================================================
CREATE OR REPLACE FUNCTION public.confirm_payment_and_activate_package(p_payment_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment public.payments%ROWTYPE;
BEGIN
  SELECT * INTO v_payment
  FROM public.payments
  WHERE id = p_payment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'payment not found';
  END IF;

  IF v_payment.package_id IS NULL THEN
    RAISE EXCEPTION 'payment has no package_id';
  END IF;

  IF v_payment.status = 'confirmed' THEN
    RETURN;
  END IF;

  UPDATE public.payments
  SET
    status = 'confirmed',
    confirmed_at = now()
  WHERE id = p_payment_id;

  -- Expire any currently active package for this user
  UPDATE public.user_packages
  SET status = 'expired'
  WHERE user_id = v_payment.user_id
    AND status = 'active';

  INSERT INTO public.user_packages (user_id, package_id, status, purchased_at, expires_at)
  VALUES (
    v_payment.user_id,
    v_payment.package_id,
    'active',
    now(),
    now() + interval '30 days'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_payment_and_activate_package(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirm_payment_and_activate_package(uuid) TO service_role;

-- =============================================================================
-- RPC: request_payout — insert + debit available → pending
-- =============================================================================
CREATE OR REPLACE FUNCTION public.request_payout(
  p_amount_usd numeric,
  p_currency public.crypto_currency,
  p_destination_address text
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

  SELECT available_usd INTO v_available
  FROM public.wallet_balances
  WHERE user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'wallet not found';
  END IF;

  IF p_amount_usd > v_available THEN
    RAISE EXCEPTION 'amount exceeds available balance';
  END IF;

  UPDATE public.wallet_balances
  SET
    available_usd = available_usd - p_amount_usd,
    pending_usd = pending_usd + p_amount_usd,
    updated_at = now()
  WHERE user_id = v_user_id;

  INSERT INTO public.payouts (
    user_id,
    amount_usd,
    currency,
    destination_address,
    status,
    requested_at
  )
  VALUES (
    v_user_id,
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

REVOKE ALL ON FUNCTION public.request_payout(numeric, public.crypto_currency, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_payout(numeric, public.crypto_currency, text) TO authenticated;

-- =============================================================================
-- RPC: reject_payout — reject + reverse pending → available
-- =============================================================================
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
END;
$$;

REVOKE ALL ON FUNCTION public.reject_payout(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reject_payout(uuid, text) TO authenticated;

-- =============================================================================
-- RPC: approve_payout_start — mark processing (NOWPayments call in app)
-- =============================================================================
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

  RETURN v_payout;
END;
$$;

REVOKE ALL ON FUNCTION public.approve_payout_start(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_payout_start(uuid) TO authenticated;

-- =============================================================================
-- Seed packages
-- =============================================================================
INSERT INTO public.packages (name, price_usd, tagline, features, is_featured, is_active)
VALUES
  (
    'Assay',
    99.00,
    'Core XAUUSD and XAGUSD signal access',
    '["Live signal feed","Entry, stop, and take-profit levels","Email alerts"]'::jsonb,
    false,
    true
  ),
  (
    'Bullion',
    249.00,
    'Signal feed plus playbook and indicators',
    '["Everything in Assay","Indicator pack","Weekly playbook","Priority feed updates"]'::jsonb,
    true,
    true
  ),
  (
    'Vault',
    499.00,
    'Full terminal access with bot guide',
    '["Everything in Bullion","Bot setup guide","Admin office hours","Extended history"]'::jsonb,
    false,
    true
  );

-- Realtime publication for live dashboards
ALTER PUBLICATION supabase_realtime ADD TABLE public.signals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.payouts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_packages;
