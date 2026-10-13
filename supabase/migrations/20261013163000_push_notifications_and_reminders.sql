-- Push notifications and 30-min reminder tracking
ALTER TABLE sbk.fixtures ADD COLUMN IF NOT EXISTS reminder_sent_at timestamptz DEFAULT NULL;

CREATE TABLE IF NOT EXISTS sbk.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES sbk.profiles(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_push_subs_member ON sbk.push_subscriptions(member_id);

ALTER TABLE sbk.push_subscriptions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'sbk' AND tablename = 'push_subscriptions' AND policyname = 'push_sub_member'
  ) THEN
    CREATE POLICY push_sub_member ON sbk.push_subscriptions FOR ALL TO sbk_app
      USING (member_id = sbk.uid() OR sbk.is_admin())
      WITH CHECK (member_id = sbk.uid() OR sbk.is_admin());
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON sbk.push_subscriptions TO sbk_app;
GRANT UPDATE(reminder_sent_at) ON sbk.fixtures TO sbk_app;

CREATE OR REPLACE FUNCTION sbk.fixture_unpredicted_members(target_fixture_id uuid)
RETURNS TABLE(
  member_id uuid,
  display_name text,
  email text,
  push_count bigint
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=sbk,pg_temp AS $$
  SELECT
    p.id AS member_id,
    p.display_name,
    p.email,
    COUNT(ps.id) AS push_count
  FROM sbk.profiles p
  LEFT JOIN sbk.push_subscriptions ps ON ps.member_id = p.id
  WHERE p.membership = 'approved'
    AND NOT EXISTS (
      SELECT 1 FROM sbk.predictions pr
      WHERE pr.fixture_id = target_fixture_id
        AND pr.member_id = p.id
    )
  GROUP BY p.id, p.display_name, p.email
  ORDER BY p.display_name;
$$;

REVOKE ALL ON FUNCTION sbk.fixture_unpredicted_members(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION sbk.fixture_unpredicted_members(uuid) TO sbk_app;
