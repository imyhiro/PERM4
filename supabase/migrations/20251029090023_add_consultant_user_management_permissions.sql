/*
  # Add Consultant User Management Permissions

  ## Changes
  
  1. Allow consultants to create reader users
  2. Allow consultants to view readers assigned to their sites
  3. Allow consultants to update readers assigned to their sites
  4. Allow consultants to delete readers assigned to their sites
  5. Allow consultants to manage site access for readers on their sites
  
  ## Security
  - Consultants can ONLY manage readers (not other consultants or admins)
  - Consultants can ONLY assign readers to sites they have access to
  - All operations are properly restricted by role and site access
*/

-- =============================================
-- USERS TABLE - Add Consultant Permissions
-- =============================================

-- Consultants can view readers assigned to their sites
CREATE POLICY "Consultants can view readers assigned to their sites"
  ON users FOR SELECT
  TO authenticated
  USING (
    get_user_role() = 'consultant'
    AND role = 'reader'
    AND EXISTS (
      SELECT 1 FROM user_site_access usa1
      WHERE usa1.user_id = users.id
      AND EXISTS (
        SELECT 1 FROM user_site_access usa2
        WHERE usa2.user_id = auth.uid()
        AND usa2.site_id = usa1.site_id
      )
    )
  );

-- Consultants can create reader users (in their organization)
CREATE POLICY "Consultants can insert reader users"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (
    get_user_role() = 'consultant'
    AND role = 'reader'
    AND organization_id = get_user_organization_id()
  );

-- Consultants can update readers assigned to their sites
CREATE POLICY "Consultants can update readers assigned to their sites"
  ON users FOR UPDATE
  TO authenticated
  USING (
    get_user_role() = 'consultant'
    AND role = 'reader'
    AND EXISTS (
      SELECT 1 FROM user_site_access usa1
      WHERE usa1.user_id = users.id
      AND EXISTS (
        SELECT 1 FROM user_site_access usa2
        WHERE usa2.user_id = auth.uid()
        AND usa2.site_id = usa1.site_id
      )
    )
  )
  WITH CHECK (
    role = 'reader'
  );

-- Consultants can delete readers assigned to their sites
CREATE POLICY "Consultants can delete readers assigned to their sites"
  ON users FOR DELETE
  TO authenticated
  USING (
    get_user_role() = 'consultant'
    AND role = 'reader'
    AND EXISTS (
      SELECT 1 FROM user_site_access usa1
      WHERE usa1.user_id = users.id
      AND EXISTS (
        SELECT 1 FROM user_site_access usa2
        WHERE usa2.user_id = auth.uid()
        AND usa2.site_id = usa1.site_id
      )
    )
  );

-- =============================================
-- USER SITE ACCESS - Add Consultant Permissions
-- =============================================

-- Consultants can view site access for their sites
CREATE POLICY "Consultants can view site access for their sites"
  ON user_site_access FOR SELECT
  TO authenticated
  USING (
    get_user_role() = 'consultant'
    AND user_has_site_access(site_id)
  );

-- Consultants can assign readers to their sites
CREATE POLICY "Consultants can insert site access for readers"
  ON user_site_access FOR INSERT
  TO authenticated
  WITH CHECK (
    get_user_role() = 'consultant'
    AND user_has_site_access(site_id)
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.id = user_site_access.user_id
      AND users.role = 'reader'
    )
  );

-- Consultants can remove readers from their sites
CREATE POLICY "Consultants can delete site access for readers"
  ON user_site_access FOR DELETE
  TO authenticated
  USING (
    get_user_role() = 'consultant'
    AND user_has_site_access(site_id)
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.id = user_site_access.user_id
      AND users.role = 'reader'
    )
  );
