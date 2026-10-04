import { create } from "zustand";
import type { UserZustandType } from "../types/UserZustandType";
import type { User } from "../types/User";
import type { Session } from "@supabase/supabase-js";
export const useAuthStore = create<UserZustandType>((set) => ({
    user : null,
    session : null,
    
    setUser: (user:User | null) => set(() => ({user})),
    setSession: (session:Session | null) => set(() => ({session})),

}));

