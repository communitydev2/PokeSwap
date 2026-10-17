import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useAuthStore } from '../store/userStore';

export type MyTcgAccount = { tcg_account_id: string; tcg_id: string; tcg_id_username: string };

// The signed-in user's TCG Pocket accounts (empty when signed out)
export function useMyTcgAccounts() {
  const userId = useAuthStore((state) => state.user?.user_id);
  const [accounts, setAccounts] = useState<MyTcgAccount[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) {
      setAccounts([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    supabase
      .from('player_tcg_account')
      .select('tcg_account_id, tcg_id, tcg_id_username')
      .eq('user_id', userId)
      .then(({ data }) => {
        if (cancelled) return;
        setAccounts((data ?? []) as MyTcgAccount[]);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return { accounts, loading };
}
