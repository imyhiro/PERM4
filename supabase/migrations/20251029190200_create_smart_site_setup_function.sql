/*
  # Smart Site Setup Function

  ## Purpose
  Automatically populate a newly created site with relevant assets and threats
  based on the site's context (industry_type, location_type, country).

  ## How It Works
  1. Receives a site_id
  2. Analyzes site context (industry, location, country)
  3. Finds matching assets from asset_catalog
  4. Finds matching threats from threat_catalog
  5. Creates initial asset and threat records for the site
  6. Returns statistics about what was created

  ## Usage
  SELECT * FROM smart_site_setup('site-uuid-here', 'user-uuid-here');

  ## Returns
  JSON object with:
  - assets_added: number of assets created
  - threats_added: number of threats created
  - site_name: name of the site
  - industry_type: industry type
  - location_type: location type
*/

-- =============================================
-- DROP EXISTING FUNCTION (if exists)
-- =============================================

DROP FUNCTION IF EXISTS smart_site_setup(uuid, uuid);

-- =============================================
-- CREATE SMART SITE SETUP FUNCTION
-- =============================================

CREATE OR REPLACE FUNCTION smart_site_setup(
  p_site_id uuid,
  p_user_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_site_info RECORD;
  v_assets_added integer := 0;
  v_threats_added integer := 0;
  v_region text;
  v_asset RECORD;
  v_threat RECORD;
BEGIN
  -- =============================================
  -- STEP 1: Get site information
  -- =============================================
  SELECT
    id,
    name,
    industry_type,
    location_type,
    location_country,
    organization_id
  INTO v_site_info
  FROM sites
  WHERE id = p_site_id;

  -- If site not found, return error
  IF NOT FOUND THEN
    RETURN json_build_object(
      'error', 'Site not found',
      'site_id', p_site_id
    );
  END IF;

  -- =============================================
  -- STEP 2: Determine region for threat matching
  -- =============================================
  -- Map countries to regions used in threat_catalog
  CASE
    WHEN LOWER(v_site_info.location_country) LIKE '%mexico%' OR LOWER(v_site_info.location_country) LIKE '%méxi%' THEN
      v_region := 'mexico';
    WHEN LOWER(v_site_info.location_country) IN ('usa', 'united states', 'estados unidos') THEN
      v_region := 'usa';
    ELSE
      v_region := 'latam'; -- Default to latam for other countries
  END CASE;

  -- =============================================
  -- STEP 3: Find and create matching ASSETS
  -- =============================================
  -- Match assets where:
  -- 1. is_global = true (from catalog)
  -- 2. industry_types array contains site's industry_type
  -- 3. location_types array contains site's location_type
  -- 4. Priority is critical or high (to avoid overwhelming)

  FOR v_asset IN
    SELECT
      id,
      name,
      description,
      category,
      priority
    FROM asset_catalog
    WHERE is_global = true
      AND (
        v_site_info.industry_type = ANY(industry_types)
        OR industry_types = '{}'  -- Empty array means applies to all
      )
      AND (
        v_site_info.location_type = ANY(location_types)
        OR location_types = '{}'  -- Empty array means applies to all
      )
      AND priority IN ('critical', 'high')  -- Only import critical and high priority
    ORDER BY
      CASE priority
        WHEN 'critical' THEN 1
        WHEN 'high' THEN 2
        WHEN 'medium' THEN 3
        ELSE 4
      END,
      name
  LOOP
    -- Create asset record for this site
    INSERT INTO assets (
      site_id,
      name,
      type,
      description,
      value,
      location,
      owner,
      status,
      created_by,
      created_at,
      updated_at
    ) VALUES (
      p_site_id,
      v_asset.name,
      v_asset.category,
      v_asset.description,
      v_asset.priority,
      v_site_info.name,
      '',
      'operational',
      p_user_id,
      now(),
      now()
    );

    v_assets_added := v_assets_added + 1;
  END LOOP;

  -- =============================================
  -- STEP 4: Find and create matching THREATS
  -- =============================================
  -- Match threats where:
  -- 1. is_global = true (from catalog)
  -- 2. industry_types array contains site's industry_type
  -- 3. regions array contains the site's region
  -- 4. Severity is critical or high

  FOR v_threat IN
    SELECT
      id,
      name,
      description,
      category,
      severity
    FROM threat_catalog
    WHERE is_global = true
      AND (
        v_site_info.industry_type = ANY(industry_types)
        OR industry_types = '{}'  -- Empty array means applies to all
      )
      AND (
        v_region = ANY(regions)
        OR regions = '{}'  -- Empty array means applies to all
      )
      AND severity IN ('critical', 'high')  -- Only import critical and high severity
    ORDER BY
      CASE severity
        WHEN 'critical' THEN 1
        WHEN 'high' THEN 2
        WHEN 'medium' THEN 3
        ELSE 4
      END,
      name
  LOOP
    -- Create threat record for this site
    INSERT INTO threats (
      site_id,
      name,
      category,
      description,
      probability,
      impact,
      risk_level,
      mitigation_measures,
      status,
      created_by,
      created_at,
      updated_at
    ) VALUES (
      p_site_id,
      v_threat.name,
      v_threat.category,
      v_threat.description,
      CASE v_threat.severity
        WHEN 'critical' THEN 'high'
        WHEN 'high' THEN 'high'
        ELSE 'medium'
      END,
      CASE v_threat.severity
        WHEN 'critical' THEN 'high'
        WHEN 'high' THEN 'high'
        ELSE 'medium'
      END,
      CASE v_threat.severity
        WHEN 'critical' THEN 'critical'
        WHEN 'high' THEN 'high'
        ELSE 'medium'
      END,
      '',
      'active',
      p_user_id,
      now(),
      now()
    );

    v_threats_added := v_threats_added + 1;
  END LOOP;

  -- =============================================
  -- STEP 5: Return results
  -- =============================================
  RETURN json_build_object(
    'success', true,
    'site_id', p_site_id,
    'site_name', v_site_info.name,
    'industry_type', v_site_info.industry_type,
    'location_type', v_site_info.location_type,
    'location_country', v_site_info.location_country,
    'region_matched', v_region,
    'assets_added', v_assets_added,
    'threats_added', v_threats_added,
    'total_items', v_assets_added + v_threats_added
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Return error information
    RETURN json_build_object(
      'error', 'Function execution failed',
      'message', SQLERRM,
      'site_id', p_site_id
    );
END;
$$;

-- =============================================
-- GRANT PERMISSIONS
-- =============================================

-- Allow authenticated users to execute this function
GRANT EXECUTE ON FUNCTION smart_site_setup(uuid, uuid) TO authenticated;

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON FUNCTION smart_site_setup(uuid, uuid) IS
'Automatically populates a new site with relevant assets and threats based on industry type, location type, and country. Returns JSON with statistics about items created.';
