/*
  # Initial Schema Setup for Risk Analysis Platform
  
  ## Overview
  This migration creates the foundational database structure for a modular risk analysis platform
  focused on site management, asset identification, threat cataloging, and scenario generation.
  
  ## New Tables
  
  ### 1. organizations
  - `id` (uuid, primary key)
  - `name` (text) - Organization name
  - `license_type` (text) - 'free' or 'pro'
  - `license_limit` (integer) - Max risk analyses allowed (3 for free, 10 for pro)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
  
  ### 2. users
  - `id` (uuid, primary key) - References auth.users
  - `email` (text)
  - `full_name` (text)
  - `role` (text) - 'super_admin', 'admin', 'consultant', 'reader'
  - `organization_id` (uuid, nullable) - References organizations
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
  
  ### 3. sites
  - `id` (uuid, primary key)
  - `organization_id` (uuid) - References organizations
  - `name` (text) - Site name (e.g., "Planta Monterrey")
  - `industry_type` (text) - Type of industry
  - `location_country` (text)
  - `location_state` (text)
  - `location_city` (text)
  - `location_zone` (text) - e.g., "Zona industrial"
  - `location_address` (text)
  - `location_type` (text) - 'office', 'plant', 'warehouse', 'home', 'transit'
  - `risk_zone_classification` (text) - 'high', 'medium', 'low' (can be AI-suggested)
  - `created_by` (uuid) - References users
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
  
  ### 4. user_site_access
  Junction table for controlling which users (especially readers and consultants) can access which sites
  - `id` (uuid, primary key)
  - `user_id` (uuid) - References users
  - `site_id` (uuid) - References sites
  - `created_at` (timestamptz)
  
  ### 5. asset_catalog
  Global catalog of vital assets that can be used across organizations
  - `id` (uuid, primary key)
  - `name` (text) - Asset name
  - `description` (text)
  - `category` (text) - Grouping category
  - `is_global` (boolean) - True if available to all, false if organization-specific
  - `organization_id` (uuid, nullable) - If organization-specific
  - `created_by` (uuid) - References users
  - `created_at` (timestamptz)
  
  ### 6. threat_catalog
  Global catalog of threats
  - `id` (uuid, primary key)
  - `name` (text) - Threat name
  - `description` (text)
  - `category` (text) - Grouping category
  - `is_global` (boolean) - True if available to all, false if organization-specific
  - `organization_id` (uuid, nullable) - If organization-specific
  - `created_by` (uuid) - References users
  - `created_at` (timestamptz)
  
  ### 7. asset_threat_compatibility
  Defines which threats are compatible with which assets (rules configuration)
  - `id` (uuid, primary key)
  - `asset_id` (uuid) - References asset_catalog
  - `threat_id` (uuid) - References threat_catalog
  - `is_global` (boolean) - Global rule or organization-specific
  - `organization_id` (uuid, nullable) - If organization-specific
  - `created_by` (uuid) - References users
  - `created_at` (timestamptz)
  
  ### 8. site_assets
  Assets selected for a specific site (checked from catalog or custom)
  - `id` (uuid, primary key)
  - `site_id` (uuid) - References sites
  - `asset_catalog_id` (uuid, nullable) - References asset_catalog if from catalog
  - `custom_name` (text, nullable) - If custom asset
  - `custom_description` (text, nullable)
  - `custom_category` (text, nullable)
  - `created_by` (uuid) - References users
  - `created_at` (timestamptz)
  
  ### 9. scenarios
  Generated scenarios (asset + threat combination)
  - `id` (uuid, primary key)
  - `site_id` (uuid) - References sites
  - `site_asset_id` (uuid) - References site_assets
  - `threat_id` (uuid) - References threat_catalog
  - `scenario_description` (text) - Analysis field
  - `vulnerabilities` (text) - Analysis field
  - `facilitators` (text) - Analysis field
  - `risk_factors` (text) - Analysis field
  - `suggested_measures` (text) - Analysis field
  - `analyzed_by` (uuid, nullable) - References users
  - `analyzed_at` (timestamptz, nullable)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
  
  ## Security
  - Row Level Security (RLS) enabled on all tables
  - Policies enforce role-based access control
  - Super admins have full access
  - Admins see their organization's data
  - Consultants see assigned sites only
  - Readers see assigned sites only (read-only)
  
  ## Notes
  - All IDs use UUID for security and scalability
  - Timestamps track creation and modification
  - Soft deletes not implemented (can be added later)
  - Evaluation, controls, and reporting features reserved for future modules
*/

