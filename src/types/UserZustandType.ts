import type { Session } from "@supabase/supabase-js";
import type { User } from "./User";


export interface UserZustandType {
    user: User |null,
    session : Session | null,
    profileLoading: boolean,
    // Supported in the last 35 days (shows the supporter badge)
    isSupporter: boolean,

    setUser: (user:User | null) => void;
     setSession : (session:Session | null) => void;
    setProfileLoading: (profileLoading: boolean) => void;
    setIsSupporter: (isSupporter: boolean) => void;
}

