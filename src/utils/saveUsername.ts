import { supabase } from '../supabaseClient';
import type { User } from '../types/User';

// Save a username for the signed-in user. Updates their user_account row, or
// creates it if it doesn't exist yet (accounts whose profile was never made).
// Banned words and duplicates are rejected by the database; those errors are
// turned into messages for the user.
export async function saveUsername(
  userId: string,
  username: string,
): Promise<{ user: User } | { error: string }> {
  const updated = await supabase.from('user_account').update({ username }).eq('user_id', userId).select();
  let result = updated;

  if (!updated.error && !updated.data?.length) {
    result = await supabase.from('user_account').insert({ user_id: userId, username }).select();
  }

  if (result.error) {
    console.warn(result.error);
    if (result.error.message === 'Username contains a banned word') {
      return { error: 'This username is inappropriate, please choose another one.' };
    }
    if (result.error.code === '23505') {
      return { error: 'This username already exists. Please pick another one.' };
    }
    return { error: "Couldn't save your username. Please try again." };
  }
  if (!result.data?.length) {
    return { error: "Couldn't save your username. Please try again." };
  }
  return { user: result.data[0] };
}
