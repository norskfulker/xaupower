-- Settings additions only. Does not alter payment/payout RPCs or snapshots.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS notification_preferences jsonb NOT NULL DEFAULT '{"email_deposits": true, "email_payouts": true}'::jsonb;

CREATE TABLE public.saved_payout_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  currency public.crypto_currency NOT NULL,
  address text NOT NULL,
  label text NOT NULL DEFAULT 'Payout address',
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX saved_payout_addresses_user_id_idx
  ON public.saved_payout_addresses (user_id);

ALTER TABLE public.saved_payout_addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "saved_payout_addresses_select_own"
  ON public.saved_payout_addresses FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "saved_payout_addresses_insert_own"
  ON public.saved_payout_addresses FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "saved_payout_addresses_update_own"
  ON public.saved_payout_addresses FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "saved_payout_addresses_delete_own"
  ON public.saved_payout_addresses FOR DELETE TO authenticated
  USING (user_id = auth.uid());
