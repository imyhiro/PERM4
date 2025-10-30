/*
  # Update scenarios table RLS policies for role-based access

  1. Changes
    - Drop existing policies on scenarios table
    - Create new policies based on role requirements:
      - SuperAdmin: Full access to all scenarios
      - Admin: Full access to all scenarios (filtered by app)
      - Consultant: Access to scenarios in assigned sites
      - Reader: Read-only access to scenarios in assigned sites

  2. Security
    - Maintains strict RLS on scenarios table
    - Ensures proper role-based access control
*/

-- Drop existing policies
DROP POLICY IF EXISTS "SuperAdmin can view all scenarios" ON scenarios;
DROP POLICY IF EXISTS "Admin can view scenarios" ON scenarios;
DROP POLICY IF EXISTS "Consultant can view assigned site scenarios" ON scenarios;
DROP POLICY IF EXISTS "Reader can view assigned site scenarios" ON scenarios;
DROP POLICY IF EXISTS "SuperAdmin can insert scenarios" ON scenarios;
DROP POLICY IF EXISTS "Admin can insert scenarios" ON scenarios;
DROP POLICY IF EXISTS "Consultant can insert scenarios in assigned sites" ON scenarios;
DROP POLICY IF EXISTS "SuperAdmin can update all scenarios" ON scenarios;
DROP POLICY IF EXISTS "Admin can update scenarios" ON scenarios;
DROP POLICY IF EXISTS "Consultant can update scenarios in assigned sites" ON scenarios;
DROP POLICY IF EXISTS "SuperAdmin can delete all scenarios" ON scenarios;
DROP POLICY IF EXISTS "Admin can delete scenarios" ON scenarios;
DROP POLICY IF EXISTS "Consultant can delete scenarios in assigned sites" ON scenarios;

-- SELECT policies
CREATE POLICY "SuperAdmin can view all scenarios"
  ON scenarios FOR SELECT
  TO authenticated
  USING (
    (SELECT get_user_role()) = 'superadmin'
  );

CREATE POLICY "Admin can view scenarios"
  ON scenarios FOR SELECT
  TO authenticated
  USING (
    (SELECT get_user_role()) = 'admin'
  );

CREATE POLICY "Consultant can view assigned site scenarios"
  ON scenarios FOR SELECT
  TO authenticated
  USING (
    (SELECT get_user_role()) = 'consultant'
    AND site_id IN (
      SELECT site_id FROM user_site_access WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Reader can view assigned site scenarios"
  ON scenarios FOR SELECT
  TO authenticated
  USING (
    (SELECT get_user_role()) = 'reader'
    AND site_id IN (
      SELECT site_id FROM user_site_access WHERE user_id = auth.uid()
    )
  );

-- INSERT policies
CREATE POLICY "SuperAdmin can insert scenarios"
  ON scenarios FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT get_user_role()) = 'superadmin'
  );

CREATE POLICY "Admin can insert scenarios"
  ON scenarios FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT get_user_role()) = 'admin'
  );

CREATE POLICY "Consultant can insert scenarios in assigned sites"
  ON scenarios FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT get_user_role()) = 'consultant'
    AND site_id IN (
      SELECT site_id FROM user_site_access WHERE user_id = auth.uid()
    )
  );

-- UPDATE policies
CREATE POLICY "SuperAdmin can update all scenarios"
  ON scenarios FOR UPDATE
  TO authenticated
  USING (
    (SELECT get_user_role()) = 'superadmin'
  )
  WITH CHECK (
    (SELECT get_user_role()) = 'superadmin'
  );

CREATE POLICY "Admin can update scenarios"
  ON scenarios FOR UPDATE
  TO authenticated
  USING (
    (SELECT get_user_role()) = 'admin'
  )
  WITH CHECK (
    (SELECT get_user_role()) = 'admin'
  );

CREATE POLICY "Consultant can update scenarios in assigned sites"
  ON scenarios FOR UPDATE
  TO authenticated
  USING (
    (SELECT get_user_role()) = 'consultant'
    AND site_id IN (
      SELECT site_id FROM user_site_access WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    (SELECT get_user_role()) = 'consultant'
    AND site_id IN (
      SELECT site_id FROM user_site_access WHERE user_id = auth.uid()
    )
  );

-- DELETE policies
CREATE POLICY "SuperAdmin can delete all scenarios"
  ON scenarios FOR DELETE
  TO authenticated
  USING (
    (SELECT get_user_role()) = 'superadmin'
  );

CREATE POLICY "Admin can delete scenarios"
  ON scenarios FOR DELETE
  TO authenticated
  USING (
    (SELECT get_user_role()) = 'admin'
  );

CREATE POLICY "Consultant can delete scenarios in assigned sites"
  ON scenarios FOR DELETE
  TO authenticated
  USING (
    (SELECT get_user_role()) = 'consultant'
    AND site_id IN (
      SELECT site_id FROM user_site_access WHERE user_id = auth.uid()
    )
  );