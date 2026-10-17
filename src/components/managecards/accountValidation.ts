import type { en } from '../../i18n/en';

export type AccountFields = { name: string; tcgId: string };
export type AccountErrors = { name?: string; tcgId?: string };
export const normalizeFriendId = (id: string) => id.replace(/[\s-]/g, '');

export function validateAccounts<K extends string | number>(rows: (AccountFields & { key: K })[], t: typeof en): Partial<Record<K, AccountErrors>> {
  const errors: Partial<Record<K, AccountErrors>> = {};
  const seen = new Set<string>();
  for (const row of rows) {
    const found: AccountErrors = {};
    const id = normalizeFriendId(row.tcgId);
    if (!row.name.trim()) found.name = t.qaManageAccountNameRequired;
    if (!id) found.tcgId = t.qaManageAccountIdRequired;
    else if (!/^\d{16}$/.test(id)) found.tcgId = t.qaManageAccountIdInvalid;
    else if (seen.has(id)) found.tcgId = t.qaManageAccountDuplicate;
    seen.add(id);
    if (found.name || found.tcgId) errors[row.key] = found;
  }
  return errors;
}
