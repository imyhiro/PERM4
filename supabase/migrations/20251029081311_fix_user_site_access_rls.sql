/*
  # Fix infinite recursion in user_site_access RLS policies

  1. Changes
    - Drop existing policies that cause recursion
    - Create simpler policies using app_metadata role instead of users table
    - Avoid self-referencing queries in user_site_access policies

  2. Security
    - Super admins can manage all site access
    - Admins can manage site access in their organization
    - Users can view their own site access
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Super admins can manage all site access" ON user_site_access;
DROP POLICY IF EXISTS "Admins can manage site access in their organization" ON user_site_access;
DROP POLICY IF EXISTS "Consultants can manage site access for their sites" ON user_site_access;

-- Create new policies using app_metadata to avoid recursion
CREATE POLICY "Super admins can manage all site access"
  ON user_site_access FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin');

CREATE POLICY "Admins can manage site access in org"
  ON user_site_access FOR ALL
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    AND site_id IN (
      SELECT s.id FROM sites s
      JOIN users u ON u.organization_id = s.organization_id
      WHERE u.id = auth.uid()
    )
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    AND site_id IN (
      SELECT s.id FROM sites s
      JOIN users u ON u.organization_id = s.organization_id
      WHERE u.id = auth.uid()
    )
  );

CREATE POLICY "Users can view their own site access"
  ON user_site_access FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
