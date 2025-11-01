/*
  # Recreate All Users Table Policies Correctly
  
  ## Problem
  Missing policies for super_admin and consultants on users table.
  Also, some policies that use get_user_role() may still cause issues.
  
  ## Solution
  Create a complete set of policies for all roles:
  - Own profile access (no role check needed)
  - Super admin access (uses get_user_role())
  - Admin access (uses get_user_role())
  - Consultant access (uses get_user_role())
  
  ## Important
  The "own profile" policies MUST NOT call get_user_role() to avoid recursion.
*/

-- =============================================
-- SELECT Policies
-- =============================================

-- Keep existing own profile policy (already fixed)
-- Already exists: "Users can view own profile"

-- Add super admin policy if missing
DROP POLICY IF EXISTS "Super admins can view all users" ON users;
CREATE POLICY "Super admins can view all users"
  ON users FOR SELECT
  TO authenticated
  USING (get_user_role() = 'super_admin');

-- Keep admin policy (already exists)
-- Already exists: "Admins can view users in their organizations"

-- Add consultant policy if missing
DROP POLICY IF EXISTS "Consultants can view readers assigned to their sites" ON users;
CREATE POLICY "Consultants can view readers assigned to their sites"
  ON users FOR SELECT
  TO authenticated
  USING (
    get_user_role() = 'consultant'
    AND role = 'reader'
    AND id IN (
      SELECT user_id FROM user_site_access
      WHERE site_id IN (
        SELECT site_id FROM user_site_access WHERE user_id = auth.uid()
      )
    )
  );

-- =============================================
-- INSERT Policies
-- =============================================

-- Keep existing own profile insert (if exists)
-- Already exists: "Users can insert own profile"

-- Add super admin insert
DROP POLICY IF EXISTS "Super admins can insert users" ON users;
CREATE POLICY "Super admins can insert users"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (get_user_role() = 'super_admin');

-- Add consultant insert for readers
DROP POLICY IF EXISTS "Consultants can insert reader users" ON users;
CREATE POLICY "Consultants can insert reader users"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (
    get_user_role() = 'consultant'
    AND role = 'reader'
  );

-- =============================================
-- UPDATE Policies
-- =============================================

-- Keep existing own profile update (if exists)
-- Already exists: "Users can update own profile"

-- Add super admin update
DROP POLICY IF EXISTS "Super admins can update all users" ON users;
CREATE POLICY "Super admins can update all users"
  ON users FOR UPDATE
  TO authenticated
  USING (get_user_role() = 'super_admin')
  WITH CHECK (get_user_role() = 'super_admin');

-- Keep admin update (already exists)
-- Already exists: "Admins can update users in their organizations"

-- Add consultant update for readers
DROP POLICY IF EXISTS "Consultants can update readers assigned to their sites" ON users;
CREATE POLICY "Consultants can update readers assigned to their sites"
  ON users FOR UPDATE
  TO authenticated
  USING (
    get_user_role() = 'consultant'
    AND role = 'reader'
    AND id IN (
      SELECT user_id FROM user_site_access
      WHERE site_id IN (
        SELECT site_id FROM user_site_access WHERE user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    get_user_role() = 'consultant'
    AND role = 'reader'
  );

-- =============================================
-- DELETE Policies
-- =============================================

-- Add super admin delete
DROP POLICY IF EXISTS "Super admins can delete users" ON users;
CREATE POLICY "Super admins can delete users"
  ON users FOR DELETE
  TO authenticated
  USING (get_user_role() = 'super_admin');

-- Keep admin delete (already exists)
-- Already exists: "Admins can delete users in their organizations"

-- Add consultant delete for readers
DROP POLICY IF EXISTS "Consultants can delete readers assigned to their sites" ON users;
CREATE POLICY "Consultants can delete readers assigned to their sites"
  ON users FOR DELETE
  TO authenticated
  USING (
    get_user_role() = 'consultant'
    AND role = 'reader'
    AND id IN (
      SELECT user_id FROM user_site_access
      WHERE site_id IN (
        SELECT site_id FROM user_site_access WHERE user_id = auth.uid()
      )
    )
  );
