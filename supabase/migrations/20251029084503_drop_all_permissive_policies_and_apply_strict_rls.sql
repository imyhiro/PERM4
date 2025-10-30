/*
  # Drop All Permissive Policies and Apply Strict RLS

  ## Overview
  This migration cleans up all existing RLS policies and creates strict, non-overlapping policies
  that properly enforce role-based access control.

  ## Changes

  ### Organizations Table
  - Drop ALL existing policies (including permissive ones with USING (true))
  - Super Admin: Full access to all organizations
  - Admin: Can ONLY view their own organization (no create/update/delete)
  
  ### Users Table  
  - Drop ALL existing policies
  - Super Admin: Full access to all users
  - Admin: Can only view/manage users in their organization
  - Users: Can view their own profile
  
  ### Sites Table
  - Drop ALL existing policies (including duplicate "full access" policies)
  - Super Admin: Full access to all sites
  - Admin: Full access to sites in their organization only
  - Consultant: Full access to assigned sites only
  - Reader: View-only access to assigned sites only

  ### User Site Access Table
  - Super Admin: Full access
  - Admin: Can manage assignments for sites in their organization
  - Others: Read-only for their own assignments

  ## Important Notes
  - All permissive policies with USING (true) are removed
  - Each role has specific, non-overlapping permissions
  - Admin role is scoped to their organization only
  - Consultant and Reader roles require explicit site assignments
*/

-- =============================================
-- ORGANIZATIONS TABLE - Complete Rebuild
-- =============================================

-- Drop ALL existing policies
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver organizations" ON organizations;
DROP POLICY IF EXISTS "Usuarios autenticados pueden crear organizations" ON organizations;
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar organizations" ON organizations;
DROP POLICY IF EXISTS "Usuarios autenticados pueden eliminar organizations" ON organizations;
DROP POLICY IF EXISTS "Super admins can view all organizations" ON organizations;
DROP POLICY IF EXISTS "Admins can view own organization" ON organizations;
DROP POLICY IF EXISTS "Super admins can insert organizations" ON organizations;
DROP POLICY IF EXISTS "Super admins can update organizations" ON organizations;
DROP POLICY IF EXISTS "Super admins can delete organizations" ON organizations;

-- Create strict policies
CREATE POLICY "Super admins can view all organizations"
  ON organizations FOR SELECT
  TO authenticated
  USING ((auth.jwt()->>'app_metadata')::jsonb->>'role' = 'super_admin');

CREATE POLICY "Admins can view own organization"
  ON organizations FOR SELECT
  TO authenticated
  USING (
    (auth.jwt()->>'app_metadata')::jsonb->>'role' = 'admin'
    AND id = (SELECT organization_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Super admins can insert organizations"
  ON organizations FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt()->>'app_metadata')::jsonb->>'role' = 'super_admin');

CREATE POLICY "Super admins can update organizations"
  ON organizations FOR UPDATE
  TO authenticated
  USING ((auth.jwt()->>'app_metadata')::jsonb->>'role' = 'super_admin');

CREATE POLICY "Super admins can delete organizations"
  ON organizations FOR DELETE
  TO authenticated
  USING ((auth.jwt()->>'app_metadata')::jsonb->>'role' = 'super_admin');

-- =============================================
-- USERS TABLE - Complete Rebuild
-- =============================================

-- Drop ALL existing policies
DROP POLICY IF EXISTS "Users can view based on metadata role" ON users;
DROP POLICY IF EXISTS "Usuarios pueden insertar su propio perfil" ON users;
DROP POLICY IF EXISTS "Usuarios pueden actualizar su propio perfil" ON users;
DROP POLICY IF EXISTS "Admins can update users" ON users;
DROP POLICY IF EXISTS "Admins can delete users" ON users;

-- Create strict policies
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Super admins can view all users"
  ON users FOR SELECT
  TO authenticated
  USING ((auth.jwt()->>'app_metadata')::jsonb->>'role' = 'super_admin');

CREATE POLICY "Admins can view users in their organization"
  ON users FOR SELECT
  TO authenticated
  USING (
    (auth.jwt()->>'app_metadata')::jsonb->>'role' = 'admin'
    AND organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
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
  USING ((auth.jwt()->>'app_metadata')::jsonb->>'role' = 'super_admin');

CREATE POLICY "Admins can update users in their organization"
  ON users FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt()->>'app_metadata')::jsonb->>'role' = 'admin'
    AND organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
    AND role != 'super_admin'
  );

CREATE POLICY "Super admins can delete users"
  ON users FOR DELETE
  TO authenticated
  USING ((auth.jwt()->>'app_metadata')::jsonb->>'role' = 'super_admin');

CREATE POLICY "Admins can delete users in their organization"
  ON users FOR DELETE
  TO authenticated
  USING (
    (auth.jwt()->>'app_metadata')::jsonb->>'role' = 'admin'
    AND organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
    AND role != 'super_admin'
    AND role != 'admin'
  );

-- =============================================
-- SITES TABLE - Complete Rebuild
-- =============================================

