/*
  # Add performance indexes for better query speed

  1. Indexes
    - Add index on scenarios(site_id, created_at) for faster filtering and sorting
    - Add index on scenarios(asset_id) for faster joins (already exists from previous migration)
    - Add index on assets(site_id) for faster filtering
    - Add index on threats(site_id) for faster filtering
    - Add index on sites(organization_id) for faster organization filtering

  2. Notes
    - These indexes will significantly improve query performance
    - Especially important for Dashboard stats and Scenarios page
    - Some indexes may already exist, using IF NOT EXISTS to prevent errors
*/

-- Scenarios indexes
CREATE INDEX IF NOT EXISTS idx_scenarios_site_created ON scenarios(site_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scenarios_asset_id ON scenarios(asset_id);

-- Assets index
CREATE INDEX IF NOT EXISTS idx_assets_site_id ON assets(site_id);

-- Threats index
CREATE INDEX IF NOT EXISTS idx_threats_site_id ON threats(site_id);

-- Sites index
CREATE INDEX IF NOT EXISTS idx_sites_organization_id ON sites(organization_id);

-- Users index for organization filtering
CREATE INDEX IF NOT EXISTS idx_users_organization_id ON users(organization_id);
