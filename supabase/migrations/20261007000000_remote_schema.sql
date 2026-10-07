


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."block_banned_usernames"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $_$
begin
  if new.username is null then
    return new;
  end if;

  if exists (
    select 1
    from public.banned_words bw
    where lower(new.username) ~ ('(^|[^[:alnum:]_])' || bw.word || '([^[:alnum:]_]|$)')
  ) then
    raise exception 'Username contains a banned word';
  end if;

  return new;
end;
$_$;


ALTER FUNCTION "public"."block_banned_usernames"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_username_by_email"("p_email" "text") RETURNS "text"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select ua.username
  from auth.users u
  join public.user_account ua on ua.user_id = u.id
  where lower(u.email) = lower(trim(p_email))
  limit 1;
$$;


ALTER FUNCTION "public"."get_username_by_email"("p_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user_account"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  insert into public.user_account (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_user_account"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."search_cards_filter"("p_search_string" "text" DEFAULT ''::"text", "p_rarity" "text" DEFAULT 'any'::"text", "p_set" "text" DEFAULT 'any'::"text") RETURNS TABLE("card_id" "uuid", "card_image" "text", "card_local_id" "text", "card_name" "text", "rarity_id" "uuid", "rarity_name" character varying, "set_id" "uuid", "set_name" character varying, "score" bigint)
    LANGUAGE "sql"
    AS $$
    WITH base AS (
        SELECT
            c.card_id,
            c.card_image,
            c.card_local_id,
            c.card_name,
            c.rarity_id,
            r.name AS rarity_name,
            c.set_id,
            s.set_name,

            CASE
                WHEN trim(coalesce(p_search_string, '')) = '' THEN 0
                ELSE (
                    SELECT COUNT(*)
                    FROM unnest(regexp_split_to_array(lower(trim(p_search_string)), '\s+')) AS search_word
                    WHERE search_word <> ''
                    AND EXISTS (
                        SELECT 1
                        FROM unnest(regexp_split_to_array(lower(coalesce(c.card_name, '')), '\s+')) AS card_word
                        WHERE card_word LIKE search_word || '%'
                    )
                )
            END AS score,

            CASE
                WHEN trim(coalesce(p_search_string, '')) = '' THEN TRUE
                ELSE NOT EXISTS (
                    SELECT 1
                    FROM unnest(regexp_split_to_array(lower(trim(p_search_string)), '\s+')) AS search_word
                    WHERE search_word <> ''
                    AND NOT EXISTS (
                        SELECT 1
                        FROM unnest(regexp_split_to_array(lower(coalesce(c.card_name, '')), '\s+')) AS card_word
                        WHERE card_word LIKE search_word || '%'
                    )
                )
            END AS search_matches

        FROM card c
        LEFT JOIN rarity r
            ON c.rarity_id = r.rarity_id
        LEFT JOIN "set" s
            ON c.set_id = s.set_id
    )
    SELECT
        card_id,
        card_image,
        card_local_id,
        card_name,
        rarity_id,
        rarity_name,
        set_id,
        set_name,
        score
    FROM base
    WHERE
        search_matches
        AND (
            lower(trim(coalesce(p_rarity, 'any'))) = 'any'
            OR lower(coalesce(rarity_name, '')) = lower(trim(p_rarity))
        )
        AND (
            lower(trim(coalesce(p_set, 'any'))) = 'any'
            OR lower(coalesce(set_name, '')) = lower(trim(p_set))
        )
    ORDER BY
        score DESC,
        card_name ASC;
$$;


ALTER FUNCTION "public"."search_cards_filter"("p_search_string" "text", "p_rarity" "text", "p_set" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."test_authorization_header"() RETURNS json
    LANGUAGE "sql"
    AS $$
    select auth.jwt();
$$;


ALTER FUNCTION "public"."test_authorization_header"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."wishlist" (
    "wishlist_id" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "quantity" smallint,
    "tcg_account_id" integer,
    "card_id" "uuid",
    "language_id" "uuid" DEFAULT "extensions"."uuid_generate_v4"()
);


ALTER TABLE "public"."wishlist" OWNER TO "postgres";


COMMENT ON TABLE "public"."wishlist" IS 'tcg account wishlist';



ALTER TABLE "public"."wishlist" ALTER COLUMN "wishlist_id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."Wishlist_wishlist_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."banned_words" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "word" "text"
);


ALTER TABLE "public"."banned_words" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."card" (
    "card_id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "card_image" "text",
    "card_local_id" "text",
    "card_name" "text",
    "rarity_id" "uuid",
    "set_id" "uuid"
);


ALTER TABLE "public"."card" OWNER TO "postgres";


COMMENT ON TABLE "public"."card" IS 'pokemon card';



CREATE TABLE IF NOT EXISTS "public"."card_sync_runs" (
    "id" bigint NOT NULL,
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "finished_at" timestamp with time zone,
    "sets_added" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "cards_added" integer DEFAULT 0 NOT NULL,
    "cards_updated" integer DEFAULT 0 NOT NULL,
    "error" "text"
);


ALTER TABLE "public"."card_sync_runs" OWNER TO "postgres";


ALTER TABLE "public"."card_sync_runs" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."card_sync_runs_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."cards_available_for_trade" (
    "id" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "card_id" "uuid",
    "quantity" smallint
);


ALTER TABLE "public"."cards_available_for_trade" OWNER TO "postgres";


ALTER TABLE "public"."cards_available_for_trade" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."cards_available_for_trade_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."friend" (
    "friend_id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "favorite" boolean,
    "user_id_2" "uuid"
);


