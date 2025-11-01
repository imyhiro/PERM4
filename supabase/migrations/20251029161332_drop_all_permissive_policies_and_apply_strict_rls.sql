/*
  # Drop All Policies and Recreate with JWT-Only Approach
  
  ## Problem
  All existing RLS policies query public.users table, causing infinite recursion
  and "permission denied" errors. This is because RLS on users prevents access
  to users from within other RLS policies.
  
  ## Solution
  Use ONLY auth.jwt() to read role and organization_id from JWT token.
  NEVER query public.users from ANY RLS policy.
  
  ## Critical Change
  Users must have their role and organization_id stored in raw_app_meta_data:
  - auth.jwt()->>'role'
  - auth.jwt()->>'organization_id'
  
  ## Security Model
  - Super admins: Can access everything
  - Admins: Can access their organization's data  
  - Consultants: Can access assigned sites
  - Readers: Can view assigned sites (read-only)
*/

-- =============================================
-- DROP ALL EXISTING POLICIES
-- =============================================

-- Drop organizations policies
DROP POLICY IF EXISTS "Super admins can manage all organizations" ON organizations;
DROP POLICY IF EXISTS "Super admins can view all organizations" ON organizations;
DROP POLICY IF EXISTS "Super admins can insert organizations" ON organizations;
DROP POLICY IF EXISTS "Super admins can update all organizations" ON organizations;
DROP POLICY IF EXISTS "Super admins can delete organizations" ON organizations;
DROP POLICY IF EXISTS "Users can view their own organization" ON organizations;
DROP POLICY IF EXISTS "Admins can view organizations they created" ON organizations;
DROP POLICY IF EXISTS "Admins can insert organizations" ON organizations;
DROP POLICY IF EXISTS "Admins can update organizations they created" ON organizations;
DROP POLICY IF EXISTS "Admins can delete organizations they created" ON organizations;
DROP POLICY IF EXISTS "Consultants and readers can view their organization" ON organizations;

-- Drop users policies
DROP POLICY IF EXISTS "Super admins can manage all users" ON users;
DROP POLICY IF EXISTS "Super admins can view all users" ON users;
DROP POLICY IF EXISTS "Super admins can insert users" ON users;
DROP POLICY IF EXISTS "Super admins can update all users" ON users;
DROP POLICY IF EXISTS "Super admins can delete users" ON users;
DROP POLICY IF EXISTS "Admins can manage users in their organization" ON users;
DROP POLICY IF EXISTS "Admins can view users in their organizations" ON users;
DROP POLICY IF EXISTS "Admins can update users in their organizations" ON users;
DROP POLICY IF EXISTS "Admins can delete users in their organizations" ON users;
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
DROP POLICY IF EXISTS "Consultants can view readers assigned to their sites" ON users;
DROP POLICY IF EXISTS "Consultants can insert reader users" ON users;
DROP POLICY IF EXISTS "Consultants can update readers assigned to their sites" ON users;
DROP POLICY IF EXISTS "Consultants can delete readers assigned to their sites" ON users;

-- Drop sites policies
DROP POLICY IF EXISTS "Super admins can manage all sites" ON sites;
DROP POLICY IF EXISTS "Admins can manage sites in their organization" ON sites;
DROP POLICY IF EXISTS "Consultants can view assigned sites" ON sites;
DROP POLICY IF EXISTS "Consultants can update assigned sites" ON sites;
DROP POLICY IF EXISTS "Readers can view assigned sites" ON sites;

-- Drop user_site_access policies
DROP POLICY IF EXISTS "Super admins can manage all site access" ON user_site_access;
DROP POLICY IF EXISTS "Admins can manage site access in their organization" ON user_site_access;
DROP POLICY IF EXISTS "Consultants can manage site access for their sites" ON user_site_access;

-- Drop asset_catalog policies
DROP POLICY IF EXISTS "Super admins can manage all assets" ON asset_catalog;
DROP POLICY IF EXISTS "Users can view global and their org assets" ON asset_catalog;
DROP POLICY IF EXISTS "Admins and consultants can create org assets" ON asset_catalog;
DROP POLICY IF EXISTS "Admins and consultants can update org assets" ON asset_catalog;

