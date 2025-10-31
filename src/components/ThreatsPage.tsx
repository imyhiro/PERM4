import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import { supabase } from '../lib/supabase';
import { AlertTriangle, Plus, X, Eye, Edit2, Trash2, LayoutGrid, List, Search } from 'lucide-react';
import type { Database } from '../lib/database.types';

type Threat = Database['public']['Tables']['threats']['Row'];
type Site = Database['public']['Tables']['sites']['Row'];

export function ThreatsPage({ onBack }: { onBack: () => void }) {
  const { profile } = useAuth();
  const { selectedOrganizationId, selectedSiteId } = useApp();
  const [threats, setThreats] = useState<Threat[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingThreat, setDeletingThreat] = useState<Threat | null>(null);
  const [selectedThreat, setSelectedThreat] = useState<Threat | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [formData, setFormData] = useState({
    site_id: '',
    name: '',
    category: 'natural' as 'natural' | 'technological' | 'social' | 'environmental',
    description: '',
    probability: 'medium' as 'high' | 'medium' | 'low',
    impact: 'medium' as 'high' | 'medium' | 'low',
    risk_level: 'medium' as 'critical' | 'high' | 'medium' | 'low',
    mitigation_measures: '',
    status: 'active' as 'active' | 'mitigated' | 'monitoring',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [selectedThreats, setSelectedThreats] = useState<Set<string>>(new Set());
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadData();
  }, [selectedOrganizationId, selectedSiteId]);

  const loadData = async () => {
    try {
      // Load sites based on selected organization
      let sitesQuery = supabase.from('sites').select('*');

      if (selectedOrganizationId) {
        sitesQuery = sitesQuery.eq('organization_id', selectedOrganizationId);
      }

      if (profile?.role === 'consultant' || profile?.role === 'reader') {
        const { data: siteAccess } = await supabase
          .from('user_site_access')
          .select('site_id')
          .eq('user_id', profile.id);

        if (siteAccess && siteAccess.length > 0) {
          sitesQuery = sitesQuery.in('id', siteAccess.map(sa => sa.site_id));
        }
      }

      const sitesResult = await sitesQuery.order('name');
      if (sitesResult.error) throw sitesResult.error;
      setSites(sitesResult.data || []);

      // Load threats based on selected site or organization
      let threatsQuery = supabase.from('threats').select('*');

      if (selectedSiteId) {
        threatsQuery = threatsQuery.eq('site_id', selectedSiteId);
      } else if (selectedOrganizationId && sitesResult.data && sitesResult.data.length > 0) {
        const siteIds = sitesResult.data.map(s => s.id);
        threatsQuery = threatsQuery.in('site_id', siteIds);
      }

      const threatsResult = await threatsQuery.order('created_at', { ascending: false });
      if (threatsResult.error) throw threatsResult.error;
      setThreats(threatsResult.data || []);
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

    try {
      if (!profile?.id) throw new Error('Usuario no autenticado');

      const { error } = await supabase.from('threats').insert({
        ...formData,
        created_by: profile.id,
      });

      if (error) throw error;

      setFormData({
        site_id: '',
        name: '',
        category: 'natural',
        description: '',
        probability: 'medium',
        impact: 'medium',
        risk_level: 'medium',
        mitigation_measures: '',
        status: 'active',
      });
      setShowCreateModal(false);
      loadData();
    } catch (err: any) {
      setError(err.message || 'Error al crear la amenaza');
    } finally {
      setSubmitting(false);
    }
  };

  const handleView = (threat: Threat) => {
    setSelectedThreat(threat);
    setShowViewModal(true);
  };

  const handleEdit = (threat: Threat) => {
    setSelectedThreat(threat);
    setFormData({
      site_id: threat.site_id,
      name: threat.name,
      category: threat.category as any,
      description: threat.description || '',
      probability: threat.probability as any,
      impact: threat.impact as any,
      risk_level: threat.risk_level as any,
      mitigation_measures: threat.mitigation_measures || '',
      status: threat.status as any,
    });
    setShowEditModal(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedThreat) return;

    setError('');
    setSubmitting(true);

    try {
      const { error } = await supabase
        .from('threats')
        .update({ ...formData, updated_at: new Date().toISOString() })
        .eq('id', selectedThreat.id);

      if (error) throw error;

      setShowEditModal(false);
      setSelectedThreat(null);
      loadData();
    } catch (err: any) {
      setError(err.message || 'Error al actualizar la amenaza');
    } finally {
      setSubmitting(false);
    }
  };

  const getRiskLevelColor = (level: string) => {
    const colors: Record<string, string> = {
      critical: 'bg-red-600 text-white',
      high: 'bg-red-100 text-red-700',
      medium: 'bg-orange-100 text-orange-700',
      low: 'bg-green-100 text-green-700',
    };
    return colors[level] || 'bg-slate-100 text-slate-700';
  };

  const openDeleteModal = (threat: Threat) => {
    setDeletingThreat(threat);
    setError('');
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    if (!deletingThreat) return;
    setError('');
    setSubmitting(true);
    try {
      const { error } = await supabase.from('threats').delete().eq('id', deletingThreat.id);
      if (error) throw error;
      setShowDeleteModal(false);
      setDeletingThreat(null);
      loadData();
    } catch (err: any) {
      setError(err.message || 'Error al eliminar la amenaza');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelectAll = () => {
    // Get current filtered threats
    const currentFiltered = threats.filter((threat) => {
      const searchLower = searchTerm.toLowerCase();
      const nameMatch = threat.name.toLowerCase().includes(searchLower);
      const categoryMatch = getCategoryLabel(threat.category).toLowerCase().includes(searchLower);
      return nameMatch || categoryMatch;
    });

    if (selectedThreats.size === currentFiltered.length && currentFiltered.length > 0) {
      setSelectedThreats(new Set());
    } else {
      setSelectedThreats(new Set(currentFiltered.map(threat => threat.id)));
    }
  };

  const handleSelectThreat = (threatId: string) => {
    const newSelected = new Set(selectedThreats);
    if (newSelected.has(threatId)) {
      newSelected.delete(threatId);
    } else {
      newSelected.add(threatId);
    }
    setSelectedThreats(newSelected);
  };

  const handleBulkDelete = async () => {
    setError('');
    setSubmitting(true);

    try {
      const deletePromises = Array.from(selectedThreats).map(threatId =>
        supabase.from('threats').delete().eq('id', threatId)
      );

      const results = await Promise.all(deletePromises);
      const errors = results.filter(r => r.error);

      if (errors.length > 0) {
        throw new Error(`Error eliminando ${errors.length} amenaza(s)`);
      }

      setShowBulkDeleteModal(false);
      setSelectedThreats(new Set());
      loadData();
    } catch (err: any) {
      setError(err.message || 'Error al eliminar las amenazas');
    } finally {
      setSubmitting(false);
    }
  };

  const getRiskLevelLabel = (level: string) => {
    const labels: Record<string, string> = {
      critical: 'Crítico',
      high: 'Alto',
      medium: 'Medio',
      low: 'Bajo',
    };
    return labels[level] || level;
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      natural: 'Natural',
      technological: 'Tecnológico',
      social: 'Social',
      environmental: 'Ambiental',
    };
    return labels[category] || category;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-red-100 text-red-700',
      mitigated: 'bg-green-100 text-green-700',
      monitoring: 'bg-orange-100 text-orange-700',
    };
    return colors[status] || 'bg-slate-100 text-slate-700';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      active: 'Activa',
      mitigated: 'Mitigada',
      monitoring: 'Monitoreando',
    };
    return labels[status] || status;
  };

  const getLevelLabel = (level: string) => {
    const labels: Record<string, string> = {
      high: 'Alto',
      medium: 'Medio',
      low: 'Bajo',
    };
    return labels[level] || level;
  };

  const getSiteName = (siteId: string) => {
    const site = sites.find((s) => s.id === siteId);
    return site?.name || 'Sitio no encontrado';
  };

  // Define category order
  const categoryOrder: Record<string, number> = {
    natural: 1,
    technological: 2,
    social: 3,
    environmental: 4,
  };

  const filteredThreats = threats
    .filter((threat) => {
      const searchLower = searchTerm.toLowerCase();
      const nameMatch = threat.name.toLowerCase().includes(searchLower);
      const categoryMatch = getCategoryLabel(threat.category).toLowerCase().includes(searchLower);
      return nameMatch || categoryMatch;
    })
    .sort((a, b) => {
      const orderA = categoryOrder[a.category] || 999;
      const orderB = categoryOrder[b.category] || 999;
      if (orderA !== orderB) return orderA - orderB;
      // Secondary sort by name
      return a.name.localeCompare(b.name);
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-600">Cargando amenazas...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={onBack}
            className="text-slate-600 hover:text-slate-900 mb-2 inline-flex items-center gap-2"
          >
            ← Volver al Dashboard
          </button>
          <h1 className="text-3xl font-bold text-slate-900">Gestión de Amenazas</h1>
          <p className="text-slate-600 mt-1">
            Identifica y gestiona las amenazas de tu organización
          </p>
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
              className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition"
            >
              <Plus className="w-5 h-5" />
              Crear Amenaza
            </button>
          )}
        </div>
      </div>

      <div className="mb-6 flex items-center gap-3">
        <div className="relative w-96">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar amenaza por nombre o categoría..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        {selectedThreats.size > 0 && (profile?.role === 'super_admin' || profile?.role === 'admin' || profile?.role === 'consultant') && (
          <button
            onClick={() => setShowBulkDeleteModal(true)}
            className="flex items-center gap-2 px-3 py-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition text-sm whitespace-nowrap"
            title={`Eliminar ${selectedThreats.size} seleccionado(s)`}
          >
            <Trash2 className="w-4 h-4" />
            <span className="text-xs">({selectedThreats.size})</span>
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {filteredThreats.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <AlertTriangle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            {searchTerm ? 'No se encontraron amenazas' : 'No hay amenazas'}
          </h3>
          <p className="text-slate-600 mb-6">
            {searchTerm ? 'Intenta con otro término de búsqueda' : 'Comienza agregando tu primera amenaza'}
          </p>
          {(profile?.role === 'super_admin' || profile?.role === 'admin' || profile?.role === 'consultant') && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition"
            >
              <Plus className="w-5 h-5" />
              Crear Amenaza
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredThreats.map((threat) => (
            <div
              key={threat.id}
              className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-md transition"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div className="flex gap-2">
                  <span className={`px-2 py-1 rounded-md text-xs font-semibold ${getRiskLevelColor(threat.risk_level)}`}>
                    {getRiskLevelLabel(threat.risk_level)}
                  </span>
                  <span className={`px-2 py-1 rounded-md text-xs font-semibold ${getStatusColor(threat.status)}`}>
                    {getStatusLabel(threat.status)}
                  </span>
                </div>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-1">{threat.name}</h3>
              <p className="text-sm text-slate-600 mb-2">{getCategoryLabel(threat.category)}</p>
              <p className="text-xs text-slate-500 mb-3">{getSiteName(threat.site_id)}</p>
              <div className="flex gap-2 text-xs text-slate-400">
                <span>Probabilidad: {getLevelLabel(threat.probability)}</span>
                <span>•</span>
                <span>Impacto: {getLevelLabel(threat.impact)}</span>
              </div>

              <div className="flex gap-2 pt-4 border-t border-slate-100 mt-4">
                <button
                  onClick={() => handleView(threat)}
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-lg font-medium transition text-sm"
                >
                  <Eye className="w-4 h-4" />
                  Ver
                </button>
                {(profile?.role === 'super_admin' || profile?.role === 'admin' || profile?.role === 'consultant') && (
                  <>
                    <button
                      onClick={() => handleEdit(threat)}
                      className="flex-1 inline-flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg font-medium transition text-sm"
                    >
                      <Edit2 className="w-4 h-4" />
                      Editar
                    </button>
                    <button
                      onClick={() => openDeleteModal(threat)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                      title="Eliminar amenaza"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {(profile?.role === 'super_admin' || profile?.role === 'admin' || profile?.role === 'consultant') && (
                  <th className="px-6 py-3 w-12">
                    <input
                      type="checkbox"
                      checked={selectedThreats.size === filteredThreats.length && filteredThreats.length > 0}
                      onChange={handleSelectAll}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                  </th>
                )}
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase">Amenaza</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase">Categoría</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase">Sitio</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase">Riesgo</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase">Estado</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-slate-600 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredThreats.map((threat) => (
                <tr key={threat.id} className="hover:bg-slate-50 transition">
                  {(profile?.role === 'super_admin' || profile?.role === 'admin' || profile?.role === 'consultant') && (
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedThreats.has(threat.id)}
                        onChange={() => handleSelectThreat(threat.id)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </td>
                  )}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                      </div>
                      <div>
                        <div className="font-medium text-slate-900">{threat.name}</div>
                        <div className="text-xs text-slate-500">
                          P: {getLevelLabel(threat.probability)} • I: {getLevelLabel(threat.impact)}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{getCategoryLabel(threat.category)}</td>
                  <td className="px-6 py-4 text-slate-600">{getSiteName(threat.site_id)}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-md text-xs font-semibold ${getRiskLevelColor(threat.risk_level)}`}>
                      {getRiskLevelLabel(threat.risk_level)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-md text-xs font-semibold ${getStatusColor(threat.status)}`}>
                      {getStatusLabel(threat.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleView(threat)}
                        className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition"
                        title="Ver"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {(profile?.role === 'super_admin' || profile?.role === 'admin' || profile?.role === 'consultant') && (
                        <>
                          <button
                            onClick={() => handleEdit(threat)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openDeleteModal(threat)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
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
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full my-8">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-2xl font-bold text-slate-900">Crear Amenaza</h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setError('');
                }}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6">
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Sitio</label>
                  <select
                    value={formData.site_id}
                    onChange={(e) => setFormData({ ...formData, site_id: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    required
                  >
                    <option value="">Seleccionar sitio</option>
                    {sites.map((site) => (
                      <option key={site.id} value={site.id}>
                        {site.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Nombre</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Categoría</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      required
                    >
                      <option value="natural">Natural</option>
                      <option value="technological">Tecnológico</option>
                      <option value="social">Social</option>
                      <option value="environmental">Ambiental</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Descripción</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Probabilidad</label>
                    <select
                      value={formData.probability}
                      onChange={(e) => setFormData({ ...formData, probability: e.target.value as any })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    >
                      <option value="high">Alto</option>
                      <option value="medium">Medio</option>
                      <option value="low">Bajo</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Impacto</label>
                    <select
                      value={formData.impact}
                      onChange={(e) => setFormData({ ...formData, impact: e.target.value as any })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    >
                      <option value="high">Alto</option>
                      <option value="medium">Medio</option>
                      <option value="low">Bajo</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Nivel de Riesgo</label>
                    <select
                      value={formData.risk_level}
                      onChange={(e) => setFormData({ ...formData, risk_level: e.target.value as any })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    >
                      <option value="critical">Crítico</option>
                      <option value="high">Alto</option>
                      <option value="medium">Medio</option>
                      <option value="low">Bajo</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Estado</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  >
                    <option value="active">Activa</option>
                    <option value="mitigated">Mitigada</option>
                    <option value="monitoring">Monitoreando</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Medidas de Mitigación</label>
                  <textarea
                    value={formData.mitigation_measures}
                    onChange={(e) => setFormData({ ...formData, mitigation_measures: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    rows={3}
                    placeholder="Describe las medidas para mitigar esta amenaza"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setError('');
                  }}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition disabled:opacity-50"
                >
                  {submitting ? 'Creando...' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showViewModal && selectedThreat && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900">Detalles de la Amenaza</h2>
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedThreat(null);
                }}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nombre</label>
                  <p className="text-slate-900">{selectedThreat.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Categoría</label>
                  <p className="text-slate-900">{getCategoryLabel(selectedThreat.category)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Sitio</label>
                  <p className="text-slate-900">{getSiteName(selectedThreat.site_id)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nivel de Riesgo</label>
                  <span className={`inline-block px-3 py-1 rounded-md text-sm font-semibold ${getRiskLevelColor(selectedThreat.risk_level)}`}>
                    {getRiskLevelLabel(selectedThreat.risk_level)}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Probabilidad</label>
                  <p className="text-slate-900">{getLevelLabel(selectedThreat.probability)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Impacto</label>
                  <p className="text-slate-900">{getLevelLabel(selectedThreat.impact)}</p>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Estado</label>
                  <span className={`inline-block px-3 py-1 rounded-md text-sm font-semibold ${getStatusColor(selectedThreat.status)}`}>
                    {getStatusLabel(selectedThreat.status)}
                  </span>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Descripción</label>
                  <p className="text-slate-900">{selectedThreat.description || 'Sin descripción'}</p>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Medidas de Mitigación</label>
                  <p className="text-slate-900">{selectedThreat.mitigation_measures || 'No especificadas'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showEditModal && selectedThreat && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full my-8">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-2xl font-bold text-slate-900">Editar Amenaza</h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedThreat(null);
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
                  <label className="block text-sm font-medium text-slate-700 mb-1">Sitio</label>
                  <select
                    value={formData.site_id}
                    onChange={(e) => setFormData({ ...formData, site_id: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    required
                  >
                    <option value="">Seleccionar sitio</option>
                    {sites.map((site) => (
                      <option key={site.id} value={site.id}>
                        {site.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Nombre</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Categoría</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      required
                    >
                      <option value="natural">Natural</option>
                      <option value="technological">Tecnológico</option>
                      <option value="social">Social</option>
                      <option value="environmental">Ambiental</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Descripción</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Probabilidad</label>
                    <select
                      value={formData.probability}
                      onChange={(e) => setFormData({ ...formData, probability: e.target.value as any })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    >
                      <option value="high">Alto</option>
                      <option value="medium">Medio</option>
                      <option value="low">Bajo</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Impacto</label>
                    <select
                      value={formData.impact}
                      onChange={(e) => setFormData({ ...formData, impact: e.target.value as any })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    >
                      <option value="high">Alto</option>
                      <option value="medium">Medio</option>
                      <option value="low">Bajo</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Nivel de Riesgo</label>
                    <select
                      value={formData.risk_level}
                      onChange={(e) => setFormData({ ...formData, risk_level: e.target.value as any })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    >
                      <option value="critical">Crítico</option>
                      <option value="high">Alto</option>
                      <option value="medium">Medio</option>
                      <option value="low">Bajo</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Estado</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  >
                    <option value="active">Activa</option>
                    <option value="mitigated">Mitigada</option>
                    <option value="monitoring">Monitoreando</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Medidas de Mitigación</label>
                  <textarea
                    value={formData.mitigation_measures}
                    onChange={(e) => setFormData({ ...formData, mitigation_measures: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedThreat(null);
                    setError('');
                  }}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition disabled:opacity-50"
                >
                  {submitting ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteModal && deletingThreat && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-900">Eliminar Amenaza</h3>
              <button onClick={() => { setShowDeleteModal(false); setDeletingThreat(null); setError(''); }} className="p-2 hover:bg-slate-100 rounded-lg transition">
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>
            <div className="mb-6">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <p className="text-center text-slate-700 mb-2">¿Estás seguro de que deseas eliminar la amenaza <span className="font-semibold">"{deletingThreat.name}"</span>?</p>
              <p className="text-center text-sm text-slate-500">Esta acción no se puede deshacer.</p>
            </div>
            {error && (<div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">{error}</div>)}
            <div className="flex gap-3">
              <button type="button" onClick={() => { setShowDeleteModal(false); setDeletingThreat(null); setError(''); }} className="flex-1 px-4 py-3 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition">Cancelar</button>
              <button onClick={handleDelete} disabled={submitting} className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed">{submitting ? 'Eliminando...' : 'Eliminar'}</button>
            </div>
          </div>
        </div>
      )}

      {showBulkDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-900">Eliminar Amenazas</h3>
              <button
                onClick={() => {
                  setShowBulkDeleteModal(false);
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
                ¿Estás seguro de que deseas eliminar <span className="font-semibold">{selectedThreats.size} amenaza(s)</span>?
              </p>
              <p className="text-center text-sm text-slate-500">
                Esta acción no se puede deshacer.
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
                  setShowBulkDeleteModal(false);
                  setError('');
                }}
                className="flex-1 px-4 py-3 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleBulkDelete}
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
