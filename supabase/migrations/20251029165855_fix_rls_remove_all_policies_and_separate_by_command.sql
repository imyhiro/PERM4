/*
  # Fix RLS Policies - Remove ALL Policies and Separate by Command

  The issue is that policies with cmd="ALL" can conflict with specific command policies.
  This migration removes all "ALL" policies and creates explicit SELECT, INSERT, UPDATE, DELETE policies.

  ## Changes
  1. Drop all policies with cmd="ALL" 
  2. Create separate SELECT, INSERT, UPDATE, DELETE policies for each role
  3. Ensure super_admin has full access to all tables
  4. Ensure admin/consultant/reader have appropriate access based on their role
*/

-- =============================================
-- ORGANIZATIONS TABLE - Drop ALL policies
-- =============================================

DROP POLICY IF EXISTS "orgs_super_admin_all" ON organizations;

-- =============================================
-- ORGANIZATIONS TABLE - Create separate policies
-- =============================================

-- SELECT policies (keep existing)
-- orgs_admin_select_created - already exists
-- orgs_select_own - already exists

-- Add super_admin SELECT policy
DROP POLICY IF EXISTS "orgs_super_admin_select" ON organizations;
CREATE POLICY "orgs_super_admin_select"
  ON organizations FOR SELECT
  TO authenticated
  USING ((auth.jwt() ->> 'role'::text) = 'super_admin'::text);

-- INSERT policies (already exist)
-- orgs_super_admin_insert - already exists
-- orgs_admin_insert - already exists

-- UPDATE policies (already exist)
-- orgs_super_admin_update - already exists
-- orgs_admin_update_created - already exists

-- DELETE policies (already exist)
-- orgs_super_admin_delete - already exists
-- orgs_admin_delete_created - already exists

-- =============================================
-- SITES TABLE - Drop ALL policies
-- =============================================

DROP POLICY IF EXISTS "sites_super_admin_all" ON sites;
DROP POLICY IF EXISTS "sites_admin_all" ON sites;

-- =============================================
-- SITES TABLE - Create separate policies
-- =============================================

-- Add super_admin SELECT policy
DROP POLICY IF EXISTS "sites_super_admin_select" ON sites;
CREATE POLICY "sites_super_admin_select"
  ON sites FOR SELECT
  TO authenticated
  USING ((auth.jwt() ->> 'role'::text) = 'super_admin'::text);

-- Add admin SELECT policy for sites in their org or orgs they created
DROP POLICY IF EXISTS "sites_admin_select" ON sites;
CREATE POLICY "sites_admin_select"
  ON sites FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() ->> 'role'::text) = 'admin'::text
    AND (
      (organization_id)::text = (auth.jwt() ->> 'organization_id'::text)
      OR EXISTS (
        SELECT 1 FROM organizations
        WHERE id = sites.organization_id
        AND created_by = auth.uid()
      )
    )
  );

-- sites_consultant_reader_select - already exists

-- INSERT policies (already exist)
-- sites_super_admin_insert - already exists
-- sites_admin_insert - already exists

-- UPDATE policies (already exist)
-- sites_super_admin_update - already exists
-- sites_admin_update - already exists
-- sites_consultant_update - already exists

-- DELETE policies (already exist)
-- sites_super_admin_delete - already exists
-- sites_admin_delete - already exists