/*
  # Allow Consultants Full Permissions on Assets and Threats

  ## Problem
  Consultants can already create sites, but still cannot:
  - Create assets or threats
  - Update/delete assets or threats they created

  Only readers should be read-only. Consultants need full CRUD.

  ## Solution
  Add INSERT, UPDATE, and DELETE policies for consultants on:
  - asset_catalog (INSERT, UPDATE, DELETE all missing)
  - threat_catalog (INSERT, UPDATE, DELETE all missing)

  ## Rules for Consultants
  - Can create assets/threats in their organization
  - Can only update/delete items they created (not items created by admins)
  - All operations respect organization boundaries

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
