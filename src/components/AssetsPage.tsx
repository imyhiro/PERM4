import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import { supabase } from '../lib/supabase';
import { Package, Plus, X, Eye, Edit2, Trash2, LayoutGrid, List, Search } from 'lucide-react';
import type { Database } from '../lib/database.types';

type Asset = Database['public']['Tables']['assets']['Row'];
type Site = Database['public']['Tables']['sites']['Row'];

export function AssetsPage({ onBack }: { onBack: () => void }) {
  const { profile } = useAuth();
  const { selectedOrganizationId, selectedSiteId } = useApp();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingAsset, setDeletingAsset] = useState<Asset | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [formData, setFormData] = useState({
    site_id: '',
    name: '',
    type: '',
    description: '',
    value: 'medium' as 'high' | 'medium' | 'low',
    location: '',
    owner: '',
    status: 'operational' as 'operational' | 'maintenance' | 'inactive',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
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

      // Load assets based on selected site or organization
      let assetsQuery = supabase.from('assets').select('*');

      if (selectedSiteId) {
        assetsQuery = assetsQuery.eq('site_id', selectedSiteId);
      } else if (selectedOrganizationId && sitesResult.data && sitesResult.data.length > 0) {
        const siteIds = sitesResult.data.map(s => s.id);
        assetsQuery = assetsQuery.in('site_id', siteIds);
      }

      const assetsResult = await assetsQuery.order('created_at', { ascending: false });
      if (assetsResult.error) throw assetsResult.error;
      setAssets(assetsResult.data || []);
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

      const { error } = await supabase.from('assets').insert({
        ...formData,
        created_by: profile.id,
      });

      if (error) throw error;

      setFormData({
        site_id: '',
        name: '',
        type: '',
        description: '',
        value: 'medium',
        location: '',
        owner: '',
        status: 'operational',
      });
      setShowCreateModal(false);
      loadData();
    } catch (err: any) {
      setError(err.message || 'Error al crear el activo');
    } finally {
      setSubmitting(false);
    }
  };

  const handleView = (asset: Asset) => {
    setSelectedAsset(asset);
    setShowViewModal(true);
  };

  const handleEdit = (asset: Asset) => {
    setSelectedAsset(asset);
    setFormData({
      site_id: asset.site_id,
      name: asset.name,
      type: asset.type,
      description: asset.description || '',
      value: asset.value as 'high' | 'medium' | 'low',
      location: asset.location || '',
      owner: asset.owner || '',
      status: asset.status as 'operational' | 'maintenance' | 'inactive',
    });
    setShowEditModal(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAsset) return;

    setError('');
    setSubmitting(true);

    try {
      const { error } = await supabase
        .from('assets')
        .update({ ...formData, updated_at: new Date().toISOString() })
        .eq('id', selectedAsset.id);

      if (error) throw error;

      setShowEditModal(false);
      setSelectedAsset(null);
      loadData();
    } catch (err: any) {
      setError(err.message || 'Error al actualizar el activo');
    } finally {
      setSubmitting(false);
    }
  };

  const getValueColor = (value: string) => {
    const colors: Record<string, string> = {
      high: 'bg-red-100 text-red-700',
      medium: 'bg-orange-100 text-orange-700',
      low: 'bg-green-100 text-green-700',
    };
    return colors[value] || 'bg-slate-100 text-slate-700';
  };

  const openDeleteModal = (asset: Asset) => {
    setDeletingAsset(asset);
    setError('');
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    if (!deletingAsset) return;
    setError('');
    setSubmitting(true);
    try {
      const { error } = await supabase.from('assets').delete().eq('id', deletingAsset.id);
      if (error) throw error;
      setShowDeleteModal(false);
      setDeletingAsset(null);
      loadData();
    } catch (err: any) {
      setError(err.message || 'Error al eliminar el activo');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedAssets.size === filteredAssets.length && filteredAssets.length > 0) {
      setSelectedAssets(new Set());
    } else {
      setSelectedAssets(new Set(filteredAssets.map(asset => asset.id)));
    }
  };

  const handleSelectAsset = (assetId: string) => {
    const newSelected = new Set(selectedAssets);
    if (newSelected.has(assetId)) {
      newSelected.delete(assetId);
    } else {
      newSelected.add(assetId);
    }
    setSelectedAssets(newSelected);
  };

  const handleBulkDelete = async () => {
    setError('');
    setSubmitting(true);

    try {
      const deletePromises = Array.from(selectedAssets).map(assetId =>
        supabase.from('assets').delete().eq('id', assetId)
      );

      const results = await Promise.all(deletePromises);
      const errors = results.filter(r => r.error);

      if (errors.length > 0) {
        throw new Error(`Error eliminando ${errors.length} activo(s)`);
      }

      setShowBulkDeleteModal(false);
      setSelectedAssets(new Set());
      loadData();
    } catch (err: any) {
      setError(err.message || 'Error al eliminar los activos');
    } finally {
      setSubmitting(false);
    }
  };

  const getValueLabel = (value: string) => {
    const labels: Record<string, string> = {
      high: 'Alto',
      medium: 'Medio',
      low: 'Bajo',
    };
    return labels[value] || value;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      operational: 'bg-green-100 text-green-700',
      maintenance: 'bg-orange-100 text-orange-700',
      inactive: 'bg-slate-100 text-slate-700',
    };
    return colors[status] || 'bg-slate-100 text-slate-700';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      operational: 'Operativo',
      maintenance: 'Mantenimiento',
      inactive: 'Inactivo',
    };
    return labels[status] || status;
  };

  const getSiteName = (siteId: string) => {
    const site = sites.find((s) => s.id === siteId);
    return site?.name || 'Sitio no encontrado';
  };

  // Define asset type order (by keyword matching)
  const getAssetTypeOrder = (type: string): number => {
    const lowerType = type.toLowerCase();
    if (lowerType.includes('persona') || lowerType.includes('personal') || lowerType.includes('people')) return 1;
    if (lowerType.includes('bien') || lowerType.includes('equipo') || lowerType.includes('goods') || lowerType.includes('asset')) return 2;
    if (lowerType.includes('proceso') || lowerType.includes('process')) return 3;
    if (lowerType.includes('información') || lowerType.includes('informacion') || lowerType.includes('dato') || lowerType.includes('information') || lowerType.includes('data')) return 4;
    return 999; // Other types go last
  };

  const filteredAssets = assets
    .filter((asset) => {
      const searchLower = searchTerm.toLowerCase();
      return (
        asset.name.toLowerCase().includes(searchLower) ||
        asset.type.toLowerCase().includes(searchLower)
      );
    })
    .sort((a, b) => {
      const orderA = getAssetTypeOrder(a.type);
      const orderB = getAssetTypeOrder(b.type);
      if (orderA !== orderB) return orderA - orderB;
      // Secondary sort by name
      return a.name.localeCompare(b.name);
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-600">Cargando activos...</div>
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
          <h1 className="text-3xl font-bold text-slate-900">Gestión de Activos</h1>
          <p className="text-slate-600 mt-1">
            Administra los activos de tu organización
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
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition"
            >
              <Plus className="w-5 h-5" />
              Crear Activo
            </button>
          )}
        </div>
      </div>

      <div className="mb-6 flex items-center gap-3">
        <div className="relative w-96">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar activo por nombre o tipo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        {selectedAssets.size > 0 && (profile?.role === 'super_admin' || profile?.role === 'admin') && (
          <button
            onClick={() => setShowBulkDeleteModal(true)}
            className="flex items-center gap-2 px-3 py-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition text-sm whitespace-nowrap"
            title={`Eliminar ${selectedAssets.size} seleccionado(s)`}
          >
            <Trash2 className="w-4 h-4" />
            <span className="text-xs">({selectedAssets.size})</span>
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {filteredAssets.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            {assets.length === 0 ? 'No hay activos' : 'No se encontraron activos'}
          </h3>
          <p className="text-slate-600 mb-6">
            {assets.length === 0 ? 'Comienza agregando tu primer activo' : 'Intenta con otro término de búsqueda'}
          </p>
          {(profile?.role === 'super_admin' || profile?.role === 'admin' || profile?.role === 'consultant') && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition"
            >
              <Plus className="w-5 h-5" />
              Crear Activo
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAssets.map((asset) => (
            <div
              key={asset.id}
              className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-md transition"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Package className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex gap-2">
                  <span className={`px-2 py-1 rounded-md text-xs font-semibold ${getValueColor(asset.value)}`}>
                    {getValueLabel(asset.value)}
                  </span>
                  <span className={`px-2 py-1 rounded-md text-xs font-semibold ${getStatusColor(asset.status)}`}>
                    {getStatusLabel(asset.status)}
                  </span>
                </div>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-1">{asset.name}</h3>
              <p className="text-sm text-slate-600 mb-2">{asset.type}</p>
              <p className="text-xs text-slate-500 mb-3">{getSiteName(asset.site_id)}</p>
              {asset.owner && <p className="text-xs text-slate-400">Responsable: {asset.owner}</p>}

              <div className="flex gap-2 pt-4 border-t border-slate-100 mt-4">
                <button
                  onClick={() => handleView(asset)}
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-lg font-medium transition text-sm"
                >
                  <Eye className="w-4 h-4" />
                  Ver
                </button>
                {(profile?.role === 'super_admin' || profile?.role === 'admin' || profile?.role === 'consultant') && (
                  <>
                    <button
                      onClick={() => handleEdit(asset)}
                      className="flex-1 inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg font-medium transition text-sm"
                    >
                      <Edit2 className="w-4 h-4" />
                      Editar
                    </button>
                    <button
                      onClick={() => openDeleteModal(asset)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                      title="Eliminar activo"
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
                {(profile?.role === 'super_admin' || profile?.role === 'admin') && (
                  <th className="px-6 py-3 w-12">
                    <input
                      type="checkbox"
                      checked={selectedAssets.size === filteredAssets.length && filteredAssets.length > 0}
                      onChange={handleSelectAll}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                  </th>
                )}
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase">Activo</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase">Tipo</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase">Sitio</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase">Valor</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase">Estado</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-slate-600 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredAssets.map((asset) => (
                <tr key={asset.id} className="hover:bg-slate-50 transition">
                  {(profile?.role === 'super_admin' || profile?.role === 'admin') && (
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedAssets.has(asset.id)}
                        onChange={() => handleSelectAsset(asset.id)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </td>
                  )}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Package className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="font-medium text-slate-900">{asset.name}</div>
                        {asset.owner && <div className="text-xs text-slate-500">{asset.owner}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{asset.type}</td>
                  <td className="px-6 py-4 text-slate-600">{getSiteName(asset.site_id)}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-md text-xs font-semibold ${getValueColor(asset.value)}`}>
                      {getValueLabel(asset.value)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-md text-xs font-semibold ${getStatusColor(asset.status)}`}>
                      {getStatusLabel(asset.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleView(asset)}
                        className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition"
                        title="Ver"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {(profile?.role === 'super_admin' || profile?.role === 'admin' || profile?.role === 'consultant') && (
                        <>
                          <button
                            onClick={() => handleEdit(asset)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openDeleteModal(asset)}
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
              <h2 className="text-2xl font-bold text-slate-900">Crear Activo</h2>
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
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
                    <input
                      type="text"
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      placeholder="Ej: Equipo, Datos, Personal"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Descripción</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Valor</label>
                    <select
                      value={formData.value}
                      onChange={(e) => setFormData({ ...formData, value: e.target.value as any })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="high">Alto</option>
                      <option value="medium">Medio</option>
                      <option value="low">Bajo</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Estado</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="operational">Operativo</option>
                      <option value="maintenance">Mantenimiento</option>
                      <option value="inactive">Inactivo</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Ubicación</label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Responsable</label>
                  <input
                    type="text"
                    value={formData.owner}
                    onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition disabled:opacity-50"
                >
                  {submitting ? 'Creando...' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showViewModal && selectedAsset && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900">Detalles del Activo</h2>
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedAsset(null);
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
                  <p className="text-slate-900">{selectedAsset.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
                  <p className="text-slate-900">{selectedAsset.type}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Sitio</label>
                  <p className="text-slate-900">{getSiteName(selectedAsset.site_id)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Valor</label>
                  <span className={`inline-block px-3 py-1 rounded-md text-sm font-semibold ${getValueColor(selectedAsset.value)}`}>
                    {getValueLabel(selectedAsset.value)}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Estado</label>
                  <span className={`inline-block px-3 py-1 rounded-md text-sm font-semibold ${getStatusColor(selectedAsset.status)}`}>
                    {getStatusLabel(selectedAsset.status)}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Ubicación</label>
                  <p className="text-slate-900">{selectedAsset.location || 'No especificada'}</p>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Responsable</label>
                  <p className="text-slate-900">{selectedAsset.owner || 'No asignado'}</p>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Descripción</label>
                  <p className="text-slate-900">{selectedAsset.description || 'Sin descripción'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showEditModal && selectedAsset && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full my-8">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-2xl font-bold text-slate-900">Editar Activo</h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedAsset(null);
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
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
                    <input
                      type="text"
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Descripción</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Valor</label>
                    <select
                      value={formData.value}
                      onChange={(e) => setFormData({ ...formData, value: e.target.value as any })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="high">Alto</option>
                      <option value="medium">Medio</option>
                      <option value="low">Bajo</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Estado</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="operational">Operativo</option>
                      <option value="maintenance">Mantenimiento</option>
                      <option value="inactive">Inactivo</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Ubicación</label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Responsable</label>
                  <input
                    type="text"
                    value={formData.owner}
                    onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedAsset(null);
                    setError('');
                  }}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition disabled:opacity-50"
                >
                  {submitting ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteModal && deletingAsset && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-900">Eliminar Activo</h3>
              <button onClick={() => { setShowDeleteModal(false); setDeletingAsset(null); setError(''); }} className="p-2 hover:bg-slate-100 rounded-lg transition">
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>
            <div className="mb-6">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <p className="text-center text-slate-700 mb-2">¿Estás seguro de que deseas eliminar el activo <span className="font-semibold">"{deletingAsset.name}"</span>?</p>
              <p className="text-center text-sm text-slate-500">Esta acción no se puede deshacer.</p>
            </div>
            {error && (<div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">{error}</div>)}
            <div className="flex gap-3">
              <button type="button" onClick={() => { setShowDeleteModal(false); setDeletingAsset(null); setError(''); }} className="flex-1 px-4 py-3 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition">Cancelar</button>
              <button onClick={handleDelete} disabled={submitting} className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed">{submitting ? 'Eliminando...' : 'Eliminar'}</button>
            </div>
          </div>
        </div>
      )}

      {showBulkDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-900">Eliminar Activos</h3>
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
                ¿Estás seguro de que deseas eliminar <span className="font-semibold">{selectedAssets.size} activo(s)</span>?
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
