import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useAuthStore } from '../store/userStore';

const NO_IDS = new Set<string>();
// Share the request across mounted market rows and trade views.
const requests = new Map<string, Promise<Set<string>>>();

export function useFriendAccounts() {
  const userId = useAuthStore((s) => s.user?.user_id);
  const [result, setResult] = useState<{ userId: string; ids: Set<string> }>();
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    let request = requests.get(userId);
    if (!request) {
      request = Promise.resolve(supabase.rpc('my_friend_account_ids'))
        .then(({ data, error }) => {
          if (error) throw error;
          return new Set<string>((data ?? []) as string[]);
        })
        .catch(() => NO_IDS);
      requests.set(userId, request);
    }
    void request.then((ids) => {
      if (!cancelled) setResult({ userId, ids });
    });
    return () => { cancelled = true; };
  }, [userId]);
  return {
    ids: userId && result?.userId === userId ? result.ids : NO_IDS,
    loading: !!userId && result?.userId !== userId,
  };
}
