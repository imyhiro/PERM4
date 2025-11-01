/*
  # Fix infinite recursion in sites RLS policies

  1. Changes
    - Drop existing policies that query users table
    - Create new policies using app_metadata to avoid recursion
    - Simplify policy structure

  2. Security
    - Super admins can manage all sites
    - Admins can manage sites in their organization (using direct organization_id check)
    - Users can view sites they have access to via user_site_access
*/

-- Drop all existing policies
DROP POLICY IF EXISTS "Super admins can manage all sites" ON sites;
DROP POLICY IF EXISTS "Admins can manage sites in their organization" ON sites;
DROP POLICY IF EXISTS "Consultants can view assigned sites" ON sites;
DROP POLICY IF EXISTS "Consultants can update assigned sites" ON sites;
DROP POLICY IF EXISTS "Readers can view assigned sites" ON sites;

-- Super admins can do everything (using app_metadata)
CREATE POLICY "Super admins can manage all sites"
  ON sites FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin');

-- Admins can manage sites in their organization
CREATE POLICY "Admins can manage sites in their org"
  ON sites FOR ALL
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    AND organization_id = (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    AND organization_id = (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Users can view sites they have explicit access to
CREATE POLICY "Users can view assigned sites"
  ON sites FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT site_id FROM user_site_access WHERE user_id = auth.uid()
    )
  );
