/*
  # Allow Consultants Full Permissions (Sites, Assets, Threats)

  ## Problem
  Consultants currently have limited permissions:
  - Can view sites, assets, and threats
  - Can update sites
  - CANNOT create sites, assets, or threats
  - CANNOT delete anything

  Only readers should be read-only. Consultants should have full CRUD within their organization.

  ## Solution
  Add INSERT, UPDATE, and DELETE policies for consultants on:
  - sites (only INSERT is missing)
  - asset_catalog (INSERT, UPDATE, DELETE all missing)
  - threat_catalog (INSERT, UPDATE, DELETE all missing)

  ## Rules for Consultants
  - Can create/update/delete items in their organization
  - Can only update/delete items they created (not items created by admins)
  - All operations respect organization boundaries

  ## Changes
  - Add sites_consultant_insert policy
  - Add asset_catalog_consultant_insert policy
  - Add asset_catalog_consultant_update policy
  - Add asset_catalog_consultant_delete policy
  - Add threat_catalog_consultant_insert policy
  - Add threat_catalog_consultant_update policy
  - Add threat_catalog_consultant_delete policy
*/

-- =============================================
-- SITES - Add INSERT policy for consultants
-- =============================================

-- Consultants can insert sites in their organization
CREATE POLICY "sites_consultant_insert"
  ON sites FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'consultant'
    AND organization_id::text = (auth.jwt() -> 'app_metadata' ->> 'organization_id')
  );

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
