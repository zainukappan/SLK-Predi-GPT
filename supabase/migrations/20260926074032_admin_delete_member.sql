CREATE FUNCTION sbk.admin_delete_member(target_member uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=sbk,pg_temp AS $$
DECLARE target_profile sbk.profiles;
BEGIN
 IF NOT sbk.is_admin() THEN RAISE EXCEPTION 'forbidden';END IF;
 SELECT * INTO target_profile FROM profiles WHERE id=target_member FOR UPDATE;
 IF target_profile.id IS NULL THEN RAISE EXCEPTION 'member_not_found';END IF;
 IF target_profile.role<>'member' OR target_profile.id=sbk.uid() THEN RAISE EXCEPTION 'admin_protected';END IF;

 INSERT INTO admin_audit_events(actor,action,target,before_value,after_value)
 VALUES(sbk.uid(),'DELETE_MEMBER','profiles',
   jsonb_build_object('id',target_profile.id,'display_name',target_profile.display_name,'membership',target_profile.membership),
   jsonb_build_object('deleted',true));

 DELETE FROM prediction_revisions WHERE prediction_id IN (SELECT id FROM predictions WHERE member_id=target_member);
 DELETE FROM predictions WHERE member_id=target_member;
 DELETE FROM membership_reviews WHERE member_id=target_member;
 DELETE FROM sessions WHERE member_id=target_member;
 DELETE FROM local_credentials WHERE member_id=target_member;
 DELETE FROM profiles WHERE id=target_member;
END $$;

REVOKE ALL ON FUNCTION sbk.admin_delete_member(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION sbk.admin_delete_member(uuid) TO sbk_app;
