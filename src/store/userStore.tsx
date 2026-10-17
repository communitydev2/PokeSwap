import { create } from "zustand";
import type { UserZustandType } from "../types/UserZustandType";
import type { User } from "../types/User";
import type { Session } from "@supabase/supabase-js";
export const useAuthStore = create<UserZustandType & { authReady: boolean; profileError: boolean; setProfileError: (failed: boolean) => void }>((set) => ({
    authReady: false,
    profileError: false,
    setProfileError: (profileError) => set({ profileError }),
    user : null,
    session : null,
    profileLoading: false,
    isSupporter: false,
    
    setUser: (user:User | null) => set((state) => user && user.user_id !== state.session?.user.id ? {} : { user }),
    setSession: (session:Session | null) => set((state) => state.session?.user.id === session?.user.id ? { session, authReady: true } : { session, authReady: true, user: null, isSupporter: false, profileLoading: Boolean(session), profileError: false }),
    setProfileLoading: (profileLoading: boolean) => set(() => ({profileLoading})),
    setIsSupporter: (isSupporter: boolean) => set(() => ({isSupporter})),

}));

