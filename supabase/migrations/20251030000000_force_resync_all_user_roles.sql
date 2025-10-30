-- =============================================
-- Force re-sync all user roles to app_metadata
-- This ensures all users have their role in JWT
-- =============================================

-- Update ALL users to ensure role and organization_id are in app_metadata
UPDATE auth.users au
SET raw_app_meta_data =
  COALESCE(raw_app_meta_data, '{}'::jsonb) ||
  jsonb_build_object(
    'role', COALESCE(u.role, 'reader'),
    'organization_id', COALESCE(u.organization_id::text, '')
  )
FROM public.users u
WHERE au.id = u.id;

-- Log the update
DO $$
DECLARE
  updated_count integer;
BEGIN
  SELECT COUNT(*) INTO updated_count FROM auth.users;
  RAISE NOTICE 'Re-synced % users to app_metadata', updated_count;
END $$;
