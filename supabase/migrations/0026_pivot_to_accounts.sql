-- =============================================================================
-- 0026_pivot_to_accounts.sql
-- Pivot from "bot plan packages" to "Accounts".
--   - User creates an Account, picks risk tier at create time.
--   - Deposits go straight to the chosen account.
--   - Internal transfers: account → account (instant, same user).
--   - Cross-user transfers: email lookup → 2h confirmation window.
--   - Capital is freely withdrawable.
--
-- DESTRUCTIVE: drops user_packages, package_variants, packages, payments,
-- payouts, wallet_balances, user_signal_access, portfolio_snapshots,
-- transactions and all related RPCs/columns. A pre-pivot snapshot of
-- data has been captured at /tmp/xaupower_pre_pivot.json. Schema cannot
-- be rolled back via SQL — re-running 0001..0025 is required.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0. Define is_admin_fn() FIRST — referenced by RLS policies below.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin_fn()
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

-- -----------------------------------------------------------------------------
-- 1. Drop everything we are replacing.
-- -----------------------------------------------------------------------------
DROP VIEW IF EXISTS public.referral_leaderboard CASCADE;

DROP TRIGGER IF EXISTS profiles_referral_guard ON public.profiles;
DROP TRIGGER IF EXISTS handle_new_user ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

DROP FUNCTION IF EXISTS public.set_own_referrer(text) CASCADE;
DROP FUNCTION IF EXISTS public.set_own_referral_code(text) CASCADE;
DROP FUNCTION IF EXISTS public.referral_code_exists(text) CASCADE;
DROP FUNCTION IF EXISTS public.new_referral_code() CASCADE;
DROP FUNCTION IF EXISTS public.normalize_referral_code(text) CASCADE;
DROP FUNCTION IF EXISTS public.profiles_referral_guard() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;

DROP FUNCTION IF EXISTS public.submit_manual_payment(
  public.payment_kind, public.crypto_currency, text, uuid, numeric, text, numeric, uuid
);
DROP FUNCTION IF EXISTS public.approve_payment_and_activate(uuid);
DROP FUNCTION IF EXISTS public.reject_payment(uuid, text);
DROP FUNCTION IF EXISTS public.auto_reject_pending_payments();
DROP FUNCTION IF EXISTS public.wipe_bot_account(uuid, text);
DROP FUNCTION IF EXISTS public.generate_bot_account_code();
DROP FUNCTION IF EXISTS public.credit_daily_bot_returns();
DROP FUNCTION IF EXISTS public.get_user_bot_pnl_totals(uuid);

DROP FUNCTION IF EXISTS public.request_payout(numeric, public.crypto_currency, text, uuid);
DROP FUNCTION IF EXISTS public.approve_payout_start(uuid);
DROP FUNCTION IF EXISTS public.attach_nowpayments_payout_id(text, uuid);
DROP FUNCTION IF EXISTS public.complete_payout_sent(uuid, text);
DROP FUNCTION IF EXISTS public.fail_payout_and_restore(uuid, text);
DROP FUNCTION IF EXISTS public.mark_payout_provider_failed(uuid, text);
DROP FUNCTION IF EXISTS public.reject_payout(uuid, text);

DROP TABLE IF EXISTS public.transfers CASCADE;
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.payouts CASCADE;
DROP TABLE IF EXISTS public.payments CASCADE;
DROP TABLE IF EXISTS public.user_signal_access CASCADE;
DROP TABLE IF EXISTS public.user_packages CASCADE;
DROP TABLE IF EXISTS public.wallet_balances CASCADE;
DROP TABLE IF EXISTS public.portfolio_snapshots CASCADE;
DROP TABLE IF EXISTS public.package_variants CASCADE;
DROP TABLE IF EXISTS public.packages CASCADE;

DROP TYPE IF EXISTS public.user_package_status;
DROP TYPE IF EXISTS public.payment_kind;
DROP TYPE IF EXISTS public.payment_status;
DROP TYPE IF EXISTS public.payout_status;
DROP TYPE IF EXISTS public.transaction_type;

-- -----------------------------------------------------------------------------
-- 2. Profiles: drop the columns that no longer apply.
--    Keep notification_preferences; it's still used.
-- -----------------------------------------------------------------------------
ALTER TABLE public.profiles DROP COLUMN IF EXISTS referred_by;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS referral_code;

