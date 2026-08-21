-- Server-side metal price cache. Clients read + Realtime-subscribe only.
-- External API is hit by the refresh-prices Edge Function on a 5-minute cron.

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE TABLE IF NOT EXISTS public.price_cache (
  pair text PRIMARY KEY CHECK (pair IN ('XAUUSD', 'XAGUSD')),
  price numeric(18, 6) NOT NULL CHECK (price > 0),
  change_pct numeric(12, 6),
  fetched_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.price_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "price_cache_public_read" ON public.price_cache;
CREATE POLICY "price_cache_public_read"
  ON public.price_cache FOR SELECT
  USING (true);

GRANT SELECT ON public.price_cache TO anon, authenticated;

ALTER TABLE public.price_cache REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'price_cache'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.price_cache;
  END IF;
END $$;

-- Invoke refresh-prices every 5 minutes. The function itself refuses to
-- hit goldprice.dev more often than ~4 minutes, so extra triggers are cheap.
DO $$
BEGIN
  PERFORM cron.unschedule('refresh-metal-prices');
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

SELECT cron.schedule(
  'refresh-metal-prices',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://bsjhsefduusvagccqajn.supabase.co/functions/v1/refresh-prices',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
