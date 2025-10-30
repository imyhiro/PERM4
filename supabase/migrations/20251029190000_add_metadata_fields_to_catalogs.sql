/*
  # Add Metadata Fields to Catalogs for Smart Matching

  ## Purpose
  Add contextual metadata to asset_catalog and threat_catalog to enable
  intelligent automatic matching when creating new sites.

  ## Changes to asset_catalog
  - industry_types: Array of industries where this asset is relevant
  - location_types: Array of location types where this asset applies
  - priority: How critical this asset typically is
  - tags: Additional searchable tags

  ## Changes to threat_catalog
  - industry_types: Array of industries where this threat is relevant
  - regions: Array of geographic regions where this threat is common
  - severity: Typical severity level
  - tags: Additional searchable tags

  ## Benefits
  - Enables automatic site setup based on context
  - Better filtering and search
  - Improves user experience (less manual work)
*/

-- =============================================
-- ADD METADATA FIELDS TO asset_catalog
-- =============================================

-- Add industry types (which industries need this asset)
ALTER TABLE asset_catalog
ADD COLUMN IF NOT EXISTS industry_types text[] DEFAULT '{}';

-- Add location types (where this asset is typically used)
ALTER TABLE asset_catalog
ADD COLUMN IF NOT EXISTS location_types text[] DEFAULT '{}';

-- Add priority level
ALTER TABLE asset_catalog
ADD COLUMN IF NOT EXISTS priority text DEFAULT 'medium'
CHECK (priority IN ('critical', 'high', 'medium', 'low'));

-- Add tags for better searchability
ALTER TABLE asset_catalog
ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';

-- =============================================
-- ADD METADATA FIELDS TO threat_catalog
-- =============================================

-- Add industry types (which industries face this threat)
ALTER TABLE threat_catalog
ADD COLUMN IF NOT EXISTS industry_types text[] DEFAULT '{}';

-- Add regions (where this threat is common)
ALTER TABLE threat_catalog
ADD COLUMN IF NOT EXISTS regions text[] DEFAULT '{}';

-- Add severity level
ALTER TABLE threat_catalog
ADD COLUMN IF NOT EXISTS severity text DEFAULT 'medium'
CHECK (severity IN ('critical', 'high', 'medium', 'low'));

-- Add tags for better searchability
ALTER TABLE threat_catalog
ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';

-- =============================================
-- CREATE INDEXES FOR BETTER PERFORMANCE
-- =============================================

-- Indexes for array searches
CREATE INDEX IF NOT EXISTS idx_asset_catalog_industry_types ON asset_catalog USING GIN (industry_types);
CREATE INDEX IF NOT EXISTS idx_asset_catalog_location_types ON asset_catalog USING GIN (location_types);
CREATE INDEX IF NOT EXISTS idx_asset_catalog_tags ON asset_catalog USING GIN (tags);

CREATE INDEX IF NOT EXISTS idx_threat_catalog_industry_types ON threat_catalog USING GIN (industry_types);
CREATE INDEX IF NOT EXISTS idx_threat_catalog_regions ON threat_catalog USING GIN (regions);
CREATE INDEX IF NOT EXISTS idx_threat_catalog_tags ON threat_catalog USING GIN (tags);

-- Regular indexes for priority and severity
CREATE INDEX IF NOT EXISTS idx_asset_catalog_priority ON asset_catalog(priority);
CREATE INDEX IF NOT EXISTS idx_threat_catalog_severity ON threat_catalog(severity);

-- =============================================
-- ADD COMMENTS FOR DOCUMENTATION
-- =============================================

COMMENT ON COLUMN asset_catalog.industry_types IS 'Array of industry types where this asset is relevant (e.g., manufacturing, office, warehouse)';
COMMENT ON COLUMN asset_catalog.location_types IS 'Array of location types where this asset is used (e.g., office, plant, warehouse, home, transit)';
COMMENT ON COLUMN asset_catalog.priority IS 'Typical importance level of this asset (critical, high, medium, low)';
COMMENT ON COLUMN asset_catalog.tags IS 'Additional searchable tags for better filtering';

COMMENT ON COLUMN threat_catalog.industry_types IS 'Array of industry types where this threat is relevant';
COMMENT ON COLUMN threat_catalog.regions IS 'Array of geographic regions where this threat is common (e.g., mexico, usa, latam, europe)';
COMMENT ON COLUMN threat_catalog.severity IS 'Typical severity level of this threat (critical, high, medium, low)';
COMMENT ON COLUMN threat_catalog.tags IS 'Additional searchable tags for better filtering';
