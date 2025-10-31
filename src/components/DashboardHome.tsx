import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import { supabase } from '../lib/supabase';
import { Building2, MapPin, Users, Shield, AlertTriangle, TrendingUp } from 'lucide-react';

interface DashboardHomeProps {
  onNavigate?: (page: string) => void;
}

export function DashboardHome({ onNavigate }: DashboardHomeProps) {
  const { profile } = useAuth();
  const { selectedOrganizationId, selectedSiteId } = useApp();
  const [stats, setStats] = useState({
    organizations: 0,
    sites: 0,
    users: 0,
    assets: 0,
    threats: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    loadStats();
  }, [profile, selectedOrganizationId, selectedSiteId]);

  const loadStats = async () => {
    if (!profile) return;

    try {
      // Build queries based on selected filters
      let orgsQuery = supabase.from('organizations').select('id', { count: 'exact', head: true });
      let sitesQuery = supabase.from('sites').select('id', { count: 'exact', head: true });
      let usersQuery = supabase.from('users').select('id', { count: 'exact', head: true });
      let assetsQuery = supabase.from('assets').select('id', { count: 'exact', head: true });
      let threatsQuery = supabase.from('threats').select('id', { count: 'exact', head: true });

      // Apply site filter first (most specific)
      if (selectedSiteId) {
        // Filter sites to just the selected one
        sitesQuery = sitesQuery.eq('id', selectedSiteId);

        // Filter assets and threats by the selected site
        assetsQuery = assetsQuery.eq('site_id', selectedSiteId);
        threatsQuery = threatsQuery.eq('site_id', selectedSiteId);

        // Get the organization of this site for proper filtering
        const { data: siteData } = await supabase
          .from('sites')
          .select('organization_id')
          .eq('id', selectedSiteId)
          .single();

        if (siteData?.organization_id) {
          orgsQuery = orgsQuery.eq('id', siteData.organization_id);
          usersQuery = usersQuery.eq('organization_id', siteData.organization_id);
        }
      } else if (selectedOrganizationId) {
        // Filter by selected organization only
        orgsQuery = orgsQuery.eq('id', selectedOrganizationId);
        sitesQuery = sitesQuery.eq('organization_id', selectedOrganizationId);
        usersQuery = usersQuery.eq('organization_id', selectedOrganizationId);

        // For assets and threats, first get site IDs from this organization
        const { data: orgSites } = await supabase
          .from('sites')
          .select('id')
          .eq('organization_id', selectedOrganizationId);

        const siteIds = orgSites?.map(s => s.id) || [];

        if (siteIds.length > 0) {
          assetsQuery = assetsQuery.in('site_id', siteIds);
          threatsQuery = threatsQuery.in('site_id', siteIds);
        } else {
          // No sites in this organization, so no assets/threats
          assetsQuery = assetsQuery.eq('id', '00000000-0000-0000-0000-000000000000'); // Impossible match
          threatsQuery = threatsQuery.eq('id', '00000000-0000-0000-0000-000000000000'); // Impossible match
        }
      }

      // Execute all queries in parallel
      const [orgs, sites, users, assets, threats] = await Promise.all([
        orgsQuery,
        sitesQuery,
        usersQuery,
        assetsQuery,
        threatsQuery,
      ]);

      setStats({
        organizations: orgs.count || 0,
        sites: sites.count || 0,
        users: users.count || 0,
        assets: assets.count || 0,
        threats: threats.count || 0,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getVisibleStats = () => {
    const role = profile?.role;
    const statCards = [];

    if (role === 'super_admin' || role === 'admin') {
      statCards.push({
        label: 'Organizaciones',
        value: stats.organizations,
        icon: Building2,
        color: 'bg-blue-500',
        bgColor: 'bg-blue-50',
        page: 'organizations',
      });
    }

    statCards.push({
      label: 'Sitios',
      value: stats.sites,
      icon: MapPin,
      color: 'bg-green-500',
      bgColor: 'bg-green-50',
      page: 'sites',
    });

    if (role === 'super_admin') {
      statCards.push({
        label: 'Usuarios',
        value: stats.users,
        icon: Users,
        color: 'bg-orange-500',
        bgColor: 'bg-orange-50',
        page: 'users',
      });
    }

    statCards.push(
      {
        label: 'Activos',
        value: stats.assets,
        icon: Shield,
        color: 'bg-blue-500',
        bgColor: 'bg-blue-50',
        page: 'assets',
      },
      {
        label: 'Amenazas',
        value: stats.threats,
        icon: AlertTriangle,
        color: 'bg-red-500',
        bgColor: 'bg-red-50',
        page: 'threats',
      }
    );

    return statCards;
  };

  const visibleStats = getVisibleStats();

  const getFilterDescription = () => {
    if (selectedSiteId) {
      return 'Mostrando datos del sitio seleccionado';
    } else if (selectedOrganizationId) {
      return 'Mostrando datos de la organización seleccionada';
    } else {
      return 'Mostrando todos los datos del sistema';
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">{getFilterDescription()}</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse">
              <div className="h-12 w-12 bg-gray-200 rounded-lg mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-16"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {visibleStats.map((stat, index) => (
            <button
              key={index}
              onClick={() => onNavigate?.(stat.page)}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer text-left hover:border-blue-300"
            >
              <div className={`${stat.bgColor} w-12 h-12 rounded-lg flex items-center justify-center mb-4`}>
                <stat.icon className={`w-6 h-6 ${stat.color.replace('bg-', 'text-')}`} />
              </div>
              <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
              <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
            </button>
          ))}
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Resumen de Actividad</h2>
          </div>
          <p className="text-gray-600 text-sm">
            Sistema de análisis y gestión de riesgos operativo. Use el menú lateral para navegar entre las diferentes secciones.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Acceso Rápido</h2>
          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              Gestione sus organizaciones, sitios, activos y amenazas desde el menú de navegación.
            </p>
            <p className="text-sm text-gray-600">
              Los selectores en el encabezado le permiten filtrar la información por organización y sitio.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