-- Drop threat_catalog policies
DROP POLICY IF EXISTS "Super admins can manage all threats" ON threat_catalog;
DROP POLICY IF EXISTS "Users can view global and their org threats" ON threat_catalog;
DROP POLICY IF EXISTS "Admins and consultants can create org threats" ON threat_catalog;
DROP POLICY IF EXISTS "Admins and consultants can update org threats" ON threat_catalog;

-- Drop asset_threat_compatibility policies
DROP POLICY IF EXISTS "Super admins can manage all compatibility rules" ON asset_threat_compatibility;
DROP POLICY IF EXISTS "Users can view global and their org compatibility rules" ON asset_threat_compatibility;
DROP POLICY IF EXISTS "Admins and consultants can create org compatibility rules" ON asset_threat_compatibility;

-- Drop site_assets policies
DROP POLICY IF EXISTS "Super admins can manage all site assets" ON site_assets;
DROP POLICY IF EXISTS "Admins can manage site assets in their organization" ON site_assets;
DROP POLICY IF EXISTS "Consultants can manage site assets for assigned sites" ON site_assets;
DROP POLICY IF EXISTS "Readers can view site assets for assigned sites" ON site_assets;

-- Drop scenarios policies
DROP POLICY IF EXISTS "Super admins can manage all scenarios" ON scenarios;
DROP POLICY IF EXISTS "Admins can manage scenarios in their organization" ON scenarios;
DROP POLICY IF EXISTS "Consultants can manage scenarios for assigned sites" ON scenarios;
DROP POLICY IF EXISTS "Readers can view scenarios for assigned sites" ON scenarios;

-- =============================================
-- USERS TABLE - SIMPLEST POLICIES
-- =============================================

-- Own profile access (NO JWT check needed)
CREATE POLICY "users_select_own"
  ON users FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "users_update_own"
  ON users FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "users_insert_own"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- Super admin full access
CREATE POLICY "users_super_admin_all"
  ON users FOR ALL
  TO authenticated
  USING ((auth.jwt()->>'role') = 'super_admin')
  WITH CHECK ((auth.jwt()->>'role') = 'super_admin');

-- Admins can manage users in their organization
CREATE POLICY "users_admin_select"
  ON users FOR SELECT
  TO authenticated
  USING (
    (auth.jwt()->>'role') = 'admin'
    AND organization_id::text = (auth.jwt()->>'organization_id')
  );

CREATE POLICY "users_admin_insert"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt()->>'role') = 'admin'
    AND organization_id::text = (auth.jwt()->>'organization_id')
  );

CREATE POLICY "users_admin_update"
  ON users FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt()->>'role') = 'admin'
    AND organization_id::text = (auth.jwt()->>'organization_id')
  )
  WITH CHECK (
    (auth.jwt()->>'role') = 'admin'
    AND organization_id::text = (auth.jwt()->>'organization_id')
  );

CREATE POLICY "users_admin_delete"
  ON users FOR DELETE
  TO authenticated
  USING (
    (auth.jwt()->>'role') = 'admin'
    AND organization_id::text = (auth.jwt()->>'organization_id')
  );

-- =============================================
-- ORGANIZATIONS TABLE
-- =============================================

CREATE POLICY "orgs_super_admin_all"
  ON organizations FOR ALL
  TO authenticated
  USING ((auth.jwt()->>'role') = 'super_admin')
  WITH CHECK ((auth.jwt()->>'role') = 'super_admin');

CREATE POLICY "orgs_select_own"
  ON organizations FOR SELECT
  TO authenticated
  USING (id::text = (auth.jwt()->>'organization_id'));

CREATE POLICY "orgs_admin_select_created"
  ON organizations FOR SELECT
  TO authenticated
  USING (
    (auth.jwt()->>'role') = 'admin'
    AND created_by = auth.uid()
  );

-- =============================================
-- SITES TABLE
-- =============================================

CREATE POLICY "sites_super_admin_all"
  ON sites FOR ALL
  TO authenticated
  USING ((auth.jwt()->>'role') = 'super_admin')
  WITH CHECK ((auth.jwt()->>'role') = 'super_admin');

CREATE POLICY "sites_admin_all"
  ON sites FOR ALL
  TO authenticated
  USING (
    (auth.jwt()->>'role') = 'admin'
    AND organization_id::text = (auth.jwt()->>'organization_id')
  )
  WITH CHECK (
    (auth.jwt()->>'role') = 'admin'
    AND organization_id::text = (auth.jwt()->>'organization_id')
  );

