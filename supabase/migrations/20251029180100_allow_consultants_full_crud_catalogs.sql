/*
  # Allow Consultants Full CRUD on Catalogs

  ## Problem
  Consultants currently can only SELECT (view) asset_catalog and threat_catalog,
  but cannot INSERT, UPDATE, or DELETE. Only readers should be read-only.

  ## Solution
  Add INSERT, UPDATE, and DELETE policies for consultants on:
  - asset_catalog
  - threat_catalog

  Consultants can:
  - Create assets/threats in their organization
  - Update assets/threats they created
  - Delete assets/threats they created

  ## Changes
  - Add asset_catalog_consultant_insert policy
  - Add asset_catalog_consultant_update policy
  - Add asset_catalog_consultant_delete policy
  - Add threat_catalog_consultant_insert policy
  - Add threat_catalog_consultant_update policy
  - Add threat_catalog_consultant_delete policy
*/

-- =============================================
-- ASSET_CATALOG - Add CRUD policies for consultants
-- =============================================

-- Consultants can insert assets in their organization
CREATE POLICY "asset_catalog_consultant_insert"
  ON asset_catalog FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'consultant'
    AND organization_id::text = (auth.jwt() -> 'app_metadata' ->> 'organization_id')
  );

-- Consultants can update assets they created
CREATE POLICY "asset_catalog_consultant_update"
  ON asset_catalog FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'consultant'
    AND created_by = auth.uid()
    AND organization_id::text = (auth.jwt() -> 'app_metadata' ->> 'organization_id')
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'consultant'
    AND created_by = auth.uid()
    AND organization_id::text = (auth.jwt() -> 'app_metadata' ->> 'organization_id')
  );

-- Consultants can delete assets they created
CREATE POLICY "asset_catalog_consultant_delete"
  ON asset_catalog FOR DELETE
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'consultant'
    AND created_by = auth.uid()
    AND organization_id::text = (auth.jwt() -> 'app_metadata' ->> 'organization_id')
  );

-- =============================================
-- THREAT_CATALOG - Add CRUD policies for consultants
-- =============================================

-- Consultants can insert threats in their organization
CREATE POLICY "threat_catalog_consultant_insert"
  ON threat_catalog FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'consultant'
    AND organization_id::text = (auth.jwt() -> 'app_metadata' ->> 'organization_id')
  );

-- Consultants can update threats they created
CREATE POLICY "threat_catalog_consultant_update"
  ON threat_catalog FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'consultant'
    AND created_by = auth.uid()
    AND organization_id::text = (auth.jwt() -> 'app_metadata' ->> 'organization_id')
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'consultant'
    AND created_by = auth.uid()
    AND organization_id::text = (auth.jwt() -> 'app_metadata' ->> 'organization_id')
  );

-- Consultants can delete threats they created
CREATE POLICY "threat_catalog_consultant_delete"
  ON threat_catalog FOR DELETE
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'consultant'
    AND created_by = auth.uid()
    AND organization_id::text = (auth.jwt() -> 'app_metadata' ->> 'organization_id')
  );