-- -----------------------------------------------------------------------------
-- 3. Enums
-- -----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.account_status AS ENUM ('active', 'expired', 'draining');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.risk_tier AS ENUM ('conservative', 'standard', 'aggressive');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.payment_kind AS ENUM ('deposit', 'withdrawal', 'transfer');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.payment_status AS ENUM (
    'pending_review', 'confirmed', 'rejected', 'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.payout_status AS ENUM (
    'requested', 'pending_review', 'processing', 'sent', 'rejected', 'failed'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.transfer_status AS ENUM (
    'pending', 'completed', 'rejected', 'expired'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.transaction_type AS ENUM (
    'deposit', 'withdrawal', 'transfer_out', 'transfer_in', 'daily_return'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- -----------------------------------------------------------------------------
-- 4. accounts table
-- -----------------------------------------------------------------------------
CREATE TABLE public.accounts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  account_code    text NOT NULL UNIQUE,
  name            text NOT NULL,
  risk_tier       public.risk_tier NOT NULL DEFAULT 'standard',
  status          public.account_status NOT NULL DEFAULT 'active',
  available_usd   numeric(14, 2) NOT NULL DEFAULT 0 CHECK (available_usd >= 0),
  pending_usd     numeric(14, 2) NOT NULL DEFAULT 0 CHECK (pending_usd >= 0),
  capital_usd     numeric(14, 2) NOT NULL DEFAULT 0,
  purchased_at    timestamptz NOT NULL DEFAULT now(),
  expires_at      timestamptz
);

CREATE INDEX IF NOT EXISTS accounts_user_id_idx ON public.accounts (user_id);
CREATE INDEX IF NOT EXISTS accounts_status_idx ON public.accounts (status);

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "accounts_select_own"
  ON public.accounts FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin_fn());

CREATE POLICY "accounts_insert_own"
  ON public.accounts FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "accounts_update_own"
  ON public.accounts FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_admin_fn())
  WITH CHECK (user_id = auth.uid() OR public.is_admin_fn());

-- -----------------------------------------------------------------------------
-- 5. payments table (single kind)
-- -----------------------------------------------------------------------------
CREATE TABLE public.payments (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  account_id       uuid NOT NULL REFERENCES public.accounts (id) ON DELETE RESTRICT,
  kind             public.payment_kind NOT NULL,
  currency         public.crypto_currency NOT NULL,
  amount_usd       numeric(14, 2) NOT NULL CHECK (amount_usd > 0),
  status           public.payment_status NOT NULL DEFAULT 'pending_review',
  tx_hash          text,
  user_note        text,
  admin_note       text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  submitted_at     timestamptz NOT NULL DEFAULT now(),
  confirmed_at     timestamptz,
  nowpayments_payment_id text
);

CREATE INDEX IF NOT EXISTS payments_user_id_idx ON public.payments (user_id);
CREATE INDEX IF NOT EXISTS payments_account_id_idx ON public.payments (account_id);
CREATE INDEX IF NOT EXISTS payments_status_idx ON public.payments (status);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payments_select_own_or_admin"
  ON public.payments FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin_fn());

CREATE POLICY "payments_insert_own"
  ON public.payments FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "payments_update_admin"
  ON public.payments FOR UPDATE TO authenticated
  USING (public.is_admin_fn())
  WITH CHECK (public.is_admin_fn());

-- -----------------------------------------------------------------------------
-- 6. payouts table (withdrawal requests)
-- -----------------------------------------------------------------------------
CREATE TABLE public.payouts (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  account_id           uuid NOT NULL REFERENCES public.accounts (id) ON DELETE RESTRICT,
  amount_usd           numeric(14, 2) NOT NULL CHECK (amount_usd > 0),
  currency             public.crypto_currency NOT NULL,
  destination_address  text NOT NULL,
  status               public.payout_status NOT NULL DEFAULT 'requested',
  nowpayments_payout_id text,
  tx_hash              text,
  admin_note           text,
  requested_at         timestamptz NOT NULL DEFAULT now(),
  reviewed_by          uuid REFERENCES auth.users (id),
  reviewed_at          timestamptz
);

CREATE INDEX IF NOT EXISTS payouts_user_id_idx ON public.payouts (user_id);
CREATE INDEX IF NOT EXISTS payouts_account_id_idx ON public.payouts (account_id);
CREATE INDEX IF NOT EXISTS payouts_status_idx ON public.payouts (status);

ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payouts_select_own_or_admin"
  ON public.payouts FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin_fn());

CREATE POLICY "payouts_insert_own"
  ON public.payouts FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "payouts_update_admin"
  ON public.payouts FOR UPDATE TO authenticated
  USING (public.is_admin_fn())
  WITH CHECK (public.is_admin_fn());