CREATE POLICY "sites_consultant_select"
  ON sites FOR SELECT
  TO authenticated
  USING (
    (auth.jwt()->>'role') IN ('consultant', 'reader')
    AND (
      id IN (SELECT site_id FROM user_site_access WHERE user_id = auth.uid())
      OR organization_id::text = (auth.jwt()->>'organization_id')
    )
  );

CREATE POLICY "sites_consultant_update"
  ON sites FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt()->>'role') = 'consultant'
    AND id IN (SELECT site_id FROM user_site_access WHERE user_id = auth.uid())
  )
  WITH CHECK (
    (auth.jwt()->>'role') = 'consultant'
    AND id IN (SELECT site_id FROM user_site_access WHERE user_id = auth.uid())
  );

-- =============================================
-- USER_SITE_ACCESS TABLE
-- =============================================

CREATE POLICY "usa_super_admin_all"
  ON user_site_access FOR ALL
  TO authenticated
  USING ((auth.jwt()->>'role') = 'super_admin')
  WITH CHECK ((auth.jwt()->>'role') = 'super_admin');

CREATE POLICY "usa_admin_all"
  ON user_site_access FOR ALL
  TO authenticated
  USING (
    (auth.jwt()->>'role') = 'admin'
    AND site_id IN (
      SELECT id FROM sites WHERE organization_id::text = (auth.jwt()->>'organization_id')
    )
  )
  WITH CHECK (
    (auth.jwt()->>'role') = 'admin'
    AND site_id IN (
      SELECT id FROM sites WHERE organization_id::text = (auth.jwt()->>'organization_id')
    )
  );

CREATE POLICY "usa_consultant_all"
  ON user_site_access FOR ALL
  TO authenticated
  USING (
    (auth.jwt()->>'role') = 'consultant'
    AND site_id IN (SELECT site_id FROM user_site_access WHERE user_id = auth.uid())
  )
  WITH CHECK (
    (auth.jwt()->>'role') = 'consultant'
    AND site_id IN (SELECT site_id FROM user_site_access WHERE user_id = auth.uid())
  );

-- =============================================
-- ASSET_CATALOG TABLE
-- =============================================

CREATE POLICY "assets_super_admin_all"
  ON asset_catalog FOR ALL
  TO authenticated
  USING ((auth.jwt()->>'role') = 'super_admin')
  WITH CHECK ((auth.jwt()->>'role') = 'super_admin');

CREATE POLICY "assets_select_global_or_own_org"
  ON asset_catalog FOR SELECT
  TO authenticated
  USING (
    is_global = true 
    OR organization_id::text = (auth.jwt()->>'organization_id')
  );

CREATE POLICY "assets_admin_consultant_insert"
  ON asset_catalog FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt()->>'role') IN ('admin', 'consultant')
    AND organization_id::text = (auth.jwt()->>'organization_id')
  );

CREATE POLICY "assets_admin_consultant_update"
  ON asset_catalog FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt()->>'role') IN ('admin', 'consultant')
    AND organization_id::text = (auth.jwt()->>'organization_id')
  )
  WITH CHECK (
    (auth.jwt()->>'role') IN ('admin', 'consultant')
    AND organization_id::text = (auth.jwt()->>'organization_id')
  );

-- =============================================
-- THREAT_CATALOG TABLE
-- =============================================

CREATE POLICY "threats_super_admin_all"
  ON threat_catalog FOR ALL
  TO authenticated
  USING ((auth.jwt()->>'role') = 'super_admin')
  WITH CHECK ((auth.jwt()->>'role') = 'super_admin');

CREATE POLICY "threats_select_global_or_own_org"
  ON threat_catalog FOR SELECT
  TO authenticated
  USING (
    is_global = true 
    OR organization_id::text = (auth.jwt()->>'organization_id')
  );

CREATE POLICY "threats_admin_consultant_insert"
  ON threat_catalog FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt()->>'role') IN ('admin', 'consultant')
    AND organization_id::text = (auth.jwt()->>'organization_id')
  );