ALTER TABLE "public"."friend" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."illustrator" (
    "illustratorid" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" character varying(30),
    "picture" "text"
);


ALTER TABLE "public"."illustrator" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."language" (
    "name" "text",
    "icon" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "language_id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL
);


ALTER TABLE "public"."language" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."player_tcg_account" (
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "tcg_id_username" "text",
    "tcg_id" integer NOT NULL,
    "wishlist_id" "uuid" DEFAULT "extensions"."uuid_generate_v4"(),
    "available_cards_for_trade" "uuid" DEFAULT "extensions"."uuid_generate_v4"(),
    "exclusive_trade_id" "uuid" DEFAULT "gen_random_uuid"(),
    "user_id" "uuid" NOT NULL,
    "tcg_account_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL
);


ALTER TABLE "public"."player_tcg_account" OWNER TO "postgres";


COMMENT ON TABLE "public"."player_tcg_account" IS 'One of many TCG Pocket accounts of a player';



COMMENT ON COLUMN "public"."player_tcg_account"."tcg_id" IS 'tcg pocket id';



CREATE TABLE IF NOT EXISTS "public"."rarity" (
    "rarity_id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" character varying(20)
);


ALTER TABLE "public"."rarity" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."set" (
    "set_id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "official_card_count" integer,
    "total_card_count" integer,
    "set_code" character varying(4),
    "set_name" character varying(30),
    "release_date" "date",
    "added_at" timestamp with time zone
);


ALTER TABLE "public"."set" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_account" (
    "user_id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "username" character varying(30),
    "discord_id" character varying(255),
    "email_updates" boolean,
    "show_discord_id" boolean,
    "last_logged_in" "date"
);


