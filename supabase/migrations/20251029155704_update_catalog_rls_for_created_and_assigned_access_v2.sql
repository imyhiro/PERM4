/*
  # Update Catalog RLS Policies for Created and Assigned Access
  
  ## Overview
  This migration updates RLS policies for sites, assets, and threats to allow:
  - **Super admins**: Full access to everything
  - **Admins**: Access to records in organizations they created OR sites they have access to
  - **Consultants**: Access to records in sites they have access to (can create/update)
  - **Readers**: View-only access to records in sites they have access to
  
  ## Changes
  
  ### Sites Table
  - Update admin SELECT policy to include created organizations and assigned sites
  - Update admin INSERT/UPDATE policies to include assigned sites
  - Add consultant INSERT/UPDATE policies for assigned sites
  
  ### Assets Table
  - Update admin policies to include sites from created organizations and assigned sites
  - Update consultant policies for assigned sites
  - Add reader policies for view-only access
  
  ### Threats Table
  - Update admin policies to include sites from created organizations and assigned sites
  - Update consultant policies for assigned sites
  - Add reader policies for view-only access
  
  ## Security
  - All policies check authentication
  - Role-based access through app_metadata
  - Site access verified through user_site_access table
  - Organization ownership verified through created_by field
*/

-- =============================================
-- SITES - Updated policies
-- =============================================

-- Drop ALL existing policies for sites
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'sites') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON sites';
    END LOOP;
END $$;

-- Create new SELECT policies
CREATE POLICY "Super admins can view all sites"
  ON sites FOR SELECT
  TO authenticated
  USING (get_user_role() = 'super_admin');

