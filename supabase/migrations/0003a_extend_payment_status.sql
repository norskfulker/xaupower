-- 0003a: extend payment_status (must commit before new values are usable)
ALTER TYPE public.payment_status ADD VALUE IF NOT EXISTS 'pending_review';
ALTER TYPE public.payment_status ADD VALUE IF NOT EXISTS 'rejected';