CREATE POLICY "threats_admin_consultant_update"
  ON threat_catalog FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt()->>'role') IN ('admin', 'consultant')
    AND organization_id::text = (auth.jwt()->>'organization_id')
  )
  WITH CHECK (
    (auth.jwt()->>'role') IN ('admin', 'consultant')
    AND organization_id::text = (auth.jwt()->>'organization_id')
  );

-- =============================================
-- ASSET_THREAT_COMPATIBILITY TABLE
-- =============================================

CREATE POLICY "compat_super_admin_all"
  ON asset_threat_compatibility FOR ALL
  TO authenticated
  USING ((auth.jwt()->>'role') = 'super_admin')
  WITH CHECK ((auth.jwt()->>'role') = 'super_admin');

CREATE POLICY "compat_select_global_or_own_org"
  ON asset_threat_compatibility FOR SELECT
  TO authenticated
  USING (
    is_global = true 
    OR organization_id::text = (auth.jwt()->>'organization_id')
  );

CREATE POLICY "compat_admin_consultant_insert"
  ON asset_threat_compatibility FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt()->>'role') IN ('admin', 'consultant')
    AND organization_id::text = (auth.jwt()->>'organization_id')
  );

-- =============================================
-- SITE_ASSETS TABLE
-- =============================================

CREATE POLICY "site_assets_super_admin_all"
  ON site_assets FOR ALL
  TO authenticated
  USING ((auth.jwt()->>'role') = 'super_admin')
  WITH CHECK ((auth.jwt()->>'role') = 'super_admin');

CREATE POLICY "site_assets_admin_all"
  ON site_assets FOR ALL
  TO authenticated
  USING (
    (auth.jwt()->>'role') = 'admin'
    AND site_id IN (
      SELECT id FROM sites WHERE organization_id::text = (auth.jwt()->>'organization_id')
    )
  )
  WITH CHECK (
    (auth.jwt()->>'role') = 'admin'
    AND site_id IN (
      SELECT id FROM sites WHERE organization_id::text = (auth.jwt()->>'organization_id')
    )
  );

CREATE POLICY "site_assets_consultant_all"
  ON site_assets FOR ALL
  TO authenticated
  USING (
    (auth.jwt()->>'role') = 'consultant'
    AND site_id IN (SELECT site_id FROM user_site_access WHERE user_id = auth.uid())
  )
  WITH CHECK (
    (auth.jwt()->>'role') = 'consultant'
    AND site_id IN (SELECT site_id FROM user_site_access WHERE user_id = auth.uid())
  );

CREATE POLICY "site_assets_reader_select"
  ON site_assets FOR SELECT
  TO authenticated
  USING (
    (auth.jwt()->>'role') = 'reader'
    AND site_id IN (SELECT site_id FROM user_site_access WHERE user_id = auth.uid())
  );

-- =============================================
-- SCENARIOS TABLE
-- =============================================

CREATE POLICY "scenarios_super_admin_all"
  ON scenarios FOR ALL
  TO authenticated
  USING ((auth.jwt()->>'role') = 'super_admin')
  WITH CHECK ((auth.jwt()->>'role') = 'super_admin');

CREATE POLICY "scenarios_admin_all"
  ON scenarios FOR ALL
  TO authenticated
  USING (
    (auth.jwt()->>'role') = 'admin'
    AND site_id IN (
      SELECT id FROM sites WHERE organization_id::text = (auth.jwt()->>'organization_id')
    )
  )
  WITH CHECK (
    (auth.jwt()->>'role') = 'admin'
    AND site_id IN (
      SELECT id FROM sites WHERE organization_id::text = (auth.jwt()->>'organization_id')
    )
  );

CREATE POLICY "scenarios_consultant_all"
  ON scenarios FOR ALL
  TO authenticated
  USING (
    (auth.jwt()->>'role') = 'consultant'
    AND site_id IN (SELECT site_id FROM user_site_access WHERE user_id = auth.uid())
  )
  WITH CHECK (
    (auth.jwt()->>'role') = 'consultant'
    AND site_id IN (SELECT site_id FROM user_site_access WHERE user_id = auth.uid())
  );

CREATE POLICY "scenarios_reader_select"
  ON scenarios FOR SELECT
  TO authenticated
  USING (
    (auth.jwt()->>'role') = 'reader'
    AND site_id IN (SELECT site_id FROM user_site_access WHERE user_id = auth.uid())
  );
