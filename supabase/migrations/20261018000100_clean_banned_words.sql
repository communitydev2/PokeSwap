-- Normalize imported quoted fields, removing empty words and duplicate values.
-- Lock out concurrent changes until normalization and deduplication are complete.
lock table public.banned_words in share row exclusive mode;
update public.banned_words set word=lower(btrim(word, ' "'))
where word is distinct from lower(btrim(word, ' "'));
delete from public.banned_words where word='';
-- Physical row addresses are used only within this statement; no id format is assumed.
delete from public.banned_words a using public.banned_words b
where a.word=b.word and a.ctid>b.ctid;
