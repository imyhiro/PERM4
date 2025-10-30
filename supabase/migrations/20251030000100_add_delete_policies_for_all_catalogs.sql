-- =============================================
-- Add DELETE policies for super_admin and admin
-- =============================================

-- =============================================
-- ORGANIZATIONS
-- =============================================

-- Super admin can delete any organization
CREATE POLICY "orgs_super_admin_delete"
  ON organizations FOR DELETE
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin');

-- =============================================
-- SITES
-- =============================================

-- Super admin can delete any site
CREATE POLICY "sites_super_admin_delete"
  ON sites FOR DELETE
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin');

-- Admin can delete sites in their organization
CREATE POLICY "sites_admin_delete"
  ON sites FOR DELETE
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    AND organization_id::text = (auth.jwt() -> 'app_metadata' ->> 'organization_id')
  );

-- =============================================
-- USERS
-- =============================================

-- Super admin can delete any user
CREATE POLICY "users_super_admin_delete"
  ON users FOR DELETE
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin');

-- =============================================
-- ASSETS
-- =============================================

-- Super admin can delete any asset
CREATE POLICY "assets_super_admin_delete"
  ON assets FOR DELETE
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin');

-- Admin can delete assets in their organization
CREATE POLICY "assets_admin_delete"
  ON assets FOR DELETE
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    AND EXISTS (
      SELECT 1 FROM sites
      WHERE sites.id = assets.site_id
      AND sites.organization_id::text = (auth.jwt() -> 'app_metadata' ->> 'organization_id')
    )
  );

-- =============================================
-- THREATS
-- =============================================

-- Super admin can delete any threat
CREATE POLICY "threats_super_admin_delete"
  ON threats FOR DELETE
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin');

-- Admin can delete threats in their organization
CREATE POLICY "threats_admin_delete"
  ON threats FOR DELETE
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    AND EXISTS (
      SELECT 1 FROM sites
      WHERE sites.id = threats.site_id
      AND sites.organization_id::text = (auth.jwt() -> 'app_metadata' ->> 'organization_id')
    )
  );

-- =============================================
-- ASSET_CATALOG (Global templates)
-- =============================================

-- Super admin can delete any asset template
CREATE POLICY "asset_catalog_super_admin_delete"
  ON asset_catalog FOR DELETE
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin');

-- =============================================
-- THREAT_CATALOG (Global templates)
-- =============================================

-- Super admin can delete any threat template
CREATE POLICY "threat_catalog_super_admin_delete"
  ON threat_catalog FOR DELETE
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin');
