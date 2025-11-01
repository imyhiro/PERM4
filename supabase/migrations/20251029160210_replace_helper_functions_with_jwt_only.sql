/*
  # Replace Helper Functions to Use Only JWT
  
  ## Problem
  The helper functions were trying to access the users table which has RLS enabled,
  causing "permission denied for table users" errors and infinite recursion.
  
  ## Solution
  Replace helper functions to ONLY read from auth.users (which bypasses RLS with SECURITY DEFINER)
  and never query the public.users table within RLS policies.
  
  ## Changes
  1. Drop and recreate get_user_role() to only use auth.users
  2. Drop and recreate get_user_organization_id() to only use auth.users  
  3. Add organization_id to auth.users.raw_app_meta_data during user creation
  
  ## Security
  - Functions use SECURITY DEFINER to access auth schema
  - auth.users table is not subject to RLS
  - No circular dependencies
*/

-- Drop existing functions with CASCADE to remove dependencies
DROP FUNCTION IF EXISTS public.get_user_role() CASCADE;
DROP FUNCTION IF EXISTS public.get_user_organization_id() CASCADE;

-- Recreate function to get user role from auth.users only
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT raw_app_meta_data->>'role' FROM auth.users WHERE id = auth.uid()),
    'reader'
  );
$$;

-- Recreate function to get user organization from auth.users only  
CREATE OR REPLACE FUNCTION public.get_user_organization_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
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

-- Note: The organization_id should be set in raw_app_meta_data when creating users
-- This will be handled by the create-user edge function
