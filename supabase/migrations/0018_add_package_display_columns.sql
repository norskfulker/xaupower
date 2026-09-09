-- Add package display columns (if 0016 was not applied) and seed Aurum / Sentinel / Aero.

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

CREATE UNIQUE INDEX IF NOT EXISTS package_variants_one_default_per_package
  ON public.package_variants (package_id)
  WHERE is_default;

-- Rename enum labels when old names still exist (safe if already renamed).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'package_name' AND e.enumlabel = 'Assay'
  ) THEN
    ALTER TYPE public.package_name RENAME VALUE 'Assay' TO 'Aurum';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'package_name' AND e.enumlabel = 'Bullion'
  ) THEN
    ALTER TYPE public.package_name RENAME VALUE 'Bullion' TO 'Sentinel';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'package_name' AND e.enumlabel = 'Vault'
  ) THEN
    ALTER TYPE public.package_name RENAME VALUE 'Vault' TO 'Aero';
  END IF;
END $$;

UPDATE public.packages
SET
  access_term_days = 21,
  trades_per_day = CASE name::text
    WHEN 'Aurum' THEN 7
    WHEN 'Assay' THEN 7
    WHEN 'Sentinel' THEN 20
    WHEN 'Bullion' THEN 20
    WHEN 'Aero' THEN 40
    WHEN 'Vault' THEN 40
    ELSE trades_per_day
  END,
  daily_return_min_pct = CASE name::text
    WHEN 'Aurum' THEN 5
    WHEN 'Assay' THEN 5
    WHEN 'Sentinel' THEN 6
    WHEN 'Bullion' THEN 6
    WHEN 'Aero' THEN 7
    WHEN 'Vault' THEN 7
    ELSE daily_return_min_pct
  END,
  daily_return_max_pct = CASE name::text
    WHEN 'Aurum' THEN 8
    WHEN 'Assay' THEN 8
    WHEN 'Sentinel' THEN 12
    WHEN 'Bullion' THEN 12
    WHEN 'Aero' THEN 14
    WHEN 'Vault' THEN 14
    ELSE daily_return_max_pct
  END,
  max_loss_pct = CASE name::text
    WHEN 'Aurum' THEN 30
    WHEN 'Assay' THEN 30
    WHEN 'Sentinel' THEN 40
    WHEN 'Bullion' THEN 40
    WHEN 'Aero' THEN 50
    WHEN 'Vault' THEN 50
    ELSE max_loss_pct
  END,
  price_usd = CASE name::text
    WHEN 'Aurum' THEN 99
    WHEN 'Assay' THEN 99
    WHEN 'Sentinel' THEN 399
    WHEN 'Bullion' THEN 399
    WHEN 'Aero' THEN 999
    WHEN 'Vault' THEN 999
    ELSE price_usd
  END;

UPDATE public.package_variants pv
SET is_default = false;

UPDATE public.package_variants pv
SET
  is_default = true,
  strategy_label = 'Nominal',
  max_drawdown_pct = 5
FROM public.packages p
WHERE pv.package_id = p.id
  AND pv.risk_tier = 'conservative'
  AND p.name::text IN ('Aurum', 'Assay');

UPDATE public.package_variants pv
SET
  is_default = true,
  strategy_label = 'Conservative',
  max_drawdown_pct = 8
FROM public.packages p
WHERE pv.package_id = p.id
  AND pv.risk_tier = 'standard'
  AND p.name::text IN ('Sentinel', 'Bullion');

UPDATE public.package_variants pv
SET
  is_default = true,
  strategy_label = 'Aggressive',
  max_drawdown_pct = 15
FROM public.packages p
WHERE pv.package_id = p.id
  AND pv.risk_tier = 'aggressive'
  AND p.name::text IN ('Aero', 'Vault');

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
