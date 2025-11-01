/*
  # Move License System from Organizations to Users

  ## Changes

  ### Users Table (ADD)
  - `license_type` (text) - 'free', 'pro', or 'promax' (default: 'free')
  - `site_limit` (integer, nullable) - Max sites allowed (3 for free, 10 for pro, null for promax)
  - `org_limit` (integer, nullable) - Max organizations (1 for free, null for pro/promax)
  - `license_status` (text) - 'active', 'expired', 'cancelled' (default: 'active')
  - `payment_frequency` (text, nullable) - 'monthly', 'annual', null for free
  - `subscription_start_date` (timestamptz, nullable)
  - `subscription_end_date` (timestamptz, nullable)

  ### Organizations Table (REMOVE)
  - Drop `license_type` column
  - Drop `license_limit` column

  ## Rationale
  Licenses belong to USERS, not organizations. A user with a PRO license
  can create multiple organizations and the site limit is counted globally
  across all their organizations.

  ## Migration Strategy
  All existing users will be set to 'free' plan with default limits.
*/

-- Step 1: Add license fields to users table
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS license_type text NOT NULL DEFAULT 'free' CHECK (license_type IN ('free', 'pro', 'promax')),
  ADD COLUMN IF NOT EXISTS site_limit integer CHECK (site_limit > 0 OR site_limit IS NULL),
  ADD COLUMN IF NOT EXISTS org_limit integer CHECK (org_limit > 0 OR org_limit IS NULL),
  ADD COLUMN IF NOT EXISTS license_status text NOT NULL DEFAULT 'active' CHECK (license_status IN ('active', 'expired', 'cancelled')),
  ADD COLUMN IF NOT EXISTS payment_frequency text CHECK (payment_frequency IN ('monthly', 'annual')),
  ADD COLUMN IF NOT EXISTS subscription_start_date timestamptz,
  ADD COLUMN IF NOT EXISTS subscription_end_date timestamptz;

-- Step 2: Set default limits based on license_type for existing users
-- All existing users get FREE plan (3 sites, 1 org)
UPDATE users
SET
  site_limit = 3,
  org_limit = 1
WHERE license_type = 'free' AND site_limit IS NULL;

-- Step 3: Create index for faster license queries
CREATE INDEX IF NOT EXISTS idx_users_license_type ON users(license_type);
CREATE INDEX IF NOT EXISTS idx_users_license_status ON users(license_status);

-- Step 4: Remove license fields from organizations table
ALTER TABLE organizations
  DROP COLUMN IF EXISTS license_type,
  DROP COLUMN IF EXISTS license_limit;

-- Step 5: Add comment to document the change
COMMENT ON COLUMN users.license_type IS 'User subscription plan: free (3 sites, 1 org), pro (10 sites, unlimited orgs), promax (unlimited)';
COMMENT ON COLUMN users.site_limit IS 'Maximum number of sites allowed. NULL means unlimited (promax plan)';
COMMENT ON COLUMN users.org_limit IS 'Maximum number of organizations allowed. NULL means unlimited (pro/promax plans)';
