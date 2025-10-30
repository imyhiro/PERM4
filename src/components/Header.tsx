import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import { supabase } from '../lib/supabase';
import { ChevronDown, LogOut, User, RefreshCw } from 'lucide-react';
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

  // Reset selectors when user changes (logout/login)
  useEffect(() => {
    setSelectedOrganizationId(null);
    setSelectedSiteId(null);
    loadOrganizations();
  }, [profile?.id]); // Trigger when user ID changes (including null)

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
              <p className="text-xs text-gray-500 capitalize">{profile?.role}</p>
            </div>
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-50">
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
    </header>
  );
}
