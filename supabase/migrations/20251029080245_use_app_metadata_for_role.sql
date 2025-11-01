/*
  # Use app_metadata for role checking to avoid recursion

  1. Changes
    - Drop all existing user policies
    - Create a trigger to sync role to auth.users app_metadata
    - Create RLS policies that use app_metadata instead of querying users table
    - This eliminates the recursion issue completely

  2. Security
    - Super admins and admins can see all users
    - Regular users can only see themselves
    - No table recursion
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users read access" ON users;
DROP POLICY IF EXISTS "Admins read all users" ON users;

-- Create function to sync role to app_metadata
CREATE OR REPLACE FUNCTION sync_role_to_metadata()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update auth.users app_metadata with the role
  UPDATE auth.users
  SET raw_app_meta_data = 
    COALESCE(raw_app_meta_data, '{}'::jsonb) || 
    jsonb_build_object('role', NEW.role)
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$;

-- Create trigger to sync role on insert and update
DROP TRIGGER IF EXISTS sync_role_to_metadata_trigger ON users;
CREATE TRIGGER sync_role_to_metadata_trigger
  AFTER INSERT OR UPDATE OF role ON users
  FOR EACH ROW
  EXECUTE FUNCTION sync_role_to_metadata();

-- Sync existing roles to metadata
UPDATE auth.users au
SET raw_app_meta_data = 
  COALESCE(raw_app_meta_data, '{}'::jsonb) || 
  jsonb_build_object('role', u.role)
FROM users u
WHERE au.id = u.id;

-- Create new RLS policy using app_metadata (no recursion!)
CREATE POLICY "Users can view based on metadata role"
  ON users FOR SELECT
  TO authenticated
  USING (
    -- User can see their own profile
    id = auth.uid()
    OR
    -- Or user has admin role in their JWT metadata
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin', 'admin')
  );
