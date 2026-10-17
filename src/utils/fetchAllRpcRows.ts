import { supabase } from '../supabaseClient';

// Supabase limits RPC responses too. Use a unique final ordering column so
// equal names/scores cannot move between pages. Publish only the complete result.
export async function fetchAllRpcRows<T>(
  name: string,
  params: Record<string, unknown>,
  orderBy: string[],
  signal?: AbortSignal,
): Promise<T[]> {
  const rows: T[] = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    signal?.throwIfAborted();
    let query = supabase.rpc(name, params).range(from, from + pageSize - 1);
    for (const column of orderBy) query = query.order(column);
    if (signal) query = query.abortSignal(signal);
    const { data, error } = await query;
    if (error) throw error;
    rows.push(...((data ?? []) as T[]));
    if (!data || data.length < pageSize) return rows;
  }
}
