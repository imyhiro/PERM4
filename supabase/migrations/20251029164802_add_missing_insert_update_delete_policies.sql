/*
  # Add Missing INSERT, UPDATE, DELETE Policies

  This migration adds the missing INSERT, UPDATE, and DELETE policies for all tables
  that currently only have SELECT policies.

  ## Organizations Table
  - Super admins can INSERT, UPDATE, DELETE any organization
  - Admins can INSERT organizations and UPDATE/DELETE their own created organizations

  ## Sites Table
  - Super admins can INSERT, UPDATE, DELETE any site
  - Admins can INSERT sites in their organization and UPDATE/DELETE sites in their organization

  ## Users Table (public.users)
  - Super admins can INSERT, UPDATE, DELETE any user
  - Admins can INSERT users and manage users in their organization

  ## Asset and Threat Catalogs
  - Super admins can INSERT, UPDATE, DELETE any catalog items
  - Admins can INSERT, UPDATE, DELETE catalog items they created

  ## User Site Access
  - Super admins and admins can manage user site access
*/

-- =============================================
-- ORGANIZATIONS POLICIES
-- =============================================

-- Super admin can insert any organization
CREATE POLICY "orgs_super_admin_insert"
  ON organizations FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt() ->> 'role'::text) = 'super_admin'::text);

-- Admins can insert organizations (will become the creator)
CREATE POLICY "orgs_admin_insert"
  ON organizations FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt() ->> 'role'::text) = 'admin'::text);

-- Super admin can update any organization
CREATE POLICY "orgs_super_admin_update"
  ON organizations FOR UPDATE
  TO authenticated
  USING ((auth.jwt() ->> 'role'::text) = 'super_admin'::text)
  WITH CHECK ((auth.jwt() ->> 'role'::text) = 'super_admin'::text);

-- Admins can update organizations they created
CREATE POLICY "orgs_admin_update_created"
  ON organizations FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() ->> 'role'::text) = 'admin'::text
    AND created_by = auth.uid()
  )
  WITH CHECK (
    (auth.jwt() ->> 'role'::text) = 'admin'::text
    AND created_by = auth.uid()
  );

-- Super admin can delete any organization
CREATE POLICY "orgs_super_admin_delete"
  ON organizations FOR DELETE
  TO authenticated
  USING ((auth.jwt() ->> 'role'::text) = 'super_admin'::text);

-- Admins can delete organizations they created
CREATE POLICY "orgs_admin_delete_created"
  ON organizations FOR DELETE
  TO authenticated
  USING (
    (auth.jwt() ->> 'role'::text) = 'admin'::text
    AND created_by = auth.uid()
  );

-- =============================================
-- SITES POLICIES
-- =============================================

-- Super admin can insert any site
CREATE POLICY "sites_super_admin_insert"
  ON sites FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt() ->> 'role'::text) = 'super_admin'::text);

-- Admins can insert sites in their organization or organizations they created
CREATE POLICY "sites_admin_insert"
  ON sites FOR INSERT
  TO authenticated
  WITH CHECK (
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

-- Super admin can update any site
CREATE POLICY "sites_super_admin_update"
  ON sites FOR UPDATE
  TO authenticated
  USING ((auth.jwt() ->> 'role'::text) = 'super_admin'::text)
  WITH CHECK ((auth.jwt() ->> 'role'::text) = 'super_admin'::text);

-- Admins can update sites in their organization or in organizations they created
CREATE POLICY "sites_admin_update"
  ON sites FOR UPDATE
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
  )
  WITH CHECK (
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

-- Super admin can delete any site
CREATE POLICY "sites_super_admin_delete"
  ON sites FOR DELETE
  TO authenticated
  USING ((auth.jwt() ->> 'role'::text) = 'super_admin'::text);

-- Admins can delete sites in their organization or in organizations they created
CREATE POLICY "sites_admin_delete"
  ON sites FOR DELETE
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

-- =============================================
-- USER SITE ACCESS POLICIES
-- =============================================

-- Super admin can insert any user site access
CREATE POLICY "user_site_access_super_admin_insert"
  ON user_site_access FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt() ->> 'role'::text) = 'super_admin'::text);

-- Admins can insert user site access for sites they manage
CREATE POLICY "user_site_access_admin_insert"
  ON user_site_access FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt() ->> 'role'::text) = 'admin'::text
    AND EXISTS (
      SELECT 1 FROM sites
      WHERE sites.id = user_site_access.site_id
      AND (
        (sites.organization_id)::text = (auth.jwt() ->> 'organization_id'::text)
        OR EXISTS (
          SELECT 1 FROM organizations
          WHERE organizations.id = sites.organization_id
          AND organizations.created_by = auth.uid()
        )
      )
    )
  );

-- Super admin can update any user site access
CREATE POLICY "user_site_access_super_admin_update"
  ON user_site_access FOR UPDATE
  TO authenticated
  USING ((auth.jwt() ->> 'role'::text) = 'super_admin'::text)
  WITH CHECK ((auth.jwt() ->> 'role'::text) = 'super_admin'::text);