-- Create organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  license_type text NOT NULL DEFAULT 'free' CHECK (license_type IN ('free', 'pro')),
  license_limit integer NOT NULL DEFAULT 3 CHECK (license_limit > 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create users table (extends auth.users)
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('super_admin', 'admin', 'consultant', 'reader')),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create sites table
CREATE TABLE IF NOT EXISTS sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  industry_type text NOT NULL,
  location_country text NOT NULL DEFAULT '',
  location_state text NOT NULL DEFAULT '',
  location_city text NOT NULL DEFAULT '',
  location_zone text DEFAULT '',
  location_address text DEFAULT '',
  location_type text NOT NULL CHECK (location_type IN ('office', 'plant', 'warehouse', 'home', 'transit')),
  risk_zone_classification text CHECK (risk_zone_classification IN ('high', 'medium', 'low')),
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create user_site_access table
CREATE TABLE IF NOT EXISTS user_site_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  site_id uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, site_id)
);

-- Create asset_catalog table
CREATE TABLE IF NOT EXISTS asset_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  category text NOT NULL,
  is_global boolean DEFAULT false,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);

-- Create threat_catalog table
CREATE TABLE IF NOT EXISTS threat_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  category text NOT NULL,
  is_global boolean DEFAULT false,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);

-- Create asset_threat_compatibility table
CREATE TABLE IF NOT EXISTS asset_threat_compatibility (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL REFERENCES asset_catalog(id) ON DELETE CASCADE,
  threat_id uuid NOT NULL REFERENCES threat_catalog(id) ON DELETE CASCADE,
  is_global boolean DEFAULT false,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE(asset_id, threat_id, organization_id)
);

-- Create site_assets table
CREATE TABLE IF NOT EXISTS site_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  asset_catalog_id uuid REFERENCES asset_catalog(id) ON DELETE SET NULL,
  custom_name text,
  custom_description text,
  custom_category text,
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  CHECK (
    (asset_catalog_id IS NOT NULL AND custom_name IS NULL) OR
    (asset_catalog_id IS NULL AND custom_name IS NOT NULL)
  )
);

-- Create scenarios table
CREATE TABLE IF NOT EXISTS scenarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  site_asset_id uuid NOT NULL REFERENCES site_assets(id) ON DELETE CASCADE,
  threat_id uuid NOT NULL REFERENCES threat_catalog(id) ON DELETE CASCADE,
  scenario_description text DEFAULT '',
  vulnerabilities text DEFAULT '',
  facilitators text DEFAULT '',
  risk_factors text DEFAULT '',
  suggested_measures text DEFAULT '',
  analyzed_by uuid REFERENCES users(id),
  analyzed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(site_asset_id, threat_id)
);

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_site_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE threat_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_threat_compatibility ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenarios ENABLE ROW LEVEL SECURITY;

-- RLS Policies for organizations
CREATE POLICY "Super admins can manage all organizations"
  ON organizations FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'super_admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'super_admin')
  );

CREATE POLICY "Users can view their own organization"
  ON organizations FOR SELECT
  TO authenticated
  USING (
    id IN (SELECT organization_id FROM users WHERE users.id = auth.uid())
  );

-- RLS Policies for users
CREATE POLICY "Super admins can manage all users"
  ON users FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'super_admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'super_admin')
  );

CREATE POLICY "Admins can manage users in their organization"
  ON users FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

CREATE POLICY "Users can view their own profile"
  ON users FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- RLS Policies for sites
CREATE POLICY "Super admins can manage all sites"
  ON sites FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'super_admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'super_admin')
  );

CREATE POLICY "Admins can manage sites in their organization"
  ON sites FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

CREATE POLICY "Consultants can view assigned sites"
  ON sites FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT site_id FROM user_site_access WHERE user_id = auth.uid()
    )
    OR organization_id IN (
      SELECT organization_id FROM users WHERE users.id = auth.uid() AND users.role = 'consultant'
    )
  );

CREATE POLICY "Consultants can update assigned sites"
  ON sites FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT site_id FROM user_site_access WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    id IN (
      SELECT site_id FROM user_site_access WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Readers can view assigned sites"
  ON sites FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT site_id FROM user_site_access WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for user_site_access
CREATE POLICY "Super admins can manage all site access"
  ON user_site_access FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'super_admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'super_admin')
  );

CREATE POLICY "Admins can manage site access in their organization"
  ON user_site_access FOR ALL
  TO authenticated
  USING (
    site_id IN (
      SELECT id FROM sites WHERE organization_id IN (
        SELECT organization_id FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
      )
    )
  )
  WITH CHECK (
    site_id IN (
      SELECT id FROM sites WHERE organization_id IN (
        SELECT organization_id FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
      )
    )
  );

CREATE POLICY "Consultants can manage site access for their sites"
  ON user_site_access FOR ALL
  TO authenticated
  USING (
    site_id IN (
      SELECT site_id FROM user_site_access WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    site_id IN (
      SELECT site_id FROM user_site_access WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for asset_catalog
CREATE POLICY "Super admins can manage all assets"
  ON asset_catalog FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'super_admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'super_admin')
  );

CREATE POLICY "Users can view global and their org assets"
  ON asset_catalog FOR SELECT
  TO authenticated
  USING (
    is_global = true OR organization_id IN (
      SELECT organization_id FROM users WHERE users.id = auth.uid()
    )
  );

CREATE POLICY "Admins and consultants can create org assets"
  ON asset_catalog FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'consultant')
    )
  );