-- -----------------------------------------------------------------------------
-- 7. transfers table
-- -----------------------------------------------------------------------------
CREATE TABLE public.transfers (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id      uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  to_user_id        uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  from_account_id   uuid REFERENCES public.accounts (id) ON DELETE RESTRICT,
  to_account_id     uuid REFERENCES public.accounts (id) ON DELETE RESTRICT,
  amount_usd        numeric(14, 2) NOT NULL CHECK (amount_usd > 0),
  currency          public.crypto_currency NOT NULL DEFAULT 'USDC_ERC20',
  status            public.transfer_status NOT NULL DEFAULT 'pending',
  confirm_token     text UNIQUE,
  expires_at        timestamptz NOT NULL,
  confirmed_at      timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  note              text
);

CREATE INDEX IF NOT EXISTS transfers_from_user_idx ON public.transfers (from_user_id);
CREATE INDEX IF NOT EXISTS transfers_to_user_idx ON public.transfers (to_user_id);
CREATE INDEX IF NOT EXISTS transfers_status_idx ON public.transfers (status);
CREATE INDEX IF NOT EXISTS transfers_expires_idx ON public.transfers (expires_at);

ALTER TABLE public.transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "transfers_select_own"
  ON public.transfers FOR SELECT TO authenticated
  USING (
    from_user_id = auth.uid()
    OR to_user_id = auth.uid()
    OR public.is_admin_fn()
  );

CREATE POLICY "transfers_insert_own"
  ON public.transfers FOR INSERT TO authenticated
  WITH CHECK (from_user_id = auth.uid());

CREATE POLICY "transfers_update_own_or_admin"
  ON public.transfers FOR UPDATE TO authenticated
  USING (
    from_user_id = auth.uid()
    OR to_user_id = auth.uid()
    OR public.is_admin_fn()
  )
  WITH CHECK (
    from_user_id = auth.uid()
    OR to_user_id = auth.uid()
    OR public.is_admin_fn()
  );

-- -----------------------------------------------------------------------------
-- 8. transactions (ledger)
-- -----------------------------------------------------------------------------
CREATE TABLE public.transactions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  account_id          uuid REFERENCES public.accounts (id) ON DELETE RESTRICT,
  type                public.transaction_type NOT NULL,
  amount_usd          numeric(14, 2) NOT NULL,
  reference_table     text,
  reference_id        uuid,
  paired_transaction_id uuid REFERENCES public.transactions (id) ON DELETE SET NULL,
  description         text NOT NULL,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS transactions_user_idx ON public.transactions (user_id);
CREATE INDEX IF NOT EXISTS transactions_account_idx ON public.transactions (account_id);
CREATE INDEX IF NOT EXISTS transactions_created_idx ON public.transactions (created_at DESC);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "transactions_select_own_or_admin"
  ON public.transactions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin_fn());

-- -----------------------------------------------------------------------------
-- 10. profiles handle_new_user trigger — simplified, no referrals.
--    New users start with zero accounts and zero wallet.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, notification_preferences)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', NULL),
    'user',
    jsonb_build_object('email_deposits', true, 'email_payouts', true)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS handle_new_user ON auth.users;
CREATE TRIGGER handle_new_user
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- -----------------------------------------------------------------------------
-- 11. Account code generator (unchanged shape, points at accounts now)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_account_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_code text;
BEGIN
  LOOP
    v_code := 'XAU-' || upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 6));
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.accounts WHERE account_code = v_code
    );
  END LOOP;
  RETURN v_code;
END;
$$;

REVOKE ALL ON FUNCTION public.generate_account_code() FROM PUBLIC, anon, authenticated;

