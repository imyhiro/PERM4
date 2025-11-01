/*
  # Fix All Tables - Remove public.users Queries from RLS Policies
  
  ## Problem
  Multiple tables have RLS policies that query public.users directly, causing
  "permission denied for table users" errors due to RLS recursion.
  
  ## Solution
  Replace ALL direct queries to public.users with helper function calls:
  - Use get_user_role() instead of querying users.role
  - Use get_user_organization_id() instead of querying users.organization_id
  
  ## Tables Fixed
  - asset_catalog
  - threat_catalog
  - asset_threat_compatibility
  - scenarios
  - site_assets
  
  ## Security
  - All policies maintain the same security model
  - Helper functions access auth.users only (no RLS recursion)
*/

-- =============================================
-- ASSET_CATALOG
-- =============================================

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'asset_catalog') THEN
    -- Drop old policies
    DROP POLICY IF EXISTS "Users can view global and their org assets" ON asset_catalog;
    DROP POLICY IF EXISTS "Admins and consultants can create org assets" ON asset_catalog;
    DROP POLICY IF EXISTS "Admins and consultants can update org assets" ON asset_catalog;
    DROP POLICY IF EXISTS "Super admins can manage all assets" ON asset_catalog;

    -- Create new policies
    EXECUTE 'CREATE POLICY "Users can view global and their org assets"
      ON asset_catalog FOR SELECT
      TO authenticated
      USING (is_global = true OR organization_id = get_user_organization_id())';

    EXECUTE 'CREATE POLICY "Admins and consultants can create org assets"
      ON asset_catalog FOR INSERT
      TO authenticated
      WITH CHECK (
        get_user_role() IN (''admin'', ''consultant'')
        AND organization_id = get_user_organization_id()
      )';

    EXECUTE 'CREATE POLICY "Admins and consultants can update org assets"
      ON asset_catalog FOR UPDATE
      TO authenticated
      USING (
        get_user_role() IN (''admin'', ''consultant'')
        AND organization_id = get_user_organization_id()
      )
      WITH CHECK (
        get_user_role() IN (''admin'', ''consultant'')
        AND organization_id = get_user_organization_id()
      )';

    EXECUTE 'CREATE POLICY "Super admins can manage all assets"
      ON asset_catalog FOR ALL
      TO authenticated
      USING (get_user_role() = ''super_admin'')
      WITH CHECK (get_user_role() = ''super_admin'')';
  END IF;
END $$;

-- =============================================
-- THREAT_CATALOG
-- =============================================

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'threat_catalog') THEN
    -- Drop old policies
    DROP POLICY IF EXISTS "Users can view global and their org threats" ON threat_catalog;
    DROP POLICY IF EXISTS "Admins and consultants can create org threats" ON threat_catalog;
    DROP POLICY IF EXISTS "Admins and consultants can update org threats" ON threat_catalog;
    DROP POLICY IF EXISTS "Super admins can manage all threats" ON threat_catalog;

    -- Create new policies
    EXECUTE 'CREATE POLICY "Users can view global and their org threats"
      ON threat_catalog FOR SELECT
      TO authenticated
      USING (is_global = true OR organization_id = get_user_organization_id())';

    EXECUTE 'CREATE POLICY "Admins and consultants can create org threats"
      ON threat_catalog FOR INSERT
      TO authenticated
      WITH CHECK (
        get_user_role() IN (''admin'', ''consultant'')
        AND organization_id = get_user_organization_id()
      )';

    EXECUTE 'CREATE POLICY "Admins and consultants can update org threats"
      ON threat_catalog FOR UPDATE
      TO authenticated
      USING (
        get_user_role() IN (''admin'', ''consultant'')
        AND organization_id = get_user_organization_id()
      )
      WITH CHECK (
        get_user_role() IN (''admin'', ''consultant'')
        AND organization_id = get_user_organization_id()
      )';

    EXECUTE 'CREATE POLICY "Super admins can manage all threats"
      ON threat_catalog FOR ALL
      TO authenticated
      USING (get_user_role() = ''super_admin'')
      WITH CHECK (get_user_role() = ''super_admin'')';
  END IF;
