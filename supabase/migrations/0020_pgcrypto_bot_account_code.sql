-- generate_bot_account_code() uses gen_random_bytes from pgcrypto.

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.generate_bot_account_code()
RETURNS text
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
DECLARE
  v_code text;
BEGIN
  LOOP
    v_code := 'XAU-' || upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 6));
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.user_packages WHERE account_code = v_code
    );
  END LOOP;
  RETURN v_code;
END;
$$;

REVOKE ALL ON FUNCTION public.generate_bot_account_code() FROM PUBLIC, anon, authenticated;