-- -----------------------------------------------------------------------------
-- 12. Auto name generator: "Account 1", "Account 2", … per user.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.next_account_name(p_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT format('Account %s', COALESCE(MAX(name_num), 0) + 1)
  FROM (
    SELECT CAST(regexp_replace(name, '^Account\s+', '') AS integer) AS name_num
    FROM public.accounts
    WHERE user_id = p_user_id
      AND name ~ '^Account\s+[0-9]+$'
  ) sub;
$$;

-- -----------------------------------------------------------------------------
-- 13. create_account — user creates a new account, picking risk_tier.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_account(
  p_risk_tier public.risk_tier DEFAULT 'standard',
  p_expires_at timestamptz DEFAULT NULL
)
RETURNS public.accounts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_account public.accounts%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF p_risk_tier NOT IN ('conservative', 'standard', 'aggressive') THEN
    RAISE EXCEPTION 'invalid risk tier';
  END IF;

  INSERT INTO public.accounts (
    user_id,
    account_code,
    name,
    risk_tier,
    status,
    available_usd,
    pending_usd,
    capital_usd,
    purchased_at,
    expires_at
  )
  VALUES (
    v_user_id,
    public.generate_account_code(),
    public.next_account_name(v_user_id),
    p_risk_tier,
    'active',
    0, 0, 0,
    now(),
    p_expires_at
  )
  RETURNING * INTO v_account;

  RETURN v_account;
END;
$$;

REVOKE ALL ON FUNCTION public.create_account(public.risk_tier, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_account(public.risk_tier, timestamptz) TO authenticated;

-- -----------------------------------------------------------------------------
-- 14. deposit_to_account — user submits a crypto deposit that will be
--    credited once admin approves. Goes into pending_review.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_deposit(
  p_account_id      uuid,
  p_amount_usd      numeric,
  p_currency        public.crypto_currency,
  p_tx_hash         text,
  p_user_note       text DEFAULT NULL
)
RETURNS public.payments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_account public.accounts%ROWTYPE;
  v_payment public.payments%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF p_tx_hash IS NULL OR length(trim(p_tx_hash)) < 8 THEN
    RAISE EXCEPTION 'tx hash required';
  END IF;

  IF p_amount_usd IS NULL OR p_amount_usd < 10 THEN
    RAISE EXCEPTION 'minimum deposit is 10 USD';
  END IF;

  SELECT * INTO v_account
  FROM public.accounts
  WHERE id = p_account_id
    AND user_id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'account not found';
  END IF;

  IF v_account.status <> 'active' THEN
    RAISE EXCEPTION 'account is not active';
  END IF;

  INSERT INTO public.payments (
    user_id, account_id, kind, currency, amount_usd,
    status, tx_hash, user_note, submitted_at
  )
  VALUES (
    v_user_id, p_account_id, 'deposit', p_currency, round(p_amount_usd, 2),
    'pending_review', trim(p_tx_hash), NULLIF(trim(COALESCE(p_user_note, '')), ''), now()
  )
  RETURNING * INTO v_payment;

  RETURN v_payment;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_deposit(uuid, numeric, public.crypto_currency, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_deposit(uuid, numeric, public.crypto_currency, text, text) TO authenticated;

-- -----------------------------------------------------------------------------
-- 15. approve_payment — admin approves a pending deposit. Account.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.approve_payment(p_payment_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment public.payments%ROWTYPE;
BEGIN
  IF NOT public.is_admin_fn() THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  SELECT * INTO v_payment
  FROM public.payments
  WHERE id = p_payment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'payment not found';
  END IF;

  IF v_payment.status <> 'pending_review' THEN
    RAISE EXCEPTION 'payment cannot be approved from status %', v_payment.status;
  END IF;

  UPDATE public.payments
  SET status = 'confirmed',
      confirmed_at = now()
  WHERE id = p_payment_id;

  UPDATE public.accounts
  SET available_usd = available_usd + v_payment.amount_usd,
      capital_usd   = capital_usd   + v_payment.amount_usd
  WHERE id = v_payment.account_id;

  INSERT INTO public.transactions (
    user_id, account_id, type, amount_usd,
    reference_table, reference_id, description
  )
  VALUES (
    v_payment.user_id,
    v_payment.account_id,
    'deposit',
    v_payment.amount_usd,
    'payments',
    p_payment_id,
    format('Deposit confirmed: %s USD via %s',
           v_payment.amount_usd, v_payment.currency::text)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.approve_payment(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_payment(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.reject_payment(p_payment_id uuid, p_note text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment public.payments%ROWTYPE;
BEGIN
  IF NOT public.is_admin_fn() THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  SELECT * INTO v_payment FROM public.payments WHERE id = p_payment_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'payment not found'; END IF;
  IF v_payment.status <> 'pending_review' THEN
    RAISE EXCEPTION 'cannot reject from status %', v_payment.status;
  END IF;

  UPDATE public.payments
  SET status = 'rejected', admin_note = p_note
  WHERE id = p_payment_id;
END;
$$;

REVOKE ALL ON FUNCTION public.reject_payment(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reject_payment(uuid, text) TO authenticated;

-- -----------------------------------------------------------------------------
-- 16. transfer_between_accounts — same-user, instant.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.transfer_between_accounts(
  p_from_account_id uuid,
  p_to_account_id   uuid,
  p_amount_usd      numeric
)
RETURNS public.transfers
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_from    public.accounts%ROWTYPE;
  v_to      public.accounts%ROWTYPE;
  v_tx_out  public.transactions%ROWTYPE;
  v_tx_in   public.transactions%ROWTYPE;
  v_transfer public.transfers%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF p_from_account_id = p_to_account_id THEN
    RAISE EXCEPTION 'cannot transfer to the same account';
  END IF;

  IF p_amount_usd IS NULL OR p_amount_usd <= 0 THEN
    RAISE EXCEPTION 'amount must be positive';
  END IF;

  -- Lock both accounts in a deterministic order.
  SELECT * INTO v_from
  FROM public.accounts
  WHERE id = p_from_account_id AND user_id = v_user_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'source account not found'; END IF;

  SELECT * INTO v_to
  FROM public.accounts
  WHERE id = p_to_account_id AND user_id = v_user_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'destination account not found'; END IF;

  IF v_from.status <> 'active' THEN
    RAISE EXCEPTION 'source account is not active';
  END IF;
  IF v_to.status <> 'active' THEN
    RAISE EXCEPTION 'destination account is not active';
  END IF;

  IF v_from.available_usd < p_amount_usd THEN
    RAISE EXCEPTION 'insufficient funds';
  END IF;

  UPDATE public.accounts
  SET available_usd = available_usd - p_amount_usd
  WHERE id = v_from.id;

  UPDATE public.accounts
  SET available_usd = available_usd + p_amount_usd
  WHERE id = v_to.id;

  INSERT INTO public.transfers (
    from_user_id, to_user_id, from_account_id, to_account_id,
    amount_usd, currency, status, confirm_token, expires_at, confirmed_at
  )
  VALUES (
    v_user_id, v_user_id, v_from.id, v_to.id,
    p_amount_usd, 'USDC_ERC20', 'completed', NULL, now(), now()
  )
  RETURNING * INTO v_transfer;

  INSERT INTO public.transactions (
    user_id, account_id, type, amount_usd,
    reference_table, reference_id, description
  )
  VALUES (
    v_user_id, v_from.id, 'transfer_out', p_amount_usd,
    'transfers', v_transfer.id,
    format('Transfer to %s: %s USD', v_to.account_code, p_amount_usd)
  )
  RETURNING * INTO v_tx_out;

  INSERT INTO public.transactions (
    user_id, account_id, type, amount_usd,
    reference_table, reference_id, paired_transaction_id, description
  )
  VALUES (
    v_user_id, v_to.id, 'transfer_in', p_amount_usd,
    'transfers', v_transfer.id, v_tx_out.id,
    format('Transfer from %s: %s USD', v_from.account_code, p_amount_usd)
  )
  RETURNING * INTO v_tx_in;

  UPDATE public.transactions
  SET paired_transaction_id = v_tx_in.id
  WHERE id = v_tx_out.id;

  RETURN v_transfer;
END;
$$;

REVOKE ALL ON FUNCTION public.transfer_between_accounts(uuid, uuid, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.transfer_between_accounts(uuid, uuid, numeric) TO authenticated;

-- -----------------------------------------------------------------------------
-- 17. transfer_to_user — cross-user, pending until recipient confirms.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.transfer_to_user(
  p_from_account_id uuid,
  p_to_email        text,
  p_amount_usd      numeric,
  p_note            text DEFAULT NULL
)
RETURNS public.transfers
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id    uuid := auth.uid();
  v_from       public.accounts%ROWTYPE;
  v_to_profile public.profiles%ROWTYPE;
  v_transfer   public.transfers%ROWTYPE;
  v_token      text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF p_amount_usd IS NULL OR p_amount_usd <= 0 THEN
    RAISE EXCEPTION 'amount must be positive';
  END IF;

  -- Lock source account.
  SELECT * INTO v_from
  FROM public.accounts
  WHERE id = p_from_account_id AND user_id = v_user_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'source account not found'; END IF;
  IF v_from.status <> 'active' THEN
    RAISE EXCEPTION 'source account is not active';
  END IF;
  IF v_from.available_usd < p_amount_usd THEN
    RAISE EXCEPTION 'insufficient funds';
  END IF;

  -- Find recipient. Email must already be a registered profile.
  SELECT * INTO v_to_profile
  FROM public.profiles
  WHERE lower(email) = lower(trim(p_to_email))
  LIMIT 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'recipient email not registered';
  END IF;
  IF v_to_profile.id = v_user_id THEN
    RAISE EXCEPTION 'cannot transfer to yourself';
  END IF;

  -- Move available → pending on the sender side.
  UPDATE public.accounts
  SET available_usd = available_usd - p_amount_usd,
      pending_usd   = pending_usd   + p_amount_usd
  WHERE id = v_from.id;

  -- Generate a confirm token (URL-safe).
  v_token := encode(gen_random_bytes(24), 'hex');

  INSERT INTO public.transfers (
    from_user_id, to_user_id, from_account_id, to_account_id,
    amount_usd, currency, status, confirm_token, expires_at, note
  )
  VALUES (
    v_user_id, v_to_profile.id, v_from.id, NULL,
    p_amount_usd, 'USDC_ERC20', 'pending', v_token,
    now() + interval '2 hours', NULLIF(trim(COALESCE(p_note, '')), '')
  )
  RETURNING * INTO v_transfer;

  RETURN v_transfer;
END;
$$;

REVOKE ALL ON FUNCTION public.transfer_to_user(uuid, text, numeric, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.transfer_to_user(uuid, text, numeric, text) TO authenticated;

-- -----------------------------------------------------------------------------
-- 18. confirm_transfer — recipient confirms. Credits destination (or
--     pending balance) and writes both ledger legs.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.confirm_transfer(p_transfer_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_transfer public.transfers%ROWTYPE;
  v_tx_out   public.transactions%ROWTYPE;
  v_tx_in    public.transactions%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT * INTO v_transfer
  FROM public.transfers
  WHERE id = p_transfer_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'transfer not found'; END IF;

  IF v_transfer.status <> 'pending' THEN
    RAISE EXCEPTION 'transfer is not pending';
  END IF;

  IF v_transfer.expires_at < now() THEN
    UPDATE public.transfers SET status = 'expired' WHERE id = p_transfer_id;
    -- Return funds to sender.
    UPDATE public.accounts
    SET available_usd = available_usd + v_transfer.amount_usd,
        pending_usd   = pending_usd   - v_transfer.amount_usd
    WHERE id = v_transfer.from_account_id;
    RAISE EXCEPTION 'transfer expired';
  END IF;

  IF v_transfer.to_user_id <> auth.uid() AND NOT public.is_admin_fn() THEN
    RAISE EXCEPTION 'only the recipient can confirm';
  END IF;

  UPDATE public.transfers
  SET status = 'completed', confirmed_at = now()
  WHERE id = p_transfer_id;

  -- Release the sender's pending hold.
  UPDATE public.accounts
  SET pending_usd = GREATEST(pending_usd - v_transfer.amount_usd, 0)
  WHERE id = v_transfer.from_account_id;

  -- Find or create a destination account for the recipient.
  -- For cross-user transfers to_account_id is NULL; we auto-credit their
  -- first active account, or create one.
  IF v_transfer.to_account_id IS NULL THEN
    -- Try to find an existing active account for the recipient.
    SELECT id INTO v_transfer.to_account_id
    FROM public.accounts
    WHERE user_id = v_transfer.to_user_id AND status = 'active'
    ORDER BY purchased_at ASC
    LIMIT 1;
  END IF;

  IF v_transfer.to_account_id IS NULL THEN
    -- No account yet — auto-create one for the recipient.
    INSERT INTO public.accounts (
      user_id, account_code, name, risk_tier, status,
      available_usd, pending_usd, capital_usd, purchased_at
    )
    VALUES (
      v_transfer.to_user_id,
      public.generate_account_code(),
      public.next_account_name(v_transfer.to_user_id),
      'standard',
      'active',
      v_transfer.amount_usd, 0, v_transfer.amount_usd,
      now()
    )
    RETURNING id INTO v_transfer.to_account_id;
  ELSE
    UPDATE public.accounts
    SET available_usd = available_usd + v_transfer.amount_usd
    WHERE id = v_transfer.to_account_id;
  END IF;

  -- Update the transfer row with the resolved to_account_id.
  UPDATE public.transfers
  SET to_account_id = v_transfer.to_account_id
  WHERE id = p_transfer_id;

  INSERT INTO public.transactions (
    user_id, account_id, type, amount_usd,
    reference_table, reference_id, description
  )
  VALUES (
    v_transfer.from_user_id, v_transfer.from_account_id,
    'transfer_out', v_transfer.amount_usd,
    'transfers', p_transfer_id,
    format('transfer_out to user %s', v_transfer.to_user_id)
  )
  RETURNING * INTO v_tx_out;

  INSERT INTO public.transactions (
    user_id, account_id, type, amount_usd,
    reference_table, reference_id, paired_transaction_id, description
  )
  VALUES (
    v_transfer.to_user_id, v_transfer.to_account_id,
    'transfer_in', v_transfer.amount_usd,
    'transfers', p_transfer_id, v_tx_out.id,
    format('transfer_in from user %s', v_transfer.from_user_id)
  )
  RETURNING * INTO v_tx_in;

  UPDATE public.transactions
  SET paired_transaction_id = v_tx_in.id
  WHERE id = v_tx_out.id;
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_transfer(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirm_transfer(uuid) TO authenticated;

-- -----------------------------------------------------------------------------
-- 19. expire_pending_transfers — periodic sweep. Returns refunded transfers.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.expire_pending_transfers()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
  v_row   public.transfers%ROWTYPE;
BEGIN
  v_count := 0;
  FOR v_row IN
    SELECT * FROM public.transfers
    WHERE status = 'pending' AND expires_at < now()
    FOR UPDATE
  LOOP
    UPDATE public.transfers SET status = 'expired' WHERE id = v_row.id;
    UPDATE public.accounts
    SET available_usd = available_usd + v_row.amount_usd,
        pending_usd   = pending_usd   - v_row.amount_usd
    WHERE id = v_row.from_account_id;
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.expire_pending_transfers() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.expire_pending_transfers() TO authenticated;

-- -----------------------------------------------------------------------------
-- 20. request_withdrawal — user requests a withdrawal from an account.
--     Debits available → pending; admin approves (NOWPayments sandbox).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.request_withdrawal(
  p_account_id         uuid,
  p_amount_usd         numeric,
  p_currency           public.crypto_currency,
  p_destination_address text
)
RETURNS public.payouts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_account public.accounts%ROWTYPE;
  v_payout  public.payouts%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF p_amount_usd IS NULL OR p_amount_usd < 10 THEN
    RAISE EXCEPTION 'minimum withdrawal is 10 USD';
  END IF;

  SELECT * INTO v_account
  FROM public.accounts
  WHERE id = p_account_id AND user_id = v_user_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'account not found'; END IF;

  IF v_account.status <> 'active' THEN
    RAISE EXCEPTION 'account is not active';
  END IF;

  IF v_account.available_usd < p_amount_usd THEN
    RAISE EXCEPTION 'insufficient funds';
  END IF;

  UPDATE public.accounts
  SET available_usd = available_usd - p_amount_usd,
      pending_usd   = pending_usd   + p_amount_usd,
      capital_usd   = GREATEST(capital_usd - p_amount_usd, 0)
  WHERE id = v_account.id;

  INSERT INTO public.payouts (
    user_id, account_id, amount_usd, currency,
    destination_address, status, requested_at
  )
  VALUES (
    v_user_id, v_account.id, p_amount_usd, p_currency,
    p_destination_address, 'requested', now()
  )
  RETURNING * INTO v_payout;

  INSERT INTO public.transactions (
    user_id, account_id, type, amount_usd,
    reference_table, reference_id, description
  )
  VALUES (
    v_user_id, v_account.id, 'withdrawal', p_amount_usd,
    'payouts', v_payout.id,
    format('Withdrawal requested: %s USD via %s',
           p_amount_usd, p_currency::text)
  );

  RETURN v_payout;
END;
$$;

REVOKE ALL ON FUNCTION public.request_withdrawal(uuid, numeric, public.crypto_currency, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_withdrawal(uuid, numeric, public.crypto_currency, text) TO authenticated;

-- -----------------------------------------------------------------------------
-- 21. Admin payout approve/reject — clears pending hold.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.approve_payout(p_payout_id uuid, p_nowpayments_id text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payout public.payouts%ROWTYPE;
BEGIN
  IF NOT public.is_admin_fn() THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  SELECT * INTO v_payout FROM public.payouts WHERE id = p_payout_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'payout not found'; END IF;

  IF v_payout.status <> 'requested' THEN
    RAISE EXCEPTION 'payout cannot be approved from status %', v_payout.status;
  END IF;

  UPDATE public.payouts
  SET status = 'processing',
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      nowpayments_payout_id = COALESCE(p_nowpayments_id, nowpayments_payout_id)
  WHERE id = p_payout_id;
END;
$$;

REVOKE ALL ON FUNCTION public.approve_payout(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_payout(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.complete_payout(p_payout_id uuid, p_tx_hash text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payout public.payouts%ROWTYPE;
BEGIN
  IF NOT public.is_admin_fn() THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  SELECT * INTO v_payout FROM public.payouts WHERE id = p_payout_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'payout not found'; END IF;

  IF v_payout.status <> 'processing' THEN
    RAISE EXCEPTION 'payout not in processing';
  END IF;

  UPDATE public.payouts
  SET status = 'sent', tx_hash = COALESCE(p_tx_hash, tx_hash)
  WHERE id = p_payout_id;

  UPDATE public.accounts
  SET pending_usd = GREATEST(pending_usd - v_payout.amount_usd, 0)
  WHERE id = v_payout.account_id;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_payout(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_payout(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.fail_payout(p_payout_id uuid, p_note text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payout public.payouts%ROWTYPE;
BEGIN
  IF NOT public.is_admin_fn() THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  SELECT * INTO v_payout FROM public.payouts WHERE id = p_payout_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'payout not found'; END IF;

  UPDATE public.payouts
  SET status = 'failed', admin_note = p_note, reviewed_at = now(),
      reviewed_by = auth.uid()
  WHERE id = p_payout_id;

  -- Refund: pending → available (and capital stays if it was capital).
  UPDATE public.accounts
  SET available_usd = available_usd + v_payout.amount_usd,
      pending_usd   = GREATEST(pending_usd - v_payout.amount_usd, 0),
      capital_usd   = capital_usd + v_payout.amount_usd
  WHERE id = v_payout.account_id;
END;
$$;

REVOKE ALL ON FUNCTION public.fail_payout(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fail_payout(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.reject_payout(p_payout_id uuid, p_note text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.fail_payout(p_payout_id, p_note);
END;
$$;

REVOKE ALL ON FUNCTION public.reject_payout(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reject_payout(uuid, text) TO authenticated;

-- -----------------------------------------------------------------------------
-- 22. credit_daily_returns — admin/daily cron distributes returns.
--     Reads accounts, distributes based on risk_tier.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.credit_daily_returns(
  p_conservative_pct numeric DEFAULT 0.5,
  p_standard_pct      numeric DEFAULT 1.0,
  p_aggressive_pct    numeric DEFAULT 1.5
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account public.accounts%ROWTYPE;
  v_pct     numeric;
  v_amount  numeric;
  v_count   integer := 0;
BEGIN
  IF NOT public.is_admin_fn() THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  FOR v_account IN
    SELECT * FROM public.accounts
    WHERE status = 'active'
      AND capital_usd > 0
    FOR UPDATE
  LOOP
    v_pct := CASE v_account.risk_tier
      WHEN 'conservative' THEN p_conservative_pct
      WHEN 'standard'     THEN p_standard_pct
      WHEN 'aggressive'   THEN p_aggressive_pct
      ELSE p_standard_pct
    END;

    v_amount := round(v_account.capital_usd * v_pct / 100.0, 2);
    IF v_amount <= 0 THEN CONTINUE; END IF;

    UPDATE public.accounts
    SET available_usd = available_usd + v_amount
    WHERE id = v_account.id;

    INSERT INTO public.transactions (
      user_id, account_id, type, amount_usd,
      reference_table, reference_id, description
    )
    VALUES (
      v_account.user_id, v_account.id, 'daily_return', v_amount,
      'accounts', v_account.id,
      format('Daily return (%s, %s%%): %s USD',
             v_account.risk_tier::text, v_pct, v_amount)
    );

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.credit_daily_returns(numeric, numeric, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.credit_daily_returns(numeric, numeric, numeric) TO authenticated;

-- -----------------------------------------------------------------------------
-- 23. Re-create referral_leaderboard view (still required by /dashboard/accounts.
--    Top 10 referrers — but referred_by is gone, so this view is now a
--    placeholder that returns nothing. Keep it so consumers don't break.)
-- -----------------------------------------------------------------------------
DROP VIEW IF EXISTS public.referral_leaderboard;
CREATE VIEW public.referral_leaderboard
WITH (security_invoker = true) AS
SELECT
  p.id            AS user_id,
  p.email         AS display_name,
  NULL::text      AS referral_code,
  0::int          AS referred_count
FROM public.profiles p
WHERE FALSE;

GRANT SELECT ON public.referral_leaderboard TO authenticated;

-- -----------------------------------------------------------------------------
-- 24. Restore deposit_addresses policies.
--    The original policies referenced is_admin() (dropped in step 1 with CASCADE)
--    and were silently removed. Re-create them against is_admin_fn().
-- -----------------------------------------------------------------------------
CREATE POLICY "deposit_addresses_select_authenticated"
  ON public.deposit_addresses FOR SELECT TO authenticated
  USING (is_active = true OR public.is_admin_fn());

CREATE POLICY "deposit_addresses_insert_admin"
  ON public.deposit_addresses FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_fn());

CREATE POLICY "deposit_addresses_update_admin"
  ON public.deposit_addresses FOR UPDATE TO authenticated
  USING (public.is_admin_fn())
  WITH CHECK (public.is_admin_fn());