END $$;

-- =============================================
-- ASSET_THREAT_COMPATIBILITY
-- =============================================

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'asset_threat_compatibility') THEN
    -- Drop old policies
    DROP POLICY IF EXISTS "Users can view global and their org compatibility rules" ON asset_threat_compatibility;
    DROP POLICY IF EXISTS "Admins and consultants can create org compatibility rules" ON asset_threat_compatibility;
    DROP POLICY IF EXISTS "Super admins can manage all compatibility rules" ON asset_threat_compatibility;

    -- Create new policies
    EXECUTE 'CREATE POLICY "Users can view global and their org compatibility rules"
      ON asset_threat_compatibility FOR SELECT
      TO authenticated
      USING (is_global = true OR organization_id = get_user_organization_id())';

    EXECUTE 'CREATE POLICY "Admins and consultants can create org compatibility rules"
      ON asset_threat_compatibility FOR INSERT
      TO authenticated
      WITH CHECK (
        get_user_role() IN (''admin'', ''consultant'')
        AND organization_id = get_user_organization_id()
      )';

    EXECUTE 'CREATE POLICY "Super admins can manage all compatibility rules"
      ON asset_threat_compatibility FOR ALL
      TO authenticated
      USING (get_user_role() = ''super_admin'')
      WITH CHECK (get_user_role() = ''super_admin'')';
  END IF;
END $$;

-- =============================================
-- SCENARIOS
-- =============================================

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'scenarios') THEN
    -- Drop old policies
    DROP POLICY IF EXISTS "Admins can manage scenarios in their organization" ON scenarios;
    DROP POLICY IF EXISTS "Super admins can manage all scenarios" ON scenarios;

    -- Create new policies
    EXECUTE 'CREATE POLICY "Admins can manage scenarios in their organization"
      ON scenarios FOR ALL
      TO authenticated
      USING (
        get_user_role() = ''admin''
        AND site_id IN (
          SELECT s.id FROM sites s
          JOIN organizations o ON s.organization_id = o.id
          WHERE o.created_by = auth.uid()
        )
      )
      WITH CHECK (
        get_user_role() = ''admin''
        AND site_id IN (
          SELECT s.id FROM sites s
          JOIN organizations o ON s.organization_id = o.id
          WHERE o.created_by = auth.uid()
        )
      )';

    EXECUTE 'CREATE POLICY "Super admins can manage all scenarios"
      ON scenarios FOR ALL
      TO authenticated
      USING (get_user_role() = ''super_admin'')
      WITH CHECK (get_user_role() = ''super_admin'')';
  END IF;
END $$;

-- =============================================
-- SITE_ASSETS
-- =============================================

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'site_assets') THEN
    -- Drop old policies
    DROP POLICY IF EXISTS "Admins can manage site assets in their organization" ON site_assets;
    DROP POLICY IF EXISTS "Super admins can manage all site assets" ON site_assets;

    -- Create new policies
    EXECUTE 'CREATE POLICY "Admins can manage site assets in their organization"
      ON site_assets FOR ALL
      TO authenticated
      USING (
        get_user_role() = ''admin''
        AND site_id IN (
          SELECT s.id FROM sites s
          JOIN organizations o ON s.organization_id = o.id
          WHERE o.created_by = auth.uid()
        )
      )
      WITH CHECK (
        get_user_role() = ''admin''
        AND site_id IN (
          SELECT s.id FROM sites s
          JOIN organizations o ON s.organization_id = o.id
          WHERE o.created_by = auth.uid()
        )
      )';

    EXECUTE 'CREATE POLICY "Super admins can manage all site assets"
      ON site_assets FOR ALL
      TO authenticated
      USING (get_user_role() = ''super_admin'')
      WITH CHECK (get_user_role() = ''super_admin'')';
  END IF;
END $$;
