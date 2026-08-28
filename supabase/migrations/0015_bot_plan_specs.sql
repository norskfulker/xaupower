-- Plan prices and primary variant drawdowns per tier

UPDATE public.packages
SET price_usd = CASE name
  WHEN 'Assay' THEN 99
  WHEN 'Bullion' THEN 399
  WHEN 'Vault' THEN 999
  ELSE price_usd
END;

UPDATE public.package_variants pv
SET price_usd = p.price_usd
FROM public.packages p
WHERE pv.package_id = p.id;

UPDATE public.package_variants pv
SET max_drawdown_pct = 5
FROM public.packages p
WHERE p.name = 'Assay'
  AND pv.package_id = p.id
  AND pv.risk_tier = 'conservative';

UPDATE public.package_variants pv
SET max_drawdown_pct = 8
FROM public.packages p
WHERE p.name = 'Bullion'
  AND pv.package_id = p.id
  AND pv.risk_tier = 'standard';

UPDATE public.package_variants pv
SET max_drawdown_pct = 15
FROM public.packages p
WHERE p.name = 'Vault'
  AND pv.package_id = p.id
  AND pv.risk_tier = 'aggressive';
