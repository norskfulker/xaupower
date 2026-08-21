-- Admin deposit wallets are three networks: BTC, ERC20, TRC20.
-- ERC20 (0x) covers ETH, BNB, USDT/USDC ERC20, USDT/USDC BEP20.
-- TRC20 (T…) covers TRX, USDT/USDC TRC20.

CREATE TYPE public.wallet_network AS ENUM ('BTC', 'ERC20', 'TRC20');

ALTER TABLE public.deposit_addresses
  ADD COLUMN network public.wallet_network;

UPDATE public.deposit_addresses
SET network = CASE currency::text
  WHEN 'BTC' THEN 'BTC'::public.wallet_network
  WHEN 'ETH' THEN 'ERC20'::public.wallet_network
  ELSE 'TRC20'::public.wallet_network
END;

ALTER TABLE public.deposit_addresses
  DROP CONSTRAINT IF EXISTS deposit_addresses_currency_key;

ALTER TABLE public.deposit_addresses
  DROP COLUMN currency;

ALTER TABLE public.deposit_addresses
  RENAME COLUMN network TO currency;

ALTER TABLE public.deposit_addresses
  ALTER COLUMN currency SET NOT NULL;

ALTER TABLE public.deposit_addresses
  ADD CONSTRAINT deposit_addresses_currency_key UNIQUE (currency);

INSERT INTO public.deposit_addresses (currency, address, is_active)
SELECT 'TRC20'::public.wallet_network, 'PLACEHOLDER_TRC20_REPLACE_BEFORE_LIVE', true
WHERE NOT EXISTS (
  SELECT 1 FROM public.deposit_addresses WHERE currency = 'TRC20'
);

INSERT INTO public.deposit_addresses (currency, address, is_active)
SELECT 'ERC20'::public.wallet_network, 'PLACEHOLDER_ERC20_REPLACE_BEFORE_LIVE', true
WHERE NOT EXISTS (
  SELECT 1 FROM public.deposit_addresses WHERE currency = 'ERC20'
);
