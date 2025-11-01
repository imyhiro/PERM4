/*
  # Rollback: Move License System back to Organizations

  ## WARNING
  This rollback script should ONLY be used if the license migration fails.
  Run this ONLY if you need to revert to the previous license system.

  ## Changes (Reverse)
  - Remove license fields from users table
  - Restore license fields to organizations table
*/

-- Step 1: Restore license fields to organizations table
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS license_type text NOT NULL DEFAULT 'free' CHECK (license_type IN ('free', 'pro')),
  ADD COLUMN IF NOT EXISTS license_limit integer NOT NULL DEFAULT 3 CHECK (license_limit > 0);

-- Step 2: Remove license fields from users table
ALTER TABLE users
  DROP COLUMN IF EXISTS license_type,
  DROP COLUMN IF EXISTS site_limit,
  DROP COLUMN IF EXISTS org_limit,
  DROP COLUMN IF EXISTS license_status,
  DROP COLUMN IF EXISTS payment_frequency,
  DROP COLUMN IF EXISTS subscription_start_date,
  DROP COLUMN IF EXISTS subscription_end_date;

-- Step 3: Drop indexes
DROP INDEX IF EXISTS idx_users_license_type;
DROP INDEX IF EXISTS idx_users_license_status;

-- Note: This rollback assumes no critical data was stored in the user license fields
