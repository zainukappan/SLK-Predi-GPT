-- Runs on PostgreSQL 15+ and PGlite. Server-only application role; no browser DB access.
CREATE ROLE sbk_app NOLOGIN;
CREATE SCHEMA sbk;
REVOKE ALL ON SCHEMA sbk FROM PUBLIC;
GRANT USAGE ON SCHEMA sbk TO sbk_app;
CREATE TABLE sbk.profiles (
 id uuid PRIMARY KEY, display_name text NOT NULL CHECK(length(display_name) BETWEEN 2 AND 50),
 email text NOT NULL UNIQUE, language text NOT NULL DEFAULT 'en' CHECK(language IN('en','ml')),
 membership text NOT NULL DEFAULT 'pending' CHECK(membership IN('pending','approved','rejected','suspended')),
 role text NOT NULL DEFAULT 'member' CHECK(role IN('member','admin')),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(), updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE sbk.local_credentials(member_id uuid PRIMARY KEY REFERENCES sbk.profiles(id), password_hash text NOT NULL);
CREATE TABLE sbk.sessions(token_hash text PRIMARY KEY, member_id uuid NOT NULL REFERENCES sbk.profiles(id), expires_at timestamptz NOT NULL);
CREATE INDEX ON sbk.sessions(expires_at);
CREATE TABLE sbk.rate_limits(key text PRIMARY KEY, hits integer NOT NULL DEFAULT 1, resets_at timestamptz NOT NULL);
CREATE TABLE sbk.teams(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),name_en text NOT NULL CHECK(length(name_en) BETWEEN 2 AND 100),name_ml text NOT NULL DEFAULT '',short_name text NOT NULL CHECK(length(short_name) BETWEEN 1 AND 8),badge text NOT NULL DEFAULT '',active boolean NOT NULL DEFAULT true);
CREATE TABLE sbk.rounds(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),name_en text NOT NULL,name_ml text NOT NULL,sort_order integer NOT NULL DEFAULT 0,active boolean NOT NULL DEFAULT true);
CREATE TABLE sbk.fixtures(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),round_id uuid NOT NULL REFERENCES sbk.rounds(id),home_id uuid NOT NULL REFERENCES sbk.teams(id),away_id uuid NOT NULL REFERENCES sbk.teams(id),
 kickoff timestamptz NOT NULL,deadline timestamptz GENERATED ALWAYS AS (((kickoff AT TIME ZONE 'UTC') - interval '5 minutes') AT TIME ZONE 'UTC') STORED,
 venue_en text NOT NULL DEFAULT '',venue_ml text NOT NULL DEFAULT '',knockout boolean NOT NULL DEFAULT false,demo boolean NOT NULL DEFAULT false,
 status text NOT NULL DEFAULT 'scheduled' CHECK(status IN('scheduled','postponed','cancelled','in_progress','awaiting_result','finalized')),
 schedule_note_en text NOT NULL DEFAULT '',schedule_note_ml text NOT NULL DEFAULT '', updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),CHECK(home_id<>away_id)
);
CREATE INDEX ON sbk.fixtures(kickoff);CREATE INDEX ON sbk.fixtures(round_id,status);
CREATE TABLE sbk.predictions(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),fixture_id uuid NOT NULL REFERENCES sbk.fixtures(id),member_id uuid NOT NULL REFERENCES sbk.profiles(id),home_goals integer NOT NULL CHECK(home_goals BETWEEN 0 AND 20),away_goals integer NOT NULL CHECK(away_goals BETWEEN 0 AND 20),created_at timestamptz NOT NULL DEFAULT clock_timestamp(),updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),UNIQUE(fixture_id,member_id));
CREATE INDEX ON sbk.predictions(member_id);
CREATE TABLE sbk.prediction_revisions(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,prediction_id uuid NOT NULL REFERENCES sbk.predictions(id),home_goals integer NOT NULL,away_goals integer NOT NULL,saved_at timestamptz NOT NULL,changed_at timestamptz NOT NULL DEFAULT clock_timestamp());
CREATE TABLE sbk.results(fixture_id uuid PRIMARY KEY REFERENCES sbk.fixtures(id),home_goals integer NOT NULL CHECK(home_goals BETWEEN 0 AND 20),away_goals integer NOT NULL CHECK(away_goals BETWEEN 0 AND 20),reason text NOT NULL DEFAULT '',updated_by uuid NOT NULL REFERENCES sbk.profiles(id),updated_at timestamptz NOT NULL DEFAULT clock_timestamp());
CREATE TABLE sbk.membership_reviews(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,member_id uuid NOT NULL REFERENCES sbk.profiles(id),admin_id uuid NOT NULL REFERENCES sbk.profiles(id),action text NOT NULL,note text NOT NULL DEFAULT '',created_at timestamptz NOT NULL DEFAULT clock_timestamp());
CREATE TABLE sbk.announcements(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),title_en text NOT NULL,title_ml text NOT NULL,body_en text NOT NULL,body_ml text NOT NULL,published boolean NOT NULL DEFAULT false,starts_at timestamptz,ends_at timestamptz,updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),CHECK(ends_at IS NULL OR starts_at IS NULL OR ends_at>starts_at));
CREATE TABLE sbk.rules_revisions(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),body_en text NOT NULL,body_ml text NOT NULL,contact text NOT NULL DEFAULT '',created_at timestamptz NOT NULL DEFAULT clock_timestamp());
CREATE TABLE sbk.admin_audit_events(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,actor uuid REFERENCES sbk.profiles(id),action text NOT NULL,target text NOT NULL,before_value jsonb,after_value jsonb,created_at timestamptz NOT NULL DEFAULT clock_timestamp());
CREATE INDEX ON sbk.admin_audit_events(created_at DESC);
CREATE FUNCTION sbk.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('sbk.user_id',true),'')::uuid $$;
CREATE FUNCTION sbk.is_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=sbk,pg_temp AS $$ SELECT EXISTS(SELECT 1 FROM profiles WHERE id=sbk.uid() AND role='admin' AND membership='approved') $$;
CREATE FUNCTION sbk.is_member() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=sbk,pg_temp AS $$ SELECT EXISTS(SELECT 1 FROM profiles WHERE id=sbk.uid() AND membership='approved') $$;
CREATE FUNCTION sbk.score(h integer,a integer,rh integer,ra integer) RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT CASE WHEN h IS NULL OR a IS NULL THEN 0 WHEN h=rh AND a=ra THEN 5 WHEN sign(h-a)=sign(rh-ra) THEN 3 ELSE 0 END $$;

