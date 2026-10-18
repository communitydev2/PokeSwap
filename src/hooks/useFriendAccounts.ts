import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { supabase } from '../supabaseClient';
import { useAuthStore } from '../store/userStore';

const NO_IDS = new Set<string>();
const useRevision = create<{ revision: number }>(() => ({ revision: 0 }));
type Result = { ids: Set<string>; error: boolean };
// Share in-flight work, never permanently cache a friendship list or a failure.
const requests = new Map<string, Promise<Result>>();
export function refreshFriendAccounts() {
  useRevision.setState((state) => ({ revision: state.revision + 1 }));
}

export function useFriendAccounts() {
  const userId = useAuthStore((s) => s.user?.user_id);
  const revision = useRevision((s) => s.revision);
  const [result, setResult] = useState<Result & { key: string }>();
  const key = `${userId}:${revision}`;
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    let request = requests.get(key);
    if (!request) {
      request = Promise.resolve(supabase.rpc('my_friend_account_ids'))
        .then(({ data, error }) => {
          if (error) throw error;
          return { ids: new Set<string>((data ?? []) as string[]), error: false };
        })
        .catch(() => ({ ids: NO_IDS, error: true }))
        .finally(() => { requests.delete(key); });
      requests.set(key, request);
    }
    void request.then((value) => {
      if (!cancelled) setResult({ ...value, key });
    });
    return () => { cancelled = true; };
  }, [userId, key]);
  return {
    ids: userId && result?.key === key ? result.ids : NO_IDS,
    loading: !!userId && result?.key !== key,
    error: !!userId && result?.key === key && result.error,
    retry: refreshFriendAccounts,
  };
}
