-- Payment/payout rails. Legacy BTC, ETH, USDT values stay on crypto_currency.
ALTER TYPE public.crypto_currency ADD VALUE IF NOT EXISTS 'BNB';
ALTER TYPE public.crypto_currency ADD VALUE IF NOT EXISTS 'TRX';
ALTER TYPE public.crypto_currency ADD VALUE IF NOT EXISTS 'USDT_ERC20';
ALTER TYPE public.crypto_currency ADD VALUE IF NOT EXISTS 'USDT_BEP20';
ALTER TYPE public.crypto_currency ADD VALUE IF NOT EXISTS 'USDT_TRC20';
ALTER TYPE public.crypto_currency ADD VALUE IF NOT EXISTS 'USDC_ERC20';
ALTER TYPE public.crypto_currency ADD VALUE IF NOT EXISTS 'USDC_BEP20';
ALTER TYPE public.crypto_currency ADD VALUE IF NOT EXISTS 'USDC_TRC20';
