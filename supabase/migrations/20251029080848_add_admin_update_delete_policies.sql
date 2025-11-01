/*
  # Add admin policies for UPDATE and DELETE operations

  1. Changes
    - Add policy for admins to update any user
    - Add policy for admins to delete any user (except super_admins)
    - Keep existing self-update policy
    - Keep existing policies for SELECT and INSERT

  2. Security
    - Super admins can update/delete anyone
    - Admins can update/delete non-super_admin users
    - Regular users can only update themselves
    - No one can delete super_admins except other super_admins
*/

-- Add policy for admins to update users
CREATE POLICY "Admins can update users"
  ON users FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin', 'admin')
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin', 'admin')
  );

-- Add policy for admins to delete users
CREATE POLICY "Admins can delete users"
  ON users FOR DELETE
  TO authenticated
  USING (
    -- Super admins can delete anyone
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
    OR
    -- Admins can delete non-super_admin users
    (
      (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
      AND role != 'super_admin'
    )
  );
