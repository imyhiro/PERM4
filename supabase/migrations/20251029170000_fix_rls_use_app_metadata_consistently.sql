/*
  # Fix RLS Policies - Use app_metadata Consistently

  ## Problem
  The current RLS policies have two major issues:
  1. Infinite recursion - policies query the users table which also has RLS
  2. Inconsistent role access - some use auth.jwt() ->> 'role', others use app_metadata

  ## Solution
  1. Ensure role sync trigger to app_metadata works correctly
  2. Sync all existing roles to auth.users.raw_app_meta_data
  3. Update organization_id in app_metadata as well
  4. Recreate ALL policies to use auth.jwt() -> 'app_metadata' consistently

  This eliminates recursion and ensures super_admin can see everything.
*/

-- =============================================
-- STEP 1: Ensure sync functions exist and work correctly
-- =============================================

-- Drop existing sync function if it exists
DROP FUNCTION IF EXISTS sync_role_to_metadata() CASCADE;

-- Create function to sync both role AND organization_id to app_metadata
CREATE OR REPLACE FUNCTION sync_user_metadata_to_jwt()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update auth.users app_metadata with role and organization_id
  UPDATE auth.users
  SET raw_app_meta_data =
    COALESCE(raw_app_meta_data, '{}'::jsonb) ||
    jsonb_build_object(
      'role', NEW.role,
      'organization_id', NEW.organization_id::text
    )
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$;

-- Create trigger to sync on insert and update
DROP TRIGGER IF EXISTS sync_user_metadata_trigger ON users;
CREATE TRIGGER sync_user_metadata_trigger
  AFTER INSERT OR UPDATE OF role, organization_id ON users
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_metadata_to_jwt();

-- =============================================
-- STEP 2: Sync all existing users to app_metadata
-- =============================================

UPDATE auth.users au
SET raw_app_meta_data =
  COALESCE(raw_app_meta_data, '{}'::jsonb) ||
  jsonb_build_object(
    'role', u.role,
    'organization_id', u.organization_id::text
  )
FROM users u
WHERE au.id = u.id;

-- =============================================
-- STEP 3: Drop ALL existing policies
-- =============================================

-- Organizations
DROP POLICY IF EXISTS "orgs_super_admin_select" ON organizations;
DROP POLICY IF EXISTS "orgs_super_admin_insert" ON organizations;
DROP POLICY IF EXISTS "orgs_super_admin_update" ON organizations;
DROP POLICY IF EXISTS "orgs_super_admin_delete" ON organizations;
DROP POLICY IF EXISTS "orgs_super_admin_all" ON organizations;
DROP POLICY IF EXISTS "orgs_admin_select_created" ON organizations;
DROP POLICY IF EXISTS "orgs_admin_insert" ON organizations;
DROP POLICY IF EXISTS "orgs_admin_update_created" ON organizations;
DROP POLICY IF EXISTS "orgs_admin_delete_created" ON organizations;
DROP POLICY IF EXISTS "orgs_select_own" ON organizations;
DROP POLICY IF EXISTS "Super admins can manage all organizations" ON organizations;
DROP POLICY IF EXISTS "Users can view their own organization" ON organizations;

-- Users
DROP POLICY IF EXISTS "Users can view based on metadata role" ON users;
DROP POLICY IF EXISTS "Users read access" ON users;
DROP POLICY IF EXISTS "Admins read all users" ON users;
DROP POLICY IF EXISTS "Super admins can manage all users" ON users;
DROP POLICY IF EXISTS "Admins can manage users in their organization" ON users;
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "users_super_admin_all" ON users;
DROP POLICY IF EXISTS "users_admin_select" ON users;
DROP POLICY IF EXISTS "users_admin_insert" ON users;
DROP POLICY IF EXISTS "users_admin_update" ON users;
DROP POLICY IF EXISTS "users_admin_delete" ON users;
DROP POLICY IF EXISTS "users_select_self" ON users;
DROP POLICY IF EXISTS "users_update_self" ON users;

-- Sites
DROP POLICY IF EXISTS "sites_super_admin_select" ON sites;
DROP POLICY IF EXISTS "sites_super_admin_insert" ON sites;
DROP POLICY IF EXISTS "sites_super_admin_update" ON sites;
DROP POLICY IF EXISTS "sites_super_admin_delete" ON sites;
DROP POLICY IF EXISTS "sites_super_admin_all" ON sites;
DROP POLICY IF EXISTS "sites_admin_select" ON sites;
DROP POLICY IF EXISTS "sites_admin_insert" ON sites;
DROP POLICY IF EXISTS "sites_admin_update" ON sites;
DROP POLICY IF EXISTS "sites_admin_delete" ON sites;
DROP POLICY IF EXISTS "sites_admin_all" ON sites;
DROP POLICY IF EXISTS "sites_consultant_reader_select" ON sites;
DROP POLICY IF EXISTS "sites_consultant_select" ON sites;
DROP POLICY IF EXISTS "sites_consultant_update" ON sites;
DROP POLICY IF EXISTS "Super admins can manage all sites" ON sites;
DROP POLICY IF EXISTS "Admins can manage sites in their organization" ON sites;
DROP POLICY IF EXISTS "Consultants can view assigned sites" ON sites;
DROP POLICY IF EXISTS "Consultants can update assigned sites" ON sites;
DROP POLICY IF EXISTS "Readers can view assigned sites" ON sites;

