/*
  # Allow Consultants to Create Sites

  ## Problem
  Consultants currently can only SELECT and UPDATE sites, but cannot INSERT (create) new sites.

  ## Solution
  Add an INSERT policy for consultants so they can create sites in their organization.

  ## Changes
  - Add sites_consultant_insert policy
  - Consultants can create sites in their assigned organization
*/

-- =============================================
-- SITES - Add INSERT policy for consultants
-- =============================================

-- Consultants can insert sites in their organization
CREATE POLICY "sites_consultant_insert"
  ON sites FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'consultant'
    AND organization_id::text = (auth.jwt() -> 'app_metadata' ->> 'organization_id')
  );
