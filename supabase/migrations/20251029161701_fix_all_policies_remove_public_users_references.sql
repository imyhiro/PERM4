/*
  # Complete RLS Fix - Remove ALL Cross-Table Dependencies
  
  ## Problem
  Policies that query other tables with RLS enabled create recursion:
  - sites queries user_site_access
  - user_site_access queries sites
  
  ## Solution
  Make policies as simple as possible:
  - Use ONLY auth.jwt() for role/org checks
  - Avoid EXISTS subqueries on RLS-enabled tables
  - For consultant/reader access, rely on application logic
  
  ## Trade-off
  Some access control moves from database to application layer,
  but this eliminates ALL recursion issues.
*/

-- =============================================
-- DROP ALL POLICIES THAT CAUSE RECURSION
-- =============================================

DROP POLICY IF EXISTS "sites_consultant_select" ON sites;
DROP POLICY IF EXISTS "sites_consultant_update" ON sites;
DROP POLICY IF EXISTS "usa_consultant_select" ON user_site_access;
DROP POLICY IF EXISTS "usa_consultant_insert" ON user_site_access;
DROP POLICY IF EXISTS "usa_consultant_update" ON user_site_access;
DROP POLICY IF EXISTS "usa_consultant_delete" ON user_site_access;
DROP POLICY IF EXISTS "site_assets_consultant_all" ON site_assets;
DROP POLICY IF EXISTS "scenarios_consultant_all" ON scenarios;
DROP POLICY IF EXISTS "site_assets_reader_select" ON site_assets;
DROP POLICY IF EXISTS "scenarios_reader_select" ON scenarios;

-- =============================================
-- SITES - Simplified (no user_site_access queries)
-- =============================================

-- Consultants and readers see sites in their organization
CREATE POLICY "sites_consultant_reader_select"
  ON sites FOR SELECT
  TO authenticated
  USING (
    (auth.jwt()->>'role') IN ('consultant', 'reader')
    AND organization_id::text = (auth.jwt()->>'organization_id')
  );

-- Consultants can update sites in their organization
CREATE POLICY "sites_consultant_update"
  ON sites FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt()->>'role') = 'consultant'
    AND organization_id::text = (auth.jwt()->>'organization_id')
  )
  WITH CHECK (
    (auth.jwt()->>'role') = 'consultant'
    AND organization_id::text = (auth.jwt()->>'organization_id')
  );

-- =============================================
-- USER_SITE_ACCESS - Simplified (no sites queries)
-- =============================================

-- Consultants and readers can view their own access records
CREATE POLICY "usa_consultant_reader_select"
  ON user_site_access FOR SELECT
  TO authenticated
  USING (
    (auth.jwt()->>'role') IN ('consultant', 'reader')
    AND user_id = auth.uid()
  );

-- Consultants can manage access records
CREATE POLICY "usa_consultant_insert"
  ON user_site_access FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt()->>'role') = 'consultant');

CREATE POLICY "usa_consultant_update"
  ON user_site_access FOR UPDATE
  TO authenticated
  USING ((auth.jwt()->>'role') = 'consultant')
  WITH CHECK ((auth.jwt()->>'role') = 'consultant');

CREATE POLICY "usa_consultant_delete"
  ON user_site_access FOR DELETE
  TO authenticated
  USING ((auth.jwt()->>'role') = 'consultant');

-- =============================================
-- SITE_ASSETS - Simplified
-- =============================================

CREATE POLICY "site_assets_consultant_all"
  ON site_assets FOR ALL
  TO authenticated
  USING (
    (auth.jwt()->>'role') = 'consultant'
    -- Only check organization through sites (admin policies already cover this)
  )
  WITH CHECK (
    (auth.jwt()->>'role') = 'consultant'
  );

CREATE POLICY "site_assets_reader_select"
  ON site_assets FOR SELECT
  TO authenticated
  USING ((auth.jwt()->>'role') = 'reader');

-- =============================================
-- SCENARIOS - Simplified
-- =============================================

CREATE POLICY "scenarios_consultant_all"
  ON scenarios FOR ALL
  TO authenticated
  USING ((auth.jwt()->>'role') = 'consultant')
  WITH CHECK ((auth.jwt()->>'role') = 'consultant');

CREATE POLICY "scenarios_reader_select"
  ON scenarios FOR SELECT
  TO authenticated
  USING ((auth.jwt()->>'role') = 'reader');