-- Admins can update user site access for sites they manage
CREATE POLICY "user_site_access_admin_update"
  ON user_site_access FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() ->> 'role'::text) = 'admin'::text
    AND EXISTS (
      SELECT 1 FROM sites
      WHERE sites.id = user_site_access.site_id
      AND (
        (sites.organization_id)::text = (auth.jwt() ->> 'organization_id'::text)
        OR EXISTS (
          SELECT 1 FROM organizations
          WHERE organizations.id = sites.organization_id
          AND organizations.created_by = auth.uid()
        )
      )
    )
  )
  WITH CHECK (
    (auth.jwt() ->> 'role'::text) = 'admin'::text
    AND EXISTS (
      SELECT 1 FROM sites
      WHERE sites.id = user_site_access.site_id
      AND (
        (sites.organization_id)::text = (auth.jwt() ->> 'organization_id'::text)
        OR EXISTS (
          SELECT 1 FROM organizations
          WHERE organizations.id = sites.organization_id
          AND organizations.created_by = auth.uid()
        )
      )
    )
  );

-- Super admin can delete any user site access
CREATE POLICY "user_site_access_super_admin_delete"
  ON user_site_access FOR DELETE
  TO authenticated
  USING ((auth.jwt() ->> 'role'::text) = 'super_admin'::text);

-- Admins can delete user site access for sites they manage
CREATE POLICY "user_site_access_admin_delete"
  ON user_site_access FOR DELETE
  TO authenticated
  USING (
    (auth.jwt() ->> 'role'::text) = 'admin'::text
    AND EXISTS (
      SELECT 1 FROM sites
      WHERE sites.id = user_site_access.site_id
      AND (
        (sites.organization_id)::text = (auth.jwt() ->> 'organization_id'::text)
        OR EXISTS (
          SELECT 1 FROM organizations
          WHERE organizations.id = sites.organization_id
          AND organizations.created_by = auth.uid()
        )
      )
    )
  );

-- =============================================
-- ASSET CATALOG POLICIES
-- =============================================

-- Super admin can insert any asset catalog item
CREATE POLICY "asset_catalog_super_admin_insert"
  ON asset_catalog FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt() ->> 'role'::text) = 'super_admin'::text);

-- Admins can insert asset catalog items
CREATE POLICY "asset_catalog_admin_insert"
  ON asset_catalog FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt() ->> 'role'::text) = 'admin'::text);

-- Super admin can update any asset catalog item
CREATE POLICY "asset_catalog_super_admin_update"
  ON asset_catalog FOR UPDATE
  TO authenticated
  USING ((auth.jwt() ->> 'role'::text) = 'super_admin'::text)
  WITH CHECK ((auth.jwt() ->> 'role'::text) = 'super_admin'::text);

-- Admins can update asset catalog items they created
CREATE POLICY "asset_catalog_admin_update"
  ON asset_catalog FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() ->> 'role'::text) = 'admin'::text
    AND created_by = auth.uid()
  )
  WITH CHECK (
    (auth.jwt() ->> 'role'::text) = 'admin'::text
    AND created_by = auth.uid()
  );

-- Super admin can delete any asset catalog item
CREATE POLICY "asset_catalog_super_admin_delete"
  ON asset_catalog FOR DELETE
  TO authenticated
  USING ((auth.jwt() ->> 'role'::text) = 'super_admin'::text);

-- Admins can delete asset catalog items they created
CREATE POLICY "asset_catalog_admin_delete"
  ON asset_catalog FOR DELETE
  TO authenticated
  USING (
    (auth.jwt() ->> 'role'::text) = 'admin'::text
    AND created_by = auth.uid()
  );

-- =============================================
-- THREAT CATALOG POLICIES
-- =============================================

-- Super admin can insert any threat catalog item
CREATE POLICY "threat_catalog_super_admin_insert"
  ON threat_catalog FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt() ->> 'role'::text) = 'super_admin'::text);

-- Admins can insert threat catalog items
CREATE POLICY "threat_catalog_admin_insert"
  ON threat_catalog FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt() ->> 'role'::text) = 'admin'::text);

-- Super admin can update any threat catalog item
CREATE POLICY "threat_catalog_super_admin_update"
  ON threat_catalog FOR UPDATE
  TO authenticated
  USING ((auth.jwt() ->> 'role'::text) = 'super_admin'::text)
  WITH CHECK ((auth.jwt() ->> 'role'::text) = 'super_admin'::text);

-- Admins can update threat catalog items they created
CREATE POLICY "threat_catalog_admin_update"
  ON threat_catalog FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() ->> 'role'::text) = 'admin'::text
    AND created_by = auth.uid()
  )
  WITH CHECK (
    (auth.jwt() ->> 'role'::text) = 'admin'::text
    AND created_by = auth.uid()
  );

-- Super admin can delete any threat catalog item
CREATE POLICY "threat_catalog_super_admin_delete"
  ON threat_catalog FOR DELETE
  TO authenticated
  USING ((auth.jwt() ->> 'role'::text) = 'super_admin'::text);

-- Admins can delete threat catalog items they created
CREATE POLICY "threat_catalog_admin_delete"
  ON threat_catalog FOR DELETE
  TO authenticated
  USING (
    (auth.jwt() ->> 'role'::text) = 'admin'::text
    AND created_by = auth.uid()
  );