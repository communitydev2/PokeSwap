import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../supabaseClient';

// Accounts that have signed in on this device, so the user can switch between
// them without a new magic link. Each entry keeps that account's latest tokens
// (kept fresh in __root.tsx whenever Supabase refreshes them) in localStorage,
// the same place Supabase keeps the active session.

export type SavedAccount = {
  userId: string;
  email: string;
  username: string | null;
  accessToken: string;
  refreshToken: string;
};

type SavedAccountsState = {
  accounts: SavedAccount[];
  // True while the user is signing in to an extra account (shows the sign-in form)
  addingAccount: boolean;
  // Message shown on the home page (e.g. a saved account that needs signing in again)
  notice: string | null;
  setNotice: (notice: string | null) => void;
  saveSession: (session: Session) => void;
  setUsername: (userId: string, username: string | null) => void;
  remove: (userId: string) => void;
  setAddingAccount: (adding: boolean) => void;
  switchTo: (userId: string) => Promise<{ ok: boolean }>;
};

const STORAGE_KEY = 'saved-accounts';

function load(): SavedAccount[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function persist(accounts: SavedAccount[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
  } catch {
    // storage unavailable - switching just won't survive a reload
  }
}

export const useSavedAccountsStore = create<SavedAccountsState>((set, get) => {
  const update = (accounts: SavedAccount[]) => {
    persist(accounts);
    set({ accounts });
  };

  return {
    accounts: load(),
    addingAccount: false,
    notice: null,
    setNotice: (notice) => set({ notice }),

    saveSession: (session) => {
      const existing = get().accounts.find((a) => a.userId === session.user.id);
      const entry: SavedAccount = {
        userId: session.user.id,
        email: session.user.email ?? '',
        username: existing?.username ?? null,
        accessToken: session.access_token,
        refreshToken: session.refresh_token,
      };
      if (
        existing &&
        existing.accessToken === entry.accessToken &&
        existing.refreshToken === entry.refreshToken &&
        existing.email === entry.email
      ) {
        return;
      }
      update([...get().accounts.filter((a) => a.userId !== entry.userId), entry]);
    },

    setUsername: (userId, username) => {
      const accounts = get().accounts;
      if (!accounts.some((a) => a.userId === userId && a.username !== username)) return;
      update(accounts.map((a) => (a.userId === userId ? { ...a, username } : a)));
    },

    remove: (userId) => update(get().accounts.filter((a) => a.userId !== userId)),

    setAddingAccount: (addingAccount) => set({ addingAccount }),

    // Make a saved account the active session. If its tokens no longer work
    // (signed out elsewhere, revoked), it is forgotten and needs a new sign-in.
    switchTo: async (userId) => {
      const account = get().accounts.find((a) => a.userId === userId);
      if (!account) return { ok: false };
      const { error } = await supabase.auth.setSession({
        access_token: account.accessToken,
        refresh_token: account.refreshToken,
      });
      if (error) {
        console.warn(error);
        get().remove(userId);
        return { ok: false };
      }
      set({ addingAccount: false });
      return { ok: true };
    },
  };
});
