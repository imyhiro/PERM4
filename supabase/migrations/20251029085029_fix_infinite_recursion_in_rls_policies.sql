/*
  # Fix Infinite Recursion in RLS Policies

  ## Problem
  Policies that query the same table they're protecting cause infinite recursion.
  Example: users table policies that do `SELECT organization_id FROM users WHERE id = auth.uid()`
  
  ## Solution
  - Use SECURITY DEFINER functions to bypass RLS when needed
  - Cache organization_id in a function
  - Simplify policy logic to avoid self-referencing queries
  
  ## Changes
  1. Create helper function to get current user's organization_id
  2. Recreate all policies using these helpers to avoid recursion
*/

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Function to get current user's organization (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_user_organization_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM public.users WHERE id = auth.uid();
$$;

-- =============================================
-- ORGANIZATIONS TABLE - Fix Recursion
-- =============================================

DROP POLICY IF EXISTS "Super admins can view all organizations" ON organizations;
DROP POLICY IF EXISTS "Admins can view own organization" ON organizations;
DROP POLICY IF EXISTS "Super admins can insert organizations" ON organizations;
DROP POLICY IF EXISTS "Super admins can update organizations" ON organizations;
DROP POLICY IF EXISTS "Super admins can delete organizations" ON organizations;

CREATE POLICY "Super admins can view all organizations"
  ON organizations FOR SELECT
  TO authenticated
  USING (get_user_role() = 'super_admin');

CREATE POLICY "Admins can view own organization"
  ON organizations FOR SELECT
  TO authenticated
  USING (
    get_user_role() = 'admin'
    AND id = get_user_organization_id()
  );

CREATE POLICY "Super admins can insert organizations"
  ON organizations FOR INSERT
  TO authenticated
  WITH CHECK (get_user_role() = 'super_admin');

CREATE POLICY "Super admins can update organizations"
  ON organizations FOR UPDATE
  TO authenticated
  USING (get_user_role() = 'super_admin');

CREATE POLICY "Super admins can delete organizations"
  ON organizations FOR DELETE
  TO authenticated
  USING (get_user_role() = 'super_admin');

-- =============================================
-- USERS TABLE - Fix Recursion
-- =============================================

DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Super admins can view all users" ON users;
DROP POLICY IF EXISTS "Admins can view users in their organization" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Super admins can update all users" ON users;
DROP POLICY IF EXISTS "Admins can update users in their organization" ON users;
DROP POLICY IF EXISTS "Super admins can delete users" ON users;
DROP POLICY IF EXISTS "Admins can delete users in their organization" ON users;

CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Super admins can view all users"
  ON users FOR SELECT
  TO authenticated
  USING (get_user_role() = 'super_admin');

CREATE POLICY "Admins can view users in their organization"
  ON users FOR SELECT
  TO authenticated
  USING (
    get_user_role() = 'admin'
    AND organization_id = get_user_organization_id()
  );

CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Super admins can update all users"
  ON users FOR UPDATE
  TO authenticated
  USING (get_user_role() = 'super_admin');

CREATE POLICY "Admins can update users in their organization"
  ON users FOR UPDATE
  TO authenticated
  USING (
    get_user_role() = 'admin'
    AND organization_id = get_user_organization_id()
    AND role != 'super_admin'
  );

CREATE POLICY "Super admins can delete users"
  ON users FOR DELETE
  TO authenticated
  USING (get_user_role() = 'super_admin');

CREATE POLICY "Admins can delete users in their organization"
  ON users FOR DELETE
  TO authenticated
  USING (
    get_user_role() = 'admin'
    AND organization_id = get_user_organization_id()
    AND role != 'super_admin'
    AND role != 'admin'
  );

-- =============================================
-- SITES TABLE - Fix Recursion
-- =============================================

DROP POLICY IF EXISTS "Super admins can view all sites" ON sites;
DROP POLICY IF EXISTS "Admins can view sites in their organization" ON sites;
DROP POLICY IF EXISTS "Consultants can view assigned sites" ON sites;
DROP POLICY IF EXISTS "Readers can view assigned sites" ON sites;
DROP POLICY IF EXISTS "Super admins can insert sites" ON sites;
DROP POLICY IF EXISTS "Admins can insert sites in their organization" ON sites;
DROP POLICY IF EXISTS "Super admins can update sites" ON sites;
DROP POLICY IF EXISTS "Admins can update sites in their organization" ON sites;
DROP POLICY IF EXISTS "Super admins can delete sites" ON sites;
DROP POLICY IF EXISTS "Admins can delete sites in their organization" ON sites;

