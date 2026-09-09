-- Referral codes on profiles. Users cannot refer themselves.
-- referred_by is set only at signup (handle_new_user) and then frozen.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_code text,
  ADD COLUMN IF NOT EXISTS referred_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_referral_code_key;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_referral_code_key UNIQUE (referral_code);

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_no_self_refer;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_no_self_refer
  CHECK (referred_by IS NULL OR referred_by <> id);

CREATE INDEX IF NOT EXISTS profiles_referred_by_idx
  ON public.profiles (referred_by);

CREATE OR REPLACE FUNCTION public.new_referral_code()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  code text;
  attempts int := 0;
BEGIN
  LOOP
    code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.profiles WHERE referral_code = code
    );
    attempts := attempts + 1;
    IF attempts > 24 THEN
      RAISE EXCEPTION 'could not allocate a referral code';
    END IF;
  END LOOP;
  RETURN code;
END;
$$;

CREATE OR REPLACE FUNCTION public.normalize_referral_code(p_code text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT upper(regexp_replace(trim(coalesce(p_code, '')), '[^a-zA-Z0-9]', '', 'g'));
$$;

CREATE OR REPLACE FUNCTION public.profiles_referral_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    NEW.referred_by := OLD.referred_by;
  END IF;

  IF NEW.referred_by IS NOT NULL AND NEW.referred_by = NEW.id THEN
    RAISE EXCEPTION 'cannot refer yourself';
  END IF;

  IF NEW.referral_code IS NOT NULL THEN
    NEW.referral_code := public.normalize_referral_code(NEW.referral_code);
    IF length(NEW.referral_code) < 4 OR length(NEW.referral_code) > 12 THEN
      RAISE EXCEPTION 'referral code must be 4 to 12 letters or numbers';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_referral_guard ON public.profiles;
CREATE TRIGGER profiles_referral_guard
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.profiles_referral_guard();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_own_code text;
  v_ref_code text;
  v_referrer uuid;
BEGIN
  v_own_code := public.new_referral_code();
  v_ref_code := public.normalize_referral_code(NEW.raw_user_meta_data->>'referral_code');

  IF v_ref_code <> '' THEN
    SELECT id
      INTO v_referrer
      FROM public.profiles
     WHERE referral_code = v_ref_code
       AND id <> NEW.id
     LIMIT 1;
  END IF;

  INSERT INTO public.profiles (id, email, full_name, role, referral_code, referred_by)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', NULL),
    'user',
    v_own_code,
    v_referrer
  );

  INSERT INTO public.wallet_balances (user_id, available_usd, pending_usd)
  VALUES (NEW.id, 0, 0);

  RETURN NEW;
END;
$$;

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT id FROM public.profiles WHERE referral_code IS NULL LOOP
    UPDATE public.profiles
       SET referral_code = public.new_referral_code()
     WHERE id = r.id;
  END LOOP;
END $$;

ALTER TABLE public.profiles
  ALTER COLUMN referral_code SET NOT NULL;

DROP POLICY IF EXISTS "profiles_select_my_referrals" ON public.profiles;
CREATE POLICY "profiles_select_my_referrals"
  ON public.profiles FOR SELECT TO authenticated
  USING (referred_by = auth.uid());

CREATE OR REPLACE FUNCTION public.referral_code_exists(p_code text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE referral_code = public.normalize_referral_code(p_code)
      AND (
        auth.uid() IS NULL
        OR id <> auth.uid()
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.set_own_referral_code(p_code text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  normalized := public.normalize_referral_code(p_code);
  IF length(normalized) < 4 OR length(normalized) > 12 THEN
    RAISE EXCEPTION 'referral code must be 4 to 12 letters or numbers';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE referral_code = normalized AND id <> auth.uid()
  ) THEN
    RAISE EXCEPTION 'that referral code is already taken';
  END IF;

  UPDATE public.profiles
     SET referral_code = normalized
   WHERE id = auth.uid();

  RETURN normalized;
END;
$$;

REVOKE ALL ON FUNCTION public.referral_code_exists(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_own_referral_code(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.new_referral_code() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.normalize_referral_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.referral_code_exists(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_own_referral_code(text) TO authenticated;
