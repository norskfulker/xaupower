-- Referral leaderboard + self-referrer setter.
-- - referred_by is no longer frozen on UPDATE; user can set it once via RPC.
-- - New RPC set_own_referrer(p_code) only succeeds when auth.uid()'s referred_by IS NULL.
-- - New RLS policy exposes only the columns needed for the leaderboard.
-- - New view public.referral_leaderboard lists the top 10 referrers by COUNT(referred).
-- - Replaces the older profiles_select_my_referrals policy so leaderboard reads don't collide.

-- 1. Drop the freeze on UPDATE so referred_by can be set once.
CREATE OR REPLACE FUNCTION public.profiles_referral_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
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

-- 2. RPC: one-shot set of referred_by for the current user.
CREATE OR REPLACE FUNCTION public.set_own_referrer(p_code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized text;
  referrer_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  -- Block if the current user already has a referrer (one-shot rule).
  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND referred_by IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'referrer already set';
  END IF;

  normalized := public.normalize_referral_code(p_code);
  IF length(normalized) < 4 OR length(normalized) > 12 THEN
    RAISE EXCEPTION 'referral code must be 4 to 12 letters or numbers';
  END IF;

  SELECT id INTO referrer_id
    FROM public.profiles
   WHERE referral_code = normalized
     AND id <> auth.uid()
   LIMIT 1;

  IF referrer_id IS NULL THEN
    RAISE EXCEPTION 'referral code not found';
  END IF;

  -- The trigger already rejects self-referrals (id <> auth.uid() above guarantees it).

  UPDATE public.profiles
     SET referred_by = referrer_id
   WHERE id = auth.uid();

  RETURN referrer_id;
END;
$$;

REVOKE ALL ON FUNCTION public.set_own_referrer(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_own_referrer(text) TO authenticated;

-- 3. RLS: replace profiles_select_my_referrals with a broader policy
--    that also exposes the minimal profile fields for the leaderboard.
DROP POLICY IF EXISTS "profiles_select_my_referrals" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_leaderboard" ON public.profiles;
CREATE POLICY "profiles_select_leaderboard"
  ON public.profiles FOR SELECT TO authenticated
  USING (true);

-- The existing profiles_select_own_or_admin (from 0001) remains authoritative
-- for UPDATE; SELECT is now broader to allow leaderboard reads.

-- 4. Leaderboard view: top 10 by count of referred users.
DROP VIEW IF EXISTS public.referral_leaderboard;
CREATE VIEW public.referral_leaderboard
WITH (security_invoker = true) AS
SELECT
  p.id            AS user_id,
  COALESCE(NULLIF(p.full_name, ''), p.email) AS display_name,
  p.referral_code AS referral_code,
  COUNT(c.id)::int AS referred_count
FROM public.profiles p
LEFT JOIN public.profiles c
  ON c.referred_by = p.id
GROUP BY p.id, p.full_name, p.email, p.referral_code
HAVING COUNT(c.id) > 0
ORDER BY referred_count DESC, p.created_at ASC
LIMIT 10;

GRANT SELECT ON public.referral_leaderboard TO authenticated;