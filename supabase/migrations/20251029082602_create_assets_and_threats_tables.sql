/*
  # Create Assets and Threats Tables

  1. New Tables
    - `assets`
      - `id` (uuid, primary key)
      - `site_id` (uuid, foreign key to sites)
      - `name` (text) - Name of the asset
      - `type` (text) - Type of asset (equipment, data, people, facility, etc.)
      - `description` (text) - Detailed description
      - `value` (text) - Asset value/importance (high, medium, low)
      - `location` (text) - Physical or logical location
      - `owner` (text) - Person or department responsible
      - `status` (text) - operational, maintenance, inactive
      - `created_by` (uuid, foreign key to users)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `threats`
      - `id` (uuid, primary key)
      - `site_id` (uuid, foreign key to sites)
      - `name` (text) - Name of the threat
      - `category` (text) - natural, technological, human, environmental
      - `description` (text) - Detailed description
      - `probability` (text) - Likelihood of occurrence (high, medium, low)
      - `impact` (text) - Potential impact (high, medium, low)
      - `risk_level` (text) - Overall risk level (critical, high, medium, low)
      - `mitigation_measures` (text) - Actions to mitigate the threat
      - `status` (text) - active, mitigated, monitoring
      - `created_by` (uuid, foreign key to users)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users based on site access
    - Super admins and admins can manage all assets and threats
    - Consultants can view and create for their assigned sites
    - Operators can only view for their assigned sites
*/

-- Create assets table
CREATE TABLE IF NOT EXISTS assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL,
  description text DEFAULT '',
  value text NOT NULL DEFAULT 'medium',
  location text DEFAULT '',
  owner text DEFAULT '',
  status text NOT NULL DEFAULT 'operational',
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create threats table
CREATE TABLE IF NOT EXISTS threats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL,
  description text DEFAULT '',
  probability text NOT NULL DEFAULT 'medium',
  impact text NOT NULL DEFAULT 'medium',
  risk_level text NOT NULL DEFAULT 'medium',
  mitigation_measures text DEFAULT '',
  status text NOT NULL DEFAULT 'active',
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE threats ENABLE ROW LEVEL SECURITY;

-- Assets policies
CREATE POLICY "Super admins and admins can view all assets"
  ON assets FOR SELECT
  TO authenticated
  USING (
    (auth.jwt()->>'app_metadata')::jsonb->>'role' IN ('super_admin', 'admin')
  );

CREATE POLICY "Consultants and operators can view assets for their sites"
  ON assets FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_site_access
      WHERE user_site_access.user_id = auth.uid()
      AND user_site_access.site_id = assets.site_id
    )
  );

CREATE POLICY "Super admins and admins can insert assets"
  ON assets FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt()->>'app_metadata')::jsonb->>'role' IN ('super_admin', 'admin')
  );

CREATE POLICY "Consultants can insert assets for their sites"
  ON assets FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt()->>'app_metadata')::jsonb->>'role' = 'consultant'
    AND EXISTS (
      SELECT 1 FROM user_site_access
      WHERE user_site_access.user_id = auth.uid()
      AND user_site_access.site_id = assets.site_id
    )
  );

CREATE POLICY "Super admins and admins can update assets"
  ON assets FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt()->>'app_metadata')::jsonb->>'role' IN ('super_admin', 'admin')
  );

CREATE POLICY "Consultants can update assets for their sites"
  ON assets FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt()->>'app_metadata')::jsonb->>'role' = 'consultant'
    AND EXISTS (
      SELECT 1 FROM user_site_access
      WHERE user_site_access.user_id = auth.uid()
      AND user_site_access.site_id = assets.site_id
    )
  );

CREATE POLICY "Super admins and admins can delete assets"
  ON assets FOR DELETE
  TO authenticated
  USING (
    (auth.jwt()->>'app_metadata')::jsonb->>'role' IN ('super_admin', 'admin')
  );

-- Threats policies
CREATE POLICY "Super admins and admins can view all threats"
  ON threats FOR SELECT
  TO authenticated
  USING (
    (auth.jwt()->>'app_metadata')::jsonb->>'role' IN ('super_admin', 'admin')
  );

CREATE POLICY "Consultants and operators can view threats for their sites"
  ON threats FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_site_access
      WHERE user_site_access.user_id = auth.uid()
      AND user_site_access.site_id = threats.site_id
    )
  );

CREATE POLICY "Super admins and admins can insert threats"
  ON threats FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt()->>'app_metadata')::jsonb->>'role' IN ('super_admin', 'admin')
  );

CREATE POLICY "Consultants can insert threats for their sites"
  ON threats FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt()->>'app_metadata')::jsonb->>'role' = 'consultant'
    AND EXISTS (
      SELECT 1 FROM user_site_access
      WHERE user_site_access.user_id = auth.uid()
      AND user_site_access.site_id = threats.site_id
    )
  );

CREATE POLICY "Super admins and admins can update threats"
  ON threats FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt()->>'app_metadata')::jsonb->>'role' IN ('super_admin', 'admin')
  );

CREATE POLICY "Consultants can update threats for their sites"
  ON threats FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt()->>'app_metadata')::jsonb->>'role' = 'consultant'
    AND EXISTS (
      SELECT 1 FROM user_site_access
      WHERE user_site_access.user_id = auth.uid()
      AND user_site_access.site_id = threats.site_id
    )
  );

CREATE POLICY "Super admins and admins can delete threats"
  ON threats FOR DELETE
  TO authenticated
  USING (
    (auth.jwt()->>'app_metadata')::jsonb->>'role' IN ('super_admin', 'admin')
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_assets_site_id ON assets(site_id);
CREATE INDEX IF NOT EXISTS idx_threats_site_id ON threats(site_id);
CREATE INDEX IF NOT EXISTS idx_assets_created_by ON assets(created_by);
CREATE INDEX IF NOT EXISTS idx_threats_created_by ON threats(created_by);
