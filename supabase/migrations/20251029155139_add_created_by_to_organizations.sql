/*
  # Add created_by field to organizations table
  
  ## Changes
  1. Add `created_by` column to organizations table
     - References users(id)
     - Nullable to support existing records
  
  2. Update RLS policies for organizations
     - Super admins can view all organizations
     - Admins can only view organizations they created
     - Consultants and readers can view their organization
  
  3. Security
     - Maintain restrictive RLS policies
     - Ensure proper role-based access
*/

-- Add created_by column to organizations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'organizations' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE organizations ADD COLUMN created_by uuid REFERENCES users(id);
  END IF;
END $$;

-- Drop existing policies for organizations
DROP POLICY IF EXISTS "Super admins can view all organizations" ON organizations;
DROP POLICY IF EXISTS "Admins and consultants can view their organization" ON organizations;
DROP POLICY IF EXISTS "Readers can view their organization" ON organizations;
DROP POLICY IF EXISTS "Users can view their own organization" ON organizations;
DROP POLICY IF EXISTS "Super admins can insert organizations" ON organizations;
DROP POLICY IF EXISTS "Super admins can update organizations" ON organizations;
DROP POLICY IF EXISTS "Super admins can delete organizations" ON organizations;
DROP POLICY IF EXISTS "Admins can insert organizations" ON organizations;
DROP POLICY IF EXISTS "Admins can update their organizations" ON organizations;

-- Create new SELECT policies
CREATE POLICY "Super admins can view all organizations"
  ON organizations FOR SELECT
  TO authenticated
  USING (
    (SELECT raw_app_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'super_admin'
  );

CREATE POLICY "Admins can view organizations they created"
  ON organizations FOR SELECT
  TO authenticated
  USING (
    (SELECT raw_app_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin'
    AND created_by = auth.uid()
  );

CREATE POLICY "Consultants and readers can view their organization"
  ON organizations FOR SELECT
  TO authenticated
  USING (
    (SELECT raw_app_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) IN ('consultant', 'reader')
    AND id = (SELECT organization_id FROM users WHERE id = auth.uid())
  );

-- Create INSERT policies
CREATE POLICY "Super admins can insert organizations"
  ON organizations FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT raw_app_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'super_admin'
  );

CREATE POLICY "Admins can insert organizations"
  ON organizations FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT raw_app_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin'
  );

-- Create UPDATE policies
CREATE POLICY "Super admins can update all organizations"
  ON organizations FOR UPDATE
  TO authenticated
  USING (
    (SELECT raw_app_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'super_admin'
  )
  WITH CHECK (
    (SELECT raw_app_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'super_admin'
  );

CREATE POLICY "Admins can update organizations they created"
  ON organizations FOR UPDATE
  TO authenticated
  USING (
    (SELECT raw_app_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin'
    AND created_by = auth.uid()
  )
  WITH CHECK (
    (SELECT raw_app_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin'
    AND created_by = auth.uid()
  );

-- Create DELETE policies
CREATE POLICY "Super admins can delete organizations"
  ON organizations FOR DELETE
  TO authenticated
  USING (
    (SELECT raw_app_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'super_admin'
  );

CREATE POLICY "Admins can delete organizations they created"
  ON organizations FOR DELETE
  TO authenticated
  USING (
    (SELECT raw_app_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin'
    AND created_by = auth.uid()
  );