CREATE POLICY "Admins can view sites in created orgs or assigned sites"
  ON sites FOR SELECT
  TO authenticated
  USING (
    get_user_role() = 'admin'
    AND (
      organization_id IN (
        SELECT id FROM organizations WHERE created_by = auth.uid()
      )
      OR
      user_has_site_access(id)
    )
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

-- Create new INSERT policies
CREATE POLICY "Super admins can insert sites"
  ON sites FOR INSERT
  TO authenticated
  WITH CHECK (get_user_role() = 'super_admin');

CREATE POLICY "Admins can insert sites in created orgs"
  ON sites FOR INSERT
  TO authenticated
  WITH CHECK (
    get_user_role() = 'admin'
    AND organization_id IN (
      SELECT id FROM organizations WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Consultants can insert sites in assigned organizations"
  ON sites FOR INSERT
  TO authenticated
  WITH CHECK (
    get_user_role() = 'consultant'
    AND organization_id = get_user_organization_id()
  );

-- Create new UPDATE policies
CREATE POLICY "Super admins can update sites"
  ON sites FOR UPDATE
  TO authenticated
  USING (get_user_role() = 'super_admin')
  WITH CHECK (get_user_role() = 'super_admin');

CREATE POLICY "Admins can update sites in created orgs or assigned sites"
  ON sites FOR UPDATE
  TO authenticated
  USING (
    get_user_role() = 'admin'
    AND (
      organization_id IN (
        SELECT id FROM organizations WHERE created_by = auth.uid()
      )
      OR
      user_has_site_access(id)
    )
  )
  WITH CHECK (
    get_user_role() = 'admin'
    AND (
      organization_id IN (
        SELECT id FROM organizations WHERE created_by = auth.uid()
      )
      OR
      user_has_site_access(id)
    )
  );

CREATE POLICY "Consultants can update assigned sites"
  ON sites FOR UPDATE
  TO authenticated
  USING (
    get_user_role() = 'consultant'
    AND user_has_site_access(id)
  )
  WITH CHECK (
    get_user_role() = 'consultant'
    AND user_has_site_access(id)
  );

-- Create new DELETE policies
CREATE POLICY "Super admins can delete sites"
  ON sites FOR DELETE
  TO authenticated
  USING (get_user_role() = 'super_admin');

CREATE POLICY "Admins can delete sites in created orgs"
  ON sites FOR DELETE
  TO authenticated
  USING (
    get_user_role() = 'admin'
    AND organization_id IN (
      SELECT id FROM organizations WHERE created_by = auth.uid()
    )
  );

-- =============================================
-- ASSETS - Updated policies
-- =============================================

-- Drop ALL existing policies for assets
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'assets') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON assets';
    END LOOP;
END $$;

-- Create new SELECT policies
CREATE POLICY "Super admins can view all assets"
  ON assets FOR SELECT
  TO authenticated
  USING (get_user_role() = 'super_admin');

CREATE POLICY "Admins can view assets in created orgs or assigned sites"
  ON assets FOR SELECT
  TO authenticated
  USING (
    get_user_role() = 'admin'
    AND (
      site_id IN (
        SELECT s.id FROM sites s
        JOIN organizations o ON s.organization_id = o.id
        WHERE o.created_by = auth.uid()
      )
      OR
      user_has_site_access(site_id)
    )
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

-- Create new INSERT policies
CREATE POLICY "Super admins can insert assets"
  ON assets FOR INSERT
  TO authenticated
  WITH CHECK (get_user_role() = 'super_admin');

CREATE POLICY "Admins can insert assets in created orgs or assigned sites"
  ON assets FOR INSERT
  TO authenticated
  WITH CHECK (
    get_user_role() = 'admin'
    AND (
      site_id IN (
        SELECT s.id FROM sites s
        JOIN organizations o ON s.organization_id = o.id
        WHERE o.created_by = auth.uid()
      )
      OR
      user_has_site_access(site_id)
    )
  );

CREATE POLICY "Consultants can insert assets for assigned sites"
  ON assets FOR INSERT
  TO authenticated
  WITH CHECK (
    get_user_role() = 'consultant'
    AND user_has_site_access(site_id)
  );

-- Create new UPDATE policies
CREATE POLICY "Super admins can update assets"
  ON assets FOR UPDATE
  TO authenticated
  USING (get_user_role() = 'super_admin')
  WITH CHECK (get_user_role() = 'super_admin');

CREATE POLICY "Admins can update assets in created orgs or assigned sites"
  ON assets FOR UPDATE
  TO authenticated
  USING (
    get_user_role() = 'admin'
    AND (
      site_id IN (
        SELECT s.id FROM sites s
        JOIN organizations o ON s.organization_id = o.id
        WHERE o.created_by = auth.uid()
      )
      OR
      user_has_site_access(site_id)
    )
  )
  WITH CHECK (
    get_user_role() = 'admin'
    AND (
      site_id IN (
        SELECT s.id FROM sites s
        JOIN organizations o ON s.organization_id = o.id
        WHERE o.created_by = auth.uid()
      )
      OR
      user_has_site_access(site_id)
    )
  );

CREATE POLICY "Consultants can update assets for assigned sites"
  ON assets FOR UPDATE
  TO authenticated
  USING (
    get_user_role() = 'consultant'
    AND user_has_site_access(site_id)
  )
  WITH CHECK (
    get_user_role() = 'consultant'
    AND user_has_site_access(site_id)
  );

-- Create new DELETE policies
CREATE POLICY "Super admins can delete assets"
  ON assets FOR DELETE
  TO authenticated
  USING (get_user_role() = 'super_admin');

CREATE POLICY "Admins can delete assets in created orgs or assigned sites"
  ON assets FOR DELETE
  TO authenticated
  USING (
    get_user_role() = 'admin'
    AND (
      site_id IN (
        SELECT s.id FROM sites s
        JOIN organizations o ON s.organization_id = o.id
        WHERE o.created_by = auth.uid()
      )
      OR
      user_has_site_access(site_id)
    )
  );

-- =============================================
-- THREATS - Updated policies
-- =============================================

-- Drop ALL existing policies for threats
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'threats') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON threats';
    END LOOP;
END $$;

-- Create new SELECT policies
CREATE POLICY "Super admins can view all threats"
  ON threats FOR SELECT
  TO authenticated
  USING (get_user_role() = 'super_admin');

CREATE POLICY "Admins can view threats in created orgs or assigned sites"
  ON threats FOR SELECT
  TO authenticated
  USING (
    get_user_role() = 'admin'
    AND (
      site_id IN (
        SELECT s.id FROM sites s
        JOIN organizations o ON s.organization_id = o.id
        WHERE o.created_by = auth.uid()
      )
      OR
      user_has_site_access(site_id)
    )
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

-- Create new INSERT policies
CREATE POLICY "Super admins can insert threats"
  ON threats FOR INSERT
  TO authenticated
  WITH CHECK (get_user_role() = 'super_admin');

CREATE POLICY "Admins can insert threats in created orgs or assigned sites"
  ON threats FOR INSERT
  TO authenticated
  WITH CHECK (
    get_user_role() = 'admin'
    AND (
      site_id IN (
        SELECT s.id FROM sites s
        JOIN organizations o ON s.organization_id = o.id
        WHERE o.created_by = auth.uid()
      )
      OR
      user_has_site_access(site_id)
    )
  );

CREATE POLICY "Consultants can insert threats for assigned sites"
  ON threats FOR INSERT
  TO authenticated
  WITH CHECK (
    get_user_role() = 'consultant'
    AND user_has_site_access(site_id)
  );

-- Create new UPDATE policies
CREATE POLICY "Super admins can update threats"
  ON threats FOR UPDATE
  TO authenticated
  USING (get_user_role() = 'super_admin')
  WITH CHECK (get_user_role() = 'super_admin');

CREATE POLICY "Admins can update threats in created orgs or assigned sites"
  ON threats FOR UPDATE
  TO authenticated
  USING (
    get_user_role() = 'admin'
    AND (
      site_id IN (
        SELECT s.id FROM sites s
        JOIN organizations o ON s.organization_id = o.id
        WHERE o.created_by = auth.uid()
      )
      OR
      user_has_site_access(site_id)
    )
  )
  WITH CHECK (
    get_user_role() = 'admin'
    AND (
      site_id IN (
        SELECT s.id FROM sites s
        JOIN organizations o ON s.organization_id = o.id
        WHERE o.created_by = auth.uid()
      )
      OR
      user_has_site_access(site_id)
    )
  );

CREATE POLICY "Consultants can update threats for assigned sites"
  ON threats FOR UPDATE
  TO authenticated
  USING (
    get_user_role() = 'consultant'
    AND user_has_site_access(site_id)
  )
  WITH CHECK (
    get_user_role() = 'consultant'
    AND user_has_site_access(site_id)
  );

-- Create new DELETE policies
CREATE POLICY "Super admins can delete threats"
  ON threats FOR DELETE
  TO authenticated
  USING (get_user_role() = 'super_admin');

CREATE POLICY "Admins can delete threats in created orgs or assigned sites"
  ON threats FOR DELETE
  TO authenticated
  USING (
    get_user_role() = 'admin'
    AND (
      site_id IN (
        SELECT s.id FROM sites s
        JOIN organizations o ON s.organization_id = o.id
        WHERE o.created_by = auth.uid()
      )
      OR
      user_has_site_access(site_id)
    )
  );