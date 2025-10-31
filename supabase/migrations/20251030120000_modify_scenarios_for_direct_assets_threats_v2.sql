/*
  # Modify scenarios table to support direct assets and threats (Safe version)

  1. Changes
    - Add asset_id column (reference to assets table)
    - Make site_asset_id nullable (for backwards compatibility)
    - Add constraint to ensure either site_asset_id OR asset_id is present
    - Add status column for workflow (pending, in_evaluation, evaluated)
    - Add created_by column to track who created the scenario

  2. Security
    - Existing RLS policies will continue to work via site_id
*/

-- Add new columns (safe to run multiple times)
ALTER TABLE scenarios
  ADD COLUMN IF NOT EXISTS asset_id uuid REFERENCES assets(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES users(id);

-- Add check constraint for status (drop and recreate to be safe)
ALTER TABLE scenarios DROP CONSTRAINT IF EXISTS scenarios_status_check;
ALTER TABLE scenarios ADD CONSTRAINT scenarios_status_check
  CHECK (status IN ('pending', 'in_evaluation', 'evaluated'));

-- Make site_asset_id nullable for new scenarios using direct assets
DO $$
BEGIN
  ALTER TABLE scenarios ALTER COLUMN site_asset_id DROP NOT NULL;
EXCEPTION
  WHEN others THEN NULL;
END $$;

-- Drop old unique constraint if it exists
ALTER TABLE scenarios DROP CONSTRAINT IF EXISTS scenarios_site_asset_id_threat_id_key;

-- Drop and recreate asset reference check constraint
ALTER TABLE scenarios DROP CONSTRAINT IF EXISTS scenarios_asset_reference_check;
ALTER TABLE scenarios
  ADD CONSTRAINT scenarios_asset_reference_check
  CHECK (
    (site_asset_id IS NOT NULL AND asset_id IS NULL) OR
    (site_asset_id IS NULL AND asset_id IS NOT NULL)
  );

-- Drop and recreate unique constraint for the new system (site + asset + threat)
ALTER TABLE scenarios DROP CONSTRAINT IF EXISTS scenarios_site_asset_threat_unique;
ALTER TABLE scenarios
  ADD CONSTRAINT scenarios_site_asset_threat_unique
  UNIQUE NULLS NOT DISTINCT (site_id, asset_id, threat_id);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_scenarios_asset_id ON scenarios(asset_id);
CREATE INDEX IF NOT EXISTS idx_scenarios_status ON scenarios(status);

-- Fix foreign key for threat_id (should point to threats, not threat_catalog)
ALTER TABLE scenarios DROP CONSTRAINT IF EXISTS scenarios_threat_id_fkey;
ALTER TABLE scenarios ADD CONSTRAINT scenarios_threat_id_fkey
  FOREIGN KEY (threat_id) REFERENCES threats(id) ON DELETE CASCADE;