CREATE POLICY "Super admins can view all sites"
  ON sites FOR SELECT
  TO authenticated
  USING (get_user_role() = 'super_admin');

CREATE POLICY "Admins can view sites in their organization"
  ON sites FOR SELECT
  TO authenticated
  USING (
    get_user_role() = 'admin'
    AND organization_id = get_user_organization_id()
  );

CREATE POLICY "Consultants can view assigned sites"
  ON sites FOR SELECT
  TO authenticated
  USING (
    get_user_role() = 'consultant'
    AND EXISTS (
      SELECT 1 FROM user_site_access
      WHERE user_site_access.user_id = auth.uid()
      AND user_site_access.site_id = sites.id
    )
  );

CREATE POLICY "Readers can view assigned sites"
  ON sites FOR SELECT
  TO authenticated
  USING (
    get_user_role() = 'reader'
    AND EXISTS (
      SELECT 1 FROM user_site_access
      WHERE user_site_access.user_id = auth.uid()
      AND user_site_access.site_id = sites.id
    )
  );

CREATE POLICY "Super admins can insert sites"
  ON sites FOR INSERT
  TO authenticated
  WITH CHECK (get_user_role() = 'super_admin');

CREATE POLICY "Admins can insert sites in their organization"
  ON sites FOR INSERT
  TO authenticated
  WITH CHECK (
    get_user_role() = 'admin'
    AND organization_id = get_user_organization_id()
  );

CREATE POLICY "Super admins can update sites"
  ON sites FOR UPDATE
  TO authenticated
  USING (get_user_role() = 'super_admin');

CREATE POLICY "Admins can update sites in their organization"
  ON sites FOR UPDATE
  TO authenticated
  USING (
    get_user_role() = 'admin'
    AND organization_id = get_user_organization_id()
  );

CREATE POLICY "Super admins can delete sites"
  ON sites FOR DELETE
  TO authenticated
  USING (get_user_role() = 'super_admin');

CREATE POLICY "Admins can delete sites in their organization"
  ON sites FOR DELETE
  TO authenticated
  USING (
    get_user_role() = 'admin'
    AND organization_id = get_user_organization_id()
  );

-- =============================================
-- ASSETS TABLE - Fix Recursion
-- =============================================

DROP POLICY IF EXISTS "Super admins can view all assets" ON assets;
DROP POLICY IF EXISTS "Admins can view assets in their organization" ON assets;
DROP POLICY IF EXISTS "Consultants can view assets for assigned sites" ON assets;
DROP POLICY IF EXISTS "Readers can view assets for assigned sites" ON assets;
DROP POLICY IF EXISTS "Super admins can insert assets" ON assets;
DROP POLICY IF EXISTS "Admins can insert assets in their organization" ON assets;
DROP POLICY IF EXISTS "Consultants can insert assets for assigned sites" ON assets;
DROP POLICY IF EXISTS "Super admins can update assets" ON assets;
DROP POLICY IF EXISTS "Admins can update assets in their organization" ON assets;
DROP POLICY IF EXISTS "Consultants can update assets for assigned sites" ON assets;
DROP POLICY IF EXISTS "Super admins can delete assets" ON assets;
DROP POLICY IF EXISTS "Admins can delete assets in their organization" ON assets;

CREATE POLICY "Super admins can view all assets"
  ON assets FOR SELECT
  TO authenticated
  USING (get_user_role() = 'super_admin');

CREATE POLICY "Admins can view assets in their organization"
  ON assets FOR SELECT
  TO authenticated
  USING (
    get_user_role() = 'admin'
    AND EXISTS (
      SELECT 1 FROM sites
      WHERE sites.id = assets.site_id
      AND sites.organization_id = get_user_organization_id()
    )
  );

CREATE POLICY "Consultants can view assets for assigned sites"
  ON assets FOR SELECT
  TO authenticated
  USING (
    get_user_role() = 'consultant'
    AND EXISTS (
      SELECT 1 FROM user_site_access
      WHERE user_site_access.user_id = auth.uid()
      AND user_site_access.site_id = assets.site_id
    )
  );

CREATE POLICY "Readers can view assets for assigned sites"
  ON assets FOR SELECT
  TO authenticated
  USING (
    get_user_role() = 'reader'
    AND EXISTS (
      SELECT 1 FROM user_site_access
      WHERE user_site_access.user_id = auth.uid()
      AND user_site_access.site_id = assets.site_id
    )
  );