-- User Site Access
DROP POLICY IF EXISTS "user_site_access_super_admin_insert" ON user_site_access;
DROP POLICY IF EXISTS "user_site_access_super_admin_update" ON user_site_access;
DROP POLICY IF EXISTS "user_site_access_super_admin_delete" ON user_site_access;
DROP POLICY IF EXISTS "user_site_access_super_admin_all" ON user_site_access;
DROP POLICY IF EXISTS "user_site_access_admin_insert" ON user_site_access;
DROP POLICY IF EXISTS "user_site_access_admin_update" ON user_site_access;
DROP POLICY IF EXISTS "user_site_access_admin_delete" ON user_site_access;
DROP POLICY IF EXISTS "usa_admin_all" ON user_site_access;
DROP POLICY IF EXISTS "usa_consultant_reader_select" ON user_site_access;
DROP POLICY IF EXISTS "usa_consultant_select" ON user_site_access;
DROP POLICY IF EXISTS "usa_consultant_insert" ON user_site_access;
DROP POLICY IF EXISTS "usa_consultant_update" ON user_site_access;
DROP POLICY IF EXISTS "usa_consultant_delete" ON user_site_access;
DROP POLICY IF EXISTS "Super admins can manage all site access" ON user_site_access;
DROP POLICY IF EXISTS "Admins can manage site access in their organization" ON user_site_access;
DROP POLICY IF EXISTS "Consultants can manage site access for their sites" ON user_site_access;

-- Asset Catalog
DROP POLICY IF EXISTS "asset_catalog_super_admin_select" ON asset_catalog;
DROP POLICY IF EXISTS "asset_catalog_super_admin_insert" ON asset_catalog;
DROP POLICY IF EXISTS "asset_catalog_super_admin_update" ON asset_catalog;
DROP POLICY IF EXISTS "asset_catalog_super_admin_delete" ON asset_catalog;
DROP POLICY IF EXISTS "asset_catalog_super_admin_all" ON asset_catalog;
DROP POLICY IF EXISTS "asset_catalog_admin_insert" ON asset_catalog;
DROP POLICY IF EXISTS "asset_catalog_admin_update" ON asset_catalog;
DROP POLICY IF EXISTS "asset_catalog_admin_delete" ON asset_catalog;
DROP POLICY IF EXISTS "asset_catalog_select" ON asset_catalog;
DROP POLICY IF EXISTS "Super admins can manage all assets" ON asset_catalog;
DROP POLICY IF EXISTS "Users can view global and their org assets" ON asset_catalog;
DROP POLICY IF EXISTS "Admins and consultants can create org assets" ON asset_catalog;
DROP POLICY IF EXISTS "Admins and consultants can update org assets" ON asset_catalog;

-- Threat Catalog
DROP POLICY IF EXISTS "threat_catalog_super_admin_select" ON threat_catalog;
DROP POLICY IF EXISTS "threat_catalog_super_admin_insert" ON threat_catalog;
DROP POLICY IF EXISTS "threat_catalog_super_admin_update" ON threat_catalog;
DROP POLICY IF EXISTS "threat_catalog_super_admin_delete" ON threat_catalog;
DROP POLICY IF EXISTS "threat_catalog_super_admin_all" ON threat_catalog;
DROP POLICY IF EXISTS "threat_catalog_admin_insert" ON threat_catalog;
DROP POLICY IF EXISTS "threat_catalog_admin_update" ON threat_catalog;
DROP POLICY IF EXISTS "threat_catalog_admin_delete" ON threat_catalog;
DROP POLICY IF EXISTS "threat_catalog_select" ON threat_catalog;
DROP POLICY IF EXISTS "Super admins can manage all threats" ON threat_catalog;
DROP POLICY IF EXISTS "Users can view global and their org threats" ON threat_catalog;
DROP POLICY IF EXISTS "Admins and consultants can create org threats" ON threat_catalog;
DROP POLICY IF EXISTS "Admins and consultants can update org threats" ON threat_catalog;

