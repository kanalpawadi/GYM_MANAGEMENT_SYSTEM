-- 12: Supplement log. Members note what they take (and optionally what they bought,
-- the price and the bill number); their trainer and gym staff can see it (role chain).
-- Deleted together with the member (migration 11). Safe to re-run. Requires 01-11.

CREATE TABLE IF NOT EXISTS public.supplement_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  taken_on DATE NOT NULL DEFAULT (NOW() AT TIME ZONE 'Asia/Kolkata')::date,
  supplement TEXT NOT NULL CHECK (char_length(btrim(supplement)) BETWEEN 1 AND 120),
  brand TEXT CHECK (brand IS NULL OR char_length(brand) <= 120),
  dose TEXT CHECK (dose IS NULL OR char_length(dose) <= 60),
  time_of_day TEXT CHECK (time_of_day IS NULL OR time_of_day IN ('morning', 'pre-workout', 'post-workout', 'afternoon', 'evening', 'bedtime', 'with-meal')),
  -- Optional purchase details (feed the supplement statement / invoice export).
  quantity TEXT CHECK (quantity IS NULL OR char_length(quantity) <= 60),
  price NUMERIC(10,2) CHECK (price IS NULL OR price >= 0),
  shop TEXT CHECK (shop IS NULL OR char_length(shop) <= 120),
  bill_no TEXT CHECK (bill_no IS NULL OR char_length(bill_no) <= 60),
  notes TEXT CHECK (notes IS NULL OR char_length(notes) <= 500),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (taken_on <= (NOW() AT TIME ZONE 'Asia/Kolkata')::date + 1)
);
CREATE INDEX IF NOT EXISTS supplement_logs_member ON public.supplement_logs (member_id, taken_on DESC);

ALTER TABLE public.supplement_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Chain view supplements" ON public.supplement_logs;
DROP POLICY IF EXISTS "Chain add supplements" ON public.supplement_logs;
DROP POLICY IF EXISTS "Chain change supplements" ON public.supplement_logs;
DROP POLICY IF EXISTS "Chain delete supplements" ON public.supplement_logs;
-- can_manage(): the member themself, or anyone above them in the role chain.
CREATE POLICY "Chain view supplements" ON public.supplement_logs FOR SELECT USING (public.can_manage(member_id));
CREATE POLICY "Chain add supplements" ON public.supplement_logs FOR INSERT
  WITH CHECK (public.can_manage(member_id) AND created_by = auth.uid());
CREATE POLICY "Chain change supplements" ON public.supplement_logs FOR UPDATE
  USING (public.can_manage(member_id)) WITH CHECK (public.can_manage(member_id));
CREATE POLICY "Chain delete supplements" ON public.supplement_logs FOR DELETE USING (public.can_manage(member_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.supplement_logs TO authenticated;
