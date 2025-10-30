/*
  # Fix RLS Policies for Proper Role Permissions

  ## Changes

  ### Organizations Table
  - Super Admin: Can see all organizations
  - Admin: Can ONLY see their own organization
  - Remove policies that allow admins to see all organizations

  ### Sites Table
  - Super Admin: Can see all sites
  - Admin: Can ONLY see sites within their organization
  - Consultant: Can ONLY see sites assigned to them via user_site_access
  - Reader: Can ONLY see sites assigned to them via user_site_access

  ### Assets Table
  - Super Admin: Can see/manage all assets
  - Admin: Can see/manage assets from sites in their organization
  - Consultant: Can see/manage assets from their assigned sites
  - Reader: Can ONLY view assets from their assigned sites

  ### Threats Table
  - Super Admin: Can see/manage all threats
  - Admin: Can see/manage threats from sites in their organization
  - Consultant: Can see/manage threats from their assigned sites
  - Reader: Can ONLY view threats from their assigned sites

  ## Important Notes
  - All policies are rebuilt from scratch to ensure clarity
  - Each role has specific, non-overlapping permissions
  - Consultants and Readers must have explicit site access via user_site_access
*/

-- =============================================
-- ORGANIZATIONS TABLE - Fix RLS
-- =============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Super admins can view all organizations" ON organizations;
DROP POLICY IF EXISTS "Admins can view all organizations" ON organizations;
DROP POLICY IF EXISTS "Super admins can insert organizations" ON organizations;
DROP POLICY IF EXISTS "Super admins can update organizations" ON organizations;
DROP POLICY IF EXISTS "Super admins can delete organizations" ON organizations;

-- Recreate policies with correct permissions
CREATE POLICY "Super admins can view all organizations"
  ON organizations FOR SELECT
  TO authenticated
  USING ((auth.jwt()->>'app_metadata')::jsonb->>'role' = 'super_admin');

