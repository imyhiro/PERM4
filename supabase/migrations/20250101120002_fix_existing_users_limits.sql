/*
  # Fix existing users - Ensure all users have license limits set

  ## Problem
  After migration, existing users may have NULL values for site_limit and org_limit
  causing login issues when the frontend tries to access these fields.

  ## Solution
  Set default values for all users based on their license_type
*/

-- Update all FREE users to have proper limits
UPDATE users
SET
  site_limit = 3,
  org_limit = 1
WHERE license_type = 'free' AND (site_limit IS NULL OR org_limit IS NULL);

-- Update all PRO users (if any exist) to have proper limits
UPDATE users
SET
  site_limit = 10,
  org_limit = NULL  -- NULL means unlimited
WHERE license_type = 'pro' AND site_limit IS NULL;

-- Update all PROMAX users (if any exist) to have proper limits
UPDATE users
SET
  site_limit = NULL,  -- NULL means unlimited
  org_limit = NULL    -- NULL means unlimited
WHERE license_type = 'promax' AND (site_limit IS NOT NULL OR org_limit IS NOT NULL);

-- Verify the changes
-- You can run this query to check:
-- SELECT id, email, license_type, site_limit, org_limit, license_status FROM users;
