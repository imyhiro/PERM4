import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import { supabase } from '../lib/supabase';
import { ChevronDown, LogOut, User, RefreshCw, Shield, Settings, Briefcase, Eye, Sparkles, Zap, Crown, Camera } from 'lucide-react';
import { AvatarUpload } from './AvatarUpload';
import type { Database } from '../lib/database.types';

type Organization = Database['public']['Tables']['organizations']['Row'];
type Site = Database['public']['Tables']['sites']['Row'];

export function Header() {
  const { profile, signOut } = useAuth();
  const { selectedOrganizationId, selectedSiteId, setSelectedOrganizationId, setSelectedSiteId } = useApp();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showAvatarUpload, setShowAvatarUpload] = useState(false);
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string | null>(profile?.avatar_url || null);

  // Reset selectors when user changes (logout/login)
  useEffect(() => {
    setSelectedOrganizationId(null);
    setSelectedSiteId(null);
    loadOrganizations();
  }, [profile?.id]); // Trigger when user ID changes (including null)

  // Sync avatar URL when profile changes
  useEffect(() => {
    setCurrentAvatarUrl(profile?.avatar_url || null);
  }, [profile?.avatar_url]);

  useEffect(() => {
    loadSites(selectedOrganizationId);
  }, [selectedOrganizationId]);

  const loadOrganizations = async () => {
    if (!profile) {
      setOrganizations([]);
      setSites([]);
      return;
    }

    try {
      console.log('Loading organizations for user:', profile.email, 'role:', profile.role);

      // RLS policies handle filtering based on role and organization_id in JWT
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .order('name');

      console.log('Organizations query result:', { data, error });

      if (error) {
        console.error('Error loading organizations:', error);
        setOrganizations([]);
        return;
      }

      console.log('Setting organizations:', data);
      setOrganizations(data || []);

      // Don't auto-select - let user choose or keep "Todas" by default
    } catch (error) {
      console.error('Error loading organizations:', error);
      setOrganizations([]);
    }
  };

  const loadSites = async (organizationId: string | null) => {
    if (!profile) return;

    try {
      // RLS policies handle filtering based on role and organization_id in JWT
      let query = supabase.from('sites').select('*');

      // If an organization is selected, filter by it. Otherwise show all sites.
      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }

      const { data, error } = await query.order('name');

      if (error) {
        console.error('Error loading sites:', error);
        setSites([]);
        return;
      }

      setSites(data || []);

      // Don't auto-select - let user choose or keep "Todos" by default
    } catch (error) {
      console.error('Error loading sites:', error);
      setSites([]);
    }
  };

  const handleAvatarUpdated = (newUrl: string) => {
    setCurrentAvatarUrl(newUrl || null);
    // Recargar perfil para sincronizar
    window.location.reload();
  };

  const handleSignOut = async () => {
    await signOut();
    setShowUserMenu(false);
  };

  const handleRefreshSession = async () => {
    setRefreshing(true);
    try {
      const { error } = await supabase.auth.refreshSession();
      if (error) {
        console.error('Error refreshing session:', error);
        alert('Error al refrescar sesión. Por favor cierra sesión e inicia sesión nuevamente.');
      } else {
        console.log('Session refreshed successfully');
        // Reload organizations after refresh
        await loadOrganizations();
        alert('Sesión actualizada. Si no ves las organizaciones, cierra sesión e inicia sesión nuevamente.');
      }
    } catch (error) {
      console.error('Error refreshing session:', error);
      alert('Error al refrescar sesión. Por favor cierra sesión e inicia sesión nuevamente.');
    } finally {
      setRefreshing(false);
    }
  };

  const selectedOrganization = organizations.find(org => org.id === selectedOrganizationId);
  const selectedSite = sites.find(site => site.id === selectedSiteId);

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'super_admin':
        return <Shield className="w-3 h-3" />;
      case 'admin':
        return <Settings className="w-3 h-3" />;
      case 'consultant':
        return <Briefcase className="w-3 h-3" />;
      case 'reader':
        return <Eye className="w-3 h-3" />;
      default:
        return null;
    }
  };

  const getPlanIcon = (licenseType: string) => {
    switch (licenseType) {
      case 'free':
        return <Sparkles className="w-3 h-3" />;
      case 'pro':
        return <Zap className="w-3 h-3" />;
      case 'promax':
        return <Crown className="w-3 h-3" />;
      default:
        return null;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'Super Admin';
      case 'admin':
        return 'Administrador';
      case 'consultant':
        return 'Consultor';
      case 'reader':
        return 'Lector';
      default:
        return role;
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-3.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {(profile?.role === 'super_admin' || profile?.role === 'admin' || organizations.length > 0) && (
            <div className="relative">
              <select
                value={selectedOrganizationId || ''}
                onChange={(e) => setSelectedOrganizationId(e.target.value || null)}
                className="appearance-none bg-white border border-gray-300 rounded-md px-3 py-1.5 pr-8 text-sm font-medium text-gray-700 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
              >
                <option value="">Todas (organizaciones)</option>
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
            </div>
          )}

          {sites.length > 0 && (
            <div className="relative">
              <select
                value={selectedSiteId || ''}
                onChange={(e) => setSelectedSiteId(e.target.value || null)}
                className="appearance-none bg-white border border-gray-300 rounded-md px-3 py-1.5 pr-8 text-sm font-medium text-gray-700 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
              >
                <option value="">Todos (sitios)</option>
                {sites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
            </div>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-md hover:bg-gray-100 transition-colors"
          >
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">{profile?.full_name}</p>
              <div className="flex items-center justify-end gap-1 mt-0.5">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gradient-to-r from-slate-100 to-slate-50 text-slate-700 text-xs font-medium shadow-sm border border-slate-200">
                  <span className="flex items-center justify-center w-4 h-4 rounded-full bg-white shadow-sm">
                    {getRoleIcon(profile?.role || '')}
                  </span>
                  {getRoleLabel(profile?.role || '')}
                </span>
              </div>
              {profile?.license_type ? (
                <div className="flex items-center justify-end gap-1 mt-1">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gradient-to-r from-blue-100 to-blue-50 text-blue-700 text-xs font-medium shadow-sm border border-blue-200">
                    <span className="flex items-center justify-center w-4 h-4 rounded-full bg-white shadow-sm">
                      {getPlanIcon(profile.license_type)}
                    </span>
                    Plan {profile.license_type.toUpperCase()}
                    {profile.site_limit ? ` • ${profile.site_limit} sitios` : ''}
                    {!profile.site_limit && profile.license_type === 'promax' ? ' • ∞ sitios' : ''}
                  </span>
                </div>
              ) : (
                <p className="text-xs text-red-600 font-medium mt-1">Sin licencia</p>
              )}
            </div>
            {currentAvatarUrl ? (
              <img
                src={currentAvatarUrl}
                alt={profile?.full_name}
                className="w-9 h-9 rounded-full object-cover border-2 border-blue-600 shadow-md"
              />
            ) : (
              <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center shadow-md">
                <User className="w-5 h-5 text-white" />
              </div>
            )}
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-50">
              <button
                onClick={() => {
                  setShowAvatarUpload(true);
                  setShowUserMenu(false);
                }}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <Camera className="w-4 h-4" />
                Cambiar foto de perfil
              </button>
              <button
                onClick={handleRefreshSession}
                disabled={refreshing}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Actualizando...' : 'Refrescar sesión'}
              </button>
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <LogOut className="w-4 h-4" />
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal de subir avatar */}
      {showAvatarUpload && profile && (
        <AvatarUpload
          userId={profile.id}
          currentAvatarUrl={currentAvatarUrl}
          onAvatarUpdated={handleAvatarUpdated}
          onClose={() => setShowAvatarUpload(false)}
        />
      )}
    </header>
  );
}