ALTER TABLE "public"."user_account" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."username_recovery_requests" (
    "id" bigint NOT NULL,
    "email_hash" "text" NOT NULL,
    "ip_hash" "text" NOT NULL,
    "requested_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."username_recovery_requests" OWNER TO "postgres";


ALTER TABLE "public"."username_recovery_requests" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."username_recovery_requests_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



ALTER TABLE ONLY "public"."wishlist"
    ADD CONSTRAINT "Wishlist_pkey" PRIMARY KEY ("wishlist_id");



ALTER TABLE ONLY "public"."banned_words"
    ADD CONSTRAINT "banned_words_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."card"
    ADD CONSTRAINT "card_card_local_id_key" UNIQUE ("card_local_id");



ALTER TABLE ONLY "public"."card"
    ADD CONSTRAINT "card_pkey" PRIMARY KEY ("card_id");



ALTER TABLE ONLY "public"."card_sync_runs"
    ADD CONSTRAINT "card_sync_runs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cards_available_for_trade"
    ADD CONSTRAINT "cards_available_for_trade_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."friend"
    ADD CONSTRAINT "friend_friend_id_key" UNIQUE ("friend_id");



ALTER TABLE ONLY "public"."friend"
    ADD CONSTRAINT "friend_pkey" PRIMARY KEY ("friend_id");



ALTER TABLE ONLY "public"."illustrator"
    ADD CONSTRAINT "illustrator_illustratorid_key" UNIQUE ("illustratorid");



ALTER TABLE ONLY "public"."illustrator"
    ADD CONSTRAINT "illustrator_pkey" PRIMARY KEY ("illustratorid");



ALTER TABLE ONLY "public"."language"
    ADD CONSTRAINT "language_pkey" PRIMARY KEY ("language_id");



ALTER TABLE ONLY "public"."user_account"
    ADD CONSTRAINT "player_account_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."user_account"
    ADD CONSTRAINT "player_account_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."player_tcg_account"
    ADD CONSTRAINT "player_tcg_account_pkey" PRIMARY KEY ("tcg_account_id");



ALTER TABLE ONLY "public"."player_tcg_account"
    ADD CONSTRAINT "player_tcg_account_tcg_id_key" UNIQUE ("tcg_id");



ALTER TABLE ONLY "public"."rarity"
    ADD CONSTRAINT "rarity_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."rarity"
    ADD CONSTRAINT "rarity_pkey" PRIMARY KEY ("rarity_id");



ALTER TABLE ONLY "public"."rarity"
    ADD CONSTRAINT "rarity_rarityid_key" UNIQUE ("rarity_id");



ALTER TABLE ONLY "public"."set"
    ADD CONSTRAINT "set_pkey" PRIMARY KEY ("set_id");



ALTER TABLE ONLY "public"."set"
    ADD CONSTRAINT "set_set_code_key" UNIQUE ("set_code");



ALTER TABLE ONLY "public"."set"
    ADD CONSTRAINT "set_set_id_key" UNIQUE ("set_id");



ALTER TABLE ONLY "public"."user_account"
    ADD CONSTRAINT "user_account_username_key" UNIQUE ("username");



ALTER TABLE ONLY "public"."username_recovery_requests"
    ADD CONSTRAINT "username_recovery_requests_pkey" PRIMARY KEY ("id");



CREATE INDEX "username_recovery_requests_email_idx" ON "public"."username_recovery_requests" USING "btree" ("email_hash", "requested_at");



CREATE INDEX "username_recovery_requests_ip_idx" ON "public"."username_recovery_requests" USING "btree" ("ip_hash", "requested_at");



CREATE OR REPLACE TRIGGER "create_account_on_verification" AFTER INSERT ON "public"."banned_words" FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_user_account"();



CREATE OR REPLACE TRIGGER "trg_block_banned_usernames" BEFORE INSERT OR UPDATE OF "username" ON "public"."user_account" FOR EACH ROW EXECUTE FUNCTION "public"."block_banned_usernames"();



ALTER TABLE ONLY "public"."wishlist"
    ADD CONSTRAINT "Wishlist_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "public"."card"("card_id");



ALTER TABLE ONLY "public"."card"
    ADD CONSTRAINT "card_rarity_id_fkey" FOREIGN KEY ("rarity_id") REFERENCES "public"."rarity"("rarity_id");



ALTER TABLE ONLY "public"."card"
    ADD CONSTRAINT "card_set_id_fkey" FOREIGN KEY ("set_id") REFERENCES "public"."set"("set_id");



ALTER TABLE ONLY "public"."friend"
    ADD CONSTRAINT "friend_user_id_2_fkey" FOREIGN KEY ("user_id_2") REFERENCES "public"."user_account"("user_id");



ALTER TABLE ONLY "public"."friend"
    ADD CONSTRAINT "friend_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_account"("user_id");



ALTER TABLE ONLY "public"."user_account"
    ADD CONSTRAINT "user_account_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."wishlist"
    ADD CONSTRAINT "wishlist_language_id_fkey" FOREIGN KEY ("language_id") REFERENCES "public"."language"("language_id");



CREATE POLICY "Policy with security definer functions" ON "public"."user_account" TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Policy with table joins" ON "public"."user_account" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."banned_words" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."card" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."card_sync_runs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cards_available_for_trade" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."friend" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "get" ON "public"."player_tcg_account" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "get all" ON "public"."banned_words" FOR SELECT USING (true);



CREATE POLICY "get cards" ON "public"."card" FOR SELECT USING (true);



CREATE POLICY "get info" ON "public"."user_account" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "get rarity" ON "public"."rarity" FOR SELECT USING (true);



ALTER TABLE "public"."illustrator" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "insert" ON "public"."friend" FOR INSERT WITH CHECK (true);



CREATE POLICY "insert" ON "public"."user_account" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."language" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."player_tcg_account" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."rarity" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "select" ON "public"."set" FOR SELECT USING (true);



ALTER TABLE "public"."set" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_account" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."username_recovery_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."wishlist" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."block_banned_usernames"() TO "anon";
GRANT ALL ON FUNCTION "public"."block_banned_usernames"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."block_banned_usernames"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_username_by_email"("p_email" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_username_by_email"("p_email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user_account"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user_account"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user_account"() TO "service_role";



GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";



GRANT ALL ON FUNCTION "public"."search_cards_filter"("p_search_string" "text", "p_rarity" "text", "p_set" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."search_cards_filter"("p_search_string" "text", "p_rarity" "text", "p_set" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_cards_filter"("p_search_string" "text", "p_rarity" "text", "p_set" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."test_authorization_header"() TO "anon";
GRANT ALL ON FUNCTION "public"."test_authorization_header"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."test_authorization_header"() TO "service_role";



GRANT ALL ON TABLE "public"."wishlist" TO "anon";
GRANT ALL ON TABLE "public"."wishlist" TO "authenticated";
GRANT ALL ON TABLE "public"."wishlist" TO "service_role";



GRANT ALL ON SEQUENCE "public"."Wishlist_wishlist_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."Wishlist_wishlist_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."Wishlist_wishlist_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."banned_words" TO "anon";
GRANT ALL ON TABLE "public"."banned_words" TO "authenticated";
GRANT ALL ON TABLE "public"."banned_words" TO "service_role";



GRANT ALL ON TABLE "public"."card" TO "anon";
GRANT ALL ON TABLE "public"."card" TO "authenticated";
GRANT ALL ON TABLE "public"."card" TO "service_role";



GRANT ALL ON TABLE "public"."card_sync_runs" TO "anon";
GRANT ALL ON TABLE "public"."card_sync_runs" TO "authenticated";
GRANT ALL ON TABLE "public"."card_sync_runs" TO "service_role";



GRANT ALL ON SEQUENCE "public"."card_sync_runs_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."card_sync_runs_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."card_sync_runs_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."cards_available_for_trade" TO "anon";
GRANT ALL ON TABLE "public"."cards_available_for_trade" TO "authenticated";
GRANT ALL ON TABLE "public"."cards_available_for_trade" TO "service_role";



GRANT ALL ON SEQUENCE "public"."cards_available_for_trade_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."cards_available_for_trade_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."cards_available_for_trade_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."friend" TO "anon";
GRANT ALL ON TABLE "public"."friend" TO "authenticated";
GRANT ALL ON TABLE "public"."friend" TO "service_role";



GRANT ALL ON TABLE "public"."illustrator" TO "anon";
GRANT ALL ON TABLE "public"."illustrator" TO "authenticated";
GRANT ALL ON TABLE "public"."illustrator" TO "service_role";



GRANT ALL ON TABLE "public"."language" TO "anon";
GRANT ALL ON TABLE "public"."language" TO "authenticated";
GRANT ALL ON TABLE "public"."language" TO "service_role";



GRANT ALL ON TABLE "public"."player_tcg_account" TO "anon";
GRANT ALL ON TABLE "public"."player_tcg_account" TO "authenticated";
GRANT ALL ON TABLE "public"."player_tcg_account" TO "service_role";



GRANT ALL ON TABLE "public"."rarity" TO "anon";
GRANT ALL ON TABLE "public"."rarity" TO "authenticated";
GRANT ALL ON TABLE "public"."rarity" TO "service_role";



GRANT ALL ON TABLE "public"."set" TO "anon";
GRANT ALL ON TABLE "public"."set" TO "authenticated";
GRANT ALL ON TABLE "public"."set" TO "service_role";



GRANT ALL ON TABLE "public"."user_account" TO "anon";
GRANT ALL ON TABLE "public"."user_account" TO "authenticated";
GRANT ALL ON TABLE "public"."user_account" TO "service_role";



GRANT ALL ON TABLE "public"."username_recovery_requests" TO "anon";
GRANT ALL ON TABLE "public"."username_recovery_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."username_recovery_requests" TO "service_role";



GRANT ALL ON SEQUENCE "public"."username_recovery_requests_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."username_recovery_requests_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."username_recovery_requests_id_seq" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