CREATE POLICY "Super admins can insert assets"
  ON assets FOR INSERT
  TO authenticated
  WITH CHECK (get_user_role() = 'super_admin');

CREATE POLICY "Admins can insert assets in their organization"
  ON assets FOR INSERT
  TO authenticated
  WITH CHECK (
    get_user_role() = 'admin'
    AND EXISTS (
      SELECT 1 FROM sites
      WHERE sites.id = assets.site_id
      AND sites.organization_id = get_user_organization_id()
    )
  );

CREATE POLICY "Consultants can insert assets for assigned sites"
  ON assets FOR INSERT
  TO authenticated
  WITH CHECK (
    get_user_role() = 'consultant'
    AND EXISTS (
      SELECT 1 FROM user_site_access
      WHERE user_site_access.user_id = auth.uid()
      AND user_site_access.site_id = assets.site_id
    )
  );

CREATE POLICY "Super admins can update assets"
  ON assets FOR UPDATE
  TO authenticated
  USING (get_user_role() = 'super_admin');

CREATE POLICY "Admins can update assets in their organization"
  ON assets FOR UPDATE
  TO authenticated
  USING (
    get_user_role() = 'admin'
    AND EXISTS (
      SELECT 1 FROM sites
      WHERE sites.id = assets.site_id
      AND sites.organization_id = get_user_organization_id()
    )
  );

CREATE POLICY "Consultants can update assets for assigned sites"
  ON assets FOR UPDATE
  TO authenticated
  USING (
    get_user_role() = 'consultant'
    AND EXISTS (
      SELECT 1 FROM user_site_access
      WHERE user_site_access.user_id = auth.uid()
      AND user_site_access.site_id = assets.site_id
    )
  );

CREATE POLICY "Super admins can delete assets"
  ON assets FOR DELETE
  TO authenticated
  USING (get_user_role() = 'super_admin');

CREATE POLICY "Admins can delete assets in their organization"
  ON assets FOR DELETE
  TO authenticated
  USING (
    get_user_role() = 'admin'
    AND EXISTS (
      SELECT 1 FROM sites
      WHERE sites.id = assets.site_id
      AND sites.organization_id = get_user_organization_id()
    )
  );

-- =============================================
-- THREATS TABLE - Fix Recursion
-- =============================================

DROP POLICY IF EXISTS "Super admins can view all threats" ON threats;
DROP POLICY IF EXISTS "Admins can view threats in their organization" ON threats;
DROP POLICY IF EXISTS "Consultants can view threats for assigned sites" ON threats;
DROP POLICY IF EXISTS "Readers can view threats for assigned sites" ON threats;
DROP POLICY IF EXISTS "Super admins can insert threats" ON threats;
DROP POLICY IF EXISTS "Admins can insert threats in their organization" ON threats;
DROP POLICY IF EXISTS "Consultants can insert threats for assigned sites" ON threats;
DROP POLICY IF EXISTS "Super admins can update threats" ON threats;
DROP POLICY IF EXISTS "Admins can update threats in their organization" ON threats;
DROP POLICY IF EXISTS "Consultants can update threats for assigned sites" ON threats;
DROP POLICY IF EXISTS "Super admins can delete threats" ON threats;
DROP POLICY IF EXISTS "Admins can delete threats in their organization" ON threats;

CREATE POLICY "Super admins can view all threats"
  ON threats FOR SELECT
  TO authenticated
  USING (get_user_role() = 'super_admin');

CREATE POLICY "Admins can view threats in their organization"
  ON threats FOR SELECT
  TO authenticated
  USING (
    get_user_role() = 'admin'
    AND EXISTS (
      SELECT 1 FROM sites
      WHERE sites.id = threats.site_id
      AND sites.organization_id = get_user_organization_id()
    )
  );

CREATE POLICY "Consultants can view threats for assigned sites"
  ON threats FOR SELECT
  TO authenticated
  USING (
    get_user_role() = 'consultant'
    AND EXISTS (
      SELECT 1 FROM user_site_access
      WHERE user_site_access.user_id = auth.uid()
      AND user_site_access.site_id = threats.site_id
    )
  );

CREATE POLICY "Readers can view threats for assigned sites"
  ON threats FOR SELECT
  TO authenticated
  USING (
    get_user_role() = 'reader'
    AND EXISTS (
      SELECT 1 FROM user_site_access
      WHERE user_site_access.user_id = auth.uid()
      AND user_site_access.site_id = threats.site_id
    )
  );