-- Site Assets
DROP POLICY IF EXISTS "site_assets_super_admin_all" ON site_assets;
DROP POLICY IF EXISTS "site_assets_admin_all" ON site_assets;
DROP POLICY IF EXISTS "site_assets_consultant_all" ON site_assets;
DROP POLICY IF EXISTS "site_assets_reader_select" ON site_assets;
DROP POLICY IF EXISTS "Super admins can manage all site assets" ON site_assets;
DROP POLICY IF EXISTS "Admins can manage site assets in their organization" ON site_assets;
DROP POLICY IF EXISTS "Consultants can manage site assets for assigned sites" ON site_assets;
DROP POLICY IF EXISTS "Readers can view site assets for assigned sites" ON site_assets;

-- Scenarios
DROP POLICY IF EXISTS "scenarios_super_admin_all" ON scenarios;
DROP POLICY IF EXISTS "scenarios_admin_all" ON scenarios;
DROP POLICY IF EXISTS "scenarios_consultant_all" ON scenarios;
DROP POLICY IF EXISTS "scenarios_reader_select" ON scenarios;
DROP POLICY IF EXISTS "Super admins can manage all scenarios" ON scenarios;
DROP POLICY IF EXISTS "Admins can manage scenarios in their organization" ON scenarios;
DROP POLICY IF EXISTS "Consultants can manage scenarios for assigned sites" ON scenarios;
DROP POLICY IF EXISTS "Readers can view scenarios for assigned sites" ON scenarios;

-- Asset Threat Compatibility
DROP POLICY IF EXISTS "Super admins can manage all compatibility rules" ON asset_threat_compatibility;
DROP POLICY IF EXISTS "Users can view global and their org compatibility rules" ON asset_threat_compatibility;
DROP POLICY IF EXISTS "Admins and consultants can create org compatibility rules" ON asset_threat_compatibility;

-- =============================================
-- STEP 4: Create NEW policies using app_metadata
-- =============================================

-- =============================================
-- ORGANIZATIONS POLICIES
-- =============================================

-- Super admin can do everything
CREATE POLICY "orgs_super_admin_all"
  ON organizations FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin');

-- Admins can select organizations they created
CREATE POLICY "orgs_admin_select"
  ON organizations FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    AND (
      id::text = (auth.jwt() -> 'app_metadata' ->> 'organization_id')
      OR created_by = auth.uid()
    )
  );

-- Admins can insert organizations
CREATE POLICY "orgs_admin_insert"
  ON organizations FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Admins can update organizations they created
CREATE POLICY "orgs_admin_update"
  ON organizations FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    AND created_by = auth.uid()
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    AND created_by = auth.uid()
  );

-- Admins can delete organizations they created
CREATE POLICY "orgs_admin_delete"
  ON organizations FOR DELETE
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    AND created_by = auth.uid()
  );

-- Users can view their own organization
CREATE POLICY "orgs_user_select_own"
  ON organizations FOR SELECT
  TO authenticated
  USING (id::text = (auth.jwt() -> 'app_metadata' ->> 'organization_id'));

-- =============================================
-- USERS POLICIES
-- =============================================

-- Super admin can do everything
CREATE POLICY "users_super_admin_all"
  ON users FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin');

-- Admins can select users in their organization
CREATE POLICY "users_admin_select"
  ON users FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    AND organization_id::text = (auth.jwt() -> 'app_metadata' ->> 'organization_id')
  );

-- Admins can insert users in their organization
CREATE POLICY "users_admin_insert"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    AND organization_id::text = (auth.jwt() -> 'app_metadata' ->> 'organization_id')
  );

-- Admins can update users in their organization
CREATE POLICY "users_admin_update"
  ON users FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    AND organization_id::text = (auth.jwt() -> 'app_metadata' ->> 'organization_id')
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    AND organization_id::text = (auth.jwt() -> 'app_metadata' ->> 'organization_id')
  );

-- Admins can delete users in their organization
CREATE POLICY "users_admin_delete"
  ON users FOR DELETE
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    AND organization_id::text = (auth.jwt() -> 'app_metadata' ->> 'organization_id')
  );

-- Users can view their own profile
CREATE POLICY "users_select_self"
  ON users FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Users can update their own profile (except role and organization)
CREATE POLICY "users_update_self"
  ON users FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- =============================================
-- SITES POLICIES
-- =============================================

-- Super admin can do everything
CREATE POLICY "sites_super_admin_all"
  ON sites FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin');

-- Admins can manage sites in their organization or organizations they created
CREATE POLICY "sites_admin_all"
  ON sites FOR ALL
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    AND (
      organization_id::text = (auth.jwt() -> 'app_metadata' ->> 'organization_id')
      OR organization_id IN (SELECT id FROM organizations WHERE created_by = auth.uid())
    )
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    AND (
      organization_id::text = (auth.jwt() -> 'app_metadata' ->> 'organization_id')
      OR organization_id IN (SELECT id FROM organizations WHERE created_by = auth.uid())
    )
  );

