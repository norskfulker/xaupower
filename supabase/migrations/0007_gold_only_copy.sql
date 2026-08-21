-- Gold-only product copy. Live packages/variants only — do not rewrite
-- variant_snapshot (those rows are the terms a customer already bought).
-- signal_pair enum keeps XAGUSD for any historical signal rows.

UPDATE public.packages
SET
  tagline = 'Core XAUUSD signal access',
  features = '["XAUUSD signal feed","Entry, stop, and take-profit levels","Email alerts"]'::jsonb
WHERE name = 'Assay';

UPDATE public.packages
SET tagline = 'XAUUSD signal feed plus playbook and indicators'
WHERE name = 'Bullion';

UPDATE public.packages
SET tagline = 'Full XAUUSD terminal access with bot guide'
WHERE name = 'Vault';

UPDATE public.package_variants pv
SET roadmap = v.roadmap
FROM (
  SELECT p.id AS package_id, x.risk_tier, x.roadmap
  FROM public.packages p
  JOIN (
    VALUES
      (
        'Assay'::public.package_name,
        'conservative'::public.risk_tier,
        '[{"step":1,"label":"Bot enters 0.01 lot XAUUSD positions on confirmed gold setups"},{"step":2,"label":"Bot targets 1.5% gold moves before scaling out"},{"step":3,"label":"Bot caps open XAUUSD risk near 5% drawdown band"}]'::jsonb
      ),
      (
        'Assay'::public.package_name,
        'standard'::public.risk_tier,
        '[{"step":1,"label":"Bot enters up to 0.03 lot on confirmed XAUUSD setups"},{"step":2,"label":"Bot targets 2.5% gold moves at this tier"},{"step":3,"label":"Bot allows XAUUSD drawdown band up to 8%"}]'::jsonb
      ),
      (
        'Assay'::public.package_name,
        'aggressive'::public.risk_tier,
        '[{"step":1,"label":"Bot risks up to 0.05 lots per XAUUSD trade"},{"step":2,"label":"Bot targets 4% gold moves at this tier"},{"step":3,"label":"Bot allows XAUUSD drawdown band up to 12%"}]'::jsonb
      ),
      (
        'Bullion'::public.package_name,
        'conservative'::public.risk_tier,
        '[{"step":1,"label":"Bot enters 0.02 lot XAUUSD positions with indicator confirmation"},{"step":2,"label":"Bot targets 2% gold moves before partial exits"},{"step":3,"label":"Bot caps open XAUUSD risk near 6% drawdown band"}]'::jsonb
      ),
      (
        'Bullion'::public.package_name,
        'standard'::public.risk_tier,
        '[{"step":1,"label":"Bot enters up to 0.05 lot on XAUUSD playbook setups"},{"step":2,"label":"Bot targets 3.5% gold moves at this tier"},{"step":3,"label":"Bot allows XAUUSD drawdown band up to 10%"}]'::jsonb
      ),
      (
        'Bullion'::public.package_name,
        'aggressive'::public.risk_tier,
        '[{"step":1,"label":"Bot risks up to 0.10 lots per XAUUSD trade"},{"step":2,"label":"Bot targets 5.5% gold moves at this tier"},{"step":3,"label":"Bot allows XAUUSD drawdown band up to 15%"}]'::jsonb
      ),
      (
        'Vault'::public.package_name,
        'conservative'::public.risk_tier,
        '[{"step":1,"label":"Bot follows the vault XAUUSD playbook at 0.03 lot"},{"step":2,"label":"Bot targets 2.5% gold moves at this tier"},{"step":3,"label":"Bot caps open XAUUSD risk near 7% drawdown band"}]'::jsonb
      ),
      (
        'Vault'::public.package_name,
        'standard'::public.risk_tier,
        '[{"step":1,"label":"Bot enters up to 0.08 lot on full XAUUSD terminal rules"},{"step":2,"label":"Bot targets 4% gold moves at this tier"},{"step":3,"label":"Bot allows XAUUSD drawdown band up to 12%"}]'::jsonb
      ),
      (
        'Vault'::public.package_name,
        'aggressive'::public.risk_tier,
        '[{"step":1,"label":"Bot risks up to 0.15 lots per XAUUSD trade"},{"step":2,"label":"Bot targets 6.5% gold moves at this tier"},{"step":3,"label":"Bot allows XAUUSD drawdown band up to 18%"}]'::jsonb
      )
  ) AS x(package_name, risk_tier, roadmap)
    ON p.name = x.package_name
) v
WHERE pv.package_id = v.package_id
  AND pv.risk_tier = v.risk_tier;
