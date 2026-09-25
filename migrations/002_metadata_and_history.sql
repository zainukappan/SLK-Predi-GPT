-- Optional stage dates and immutable history; shared by local and production.
ALTER TABLE sbk.rounds ADD COLUMN stage_en text NOT NULL DEFAULT '';
ALTER TABLE sbk.rounds ADD COLUMN stage_ml text NOT NULL DEFAULT '';
ALTER TABLE sbk.rounds ADD COLUMN starts_at timestamptz;
ALTER TABLE sbk.rounds ADD COLUMN ends_at timestamptz;
ALTER TABLE sbk.rounds ADD CONSTRAINT round_dates CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at >= starts_at);
ALTER TABLE sbk.fixtures ADD COLUMN created_at timestamptz NOT NULL DEFAULT clock_timestamp();
ALTER TABLE sbk.fixtures ADD COLUMN created_by uuid REFERENCES sbk.profiles(id);
ALTER TABLE sbk.fixtures ADD COLUMN updated_by uuid REFERENCES sbk.profiles(id);
ALTER TABLE sbk.fixtures ADD COLUMN status_changed_at timestamptz NOT NULL DEFAULT clock_timestamp();
CREATE FUNCTION sbk.fixture_metadata() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 NEW.updated_by=sbk.uid();
 IF TG_OP='INSERT' THEN NEW.created_by=sbk.uid();NEW.created_at=clock_timestamp();NEW.status_changed_at=clock_timestamp();
 ELSE NEW.created_at=OLD.created_at;NEW.created_by=OLD.created_by;NEW.status_changed_at=CASE WHEN NEW.status<>OLD.status THEN clock_timestamp() ELSE OLD.status_changed_at END;
 END IF;RETURN NEW;END $$;
CREATE TRIGGER fixture_metadata BEFORE INSERT OR UPDATE ON sbk.fixtures FOR EACH ROW EXECUTE FUNCTION sbk.fixture_metadata();
REVOKE ALL ON FUNCTION sbk.fixture_metadata() FROM PUBLIC;
REVOKE UPDATE ON sbk.rules_revisions FROM sbk_app;
REVOKE UPDATE ON sbk.results FROM sbk_app;
GRANT UPDATE(home_goals,away_goals,reason,updated_by) ON sbk.results TO sbk_app;