CREATE POLICY "Admins can view own organization"
  ON organizations FOR SELECT
  TO authenticated
  USING (
    (auth.jwt()->>'app_metadata')::jsonb->>'role' = 'admin'
    AND id = (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
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
-- SITES TABLE - Fix RLS
-- =============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Super admins can view all sites" ON sites;
DROP POLICY IF EXISTS "Admins can view all sites" ON sites;
DROP POLICY IF EXISTS "Consultants and operators can view assigned sites" ON sites;
DROP POLICY IF EXISTS "Super admins can insert sites" ON sites;
DROP POLICY IF EXISTS "Admins can insert sites" ON sites;
DROP POLICY IF EXISTS "Super admins can update sites" ON sites;
DROP POLICY IF EXISTS "Admins can update sites" ON sites;
DROP POLICY IF EXISTS "Super admins can delete sites" ON sites;
DROP POLICY IF EXISTS "Admins can delete sites" ON sites;

-- Recreate policies with correct permissions
CREATE POLICY "Super admins can view all sites"
  ON sites FOR SELECT
  TO authenticated
  USING ((auth.jwt()->>'app_metadata')::jsonb->>'role' = 'super_admin');

CREATE POLICY "Admins can view sites in their organization"
  ON sites FOR SELECT
  TO authenticated
  USING (
    (auth.jwt()->>'app_metadata')::jsonb->>'role' = 'admin'
    AND organization_id = (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Consultants and readers can view assigned sites"
  ON sites FOR SELECT
  TO authenticated
  USING (
    (auth.jwt()->>'app_metadata')::jsonb->>'role' IN ('consultant', 'reader')
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
    AND organization_id = (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
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
    AND organization_id = (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
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
    AND organization_id = (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- =============================================
-- ASSETS TABLE - Fix RLS
-- =============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Super admins and admins can view all assets" ON assets;
DROP POLICY IF EXISTS "Consultants and operators can view assets for their sites" ON assets;
DROP POLICY IF EXISTS "Super admins and admins can insert assets" ON assets;
DROP POLICY IF EXISTS "Consultants can insert assets for their sites" ON assets;
DROP POLICY IF EXISTS "Super admins and admins can update assets" ON assets;
DROP POLICY IF EXISTS "Consultants can update assets for their sites" ON assets;
DROP POLICY IF EXISTS "Super admins and admins can delete assets" ON assets;

-- Recreate policies with correct permissions
CREATE POLICY "Super admins can view all assets"
  ON assets FOR SELECT
  TO authenticated
  USING ((auth.jwt()->>'app_metadata')::jsonb->>'role' = 'super_admin');

CREATE POLICY "Admins can view assets in their organization"
  ON assets FOR SELECT
  TO authenticated
  USING (
    (auth.jwt()->>'app_metadata')::jsonb->>'role' = 'admin'
    AND EXISTS (
      SELECT 1 FROM sites
      WHERE sites.id = assets.site_id
      AND sites.organization_id = (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Consultants can view assets for assigned sites"
  ON assets FOR SELECT
  TO authenticated
  USING (
    (auth.jwt()->>'app_metadata')::jsonb->>'role' = 'consultant'
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
    (auth.jwt()->>'app_metadata')::jsonb->>'role' = 'reader'
    AND EXISTS (
      SELECT 1 FROM user_site_access
      WHERE user_site_access.user_id = auth.uid()
      AND user_site_access.site_id = assets.site_id
    )
  );

CREATE POLICY "Super admins can insert assets"
  ON assets FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt()->>'app_metadata')::jsonb->>'role' = 'super_admin');

CREATE POLICY "Admins can insert assets in their organization"
  ON assets FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt()->>'app_metadata')::jsonb->>'role' = 'admin'
    AND EXISTS (
      SELECT 1 FROM sites
      WHERE sites.id = assets.site_id
      AND sites.organization_id = (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Consultants can insert assets for assigned sites"
  ON assets FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt()->>'app_metadata')::jsonb->>'role' = 'consultant'
    AND EXISTS (
      SELECT 1 FROM user_site_access
      WHERE user_site_access.user_id = auth.uid()
      AND user_site_access.site_id = assets.site_id
    )
  );

CREATE POLICY "Super admins can update assets"
  ON assets FOR UPDATE
  TO authenticated
  USING ((auth.jwt()->>'app_metadata')::jsonb->>'role' = 'super_admin');

CREATE POLICY "Admins can update assets in their organization"
  ON assets FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt()->>'app_metadata')::jsonb->>'role' = 'admin'
    AND EXISTS (
      SELECT 1 FROM sites
      WHERE sites.id = assets.site_id
      AND sites.organization_id = (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Consultants can update assets for assigned sites"
  ON assets FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt()->>'app_metadata')::jsonb->>'role' = 'consultant'
    AND EXISTS (
      SELECT 1 FROM user_site_access
      WHERE user_site_access.user_id = auth.uid()
      AND user_site_access.site_id = assets.site_id
    )
  );

CREATE POLICY "Super admins can delete assets"
  ON assets FOR DELETE
  TO authenticated
  USING ((auth.jwt()->>'app_metadata')::jsonb->>'role' = 'super_admin');

CREATE POLICY "Admins can delete assets in their organization"
  ON assets FOR DELETE
  TO authenticated
  USING (
    (auth.jwt()->>'app_metadata')::jsonb->>'role' = 'admin'
    AND EXISTS (
      SELECT 1 FROM sites
      WHERE sites.id = assets.site_id
      AND sites.organization_id = (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- =============================================
-- THREATS TABLE - Fix RLS
-- =============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Super admins and admins can view all threats" ON threats;
DROP POLICY IF EXISTS "Consultants and operators can view threats for their sites" ON threats;
DROP POLICY IF EXISTS "Super admins and admins can insert threats" ON threats;
DROP POLICY IF EXISTS "Consultants can insert threats for their sites" ON threats;
DROP POLICY IF EXISTS "Super admins and admins can update threats" ON threats;
DROP POLICY IF EXISTS "Consultants can update threats for their sites" ON threats;
DROP POLICY IF EXISTS "Super admins and admins can delete threats" ON threats;

-- Recreate policies with correct permissions
CREATE POLICY "Super admins can view all threats"
  ON threats FOR SELECT
  TO authenticated
  USING ((auth.jwt()->>'app_metadata')::jsonb->>'role' = 'super_admin');

CREATE POLICY "Admins can view threats in their organization"
  ON threats FOR SELECT
  TO authenticated
  USING (
    (auth.jwt()->>'app_metadata')::jsonb->>'role' = 'admin'
    AND EXISTS (
      SELECT 1 FROM sites
      WHERE sites.id = threats.site_id
      AND sites.organization_id = (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Consultants can view threats for assigned sites"
  ON threats FOR SELECT
  TO authenticated
  USING (
    (auth.jwt()->>'app_metadata')::jsonb->>'role' = 'consultant'
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
    (auth.jwt()->>'app_metadata')::jsonb->>'role' = 'reader'
    AND EXISTS (
      SELECT 1 FROM user_site_access
      WHERE user_site_access.user_id = auth.uid()
      AND user_site_access.site_id = threats.site_id
    )
  );

CREATE POLICY "Super admins can insert threats"
  ON threats FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt()->>'app_metadata')::jsonb->>'role' = 'super_admin');

CREATE POLICY "Admins can insert threats in their organization"
  ON threats FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt()->>'app_metadata')::jsonb->>'role' = 'admin'
    AND EXISTS (
      SELECT 1 FROM sites
      WHERE sites.id = threats.site_id
      AND sites.organization_id = (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Consultants can insert threats for assigned sites"
  ON threats FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt()->>'app_metadata')::jsonb->>'role' = 'consultant'
    AND EXISTS (
      SELECT 1 FROM user_site_access
      WHERE user_site_access.user_id = auth.uid()
      AND user_site_access.site_id = threats.site_id
    )
  );

CREATE POLICY "Super admins can update threats"
  ON threats FOR UPDATE
  TO authenticated
  USING ((auth.jwt()->>'app_metadata')::jsonb->>'role' = 'super_admin');

CREATE POLICY "Admins can update threats in their organization"
  ON threats FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt()->>'app_metadata')::jsonb->>'role' = 'admin'
    AND EXISTS (
      SELECT 1 FROM sites
      WHERE sites.id = threats.site_id
      AND sites.organization_id = (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Consultants can update threats for assigned sites"
  ON threats FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt()->>'app_metadata')::jsonb->>'role' = 'consultant'
    AND EXISTS (
      SELECT 1 FROM user_site_access
      WHERE user_site_access.user_id = auth.uid()
      AND user_site_access.site_id = threats.site_id
    )
  );

CREATE POLICY "Super admins can delete threats"
  ON threats FOR DELETE
  TO authenticated
  USING ((auth.jwt()->>'app_metadata')::jsonb->>'role' = 'super_admin');

CREATE POLICY "Admins can delete threats in their organization"
  ON threats FOR DELETE
  TO authenticated
  USING (
    (auth.jwt()->>'app_metadata')::jsonb->>'role' = 'admin'
    AND EXISTS (
      SELECT 1 FROM sites
      WHERE sites.id = threats.site_id
      AND sites.organization_id = (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
    )
  );
