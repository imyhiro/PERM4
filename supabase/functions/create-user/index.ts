import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface CreateUserRequest {
  email: string;
  password: string;
  full_name: string;
  role: 'admin' | 'consultant' | 'reader';
  organization_id: string | null;
  site_ids?: string[];
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Create Supabase client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Verify the requesting user is authenticated and has permission
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      }
    );

    const { data: { user: requestingUser }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError || !requestingUser) {
      throw new Error('Unauthorized');
    }

    // Get the requesting user's profile to check role
    const { data: profile, error: profileError } = await supabaseClient
      .from('users')
      .select('role, organization_id')
      .eq('id', requestingUser.id)
      .single();

    if (profileError || !profile) {
      throw new Error('Unable to verify user permissions');
    }

    // Only super_admin, admin, and consultant can create users
    if (!['super_admin', 'admin', 'consultant'].includes(profile.role)) {
      throw new Error('Insufficient permissions');
    }

    // Parse request body
    const body: CreateUserRequest = await req.json();
    const { email, password, full_name, role, organization_id, site_ids } = body;

    // Validate permissions based on role
    if (profile.role === 'consultant' && role !== 'reader') {
      throw new Error('Consultants can only create readers');
    }

    if (profile.role === 'admin' && role === 'super_admin') {
      throw new Error('Admins cannot create super admins');
    }

    // Create the user using admin API
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
      },
    });

    if (createError || !newUser.user) {
      throw new Error(createError?.message || 'Failed to create user');
    }

    // Update user profile with role and organization
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        full_name,
        role,
        organization_id: organization_id || null,
      })
      .eq('id', newUser.user.id);

    if (updateError) {
      // Rollback: delete the auth user
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      throw new Error(updateError.message);
    }

    // Assign sites if provided
    if (site_ids && site_ids.length > 0) {
      const siteAccess = site_ids.map((siteId) => ({
        user_id: newUser.user.id,
        site_id: siteId,
      }));

      const { error: accessError } = await supabaseAdmin
        .from('user_site_access')
        .insert(siteAccess);

      if (accessError) {
        // Rollback: delete the user and auth user
        await supabaseAdmin.from('users').delete().eq('id', newUser.user.id);
        await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
        throw new Error(accessError.message);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: newUser.user.id,
          email: newUser.user.email,
          full_name,
          role,
          organization_id,
        },
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});