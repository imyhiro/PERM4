/*
  # Eliminate All Cross-Table Recursion in RLS

  ## Problem
  Policies that reference other tables (even through SECURITY DEFINER functions) 
  can cause recursion when those tables also have RLS enabled.
  
  Example: assets policies query sites -> sites policies query users -> infinite loop
  
  ## Solution
  - Disable RLS temporarily on tables that are only used as lookup tables in policies
  - Use SECURITY DEFINER functions that explicitly SET search_path and bypass RLS
  - Simplify policy logic to minimize cross-table dependencies
  
  ## Changes
  1. Update helper functions to be more robust
  2. Temporarily disable RLS on helper queries
  3. Recreate all policies with simpler, non-recursive logic
*/

-- =============================================
-- DROP ALL EXISTING POLICIES FIRST
-- =============================================

-- Organizations
DROP POLICY IF EXISTS "Super admins can view all organizations" ON organizations;
DROP POLICY IF EXISTS "Admins can view own organization" ON organizations;
DROP POLICY IF EXISTS "Super admins can insert organizations" ON organizations;
DROP POLICY IF EXISTS "Super admins can update organizations" ON organizations;
DROP POLICY IF EXISTS "Super admins can delete organizations" ON organizations;

-- Users
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Super admins can view all users" ON users;
DROP POLICY IF EXISTS "Admins can view users in their organization" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Super admins can update all users" ON users;
DROP POLICY IF EXISTS "Admins can update users in their organization" ON users;
DROP POLICY IF EXISTS "Super admins can delete users" ON users;
DROP POLICY IF EXISTS "Admins can delete users in their organization" ON users;

-- Sites
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

-- Assets
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

-- Threats
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

-- User Site Access
DROP POLICY IF EXISTS "Super admins can view all site access" ON user_site_access;
DROP POLICY IF EXISTS "Admins can view site access in their organization" ON user_site_access;
DROP POLICY IF EXISTS "Users can view own site access" ON user_site_access;
DROP POLICY IF EXISTS "Super admins can insert site access" ON user_site_access;
DROP POLICY IF EXISTS "Admins can insert site access in their organization" ON user_site_access;
DROP POLICY IF EXISTS "Super admins can delete site access" ON user_site_access;
DROP POLICY IF EXISTS "Admins can delete site access in their organization" ON user_site_access;

-- =============================================
-- IMPROVED HELPER FUNCTIONS
-- =============================================

-- Get site's organization_id (bypasses RLS completely)
CREATE OR REPLACE FUNCTION public.get_site_organization_id(site_uuid uuid)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  org_id uuid;
BEGIN
  SELECT organization_id INTO org_id FROM public.sites WHERE id = site_uuid;
  RETURN org_id;
END;
$$;

-- Check if user has access to a site (bypasses RLS)
CREATE OR REPLACE FUNCTION public.user_has_site_access(site_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_site_access 
    WHERE user_id = auth.uid() AND site_id = site_uuid
  );
END;
$$;

-- =============================================
-- ORGANIZATIONS - Simple policies
-- =============================================

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
-- USERS - Simple policies
-- =============================================

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
-- SITES - Simple policies (no recursion)
-- =============================================

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
    AND user_has_site_access(id)
  );

CREATE POLICY "Readers can view assigned sites"
  ON sites FOR SELECT
  TO authenticated
  USING (
    get_user_role() = 'reader'
    AND user_has_site_access(id)
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
-- ASSETS - No cross-table queries
-- =============================================

CREATE POLICY "Super admins can view all assets"
  ON assets FOR SELECT
  TO authenticated
  USING (get_user_role() = 'super_admin');

CREATE POLICY "Admins can view assets in their organization"
  ON assets FOR SELECT
  TO authenticated
  USING (
    get_user_role() = 'admin'
    AND get_site_organization_id(site_id) = get_user_organization_id()
  );

CREATE POLICY "Consultants can view assets for assigned sites"
  ON assets FOR SELECT
  TO authenticated
  USING (
    get_user_role() = 'consultant'
    AND user_has_site_access(site_id)
  );

CREATE POLICY "Readers can view assets for assigned sites"
  ON assets FOR SELECT
  TO authenticated
  USING (
    get_user_role() = 'reader'
    AND user_has_site_access(site_id)
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
    AND get_site_organization_id(site_id) = get_user_organization_id()
  );

CREATE POLICY "Consultants can insert assets for assigned sites"
  ON assets FOR INSERT
  TO authenticated
  WITH CHECK (
    get_user_role() = 'consultant'
    AND user_has_site_access(site_id)
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
    AND get_site_organization_id(site_id) = get_user_organization_id()
  );

CREATE POLICY "Consultants can update assets for assigned sites"
  ON assets FOR UPDATE
  TO authenticated
  USING (
    get_user_role() = 'consultant'
    AND user_has_site_access(site_id)
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
    AND get_site_organization_id(site_id) = get_user_organization_id()
  );

-- =============================================
-- THREATS - No cross-table queries
-- =============================================

CREATE POLICY "Super admins can view all threats"
  ON threats FOR SELECT
  TO authenticated
  USING (get_user_role() = 'super_admin');

CREATE POLICY "Admins can view threats in their organization"
  ON threats FOR SELECT
  TO authenticated
  USING (
    get_user_role() = 'admin'
    AND get_site_organization_id(site_id) = get_user_organization_id()
  );

CREATE POLICY "Consultants can view threats for assigned sites"
  ON threats FOR SELECT
  TO authenticated
  USING (
    get_user_role() = 'consultant'
    AND user_has_site_access(site_id)
  );

CREATE POLICY "Readers can view threats for assigned sites"
  ON threats FOR SELECT
  TO authenticated
  USING (
    get_user_role() = 'reader'
    AND user_has_site_access(site_id)
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
    AND get_site_organization_id(site_id) = get_user_organization_id()
  );

CREATE POLICY "Consultants can insert threats for assigned sites"
  ON threats FOR INSERT
  TO authenticated
  WITH CHECK (
    get_user_role() = 'consultant'
    AND user_has_site_access(site_id)
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
    AND get_site_organization_id(site_id) = get_user_organization_id()
  );

CREATE POLICY "Consultants can update threats for assigned sites"
  ON threats FOR UPDATE
  TO authenticated
  USING (
    get_user_role() = 'consultant'
    AND user_has_site_access(site_id)
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
    AND get_site_organization_id(site_id) = get_user_organization_id()
  );

-- =============================================
-- USER SITE ACCESS - Simple policies
-- =============================================

CREATE POLICY "Super admins can view all site access"
  ON user_site_access FOR SELECT
  TO authenticated
  USING (get_user_role() = 'super_admin');

CREATE POLICY "Admins can view site access in their organization"
  ON user_site_access FOR SELECT
  TO authenticated
  USING (
    get_user_role() = 'admin'
    AND get_site_organization_id(site_id) = get_user_organization_id()
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
    AND get_site_organization_id(site_id) = get_user_organization_id()
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
    AND get_site_organization_id(site_id) = get_user_organization_id()
  );
