-- Rename plan enum values and ensure display fields match Aurum / Sentinel / Aero.
-- Schema columns are added in 0018 if 0016 was not applied.

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

-- Data updates require columns from 0016 or 0018; skip when columns are missing.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'packages'
      AND column_name = 'access_term_days'
  ) THEN
    RAISE NOTICE '0017: package display columns missing — run 0018_add_package_display_columns.sql';
    RETURN;
  END IF;

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
END $$;
