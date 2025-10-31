/*
  # Modify scenarios table to support direct assets and threats

  1. Changes
    - Add asset_id column (reference to assets table)
    - Make site_asset_id nullable (for backwards compatibility)
    - Add constraint to ensure either site_asset_id OR asset_id is present
    - Add status column for workflow (pending, in_evaluation, evaluated)
    - Add created_by column to track who created the scenario

  2. Security
    - Existing RLS policies will continue to work via site_id
*/

-- Add new columns
ALTER TABLE scenarios
  ADD COLUMN IF NOT EXISTS asset_id uuid REFERENCES assets(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending' CHECK (status IN ('pending', 'in_evaluation', 'evaluated')),
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES users(id);

-- Make site_asset_id nullable for new scenarios using direct assets
ALTER TABLE scenarios
  ALTER COLUMN site_asset_id DROP NOT NULL;

-- Drop old unique constraint
ALTER TABLE scenarios
  DROP CONSTRAINT IF EXISTS scenarios_site_asset_id_threat_id_key;

-- Add new constraint: must have either site_asset_id OR asset_id (but not both)
ALTER TABLE scenarios
  ADD CONSTRAINT scenarios_asset_reference_check
  CHECK (
    (site_asset_id IS NOT NULL AND asset_id IS NULL) OR
    (site_asset_id IS NULL AND asset_id IS NOT NULL)
  );

-- Add unique constraint for the new system (site + asset + threat)
ALTER TABLE scenarios
  ADD CONSTRAINT scenarios_site_asset_threat_unique
  UNIQUE NULLS NOT DISTINCT (site_id, asset_id, threat_id);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_scenarios_asset_id ON scenarios(asset_id);
CREATE INDEX IF NOT EXISTS idx_scenarios_status ON scenarios(status);
