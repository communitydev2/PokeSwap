import { supabase } from "../../supabaseClient";
import { useLocalizationStore } from "../../store/useLocalizationStore";

export async function adminRpc<T>(
  fn: string,
  args?: Record<string, unknown>,
): Promise<{ data: T | null; error: string | null }> {
  const t = useLocalizationStore.getState().t;
  try {
    const { data, error } = await supabase.rpc(fn, args);
    return {
      data: error ? null : (data as T),
      error: error
        ? error.code === "42501"
          ? t.adminNoAccess
          : error.message
        : null,
    };
  } catch {
    return { data: null, error: t.adminRequestFailed };
  }
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleString(undefined, {
        dateStyle: "short",
        timeStyle: "short",
      });
}
