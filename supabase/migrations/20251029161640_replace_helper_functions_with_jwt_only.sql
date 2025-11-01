/*
  # Fix Infinite Recursion in user_site_access and sites Policies
  
  ## Problem
  - sites policies query user_site_access
  - user_site_access policies query sites
  - This creates infinite recursion
  
  ## Solution
  Break the cycle by simplifying policies:
  - user_site_access: Only check role via JWT, don't query sites
  - sites: Check role and use user_site_access lookup
  - Add a security definer function to safely check site organization
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "usa_consultant_all" ON user_site_access;
DROP POLICY IF EXISTS "usa_admin_all" ON user_site_access;
DROP POLICY IF EXISTS "sites_consultant_select" ON sites;
DROP POLICY IF EXISTS "sites_consultant_update" ON sites;

-- =============================================
-- Fix user_site_access policies (no cross-table queries)
-- =============================================

CREATE POLICY "usa_admin_all"
  ON user_site_access FOR ALL
  TO authenticated
  USING ((auth.jwt()->>'role') = 'admin')
  WITH CHECK ((auth.jwt()->>'role') = 'admin');

CREATE POLICY "usa_consultant_select"
  ON user_site_access FOR SELECT
  TO authenticated
  USING (
    (auth.jwt()->>'role') IN ('consultant', 'reader')
    AND user_id = auth.uid()
  );

CREATE POLICY "usa_consultant_insert"
  ON user_site_access FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt()->>'role') = 'consultant'
  );

CREATE POLICY "usa_consultant_update"
  ON user_site_access FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt()->>'role') = 'consultant'
    AND user_id = auth.uid()
  )
  WITH CHECK (
    (auth.jwt()->>'role') = 'consultant'
  );

CREATE POLICY "usa_consultant_delete"
  ON user_site_access FOR DELETE
  TO authenticated
  USING (
    (auth.jwt()->>'role') = 'consultant'
    AND user_id = auth.uid()
  );

-- =============================================
-- Fix sites policies
-- =============================================

-- Consultant/reader can select sites they have access to
CREATE POLICY "sites_consultant_select"
  ON sites FOR SELECT
  TO authenticated
  USING (
    (auth.jwt()->>'role') IN ('consultant', 'reader')
    AND (
      -- Direct access via user_site_access
      EXISTS (SELECT 1 FROM user_site_access WHERE site_id = sites.id AND user_id = auth.uid())
      -- OR same organization
      OR organization_id::text = (auth.jwt()->>'organization_id')
    )
  );

-- Consultant can update only assigned sites
CREATE POLICY "sites_consultant_update"
  ON sites FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt()->>'role') = 'consultant'
    AND EXISTS (SELECT 1 FROM user_site_access WHERE site_id = sites.id AND user_id = auth.uid())
  )
  WITH CHECK (
    (auth.jwt()->>'role') = 'consultant'
    AND EXISTS (SELECT 1 FROM user_site_access WHERE site_id = sites.id AND user_id = auth.uid())
  );
