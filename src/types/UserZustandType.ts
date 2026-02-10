import type { User } from "./User";


export interface UserZustandType {
    user: User |null,
    session : string | null,

    setUser: (user:User) => void;
     setSession : (session:string) => void;
}

