import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import { supabase } from '../lib/supabase';
import { MapPin, Plus, X, Building2, Eye, Edit2, LayoutGrid, List, Trash2 } from 'lucide-react';
import type { Database } from '../lib/database.types';

type Site = Database['public']['Tables']['sites']['Row'];
type Organization = Database['public']['Tables']['organizations']['Row'];

export function SitesPage({ onBack }: { onBack: () => void }) {
  const { profile } = useAuth();
  const { selectedOrganizationId } = useApp();
  const [sites, setSites] = useState<Site[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingSite, setDeletingSite] = useState<Site | null>(null);
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [formData, setFormData] = useState({
    organization_id: '',
    name: '',
    industry_type: '',
    location_country: '',
    location_state: '',
    location_city: '',
    location_zone: '',
    location_address: '',
    location_type: 'office' as 'office' | 'plant' | 'warehouse' | 'home' | 'transit',
    risk_zone_classification: 'medium' as 'high' | 'medium' | 'low',
  });
  const [showCustomIndustry, setShowCustomIndustry] = useState(false);
  const [customIndustry, setCustomIndustry] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [setupProgress, setSetupProgress] = useState('');
  const [setupStats, setSetupStats] = useState<{
    assets_added: number;
    threats_added: number;
  } | null>(null);

  useEffect(() => {
    loadData();
  }, [selectedOrganizationId]);

  const loadData = async () => {
    try {
      // Load organizations (filter if one is selected)
      let orgsQuery = supabase.from('organizations').select('*');

      if (selectedOrganizationId) {
        orgsQuery = orgsQuery.eq('id', selectedOrganizationId);
      }

      const orgsResult = await orgsQuery.order('name', { ascending: true });
      if (orgsResult.error) {
        console.error('Error loading organizations:', orgsResult.error);
        setOrganizations([]);
      } else {
        setOrganizations(orgsResult.data || []);
      }

      // Load sites based on selected organization
      let sitesQuery = supabase.from('sites').select('*');

      if (selectedOrganizationId) {
        sitesQuery = sitesQuery.eq('organization_id', selectedOrganizationId);
      }

      const sitesResult = await sitesQuery.order('created_at', { ascending: false });
      if (sitesResult.error) {
        console.error('Error loading sites:', sitesResult.error);
        setSites([]);
      } else {
        console.log('Sites loaded:', sitesResult.data);
        setSites(sitesResult.data || []);
      }
    } catch (err: any) {
      console.error('Error loading data:', err);
      setError(`Error cargando datos: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    setSetupProgress('');
    setSetupStats(null);

    try {
      if (!profile?.id) throw new Error('Usuario no autenticado');

      // Step 1: Create the site and get its ID
      setSetupProgress('Creando sitio...');
      const { data: newSite, error: insertError } = await supabase
        .from('sites')
        .insert({
          ...formData,
          created_by: profile.id,
        })
        .select()
        .single();

      if (insertError) throw insertError;
      if (!newSite) throw new Error('No se pudo crear el sitio');

      // Step 2: Call smart_site_setup function
      setSetupProgress('Buscando activos y amenazas en catálogo...');
      const { data: setupResult, error: setupError } = await supabase.rpc('smart_site_setup', {
        p_site_id: newSite.id,
        p_user_id: profile.id,
      });

      if (setupError) {
        console.error('Error en smart_site_setup:', setupError);
        setError(`Sitio creado, pero hubo un problema al configurarlo: ${setupError.message}`);
      } else {
        console.log('Setup result:', setupResult);

        if (setupResult?.error) {
          setError(`Sitio creado, pero: ${setupResult.error} - ${setupResult.message || ''}`);
        } else {
          const assetsAdded = setupResult.assets_added || 0;
          const threatsAdded = setupResult.threats_added || 0;

          // Step 3: If no matches found, use AI to generate
          if (assetsAdded === 0 && threatsAdded === 0) {
            setSetupProgress('No se encontraron coincidencias... Generando con IA ✨');
            console.log('[AI] Starting generation for:', {
              site_id: newSite.id,
              industry: formData.industry_type,
              location: formData.location_type,
            });

            try {
              const response = await supabase.functions.invoke(
                'generate-security-items',
                {
                  body: {
                    site_id: newSite.id,
                    site_name: newSite.name,
                    industry_type: formData.industry_type,
                    location_type: formData.location_type,
                    location_country: formData.location_country,
                    user_id: profile.id,
                  },
                }
              );

              console.log('[AI] Full response:', response);
              console.log('[AI] Response data:', response.data);
              console.log('[AI] Response error:', response.error);

              // Check for errors in the response
              if (response.error) {
                console.error('[AI] Error response:', response.error);

                // Try to get error details from the context
                const errorContext = (response.error as any).context;
                console.log('[AI] Error context:', errorContext);

                setError(`Sitio creado sin contenido. Error al generar con IA: ${response.error.message}. Revisa la consola de Supabase.`);
              } else if (response.data?.error) {
                // Error from the function itself
                console.error('[AI] Function returned error:', response.data);
                setError(`Sitio creado sin contenido. Error: ${response.data.error}`);
              } else if (response.data?.success) {
                // Success!
                console.log('[AI] Success! Generated:', response.data);
                setSetupStats({
                  assets_added: response.data.assets_added || 0,
                  threats_added: response.data.threats_added || 0,
                });
                setSetupProgress('¡Sitio configurado con IA exitosamente! ✨');
              } else {
                console.warn('[AI] Unexpected response format:', response.data);
                setError('Sitio creado. Respuesta inesperada de la IA.');
              }
            } catch (aiErr: any) {
              console.error('[AI] Exception caught:', aiErr);
              console.error('[AI] Exception details:', {
                message: aiErr.message,
                stack: aiErr.stack,
                name: aiErr.name,
              });
              setError(`Sitio creado sin contenido. Excepción: ${aiErr.message || 'Error desconocido'}`);
            }
          } else {
            // Success with catalog matches! Show stats
            setSetupStats({
              assets_added: assetsAdded,
              threats_added: threatsAdded,
            });
            setSetupProgress('¡Sitio configurado exitosamente!');
          }
        }
      }

      // Wait a bit to show the success message, then close
      setTimeout(() => {
        setFormData({
          organization_id: '',
          name: '',
          industry_type: '',
          location_country: '',
          location_state: '',
          location_city: '',
          location_zone: '',
          location_address: '',
          location_type: 'office',
          risk_zone_classification: 'medium',
        });
        setShowCreateModal(false);
        setSetupProgress('');
        setSetupStats(null);
        setShowCustomIndustry(false);
        setCustomIndustry('');
        loadData();
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Error al crear el sitio');
      setSubmitting(false);
      setSetupProgress('');
    }
  };

  const handleView = (site: Site) => {
    setSelectedSite(site);
    setShowViewModal(true);
  };

  const handleEdit = (site: Site) => {
    setSelectedSite(site);
    setFormData({
      organization_id: site.organization_id,
      name: site.name,
      industry_type: site.industry_type,
      location_country: site.location_country,
      location_state: site.location_state,
      location_city: site.location_city,
      location_zone: site.location_zone,
      location_address: site.location_address,
      location_type: site.location_type,
      risk_zone_classification: site.risk_zone_classification,
    });
    setShowEditModal(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSite) return;

    setError('');
    setSubmitting(true);

    try {
      const { error } = await supabase
        .from('sites')
        .update(formData)
        .eq('id', selectedSite.id);

      if (error) throw error;

      setShowEditModal(false);
      setSelectedSite(null);
      loadData();
    } catch (err: any) {
      setError(err.message || 'Error al actualizar el sitio');
    } finally {
      setSubmitting(false);
    }
  };

  const getLocationTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      office: 'Oficina',
      plant: 'Planta',
      warehouse: 'Almacén',
      home: 'Hogar',
      transit: 'Tránsito',
    };
    return labels[type] || type;
  };

  const openDeleteModal = (site: Site) => {
    setDeletingSite(site);
    setError('');
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    if (!deletingSite) return;

    setError('');
    setSubmitting(true);

    try {
      const { error } = await supabase
        .from('sites')
        .delete()
        .eq('id', deletingSite.id);

      if (error) throw error;

      setShowDeleteModal(false);
      setDeletingSite(null);
      loadData();
    } catch (err: any) {
      setError(err.message || 'Error al eliminar el sitio');
    } finally {
      setSubmitting(false);
    }
  };

  const getRiskClassColor = (risk: string) => {
    const colors: Record<string, string> = {
      high: 'bg-red-100 text-red-700',
      medium: 'bg-orange-100 text-orange-700',
      low: 'bg-green-100 text-green-700',
    };
    return colors[risk] || 'bg-slate-100 text-slate-700';
  };

  const getRiskClassLabel = (risk: string) => {
    const labels: Record<string, string> = {
      high: 'Alto',
      medium: 'Medio',
      low: 'Bajo',
    };
    return labels[risk] || risk;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Sitios</h2>
          <p className="text-slate-600 mt-1">Gestiona los sitios para análisis de riesgos</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-white border border-slate-200 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded transition ${
                viewMode === 'grid'
                  ? 'bg-slate-100 text-slate-900'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
              title="Vista de tarjetas"
            >
              <LayoutGrid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded transition ${
                viewMode === 'list'
                  ? 'bg-slate-100 text-slate-900'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
              title="Vista de lista"
            >
              <List className="w-5 h-5" />
            </button>
          </div>
          {(profile?.role === 'super_admin' || profile?.role === 'admin' || profile?.role === 'consultant') && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition"
            >
              <Plus className="w-5 h-5" />
              Nuevo Sitio
            </button>
          )}
        </div>
      </div>

      {sites.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <MapPin className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No hay sitios</h3>
          <p className="text-slate-600 mb-6">Comienza agregando tu primer sitio</p>
          {(profile?.role === 'super_admin' || profile?.role === 'admin' || profile?.role === 'consultant') && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition"
            >
              <Plus className="w-5 h-5" />
              Crear Sitio
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sites.map((site) => {
            const fullAddress = `${site.location_address}, ${site.location_city}, ${site.location_state}, ${site.location_country}`;

            return (
              <div
                key={site.id}
                className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-md transition"
              >
                {site.location_address && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full h-48 bg-slate-100 overflow-hidden relative group"
                  >
                    <iframe
                      src={`https://www.google.com/maps/embed/v1/place?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'YOUR_API_KEY'}&q=${encodeURIComponent(fullAddress)}&zoom=15`}
                      className="w-full h-full border-0 pointer-events-none"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all flex items-center justify-center">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white rounded-lg px-4 py-2 shadow-lg">
                        <span className="text-sm font-medium text-slate-900 flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          Abrir en Google Maps
                        </span>
                      </div>
                    </div>
                  </a>
                )}
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <MapPin className="w-6 h-6 text-green-600" />
                    </div>
                    {site.risk_zone_classification && (
                      <span
                        className={`px-2 py-1 rounded-md text-xs font-semibold ${getRiskClassColor(
                          site.risk_zone_classification
                        )}`}
                      >
                        {getRiskClassLabel(site.risk_zone_classification)}
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-1">{site.name}</h3>
                  <p className="text-sm text-slate-600 mb-2">{site.industry_type}</p>
                  <p className="text-xs text-slate-500 mb-3">
                    {getLocationTypeLabel(site.location_type)} • {site.location_city}
                  </p>
                  <p className="text-xs text-slate-400 mb-4">{site.location_address}</p>

                  <div className="flex gap-2 pt-4 border-t border-slate-100">
                    <button
                      onClick={() => handleView(site)}
                      className="flex-1 inline-flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-lg font-medium transition text-sm"
                    >
                      <Eye className="w-4 h-4" />
                      Ver
                    </button>
                    {(profile?.role === 'super_admin' || profile?.role === 'admin') && (
                      <>
                        <button
                          onClick={() => handleEdit(site)}
                          className="flex-1 inline-flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg font-medium transition text-sm"
                        >
                          <Edit2 className="w-4 h-4" />
                          Editar
                        </button>
                        <button
                          onClick={() => openDeleteModal(site)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="Eliminar sitio"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase">Sitio</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase">Industria</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase">Ubicación</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase">Clasificación</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-slate-600 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {sites.map((site) => (
                <tr key={site.id} className="hover:bg-slate-50 transition">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <MapPin className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <div className="font-medium text-slate-900">{site.name}</div>
                        <div className="text-xs text-slate-500">{getLocationTypeLabel(site.location_type)}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{site.industry_type}</td>
                  <td className="px-6 py-4 text-slate-600">{site.location_city}, {site.location_state}</td>
                  <td className="px-6 py-4">
                    {site.risk_zone_classification && (
                      <span className={`px-2 py-1 rounded-md text-xs font-semibold ${getRiskClassColor(site.risk_zone_classification)}`}>
                        {getRiskClassLabel(site.risk_zone_classification)}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleView(site)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition text-sm font-medium"
                      >
                        <Eye className="w-4 h-4" />
                        Ver
                      </button>
                      {(profile?.role === 'super_admin' || profile?.role === 'admin') && (
                        <>
                          <button
                            onClick={() => handleEdit(site)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-green-600 hover:bg-green-50 rounded-lg transition text-sm font-medium"
                          >
                            <Edit2 className="w-4 h-4" />
                            Editar
                          </button>
                          <button
                            onClick={() => openDeleteModal(site)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-lg transition text-sm font-medium"
                          >
                            <Trash2 className="w-4 h-4" />
                            Eliminar
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 my-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-900">Nuevo Sitio</h3>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setError('');
                  setShowCustomIndustry(false);
                  setCustomIndustry('');
                }}
                className="p-2 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label htmlFor="organization_id" className="block text-sm font-medium text-slate-700 mb-2">
                  Organización
                </label>
                <select
                  id="organization_id"
                  value={formData.organization_id}
                  onChange={(e) => setFormData({ ...formData, organization_id: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                  required
                >
                  <option value="">Selecciona una organización</option>
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-2">
                    Nombre del Sitio
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                    placeholder="Planta Monterrey"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="industry_type" className="block text-sm font-medium text-slate-700 mb-2">
                    Tipo de Industria
                  </label>
                  {!showCustomIndustry ? (
                    <select
                      id="industry_type"
                      value={formData.industry_type}
                      onChange={(e) => {
                        if (e.target.value === 'custom') {
                          setShowCustomIndustry(true);
                          setFormData({ ...formData, industry_type: '' });
                        } else {
                          setFormData({ ...formData, industry_type: e.target.value });
                        }
                      }}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                      required={!showCustomIndustry}
                    >
                      <option value="">Selecciona un tipo</option>
                      <option value="manufacturing">Manufactura</option>
                      <option value="retail">Retail / Comercio</option>
                      <option value="banking">Banca / Finanzas</option>
                      <option value="logistics">Logística / Transporte</option>
                      <option value="office">Oficinas / Corporativo</option>
                      <option value="healthcare">Salud / Hospitales</option>
                      <option value="education">Educación / Escuelas</option>
                      <option value="custom">✨ Otro (personalizado con IA)</option>
                    </select>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={customIndustry}
                        onChange={(e) => {
                          setCustomIndustry(e.target.value);
                          setFormData({ ...formData, industry_type: e.target.value });
                        }}
                        placeholder="ej: Aeropuertos, Hoteles, Minería..."
                        className="flex-1 px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setShowCustomIndustry(false);
                          setCustomIndustry('');
                          setFormData({ ...formData, industry_type: '' });
                        }}
                        className="px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition"
                        title="Volver a selector"
                      >
                        ↩️
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="location_type" className="block text-sm font-medium text-slate-700 mb-2">
                    Tipo de Ubicación
                  </label>
                  <select
                    id="location_type"
                    value={formData.location_type}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        location_type: e.target.value as typeof formData.location_type,
                      })
                    }
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                    required
                  >
                    <option value="office">Oficina</option>
                    <option value="plant">Planta</option>
                    <option value="warehouse">Almacén</option>
                    <option value="home">Hogar</option>
                    <option value="transit">Tránsito</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="risk_zone_classification"
                    className="block text-sm font-medium text-slate-700 mb-2"
                  >
                    Clasificación de Riesgo
                  </label>
                  <select
                    id="risk_zone_classification"
                    value={formData.risk_zone_classification}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        risk_zone_classification: e.target.value as typeof formData.risk_zone_classification,
                      })
                    }
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                  >
                    <option value="low">Bajo</option>
                    <option value="medium">Medio</option>
                    <option value="high">Alto</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label htmlFor="location_country" className="block text-sm font-medium text-slate-700 mb-2">
                    País
                  </label>
                  <input
                    id="location_country"
                    type="text"
                    value={formData.location_country}
                    onChange={(e) => setFormData({ ...formData, location_country: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                    placeholder="México"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="location_state" className="block text-sm font-medium text-slate-700 mb-2">
                    Estado
                  </label>
                  <input
                    id="location_state"
                    type="text"
                    value={formData.location_state}
                    onChange={(e) => setFormData({ ...formData, location_state: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                    placeholder="Nuevo León"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="location_city" className="block text-sm font-medium text-slate-700 mb-2">
                    Ciudad
                  </label>
                  <input
                    id="location_city"
                    type="text"
                    value={formData.location_city}
                    onChange={(e) => setFormData({ ...formData, location_city: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                    placeholder="Monterrey"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="location_zone" className="block text-sm font-medium text-slate-700 mb-2">
                  Zona
                </label>
                <input
                  id="location_zone"
                  type="text"
                  value={formData.location_zone}
                  onChange={(e) => setFormData({ ...formData, location_zone: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                  placeholder="Zona industrial"
                />
              </div>

              <div>
                <label htmlFor="location_address" className="block text-sm font-medium text-slate-700 mb-2">
                  Dirección
                </label>
                <textarea
                  id="location_address"
                  value={formData.location_address}
                  onChange={(e) => setFormData({ ...formData, location_address: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition resize-none"
                  rows={2}
                  placeholder="Calle y número"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {setupProgress && (
                <div className="bg-blue-50 border border-blue-200 px-4 py-3 rounded-lg">
                  <div className="flex items-center gap-3">
                    {!setupStats && (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-medium text-blue-900">{setupProgress}</p>
                      {setupStats && (
                        <div className="mt-2 flex gap-4 text-xs text-blue-700">
                          <span>✓ {setupStats.assets_added} activos agregados</span>
                          <span>✓ {setupStats.threats_added} amenazas agregadas</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setError('');
                    setSetupProgress('');
                    setSetupStats(null);
                    setShowCustomIndustry(false);
                    setCustomIndustry('');
                  }}
                  className="flex-1 px-4 py-3 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition"
                  disabled={submitting}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Creando...' : 'Crear Sitio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showViewModal && selectedSite && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900">Detalles del Sitio</h2>
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedSite(null);
                }}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {selectedSite.location_address && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    `${selectedSite.location_address}, ${selectedSite.location_city}, ${selectedSite.location_state}, ${selectedSite.location_country}`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full h-80 bg-slate-100 overflow-hidden rounded-lg relative group"
                >
                  <iframe
                    src={`https://www.google.com/maps/embed/v1/place?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'YOUR_API_KEY'}&q=${encodeURIComponent(
                      `${selectedSite.location_address}, ${selectedSite.location_city}, ${selectedSite.location_state}, ${selectedSite.location_country}`
                    )}&zoom=15`}
                    className="w-full h-full border-0 pointer-events-none"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white rounded-lg px-6 py-3 shadow-lg">
                      <span className="text-base font-medium text-slate-900 flex items-center gap-2">
                        <MapPin className="w-5 h-5" />
                        Abrir en Google Maps
                      </span>
                    </div>
                  </div>
                </a>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Nombre del Sitio
                  </label>
                  <p className="text-slate-900">{selectedSite.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Tipo de Industria
                  </label>
                  <p className="text-slate-900">{selectedSite.industry_type}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Tipo de Ubicación
                  </label>
                  <p className="text-slate-900">{getLocationTypeLabel(selectedSite.location_type)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Clasificación de Riesgo
                  </label>
                  <span
                    className={`inline-block px-3 py-1 rounded-md text-sm font-semibold ${getRiskClassColor(
                      selectedSite.risk_zone_classification
                    )}`}
                  >
                    {getRiskClassLabel(selectedSite.risk_zone_classification)}
                  </span>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-4">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Ubicación</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">País</label>
                    <p className="text-slate-900">{selectedSite.location_country}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Estado</label>
                    <p className="text-slate-900">{selectedSite.location_state}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Ciudad</label>
                    <p className="text-slate-900">{selectedSite.location_city}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Zona</label>
                    <p className="text-slate-900">{selectedSite.location_zone}</p>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Dirección
                    </label>
                    <p className="text-slate-900">{selectedSite.location_address}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showEditModal && selectedSite && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full my-8">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-2xl font-bold text-slate-900">Editar Sitio</h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedSite(null);
                  setError('');
                }}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="p-6">
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Organización
                  </label>
                  <select
                    value={formData.organization_id}
                    onChange={(e) =>
                      setFormData({ ...formData, organization_id: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    required
                  >
                    <option value="">Seleccionar organización</option>
                    {organizations.map((org) => (
                      <option key={org.id} value={org.id}>
                        {org.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Nombre del Sitio
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Tipo de Industria
                    </label>
                    <select
                      value={formData.industry_type}
                      onChange={(e) =>
                        setFormData({ ...formData, industry_type: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      required
                    >
                      <option value="">Selecciona un tipo</option>
                      <option value="manufacturing">Manufactura</option>
                      <option value="retail">Retail / Comercio</option>
                      <option value="banking">Banca / Finanzas</option>
                      <option value="logistics">Logística / Transporte</option>
                      <option value="office">Oficinas / Corporativo</option>
                      <option value="healthcare">Salud / Hospitales</option>
                      <option value="education">Educación / Escuelas</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Tipo de Ubicación
                    </label>
                    <select
                      value={formData.location_type}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          location_type: e.target.value as any,
                        })
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      required
                    >
                      <option value="office">Oficina</option>
                      <option value="plant">Planta</option>
                      <option value="warehouse">Almacén</option>
                      <option value="home">Hogar</option>
                      <option value="transit">Tránsito</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Clasificación de Riesgo
                    </label>
                    <select
                      value={formData.risk_zone_classification}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          risk_zone_classification: e.target.value as any,
                        })
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      required
                    >
                      <option value="high">Alto</option>
                      <option value="medium">Medio</option>
                      <option value="low">Bajo</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">País</label>
                    <input
                      type="text"
                      value={formData.location_country}
                      onChange={(e) =>
                        setFormData({ ...formData, location_country: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Estado</label>
                    <input
                      type="text"
                      value={formData.location_state}
                      onChange={(e) =>
                        setFormData({ ...formData, location_state: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Ciudad</label>
                    <input
                      type="text"
                      value={formData.location_city}
                      onChange={(e) =>
                        setFormData({ ...formData, location_city: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Zona</label>
                    <input
                      type="text"
                      value={formData.location_zone}
                      onChange={(e) =>
                        setFormData({ ...formData, location_zone: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Dirección
                  </label>
                  <input
                    type="text"
                    value={formData.location_address}
                    onChange={(e) =>
                      setFormData({ ...formData, location_address: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedSite(null);
                    setError('');
                  }}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition disabled:opacity-50"
                >
                  {submitting ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteModal && deletingSite && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-900">Eliminar Sitio</h3>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletingSite(null);
                  setError('');
                }}
                className="p-2 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>

            <div className="mb-6">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <p className="text-center text-slate-700 mb-2">
                ¿Estás seguro de que deseas eliminar el sitio <span className="font-semibold">"{deletingSite.name}"</span>?
              </p>
              <p className="text-center text-sm text-slate-500">
                Esta acción no se puede deshacer. Se eliminarán todos los activos, amenazas y análisis asociados.
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletingSite(null);
                  setError('');
                }}
                className="flex-1 px-4 py-3 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={submitting}
                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