-- Consultants and readers can view sites in their organization
CREATE POLICY "sites_consultant_reader_select"
  ON sites FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('consultant', 'reader')
    AND organization_id::text = (auth.jwt() -> 'app_metadata' ->> 'organization_id')
  );

-- Consultants can update sites in their organization
CREATE POLICY "sites_consultant_update"
  ON sites FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'consultant'
    AND organization_id::text = (auth.jwt() -> 'app_metadata' ->> 'organization_id')
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'consultant'
    AND organization_id::text = (auth.jwt() -> 'app_metadata' ->> 'organization_id')
  );

-- =============================================
-- USER_SITE_ACCESS POLICIES
-- =============================================

-- Super admin can do everything
CREATE POLICY "usa_super_admin_all"
  ON user_site_access FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin');

-- Admins can manage access for sites in their organization
CREATE POLICY "usa_admin_all"
  ON user_site_access FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Consultants can view their own access
CREATE POLICY "usa_consultant_select"
  ON user_site_access FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('consultant', 'reader')
    AND user_id = auth.uid()
  );

-- =============================================
-- ASSET_CATALOG POLICIES
-- =============================================

-- Super admin can do everything
CREATE POLICY "asset_catalog_super_admin_all"
  ON asset_catalog FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin');

-- All users can view global assets and assets from their organization
CREATE POLICY "asset_catalog_select"
  ON asset_catalog FOR SELECT
  TO authenticated
  USING (
    is_global = true
    OR organization_id::text = (auth.jwt() -> 'app_metadata' ->> 'organization_id')
  );

-- Admins can insert assets
CREATE POLICY "asset_catalog_admin_insert"
  ON asset_catalog FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Admins can update assets they created
CREATE POLICY "asset_catalog_admin_update"
  ON asset_catalog FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    AND created_by = auth.uid()
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    AND created_by = auth.uid()
  );

-- Admins can delete assets they created
CREATE POLICY "asset_catalog_admin_delete"
  ON asset_catalog FOR DELETE
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    AND created_by = auth.uid()
  );

-- =============================================
-- THREAT_CATALOG POLICIES
-- =============================================

-- Super admin can do everything
CREATE POLICY "threat_catalog_super_admin_all"
  ON threat_catalog FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin');

-- All users can view global threats and threats from their organization
CREATE POLICY "threat_catalog_select"
  ON threat_catalog FOR SELECT
  TO authenticated
  USING (
    is_global = true
    OR organization_id::text = (auth.jwt() -> 'app_metadata' ->> 'organization_id')
  );

-- Admins can insert threats
CREATE POLICY "threat_catalog_admin_insert"
  ON threat_catalog FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Admins can update threats they created
CREATE POLICY "threat_catalog_admin_update"
  ON threat_catalog FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    AND created_by = auth.uid()
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    AND created_by = auth.uid()
  );

-- Admins can delete threats they created
CREATE POLICY "threat_catalog_admin_delete"
  ON threat_catalog FOR DELETE
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    AND created_by = auth.uid()
  );

-- =============================================
-- SITE_ASSETS POLICIES
-- =============================================

-- Super admin can do everything
CREATE POLICY "site_assets_super_admin_all"
  ON site_assets FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin');

-- Admins can manage site assets in their organization
CREATE POLICY "site_assets_admin_all"
  ON site_assets FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Consultants can manage site assets
CREATE POLICY "site_assets_consultant_all"
  ON site_assets FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'consultant')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'consultant');

-- Readers can view site assets
CREATE POLICY "site_assets_reader_select"
  ON site_assets FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'reader');

-- =============================================
-- SCENARIOS POLICIES
-- =============================================

-- Super admin can do everything
CREATE POLICY "scenarios_super_admin_all"
  ON scenarios FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin');

-- Admins can manage scenarios
CREATE POLICY "scenarios_admin_all"
  ON scenarios FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Consultants can manage scenarios
CREATE POLICY "scenarios_consultant_all"
  ON scenarios FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'consultant')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'consultant');

-- Readers can view scenarios
CREATE POLICY "scenarios_reader_select"
  ON scenarios FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'reader');

-- =============================================
-- ASSET_THREAT_COMPATIBILITY POLICIES
-- =============================================

-- Super admin can do everything
CREATE POLICY "compatibility_super_admin_all"
  ON asset_threat_compatibility FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin');

-- All users can view global rules and rules from their organization
CREATE POLICY "compatibility_select"
  ON asset_threat_compatibility FOR SELECT
  TO authenticated
  USING (
    is_global = true
    OR organization_id::text = (auth.jwt() -> 'app_metadata' ->> 'organization_id')
  );

-- Admins can insert compatibility rules
CREATE POLICY "compatibility_admin_insert"
  ON asset_threat_compatibility FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
