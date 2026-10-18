do $$
declare uid uuid := '00000000-0000-0000-0000-000000000001'; stamp timestamptz;
begin
  -- Signup may create an unfinished profile, but clients cannot supply a cooldown.
  insert into public.user_account (user_id, username_changed_at) values (uid, now() - interval '1 year');
  if (select username_changed_at is not null from public.user_account where user_id = uid) then
    raise exception 'Client set initial cooldown';
  end if;
  update public.user_account set username = 'First' where user_id = uid;
  if (select username_changed_at is not null from public.user_account where user_id = uid) then
    raise exception 'First-name setup consumed rename';
  end if;
  -- Clearing, blanking and re-setting the name must not bypass the rule.
  begin update public.user_account set username = null where user_id = uid;
    raise exception 'Chosen username could be cleared';
  exception when invalid_parameter_value then null; end;
  begin update public.user_account set username = '   ' where user_id = uid;
    raise exception 'Blank username accepted';
  exception when invalid_parameter_value then null; end;
  update public.user_account set username = 'Second', username_changed_at = null where user_id = uid;
  select username_changed_at into stamp from public.user_account where user_id = uid;
  if stamp is distinct from now() then raise exception 'Server did not stamp rename'; end if;
  begin update public.user_account set username = 'Third' where user_id = uid;
    raise exception 'Second rename allowed immediately';
  exception when insufficient_privilege then null; end;
  update public.user_account set username_changed_at = null, last_logged_in = current_date where user_id = uid;
  if (select username_changed_at from public.user_account where user_id = uid) is distinct from stamp then
    raise exception 'Client reset cooldown';
  end if;
  -- Admin moderation bypasses the cooldown, without resetting the player clock.
  perform set_config('test.admin', 'yes', true);
  update public.user_account set username = 'Moderated', username_changed_at = now() - interval '1 year' where user_id = uid;
  if (select username_changed_at from public.user_account where user_id = uid) is distinct from stamp then
    raise exception 'Admin reset player clock';
  end if;
  perform set_config('test.admin', 'no', true);
  begin update public.user_account set username = 'blocked name' where user_id = uid;
    raise exception 'Cooldown bypassed for banned name';
  exception when insufficient_privilege then null; end;
end $$;

-- Simulate the passage of time through isolated fixture setup, not a client update.
alter table public.user_account disable trigger trg_block_banned_usernames;
update public.user_account set username_changed_at = now() - interval '30 days';
alter table public.user_account enable trigger trg_block_banned_usernames;
do $$
declare uid uuid := '00000000-0000-0000-0000-000000000001';
begin
  update public.user_account set username = 'AfterCooldown' where user_id = uid;
  perform set_config('test.admin', 'yes', true);
  begin update public.user_account set username = 'blocked name' where user_id = uid;
    raise exception 'Banned word accepted';
  exception when raise_exception then
    if sqlerrm <> 'Username contains a banned word' then raise; end if;
  end;
  insert into public.user_account (user_id, username) values ('00000000-0000-0000-0000-000000000002', 'Other');
  begin update public.user_account set username = 'other' where user_id = uid;
    raise exception 'Case-insensitive duplicate accepted';
  exception when unique_violation then null; end;
end $$;
select 'PASS: nullable signup, first setup, null/blank rejection, server timestamps, cooldown boundary, timestamp tampering, admin moderation, banned words and duplicate names' as result;