ALTER TABLE sbk.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY profile_read ON sbk.profiles FOR SELECT TO sbk_app USING(id=sbk.uid() OR sbk.is_admin());
CREATE POLICY profile_edit ON sbk.profiles FOR UPDATE TO sbk_app USING(id=sbk.uid() OR sbk.is_admin()) WITH CHECK(id=sbk.uid() OR sbk.is_admin());
GRANT SELECT,UPDATE(display_name,language,membership) ON sbk.profiles TO sbk_app;
CREATE FUNCTION sbk.profile_guard() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF current_user='sbk_app' AND NEW.membership IS DISTINCT FROM OLD.membership AND NOT sbk.is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
 IF current_user='sbk_app' AND OLD.role='admin' AND NEW.membership<>OLD.membership THEN RAISE EXCEPTION 'admin_protected'; END IF;
 NEW.updated_at=clock_timestamp();RETURN NEW;END $$;
CREATE TRIGGER profile_guard BEFORE UPDATE ON sbk.profiles FOR EACH ROW EXECUTE FUNCTION sbk.profile_guard();

DO $$ DECLARE t text; BEGIN FOREACH t IN ARRAY ARRAY['teams','rounds','fixtures','results','announcements','rules_revisions'] LOOP
 EXECUTE format('ALTER TABLE sbk.%I ENABLE ROW LEVEL SECURITY',t);
 EXECUTE format('CREATE POLICY member_read ON sbk.%I FOR SELECT TO sbk_app USING(sbk.is_member())',t);
 EXECUTE format('CREATE POLICY admin_write ON sbk.%I FOR ALL TO sbk_app USING(sbk.is_admin()) WITH CHECK(sbk.is_admin())',t);
 EXECUTE format('GRANT SELECT,INSERT,UPDATE ON sbk.%I TO sbk_app',t);
 END LOOP; END $$;
-- Draft announcements are visible only to admins.
DROP POLICY member_read ON sbk.announcements;
CREATE POLICY published_read ON sbk.announcements FOR SELECT TO sbk_app USING(sbk.is_member() AND published AND (starts_at IS NULL OR starts_at<=clock_timestamp()) AND (ends_at IS NULL OR ends_at>clock_timestamp()));
DO $$ DECLARE t text; BEGIN FOREACH t IN ARRAY ARRAY['membership_reviews','admin_audit_events','prediction_revisions'] LOOP
 EXECUTE format('ALTER TABLE sbk.%I ENABLE ROW LEVEL SECURITY',t);
 EXECUTE format('CREATE POLICY admin_read ON sbk.%I FOR SELECT TO sbk_app USING(sbk.is_admin())',t);
 EXECUTE format('GRANT SELECT ON sbk.%I TO sbk_app',t);
 END LOOP;END $$;
