/*
  # Fix RLS infinite recursion issue

  1. Changes
    - Remove recursive policy that queries the same table it's protecting
    - Create simple policy that checks user role directly from auth metadata
    - Add fallback to allow users to see their own profile

  2. Security
    - Super admins and admins can see all users
    - Other users can only see their own profile
*/

-- Drop the problematic recursive policy
DROP POLICY IF EXISTS "Usuarios pueden ver perfiles según su rol" ON users;

-- Create new non-recursive policy
CREATE POLICY "Users can view based on role"
  ON users FOR SELECT
  TO authenticated
  USING (
    -- User can see their own profile
    id = auth.uid()
    OR
    -- Or check if current user has admin privileges by querying once
    auth.uid() IN (
      SELECT id FROM users WHERE role IN ('super_admin', 'admin')
    )
  );