-- Drop ALL existing policies
DROP POLICY IF EXISTS "Super admins full access to sites" ON sites;
DROP POLICY IF EXISTS "Admins full access to sites" ON sites;
DROP POLICY IF EXISTS "Analysts can view sites" ON sites;
DROP POLICY IF EXISTS "Readers can view sites" ON sites;
DROP POLICY IF EXISTS "Super admins can view all sites" ON sites;
DROP POLICY IF EXISTS "Admins can view sites in their organization" ON sites;
DROP POLICY IF EXISTS "Consultants and readers can view assigned sites" ON sites;
DROP POLICY IF EXISTS "Super admins can insert sites" ON sites;
DROP POLICY IF EXISTS "Admins can insert sites in their organization" ON sites;
DROP POLICY IF EXISTS "Super admins can update sites" ON sites;
DROP POLICY IF EXISTS "Admins can update sites in their organization" ON sites;
DROP POLICY IF EXISTS "Super admins can delete sites" ON sites;
DROP POLICY IF EXISTS "Admins can delete sites in their organization" ON sites;

-- Create strict policies
CREATE POLICY "Super admins can view all sites"
  ON sites FOR SELECT
  TO authenticated
  USING ((auth.jwt()->>'app_metadata')::jsonb->>'role' = 'super_admin');

CREATE POLICY "Admins can view sites in their organization"
  ON sites FOR SELECT
  TO authenticated
  USING (
    (auth.jwt()->>'app_metadata')::jsonb->>'role' = 'admin'
    AND organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Consultants can view assigned sites"
  ON sites FOR SELECT
  TO authenticated
  USING (
    (auth.jwt()->>'app_metadata')::jsonb->>'role' = 'consultant'
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
    (auth.jwt()->>'app_metadata')::jsonb->>'role' = 'reader'
    AND EXISTS (
      SELECT 1 FROM user_site_access
      WHERE user_site_access.user_id = auth.uid()
      AND user_site_access.site_id = sites.id
    )
  );

CREATE POLICY "Super admins can insert sites"
  ON sites FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt()->>'app_metadata')::jsonb->>'role' = 'super_admin');

CREATE POLICY "Admins can insert sites in their organization"
  ON sites FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt()->>'app_metadata')::jsonb->>'role' = 'admin'
    AND organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Super admins can update sites"
  ON sites FOR UPDATE
  TO authenticated
  USING ((auth.jwt()->>'app_metadata')::jsonb->>'role' = 'super_admin');

CREATE POLICY "Admins can update sites in their organization"
  ON sites FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt()->>'app_metadata')::jsonb->>'role' = 'admin'
    AND organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Super admins can delete sites"
  ON sites FOR DELETE
  TO authenticated
  USING ((auth.jwt()->>'app_metadata')::jsonb->>'role' = 'super_admin');

CREATE POLICY "Admins can delete sites in their organization"
  ON sites FOR DELETE
  TO authenticated
  USING (
    (auth.jwt()->>'app_metadata')::jsonb->>'role' = 'admin'
    AND organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  );

-- =============================================
-- USER SITE ACCESS TABLE - Complete Rebuild
-- =============================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "Super admins full access to user_site_access" ON user_site_access;
DROP POLICY IF EXISTS "Admins can manage user_site_access" ON user_site_access;
DROP POLICY IF EXISTS "Users can view own site access" ON user_site_access;

-- Create strict policies
CREATE POLICY "Super admins can view all site access"
  ON user_site_access FOR SELECT
  TO authenticated
  USING ((auth.jwt()->>'app_metadata')::jsonb->>'role' = 'super_admin');

CREATE POLICY "Admins can view site access in their organization"
  ON user_site_access FOR SELECT
  TO authenticated
  USING (
    (auth.jwt()->>'app_metadata')::jsonb->>'role' = 'admin'
    AND EXISTS (
      SELECT 1 FROM sites
      WHERE sites.id = user_site_access.site_id
      AND sites.organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can view own site access"
  ON user_site_access FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Super admins can insert site access"
  ON user_site_access FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt()->>'app_metadata')::jsonb->>'role' = 'super_admin');

CREATE POLICY "Admins can insert site access in their organization"
  ON user_site_access FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt()->>'app_metadata')::jsonb->>'role' = 'admin'
    AND EXISTS (
      SELECT 1 FROM sites
      WHERE sites.id = user_site_access.site_id
      AND sites.organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
    )
  );

CREATE POLICY "Super admins can delete site access"
  ON user_site_access FOR DELETE
  TO authenticated
  USING ((auth.jwt()->>'app_metadata')::jsonb->>'role' = 'super_admin');

CREATE POLICY "Admins can delete site access in their organization"
  ON user_site_access FOR DELETE
  TO authenticated
  USING (
    (auth.jwt()->>'app_metadata')::jsonb->>'role' = 'admin'
    AND EXISTS (
      SELECT 1 FROM sites
      WHERE sites.id = user_site_access.site_id
      AND sites.organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
    )
  );
