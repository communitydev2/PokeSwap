// Disposable PostgreSQL only. No published ports, mounted volumes or live data.
/* global process, console, URL, setTimeout */
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
const container = `oaktrade-username-test-${process.pid}`;
const docker = (args, input) => execFileSync('docker', args, { input, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
const sql = (input) => docker(['exec', '-i', container, 'psql', '-U', 'postgres', '-v', 'ON_ERROR_STOP=1'], input);
try {
  docker(['run', '--rm', '-d', '--name', container, '--network', 'none', '-e', 'POSTGRES_HOST_AUTH_METHOD=trust', 'postgres:17']);
  for (let attempt = 0; ; attempt++) {
    try { docker(['exec', container, 'pg_isready', '-U', 'postgres']); break; }
    catch (error) { if (attempt >= 30) throw error; await new Promise((resolve) => setTimeout(resolve, 250)); }
  }
  sql(await readFile(new URL('./fixtures/username-cooldown.sql', import.meta.url), 'utf8'));
  sql(await readFile(new URL('../supabase/migrations/20261018000900_username_monthly.sql', import.meta.url), 'utf8'));
  console.log(sql(`begin;
    insert into public.user_account (user_id, username) values ('00000000-0000-0000-0000-000000000001', 'First');
    update public.user_account set username = null;
    select 'BASELINE: a chosen username could be cleared' as issue, username, username_changed_at from public.user_account;
    rollback;`));
  sql(await readFile(new URL('../supabase/migrations/20261018001100_username_cooldown_validation.sql', import.meta.url), 'utf8'));
  console.log(sql(await readFile(new URL('./fixtures/username-cooldown-assertions.sql', import.meta.url), 'utf8')));
} catch (error) {
  if (error.stderr) console.error(error.stderr.toString());
  throw error;
} finally { docker(['rm', '-f', container]); }