CREATE POLICY "Super admins can insert threats"
  ON threats FOR INSERT
  TO authenticated
  WITH CHECK (get_user_role() = 'super_admin');

CREATE POLICY "Admins can insert threats in their organization"
  ON threats FOR INSERT
  TO authenticated
  WITH CHECK (
    get_user_role() = 'admin'
    AND EXISTS (
      SELECT 1 FROM sites
      WHERE sites.id = threats.site_id
      AND sites.organization_id = get_user_organization_id()
    )
  );

CREATE POLICY "Consultants can insert threats for assigned sites"
  ON threats FOR INSERT
  TO authenticated
  WITH CHECK (
    get_user_role() = 'consultant'
    AND EXISTS (
      SELECT 1 FROM user_site_access
      WHERE user_site_access.user_id = auth.uid()
      AND user_site_access.site_id = threats.site_id
    )
  );

CREATE POLICY "Super admins can update threats"
  ON threats FOR UPDATE
  TO authenticated
  USING (get_user_role() = 'super_admin');

CREATE POLICY "Admins can update threats in their organization"
  ON threats FOR UPDATE
  TO authenticated
  USING (
    get_user_role() = 'admin'
    AND EXISTS (
      SELECT 1 FROM sites
      WHERE sites.id = threats.site_id
      AND sites.organization_id = get_user_organization_id()
    )
  );

CREATE POLICY "Consultants can update threats for assigned sites"
  ON threats FOR UPDATE
  TO authenticated
  USING (
    get_user_role() = 'consultant'
    AND EXISTS (
      SELECT 1 FROM user_site_access
      WHERE user_site_access.user_id = auth.uid()
      AND user_site_access.site_id = threats.site_id
    )
  );

CREATE POLICY "Super admins can delete threats"
  ON threats FOR DELETE
  TO authenticated
  USING (get_user_role() = 'super_admin');

CREATE POLICY "Admins can delete threats in their organization"
  ON threats FOR DELETE
  TO authenticated
  USING (
    get_user_role() = 'admin'
    AND EXISTS (
      SELECT 1 FROM sites
      WHERE sites.id = threats.site_id
      AND sites.organization_id = get_user_organization_id()
    )
  );

-- =============================================
-- USER SITE ACCESS TABLE - Fix Recursion
-- =============================================

DROP POLICY IF EXISTS "Super admins can view all site access" ON user_site_access;
DROP POLICY IF EXISTS "Admins can view site access in their organization" ON user_site_access;
DROP POLICY IF EXISTS "Users can view own site access" ON user_site_access;
DROP POLICY IF EXISTS "Super admins can insert site access" ON user_site_access;
DROP POLICY IF EXISTS "Admins can insert site access in their organization" ON user_site_access;
DROP POLICY IF EXISTS "Super admins can delete site access" ON user_site_access;
DROP POLICY IF EXISTS "Admins can delete site access in their organization" ON user_site_access;

CREATE POLICY "Super admins can view all site access"
  ON user_site_access FOR SELECT
  TO authenticated
  USING (get_user_role() = 'super_admin');

CREATE POLICY "Admins can view site access in their organization"
  ON user_site_access FOR SELECT
  TO authenticated
  USING (
    get_user_role() = 'admin'
    AND EXISTS (
      SELECT 1 FROM sites
      WHERE sites.id = user_site_access.site_id
      AND sites.organization_id = get_user_organization_id()
    )
  );

CREATE POLICY "Users can view own site access"
  ON user_site_access FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Super admins can insert site access"
  ON user_site_access FOR INSERT
  TO authenticated
  WITH CHECK (get_user_role() = 'super_admin');

CREATE POLICY "Admins can insert site access in their organization"
  ON user_site_access FOR INSERT
  TO authenticated
  WITH CHECK (
    get_user_role() = 'admin'
    AND EXISTS (
      SELECT 1 FROM sites
      WHERE sites.id = user_site_access.site_id
      AND sites.organization_id = get_user_organization_id()
    )
  );

CREATE POLICY "Super admins can delete site access"
  ON user_site_access FOR DELETE
  TO authenticated
  USING (get_user_role() = 'super_admin');

CREATE POLICY "Admins can delete site access in their organization"
  ON user_site_access FOR DELETE
  TO authenticated
  USING (
    get_user_role() = 'admin'
    AND EXISTS (
      SELECT 1 FROM sites
      WHERE sites.id = user_site_access.site_id
      AND sites.organization_id = get_user_organization_id()
    )
  );
