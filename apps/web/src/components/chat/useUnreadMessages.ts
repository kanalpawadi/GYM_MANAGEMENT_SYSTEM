import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { countUnreadMessages, subscribeToMyMessages } from '../../services/chat';

const REFRESH_MS = 30_000;

/** Number of unread chat messages for the signed-in user (for menu badges). */
export function useUnreadMessages(): number {
  const { profile } = useAuth();
  const [count, setCount] = useState(0);
  const userId = profile?.id;

  useEffect(() => {
    if (!userId) return;
    let alive = true;
    const refresh = () =>
      countUnreadMessages().then((n) => {
        if (alive) setCount(n);
      });
    void refresh();
    const timer = window.setInterval(refresh, REFRESH_MS);
    const unsubscribe = subscribeToMyMessages(userId, () => void refresh());
    return () => {
      alive = false;
      window.clearInterval(timer);
      unsubscribe();
    };
  }, [userId]);

  return count;
}
