import type { Session } from "@supabase/supabase-js";
import type { User } from "./User";


export interface UserZustandType {
    user: User |null,
    session : Session | null,
    profileLoading: boolean,

    setUser: (user:User | null) => void;
     setSession : (session:Session | null) => void;
    setProfileLoading: (profileLoading: boolean) => void;
}

