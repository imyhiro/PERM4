/*
  # Fix User Site Access INSERT Policies

  ## Problem
  The INSERT policies for user_site_access are too restrictive and cause errors
  when admins and consultants try to assign users to sites.
  
  The policy that checks `EXISTS (SELECT 1 FROM users WHERE users.id = user_site_access.user_id)`
  can fail because:
  1. The user might have just been created
  2. RLS on users table might not allow the query
  
  ## Solution
  Simplify the INSERT policies to not query the users table during insert.
  Instead, rely on application logic to ensure only readers are assigned by consultants.
  
  ## Changes
  1. Remove the EXISTS check on users table from consultant policy
  2. Keep the organization and site access checks
*/

-- Drop existing INSERT policies
DROP POLICY IF EXISTS "Super admins can insert site access" ON user_site_access;
DROP POLICY IF EXISTS "Admins can insert site access in their organization" ON user_site_access;
DROP POLICY IF EXISTS "Consultants can insert site access for readers" ON user_site_access;

-- Recreate with simpler checks
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

CREATE POLICY "Consultants can insert site access for their sites"
  ON user_site_access FOR INSERT
  TO authenticated
  WITH CHECK (
    get_user_role() = 'consultant'
    AND user_has_site_access(site_id)
  );