CREATE POLICY review_write ON sbk.membership_reviews FOR INSERT TO sbk_app WITH CHECK(sbk.is_admin() AND admin_id=sbk.uid());
GRANT INSERT ON sbk.membership_reviews TO sbk_app;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA sbk TO sbk_app;
ALTER TABLE sbk.predictions ENABLE ROW LEVEL SECURITY;
CREATE POLICY prediction_read ON sbk.predictions FOR SELECT TO sbk_app USING(sbk.is_member() AND (member_id=sbk.uid() OR EXISTS(SELECT 1 FROM sbk.fixtures f WHERE f.id=fixture_id AND f.deadline<=clock_timestamp())));
CREATE POLICY prediction_insert ON sbk.predictions FOR INSERT TO sbk_app WITH CHECK(sbk.is_member() AND member_id=sbk.uid());
CREATE POLICY prediction_edit ON sbk.predictions FOR UPDATE TO sbk_app USING(sbk.is_member() AND member_id=sbk.uid()) WITH CHECK(sbk.is_member() AND member_id=sbk.uid());
GRANT SELECT,INSERT,UPDATE(home_goals,away_goals,updated_at) ON sbk.predictions TO sbk_app;
CREATE FUNCTION sbk.prediction_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=sbk,pg_temp AS $$ DECLARE f fixtures; BEGIN
 SELECT * INTO f FROM fixtures WHERE id=NEW.fixture_id FOR UPDATE;
 IF NOT sbk.is_member() OR NEW.member_id<>sbk.uid() THEN RAISE EXCEPTION 'forbidden'; END IF;
 IF f.status<>'scheduled' OR clock_timestamp()>=f.deadline THEN RAISE EXCEPTION 'prediction_locked';END IF;
 IF TG_OP='UPDATE' THEN
 IF NEW.home_goals=OLD.home_goals AND NEW.away_goals=OLD.away_goals THEN RETURN OLD;END IF;
 INSERT INTO prediction_revisions(prediction_id,home_goals,away_goals,saved_at) VALUES(OLD.id,OLD.home_goals,OLD.away_goals,OLD.updated_at);
 END IF;
 NEW.updated_at=clock_timestamp();RETURN NEW;END $$;
CREATE TRIGGER prediction_guard BEFORE INSERT OR UPDATE ON sbk.predictions FOR EACH ROW EXECUTE FUNCTION sbk.prediction_guard();
CREATE FUNCTION sbk.fixture_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=sbk,pg_temp AS $$ BEGIN
 IF TG_OP='UPDATE' THEN
 IF OLD.status='finalized' AND (NEW.status<>'finalized' OR NEW.home_id<>OLD.home_id OR NEW.away_id<>OLD.away_id OR NEW.kickoff<>OLD.kickoff OR NEW.round_id<>OLD.round_id) THEN RAISE EXCEPTION 'finalized_immutable';END IF;
 IF (NEW.home_id<>OLD.home_id OR NEW.away_id<>OLD.away_id OR NEW.round_id<>OLD.round_id) AND EXISTS(SELECT 1 FROM sbk.predictions WHERE fixture_id=OLD.id) THEN RAISE EXCEPTION 'fixture_identity_locked';END IF;
 IF NEW.kickoff<>OLD.kickoff AND (length(NEW.schedule_note_en)<5 OR length(NEW.schedule_note_ml)<5) THEN RAISE EXCEPTION 'schedule_note_required';END IF;
 END IF;
 IF NEW.status='finalized' AND NOT EXISTS(SELECT 1 FROM sbk.results WHERE fixture_id=NEW.id) THEN RAISE EXCEPTION 'result_required';END IF;
 IF NEW.status IN('in_progress','awaiting_result') AND NEW.kickoff>clock_timestamp() THEN RAISE EXCEPTION 'not_started';END IF;
 NEW.updated_at=clock_timestamp();RETURN NEW;END $$;
CREATE TRIGGER fixture_guard BEFORE INSERT OR UPDATE ON sbk.fixtures FOR EACH ROW EXECUTE FUNCTION sbk.fixture_guard();
CREATE FUNCTION sbk.result_guard() RETURNS trigger LANGUAGE plpgsql AS $$ DECLARE f sbk.fixtures; BEGIN
 SELECT * INTO f FROM sbk.fixtures WHERE id=NEW.fixture_id FOR UPDATE;
 IF NOT sbk.is_admin() THEN RAISE EXCEPTION 'forbidden';END IF;
 IF f.status NOT IN('awaiting_result','in_progress','finalized') OR f.kickoff>clock_timestamp() THEN RAISE EXCEPTION 'result_state';END IF;
 IF TG_OP='UPDATE' AND length(trim(NEW.reason))<5 THEN RAISE EXCEPTION 'correction_reason';END IF;
 NEW.updated_by=sbk.uid();NEW.updated_at=clock_timestamp();RETURN NEW;END $$;
