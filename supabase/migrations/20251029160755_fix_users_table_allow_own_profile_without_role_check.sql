/*
  # Fix Users Table - Allow Own Profile Access Without Role Check
  
  ## Problem
  The "Users can view own profile" policy is failing because even accessing
  one's own profile triggers RLS checks that may call get_user_role(), which
  then tries to access the users table, creating a deadlock.
  
  ## Solution
  The policy for viewing own profile should ONLY use auth.uid() and nothing else.
  No role checks, no function calls - just a simple id = auth.uid() check.
  
  ## Changes
  - Recreate "Users can view own profile" with minimal logic
  - Ensure this policy comes first and is the most permissive for own data
*/

-- Drop and recreate the own profile policy with zero dependencies
DROP POLICY IF EXISTS "Users can view own profile" ON users;

CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  TO authenticated
  USING (id = auth.uid());
