/*
  # Fix Assets and Threats Policies for Consultants

  ## Problem
  1. Current policies use old JWT syntax: (auth.jwt()->>'app_metadata')::jsonb->>'role'
  2. Consultants can only create assets/threats in sites where they have user_site_access
  3. Should allow consultants to create in ANY site of their organization

  ## Solution
  - Drop all old policies for assets and threats tables
  - Create new policies using correct app_metadata syntax
  - Allow consultants to work with any site in their organization
  - Maintain proper security boundaries

  ## Changes
  - Drop 11 old policies (assets: 6, threats: 5)
  - Create 12 new policies with proper access control
*/

-- =============================================
-- DROP OLD POLICIES - ASSETS
-- =============================================

DROP POLICY IF EXISTS "Super admins and admins can view all assets" ON assets;
DROP POLICY IF EXISTS "Consultants and operators can view assets for their sites" ON assets;
DROP POLICY IF EXISTS "Super admins and admins can insert assets" ON assets;
DROP POLICY IF EXISTS "Consultants can insert assets for their sites" ON assets;
DROP POLICY IF EXISTS "Super admins and admins can update assets" ON assets;
DROP POLICY IF EXISTS "Consultants can update assets for their sites" ON assets;
DROP POLICY IF EXISTS "Super admins and admins can delete assets" ON assets;

-- =============================================
-- DROP OLD POLICIES - THREATS
-- =============================================

DROP POLICY IF EXISTS "Super admins and admins can view all threats" ON threats;
DROP POLICY IF EXISTS "Consultants and operators can view threats for their sites" ON threats;
DROP POLICY IF EXISTS "Super admins and admins can insert threats" ON threats;
DROP POLICY IF EXISTS "Consultants can insert threats for their sites" ON threats;
DROP POLICY IF EXISTS "Super admins and admins can update threats" ON threats;
DROP POLICY IF EXISTS "Consultants can update threats for their sites" ON threats;
DROP POLICY IF EXISTS "Super admins and admins can delete threats" ON threats;

-- =============================================
-- CREATE NEW POLICIES - ASSETS
-- =============================================

-- Super admin can do everything
CREATE POLICY "assets_super_admin_all"
  ON assets FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin');

-- Admins can manage assets in sites of their organization
CREATE POLICY "assets_admin_all"
  ON assets FOR ALL
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    AND EXISTS (
      SELECT 1 FROM sites
      WHERE sites.id = assets.site_id
      AND sites.organization_id::text = (auth.jwt() -> 'app_metadata' ->> 'organization_id')
    )
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    AND EXISTS (
      SELECT 1 FROM sites
      WHERE sites.id = assets.site_id
      AND sites.organization_id::text = (auth.jwt() -> 'app_metadata' ->> 'organization_id')
    )
  );

-- Consultants can view assets in sites of their organization
CREATE POLICY "assets_consultant_select"
  ON assets FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'consultant'
    AND EXISTS (
      SELECT 1 FROM sites
      WHERE sites.id = assets.site_id
      AND sites.organization_id::text = (auth.jwt() -> 'app_metadata' ->> 'organization_id')
    )
  );

-- Consultants can create assets in any site of their organization
CREATE POLICY "assets_consultant_insert"
  ON assets FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'consultant'
    AND EXISTS (
      SELECT 1 FROM sites
      WHERE sites.id = assets.site_id
      AND sites.organization_id::text = (auth.jwt() -> 'app_metadata' ->> 'organization_id')
    )
  );

-- Consultants can update assets they created
CREATE POLICY "assets_consultant_update"
  ON assets FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'consultant'
    AND created_by = auth.uid()
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'consultant'
    AND created_by = auth.uid()
  );

-- Consultants can delete assets they created
CREATE POLICY "assets_consultant_delete"
  ON assets FOR DELETE
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'consultant'
    AND created_by = auth.uid()
  );

-- Readers can view assets in sites of their organization
CREATE POLICY "assets_reader_select"
  ON assets FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'reader'
    AND EXISTS (
      SELECT 1 FROM sites
      WHERE sites.id = assets.site_id
      AND sites.organization_id::text = (auth.jwt() -> 'app_metadata' ->> 'organization_id')
    )
  );

-- =============================================
-- CREATE NEW POLICIES - THREATS
-- =============================================

-- Super admin can do everything
CREATE POLICY "threats_super_admin_all"
  ON threats FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin');

-- Admins can manage threats in sites of their organization
CREATE POLICY "threats_admin_all"
  ON threats FOR ALL
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    AND EXISTS (
      SELECT 1 FROM sites
      WHERE sites.id = threats.site_id
      AND sites.organization_id::text = (auth.jwt() -> 'app_metadata' ->> 'organization_id')
    )
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    AND EXISTS (
      SELECT 1 FROM sites
      WHERE sites.id = threats.site_id
      AND sites.organization_id::text = (auth.jwt() -> 'app_metadata' ->> 'organization_id')
    )
  );

-- Consultants can view threats in sites of their organization
CREATE POLICY "threats_consultant_select"
  ON threats FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'consultant'
    AND EXISTS (
      SELECT 1 FROM sites
      WHERE sites.id = threats.site_id
      AND sites.organization_id::text = (auth.jwt() -> 'app_metadata' ->> 'organization_id')
    )
  );

-- Consultants can create threats in any site of their organization
CREATE POLICY "threats_consultant_insert"
  ON threats FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'consultant'
    AND EXISTS (
      SELECT 1 FROM sites
      WHERE sites.id = threats.site_id
      AND sites.organization_id::text = (auth.jwt() -> 'app_metadata' ->> 'organization_id')
    )
  );

-- Consultants can update threats they created
CREATE POLICY "threats_consultant_update"
  ON threats FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'consultant'
    AND created_by = auth.uid()
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'consultant'
    AND created_by = auth.uid()
  );

-- Consultants can delete threats they created
CREATE POLICY "threats_consultant_delete"
  ON threats FOR DELETE
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'consultant'
    AND created_by = auth.uid()
  );

-- Readers can view threats in sites of their organization
CREATE POLICY "threats_reader_select"
  ON threats FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'reader'
    AND EXISTS (
      SELECT 1 FROM sites
      WHERE sites.id = threats.site_id
      AND sites.organization_id::text = (auth.jwt() -> 'app_metadata' ->> 'organization_id')
    )
  );
