import { supabase } from '../supabaseClient';

export type AddedSet = { set_code: string; set_name: string; total_card_count: number | null; added_at: string };

// Sets added by the card sync (added_at is only set for those), newest first.
// Returns [] if the card-sync SQL hasn't been run yet.
export async function fetchAddedSets(sinceDays?: number): Promise<AddedSet[]> {
  let query = supabase
    .from('set')
    .select('set_code, set_name, total_card_count, added_at')
    .not('added_at', 'is', null)
    .order('added_at', { ascending: false });
  if (sinceDays) query = query.gte('added_at', new Date(Date.now() - sinceDays * 86400000).toISOString());
  const { data, error } = await query;
  if (error) return [];
  return data as AddedSet[];
}