CREATE POLICY "Admins and consultants can update org assets"
  ON asset_catalog FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'consultant')
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'consultant')
    )
  );

-- RLS Policies for threat_catalog
CREATE POLICY "Super admins can manage all threats"
  ON threat_catalog FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'super_admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'super_admin')
  );

CREATE POLICY "Users can view global and their org threats"
  ON threat_catalog FOR SELECT
  TO authenticated
  USING (
    is_global = true OR organization_id IN (
      SELECT organization_id FROM users WHERE users.id = auth.uid()
    )
  );

CREATE POLICY "Admins and consultants can create org threats"
  ON threat_catalog FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'consultant')
    )
  );

CREATE POLICY "Admins and consultants can update org threats"
  ON threat_catalog FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'consultant')
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'consultant')
    )
  );

-- RLS Policies for asset_threat_compatibility
CREATE POLICY "Super admins can manage all compatibility rules"
  ON asset_threat_compatibility FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'super_admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'super_admin')
  );

CREATE POLICY "Users can view global and their org compatibility rules"
  ON asset_threat_compatibility FOR SELECT
  TO authenticated
  USING (
    is_global = true OR organization_id IN (
      SELECT organization_id FROM users WHERE users.id = auth.uid()
    )
  );

CREATE POLICY "Admins and consultants can create org compatibility rules"
  ON asset_threat_compatibility FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'consultant')
    )
  );

-- RLS Policies for site_assets
CREATE POLICY "Super admins can manage all site assets"
  ON site_assets FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'super_admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'super_admin')
  );

CREATE POLICY "Admins can manage site assets in their organization"
  ON site_assets FOR ALL
  TO authenticated
  USING (
    site_id IN (
      SELECT id FROM sites WHERE organization_id IN (
        SELECT organization_id FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
      )
    )
  )
  WITH CHECK (
    site_id IN (
      SELECT id FROM sites WHERE organization_id IN (
        SELECT organization_id FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
      )
    )
  );

CREATE POLICY "Consultants can manage site assets for assigned sites"
  ON site_assets FOR ALL
  TO authenticated
  USING (
    site_id IN (
      SELECT site_id FROM user_site_access WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    site_id IN (
      SELECT site_id FROM user_site_access WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Readers can view site assets for assigned sites"
  ON site_assets FOR SELECT
  TO authenticated
  USING (
    site_id IN (
      SELECT site_id FROM user_site_access WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for scenarios
CREATE POLICY "Super admins can manage all scenarios"
  ON scenarios FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'super_admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'super_admin')
  );

CREATE POLICY "Admins can manage scenarios in their organization"
  ON scenarios FOR ALL
  TO authenticated
  USING (
    site_id IN (
      SELECT id FROM sites WHERE organization_id IN (
        SELECT organization_id FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
      )
    )
  )
  WITH CHECK (
    site_id IN (
      SELECT id FROM sites WHERE organization_id IN (
        SELECT organization_id FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
      )
    )
  );

CREATE POLICY "Consultants can manage scenarios for assigned sites"
  ON scenarios FOR ALL
  TO authenticated
  USING (
    site_id IN (
      SELECT site_id FROM user_site_access WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    site_id IN (
      SELECT site_id FROM user_site_access WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Readers can view scenarios for assigned sites"
  ON scenarios FOR SELECT
  TO authenticated
  USING (
    site_id IN (
      SELECT site_id FROM user_site_access WHERE user_id = auth.uid()
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_organization ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_sites_organization ON sites(organization_id);
CREATE INDEX IF NOT EXISTS idx_user_site_access_user ON user_site_access(user_id);
CREATE INDEX IF NOT EXISTS idx_user_site_access_site ON user_site_access(site_id);
CREATE INDEX IF NOT EXISTS idx_asset_catalog_organization ON asset_catalog(organization_id);
CREATE INDEX IF NOT EXISTS idx_asset_catalog_global ON asset_catalog(is_global);
CREATE INDEX IF NOT EXISTS idx_threat_catalog_organization ON threat_catalog(organization_id);
CREATE INDEX IF NOT EXISTS idx_threat_catalog_global ON threat_catalog(is_global);
CREATE INDEX IF NOT EXISTS idx_compatibility_asset ON asset_threat_compatibility(asset_id);
CREATE INDEX IF NOT EXISTS idx_compatibility_threat ON asset_threat_compatibility(threat_id);
CREATE INDEX IF NOT EXISTS idx_site_assets_site ON site_assets(site_id);
CREATE INDEX IF NOT EXISTS idx_scenarios_site ON scenarios(site_id);
CREATE INDEX IF NOT EXISTS idx_scenarios_asset ON scenarios(site_asset_id);