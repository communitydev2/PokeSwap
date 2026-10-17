import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useAuthStore } from '../store/userStore';

export type MyTcgAccount = { tcg_account_id: string; tcg_id: string; tcg_id_username: string };

// One shared empty list, so effects that depend on `accounts` don't re-run on every render
const NO_ACCOUNTS: MyTcgAccount[] = [];

// The signed-in user's TCG Pocket accounts (empty when signed out)
export function useMyTcgAccounts() {
  const userId = useAuthStore((state) => state.user?.user_id);
  const [accounts, setAccounts] = useState<MyTcgAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadedFor, setLoadedFor] = useState<string>();
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!userId) {
      setAccounts([]);
      setLoading(false);
      setLoadedFor(undefined);
      return;
    }
    let cancelled = false;
    setAccounts([]);
    setLoading(true);
    setError(false);
    supabase
      .from('player_tcg_account')
      .select('tcg_account_id, tcg_id, tcg_id_username')
      .eq('user_id', userId)
      .then(({ data, error }) => {
        if (cancelled) return;
        setError(!!error);
        setAccounts((data ?? []) as MyTcgAccount[]);
        setLoadedFor(userId);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return { error: loadedFor === userId && error, accounts: loadedFor === userId ? accounts : NO_ACCOUNTS, loading: !!userId && (loading || loadedFor !== userId) };
}
