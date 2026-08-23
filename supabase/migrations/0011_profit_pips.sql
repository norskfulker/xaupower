-- Per-user profit in pips (set by admin on the dashboard card).
ALTER TABLE public.wallet_balances
  ADD COLUMN IF NOT EXISTS profit_pips numeric(12, 2) NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'wallet_balances'
      AND policyname = 'wallet_balances_update_admin'
  ) THEN
    CREATE POLICY "wallet_balances_update_admin"
      ON public.wallet_balances FOR UPDATE TO authenticated
      USING (public.is_admin())
      WITH CHECK (public.is_admin());
  END IF;
END $$;
