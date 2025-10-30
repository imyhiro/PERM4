/*
  # Fix Helper Functions Search Path
  
  ## Problem
  The helper functions have SECURITY DEFINER with search_path set to 'public',
  which may prevent proper access to auth.users table.
  
  ## Solution
  Update functions to use correct search_path that includes both auth and public schemas.
  
  ## Changes
  - Update get_user_role() with proper search_path
  - Update get_user_organization_id() with proper search_path
*/

-- Recreate get_user_role with correct search_path
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = auth, public
AS $$
  SELECT COALESCE(
    (SELECT raw_app_meta_data->>'role' FROM auth.users WHERE id = auth.uid()),
    'reader'
  );
$$;

-- Recreate get_user_organization_id with correct search_path
CREATE OR REPLACE FUNCTION public.get_user_organization_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = auth, public
AS $$
  SELECT (
    SELECT (raw_app_meta_data->>'organization_id')::uuid 
    FROM auth.users 
    WHERE id = auth.uid()
  );
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_organization_id() TO authenticated;