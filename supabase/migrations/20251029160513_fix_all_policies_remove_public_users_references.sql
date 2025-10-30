/*
  # Fix All Policies - Remove public.users References
  
  ## Problem
  Some policies still query public.users table directly, causing RLS recursion
  and "permission denied" errors.
  
  ## Solution
  Replace all direct queries to public.users with helper function calls that
  only access auth.users.
  
  ## Changes
  - Update organizations policies to use get_user_organization_id()
  - Update all other policies to avoid querying public.users
  - Use only auth.uid() and helper functions
*/

-- =============================================
-- ORGANIZATIONS - Fix policies
-- =============================================

DROP POLICY IF EXISTS "Consultants and readers can view their organization" ON organizations;

CREATE POLICY "Consultants and readers can view their organization"
  ON organizations FOR SELECT
  TO authenticated
  USING (
    get_user_role() IN ('consultant', 'reader')
    AND id = get_user_organization_id()
  );

-- =============================================
-- USERS - Fix policies that may have issues
-- =============================================

DROP POLICY IF EXISTS "Admins can view users in their organizations" ON users;
DROP POLICY IF EXISTS "Admins can update users in their organizations" ON users;
DROP POLICY IF EXISTS "Admins can delete users in their organizations" ON users;

CREATE POLICY "Admins can view users in their organizations"
  ON users FOR SELECT
  TO authenticated
  USING (
    get_user_role() = 'admin'
    AND organization_id IN (
      SELECT id FROM organizations WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Admins can update users in their organizations"
  ON users FOR UPDATE
  TO authenticated
  USING (
    get_user_role() = 'admin'
    AND organization_id IN (
      SELECT id FROM organizations WHERE created_by = auth.uid()
    )
  )
  WITH CHECK (
    get_user_role() = 'admin'
    AND organization_id IN (
      SELECT id FROM organizations WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Admins can delete users in their organizations"
  ON users FOR DELETE
  TO authenticated
  USING (
    get_user_role() = 'admin'
    AND organization_id IN (
      SELECT id FROM organizations WHERE created_by = auth.uid()
    )
  );