CREATE TRIGGER result_guard BEFORE INSERT OR UPDATE ON sbk.results FOR EACH ROW EXECUTE FUNCTION sbk.result_guard();
CREATE FUNCTION sbk.result_finalize() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN UPDATE sbk.fixtures SET status='finalized' WHERE id=NEW.fixture_id;RETURN NEW;END $$;
CREATE TRIGGER result_finalize AFTER INSERT OR UPDATE ON sbk.results FOR EACH ROW EXECUTE FUNCTION sbk.result_finalize();
CREATE FUNCTION sbk.audit() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=sbk,pg_temp AS $$ BEGIN
 IF sbk.uid() IS NOT NULL AND sbk.is_admin() THEN INSERT INTO admin_audit_events(actor,action,target,before_value,after_value) VALUES(sbk.uid(),TG_OP,TG_TABLE_NAME,CASE WHEN TG_OP='UPDATE' THEN to_jsonb(OLD)-'email' ELSE NULL END,to_jsonb(NEW)-'email');END IF;RETURN NEW;END $$;
DO $$ DECLARE t text; BEGIN FOREACH t IN ARRAY ARRAY['profiles','teams','rounds','fixtures','results','announcements','rules_revisions','membership_reviews'] LOOP
 EXECUTE format('CREATE TRIGGER audit AFTER INSERT OR UPDATE ON sbk.%I FOR EACH ROW EXECUTE FUNCTION sbk.audit()',t);END LOOP;END $$;
CREATE FUNCTION sbk.standings(round_filter uuid DEFAULT NULL) RETURNS TABLE(member_id uuid,display_name text,points bigint,exact bigint,correct bigint,participation bigint,rank bigint) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=sbk,pg_temp AS $$
 WITH totals AS(SELECT u.id,u.display_name,coalesce(sum(sbk.score(p.home_goals,p.away_goals,r.home_goals,r.away_goals)) FILTER(WHERE f.status='finalized'),0)::bigint points,
 count(*) FILTER(WHERE f.status='finalized' AND p.home_goals=r.home_goals AND p.away_goals=r.away_goals) exact,
 count(*) FILTER(WHERE f.status='finalized' AND sign(p.home_goals-p.away_goals)=sign(r.home_goals-r.away_goals)) correct,
 count(p.id) FILTER(WHERE f.status='finalized') participation
 FROM profiles u LEFT JOIN predictions p ON p.member_id=u.id AND EXISTS(SELECT 1 FROM fixtures x WHERE x.id=p.fixture_id AND (round_filter IS NULL OR x.round_id=round_filter))
 LEFT JOIN fixtures f ON f.id=p.fixture_id LEFT JOIN results r ON r.fixture_id=f.id
 WHERE u.membership='approved' AND sbk.is_member() GROUP BY u.id,u.display_name)
 SELECT id,display_name,points,exact,correct,participation,rank() OVER(ORDER BY points DESC,exact DESC,correct DESC) FROM totals;
$$;
-- Keep all auth persistence inaccessible to the application role except narrow functions.
CREATE FUNCTION sbk.consume_limit(k text,maximum integer,seconds integer) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=sbk,pg_temp AS $$ DECLARE n integer;BEGIN
 INSERT INTO rate_limits(key,hits,resets_at) VALUES(k,1,clock_timestamp()+make_interval(secs=>seconds)) ON CONFLICT(key) DO UPDATE SET hits=CASE WHEN rate_limits.resets_at<clock_timestamp() THEN 1 ELSE rate_limits.hits+1 END,resets_at=CASE WHEN rate_limits.resets_at<clock_timestamp() THEN clock_timestamp()+make_interval(secs=>seconds) ELSE rate_limits.resets_at END RETURNING hits INTO n;RETURN n<=maximum;END $$;
CREATE FUNCTION sbk.provision(uid uuid,mail text,n text,lang text) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path=sbk,pg_temp AS $$ INSERT INTO profiles(id,email,display_name,language) VALUES(uid,mail,n,lang) ON CONFLICT(id) DO NOTHING $$;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA sbk FROM PUBLIC;
GRANT EXECUTE ON FUNCTION sbk.uid(),sbk.is_admin(),sbk.is_member(),sbk.score(integer,integer,integer,integer),sbk.standings(uuid),sbk.consume_limit(text,integer,integer),sbk.provision(uuid,text,text,text) TO sbk_app;
-- Supabase anon/authenticated roles receive NO schema, table, or function grants.
