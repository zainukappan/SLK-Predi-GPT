CREATE FUNCTION sbk.promote_member(target_id uuid) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = sbk, pg_temp
AS $$
DECLARE target_profile sbk.profiles;
BEGIN
  IF NOT sbk.is_admin() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT * INTO target_profile
  FROM sbk.profiles
  WHERE id = target_id
  FOR UPDATE;

  IF target_profile.id IS NULL
     OR target_profile.membership <> 'approved'
     OR target_profile.role <> 'member' THEN
    RAISE EXCEPTION 'admin_protected';
  END IF;

  UPDATE sbk.profiles SET role = 'admin' WHERE id = target_id;
END;
$$;

REVOKE ALL ON FUNCTION sbk.promote_member(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION sbk.promote_member(uuid) TO sbk_app;
