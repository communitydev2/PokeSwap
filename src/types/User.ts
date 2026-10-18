export interface User {
  user_id: string;
  username: string;
  username_changed_at?: string | null;
  discord_id: string;   // you may later change this to Date
  email_updates: boolean;
  show_discord_id: boolean;
  discordId:string;
  last_logged_in: Date;
  show_in_supporters?: boolean;
  
}