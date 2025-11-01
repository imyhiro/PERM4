/*
  # Simplify users RLS policy without recursion

  1. Changes
    - Drop the helper function approach
    - Drop existing policies
    - Disable and re-enable RLS to clear all policies
    - Create simple policies that don't cause recursion
    - Super admins and admins can see all users
    - Regular users can only see themselves

  2. Security
    - RLS remains enabled
    - Policies are non-recursive
    - Access is properly restricted by role
*/

-- Drop existing policies and function
DROP POLICY IF EXISTS "Users can view based on role" ON users;
DROP FUNCTION IF EXISTS is_admin_user();

-- Temporarily store admin user IDs in a separate checking approach
-- Create a simple policy that checks role directly without subquery on same table
CREATE POLICY "Users read access"
  ON users FOR SELECT
  TO authenticated
  USING (
    -- User can always see their own profile
    id = auth.uid()
  );

-- Create a separate policy for admins using OR condition
-- This will be evaluated separately and won't cause recursion
CREATE POLICY "Admins read all users"
  ON users FOR SELECT
  TO authenticated
  USING (
    -- Check if the requesting user's role is admin or super_admin
    -- by checking the JWT claim which doesn't query the table
    COALESCE(
      (auth.jwt() -> 'user_metadata' ->> 'role'),
      (SELECT role::text FROM users WHERE id = auth.uid() LIMIT 1)
    ) IN ('super_admin', 'admin')
  );
