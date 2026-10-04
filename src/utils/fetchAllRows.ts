import { supabase } from '../supabaseClient';

// Supabase returns at most 1000 rows per request, so large tables are read in
// pages. `orderBy` must give a stable order, otherwise pages can overlap.
export async function fetchAllRows<T>(table: string, orderBy: string, pageSize = 1000): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .order(orderBy)
      .range(from, from + pageSize - 1);
    if (error) throw error;
    rows.push(...(data as T[]));
    if (data.length < pageSize) return rows;
  }
}
