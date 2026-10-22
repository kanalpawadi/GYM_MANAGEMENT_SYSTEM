-- 10: One-to-one chat and the gym notice board.
-- Chat
-- * Members chat with trainers and gym staff (not with other members).
-- * Trainers and staff can chat with anyone.
-- * Members waiting for registration approval cannot chat yet.
-- Notices
-- * Trainers and staff post notices; every signed-in user sees them.
-- * Everyone gets a bell notification for a new notice.
-- Safe to re-run. Requires 01-09.

-------------------------------------------------------------------------------
-- 1. Messages
-------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 2000),
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (sender_id <> recipient_id)
);
CREATE INDEX IF NOT EXISTS messages_pair ON public.messages (sender_id, recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS messages_unread ON public.messages (recipient_id) WHERE read_at IS NULL;

-- Whether the signed-in user may chat with `other`.
CREATE OR REPLACE FUNCTION public.can_chat(other UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles me, public.profiles them
    WHERE me.id = auth.uid() AND them.id = other AND me.id <> them.id
      AND NOT (me.role::text = 'member' AND COALESCE(me.approval_status, 'approved') <> 'approved')
      AND NOT (them.role::text = 'member' AND COALESCE(them.approval_status, 'approved') <> 'approved')
      AND NOT (me.role::text = 'member' AND them.role::text = 'member')
      AND me.role::text <> 'visitor' AND them.role::text <> 'visitor'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Read own messages" ON public.messages;
DROP POLICY IF EXISTS "Send messages" ON public.messages;
CREATE POLICY "Read own messages" ON public.messages FOR SELECT
  USING (auth.uid() IN (sender_id, recipient_id));
CREATE POLICY "Send messages" ON public.messages FOR INSERT
  WITH CHECK (sender_id = auth.uid() AND read_at IS NULL AND public.can_chat(recipient_id));
-- No UPDATE / DELETE policies: messages cannot be edited. Read receipts go through mark_chat_read().

GRANT SELECT, INSERT ON public.messages TO authenticated;

-- People the signed-in user can chat with, newest conversation first.
CREATE OR REPLACE FUNCTION public.chat_contacts()
RETURNS TABLE (id UUID, full_name TEXT, role TEXT, avatar_url TEXT, member_code TEXT,
               last_body TEXT, last_at TIMESTAMPTZ, last_from_me BOOLEAN, unread INT) AS $$
DECLARE
  me public.profiles;
BEGIN
  SELECT * INTO me FROM public.profiles WHERE profiles.id = auth.uid();
  IF NOT FOUND THEN RETURN; END IF;

  RETURN QUERY
  WITH talked AS (
    SELECT CASE WHEN m.sender_id = me.id THEN m.recipient_id ELSE m.sender_id END AS other_id
    FROM public.messages m WHERE me.id IN (m.sender_id, m.recipient_id)
  ),
  candidates AS (
    SELECT p.* FROM public.profiles p
    WHERE p.id <> me.id AND p.role::text <> 'visitor'
      AND (
        p.id IN (SELECT other_id FROM talked)
        OR (me.role::text = 'member' AND (p.id = me.assigned_trainer_id OR p.role::text IN ('receptionist', 'manager', 'owner')))
        OR (me.role::text <> 'member' AND (p.role::text <> 'member' OR COALESCE(p.approval_status, 'approved') = 'approved'))
      )
  )
  SELECT c.id, c.full_name, c.role::text, c.avatar_url, c.member_code,
         last_msg.body, last_msg.created_at, last_msg.sender_id = me.id,
         (SELECT COUNT(*)::int FROM public.messages u WHERE u.sender_id = c.id AND u.recipient_id = me.id AND u.read_at IS NULL)
  FROM candidates c
  LEFT JOIN LATERAL (
    SELECT m.body, m.created_at, m.sender_id FROM public.messages m
    WHERE (m.sender_id = me.id AND m.recipient_id = c.id) OR (m.sender_id = c.id AND m.recipient_id = me.id)
    ORDER BY m.created_at DESC LIMIT 1
  ) last_msg ON true
  WHERE public.can_chat(c.id)
  ORDER BY last_msg.created_at DESC NULLS LAST, (c.id = me.assigned_trainer_id) DESC, c.full_name;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;
GRANT EXECUTE ON FUNCTION public.chat_contacts() TO authenticated;

-- One conversation, oldest first (the latest p_limit messages).
CREATE OR REPLACE FUNCTION public.chat_thread(p_other UUID, p_limit INT DEFAULT 200)
RETURNS SETOF public.messages AS $$
  SELECT * FROM (
    SELECT * FROM public.messages m
    WHERE (m.sender_id = auth.uid() AND m.recipient_id = p_other)
       OR (m.sender_id = p_other AND m.recipient_id = auth.uid())
    ORDER BY m.created_at DESC
    LIMIT LEAST(GREATEST(p_limit, 1), 500)
  ) t ORDER BY t.created_at;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;
GRANT EXECUTE ON FUNCTION public.chat_thread(UUID, INT) TO authenticated;

CREATE OR REPLACE FUNCTION public.mark_chat_read(p_other UUID)
RETURNS INT AS $$
DECLARE n INT;
BEGIN
  UPDATE public.messages SET read_at = NOW()
  WHERE sender_id = p_other AND recipient_id = auth.uid() AND read_at IS NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
GRANT EXECUTE ON FUNCTION public.mark_chat_read(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.my_unread_messages()
RETURNS INT AS $$
  SELECT COUNT(*)::int FROM public.messages WHERE recipient_id = auth.uid() AND read_at IS NULL;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;
GRANT EXECUTE ON FUNCTION public.my_unread_messages() TO authenticated;

-------------------------------------------------------------------------------
-- 2. Notice board
-------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 150),
  body TEXT NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 4000),
  pinned BOOLEAN NOT NULL DEFAULT false,
  expires_on DATE,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS notices_recent ON public.notices (pinned DESC, created_at DESC);

ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Everyone reads notices" ON public.notices;
DROP POLICY IF EXISTS "Staff post notices" ON public.notices;
DROP POLICY IF EXISTS "Staff edit notices" ON public.notices;
DROP POLICY IF EXISTS "Staff delete notices" ON public.notices;
-- Members see current notices; trainers and staff also see expired ones (to tidy up).
CREATE POLICY "Everyone reads notices" ON public.notices FOR SELECT
  USING (auth.uid() IS NOT NULL AND (expires_on IS NULL OR expires_on >= (NOW() AT TIME ZONE 'Asia/Kolkata')::date OR public.my_rank() >= 2));
CREATE POLICY "Staff post notices" ON public.notices FOR INSERT
  WITH CHECK (public.my_rank() >= 2 AND created_by = auth.uid());
-- Authors edit their own; managers and above edit anyone's.
CREATE POLICY "Staff edit notices" ON public.notices FOR UPDATE
  USING (public.my_rank() >= 2 AND (created_by = auth.uid() OR public.my_rank() >= 4))
  WITH CHECK (public.my_rank() >= 2);
CREATE POLICY "Staff delete notices" ON public.notices FOR DELETE
  USING (public.my_rank() >= 2 AND (created_by = auth.uid() OR public.my_rank() >= 4));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notices TO authenticated;

-- Bell notification for everyone (except the author) when a notice is posted.
CREATE OR REPLACE FUNCTION public.notify_new_notice()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type)
  SELECT p.id, 'Notice: ' || NEW.title, LEFT(NEW.body, 200), 'notice'
  FROM public.profiles p
  WHERE p.id IS DISTINCT FROM NEW.created_by
    AND p.role::text <> 'visitor'
    AND NOT (p.role::text = 'member' AND COALESCE(p.approval_status, 'approved') <> 'approved');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS notify_new_notice ON public.notices;
CREATE TRIGGER notify_new_notice AFTER INSERT ON public.notices
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_notice();

-------------------------------------------------------------------------------
-- 3. Live updates (Supabase Realtime) for new chat messages
-------------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (SELECT 1 FROM pg_publication_tables
                     WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'messages') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
END $$;
