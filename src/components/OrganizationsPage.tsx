import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import { supabase } from '../lib/supabase';
import { Building2, Plus, X, Users, Check, Edit2, LayoutGrid, List, Trash2, Search, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import type { Database } from '../lib/database.types';

type Organization = Database['public']['Tables']['organizations']['Row'];

export function OrganizationsPage({ onBack }: { onBack: () => void }) {
  const { profile } = useAuth();
  const { selectedOrganizationId } = useApp();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [deletingOrg, setDeletingOrg] = useState<Organization | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [formData, setFormData] = useState({
    name: '',
    license_type: 'free' as 'free' | 'pro',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [selectedOrgs, setSelectedOrgs] = useState<Set<string>>(new Set());
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    loadOrganizations();
  }, [selectedOrganizationId]);

  const loadOrganizations = async () => {
    try {
      let query = supabase.from('organizations').select('*');

      // Filter by selected organization if one is selected
      if (selectedOrganizationId) {
        query = query.eq('id', selectedOrganizationId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setOrganizations(data || []);
    } catch (err: any) {
      console.error('Error loading organizations:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const licenseLimit = formData.license_type === 'free' ? 3 : 10;

      const { error } = await supabase.from('organizations').insert({
        name: formData.name,
        license_type: formData.license_type,
        license_limit: licenseLimit,
        created_by: profile?.id,
      });

      if (error) throw error;

      setFormData({ name: '', license_type: 'free' });
      setShowCreateModal(false);
      loadOrganizations();
    } catch (err: any) {
      setError(err.message || 'Error al crear la organización');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrg) return;

    setError('');
    setSubmitting(true);

    try {
      const licenseLimit = formData.license_type === 'free' ? 3 : 10;

      const { error } = await supabase
        .from('organizations')
        .update({
          name: formData.name,
          license_type: formData.license_type,
          license_limit: licenseLimit,
        })
        .eq('id', editingOrg.id);

      if (error) throw error;

      setShowEditModal(false);
      setEditingOrg(null);
      setFormData({ name: '', license_type: 'free' });
      loadOrganizations();
    } catch (err: any) {
      setError(err.message || 'Error al actualizar la organización');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (org: Organization) => {
    setEditingOrg(org);
    setFormData({
      name: org.name,
      license_type: org.license_type as 'free' | 'pro',
    });
    setError('');
    setShowEditModal(true);
  };

  const openDeleteModal = (org: Organization) => {
    setDeletingOrg(org);
    setError('');
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    if (!deletingOrg) return;

    setError('');
    setSubmitting(true);

    try {
      const { error } = await supabase
        .from('organizations')
        .delete()
        .eq('id', deletingOrg.id);

      if (error) throw error;

      setShowDeleteModal(false);
      setDeletingOrg(null);
      loadOrganizations();
    } catch (err: any) {
      setError(err.message || 'Error al eliminar la organización');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (column: string) => {
    if (sortColumn !== column) return <ArrowUpDown className="w-4 h-4 ml-1 opacity-50" />;
    return sortDirection === 'asc' ?
      <ArrowUp className="w-4 h-4 ml-1" /> :
      <ArrowDown className="w-4 h-4 ml-1" />;
  };

  // Filter and sort organizations
  const filteredOrganizations = organizations
    .filter((org) => {
      if (!searchTerm) return true;
      return org.name.toLowerCase().includes(searchTerm.toLowerCase());
    })
    .sort((a, b) => {
      if (sortColumn) {
        let aVal: any, bVal: any;

        switch (sortColumn) {
          case 'name':
            aVal = a.name.toLowerCase();
            bVal = b.name.toLowerCase();
            break;
          case 'license':
            aVal = a.license_type.toLowerCase();
            bVal = b.license_type.toLowerCase();
            break;
          case 'limit':
            aVal = a.license_limit || 0;
            bVal = b.license_limit || 0;
            break;
          case 'created':
            aVal = new Date(a.created_at).getTime();
            bVal = new Date(b.created_at).getTime();
            break;
          default:
            return 0;
        }

        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      }
      return 0;
    });

  const handleSelectAll = () => {
    if (selectedOrgs.size === filteredOrganizations.length) {
      setSelectedOrgs(new Set());
    } else {
      setSelectedOrgs(new Set(filteredOrganizations.map(org => org.id)));
    }
  };

  const handleSelectOrg = (orgId: string) => {
    const newSelected = new Set(selectedOrgs);
    if (newSelected.has(orgId)) {
      newSelected.delete(orgId);
    } else {
      newSelected.add(orgId);
    }
    setSelectedOrgs(newSelected);
  };

  const handleBulkDelete = async () => {
    setError('');
    setSubmitting(true);

    try {
      const deletePromises = Array.from(selectedOrgs).map(orgId =>
        supabase.from('organizations').delete().eq('id', orgId)
      );

      const results = await Promise.all(deletePromises);
      const errors = results.filter(r => r.error);

      if (errors.length > 0) {
        throw new Error(`Error eliminando ${errors.length} organización(es)`);
      }

      setShowBulkDeleteModal(false);
      setSelectedOrgs(new Set());
      loadOrganizations();
    } catch (err: any) {
      setError(err.message || 'Error al eliminar las organizaciones');
    } finally {
      setSubmitting(false);
    }
  };

  const getLicenseInfo = (license: string, limit: number) => {
    return {
      label: license === 'free' ? 'Gratis' : 'Pro',
      color: license === 'free' ? 'bg-slate-100 text-slate-700' : 'bg-blue-100 text-blue-700',
      limit: `${limit} análisis`,
    };
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
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Organizaciones</h2>
          <p className="text-slate-600 mt-1">
            {profile?.role === 'super_admin'
              ? 'Gestiona las organizaciones de tu plataforma'
              : profile?.role === 'admin'
              ? 'Gestiona las organizaciones que has creado'
              : 'Información de tu organización'}
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
          {(profile?.role === 'super_admin' || profile?.role === 'admin') && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition"
            >
              <Plus className="w-5 h-5" />
              Nueva Organización
            </button>
          )}
        </div>
      </div>

      <div className="mb-6 flex items-center gap-3">
        <div className="relative w-96">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar organización..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        {selectedOrgs.size > 0 && (profile?.role === 'super_admin' || profile?.role === 'admin') && (
          <button
            onClick={() => setShowBulkDeleteModal(true)}
            className="flex items-center gap-2 px-3 py-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition text-sm whitespace-nowrap"
            title={`Eliminar ${selectedOrgs.size} seleccionado(s)`}
          >
            <Trash2 className="w-4 h-4" />
            <span className="text-xs">({selectedOrgs.size})</span>
          </button>
        )}
      </div>

      {organizations.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <Building2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No hay organizaciones</h3>
          <p className="text-slate-600 mb-6">Comienza creando tu primera organización</p>
          {(profile?.role === 'super_admin' || profile?.role === 'admin') && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition"
            >
              <Plus className="w-5 h-5" />
              Crear Organización
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOrganizations.map((org) => {
            const licenseInfo = getLicenseInfo(org.license_type, org.license_limit);
            return (
              <div
                key={org.id}
                className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-md transition"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-blue-600" />
                  </div>
                  <span className={`px-2 py-1 rounded-md text-xs font-semibold ${licenseInfo.color}`}>
                    {licenseInfo.label}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">{org.name}</h3>
                <p className="text-sm text-slate-600 mb-4">{licenseInfo.limit}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-xs text-slate-500">
                    <Users className="w-4 h-4 mr-1" />
                    Creado {new Date(org.created_at).toLocaleDateString()}
                  </div>
                  {(profile?.role === 'super_admin' || profile?.role === 'admin') && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(org)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        title="Editar organización"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openDeleteModal(org)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Eliminar organización"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
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
                {(profile?.role === 'super_admin' || profile?.role === 'admin') && (
                  <th className="px-6 py-3 w-12">
                    <input
                      type="checkbox"
                      checked={selectedOrgs.size === filteredOrganizations.length && filteredOrganizations.length > 0}
                      onChange={handleSelectAll}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                  </th>
                )}
                <th
                  className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase cursor-pointer hover:bg-slate-100 transition"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center">Organización {getSortIcon('name')}</div>
                </th>
                <th
                  className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase cursor-pointer hover:bg-slate-100 transition"
                  onClick={() => handleSort('license')}
                >
                  <div className="flex items-center">Licencia {getSortIcon('license')}</div>
                </th>
                <th
                  className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase cursor-pointer hover:bg-slate-100 transition"
                  onClick={() => handleSort('limit')}
                >
                  <div className="flex items-center">Límite de sitios {getSortIcon('limit')}</div>
                </th>
                <th
                  className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase cursor-pointer hover:bg-slate-100 transition"
                  onClick={() => handleSort('created')}
                >
                  <div className="flex items-center">Creado {getSortIcon('created')}</div>
                </th>
                {(profile?.role === 'super_admin' || profile?.role === 'admin') && (
                  <th className="text-right px-6 py-3 text-xs font-semibold text-slate-600 uppercase">Acciones</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredOrganizations.map((org) => {
                const licenseInfo = getLicenseInfo(org.license_type, org.license_limit);
                return (
                  <tr
                    key={org.id}
                    onClick={() => (profile?.role === 'super_admin' || profile?.role === 'admin') && openEditModal(org)}
                    className="hover:bg-slate-50 transition cursor-pointer"
                  >
                    {(profile?.role === 'super_admin' || profile?.role === 'admin') && (
                      <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedOrgs.has(org.id)}
                          onChange={() => handleSelectOrg(org.id)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                      </td>
                    )}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-blue-600" />
                        </div>
                        <span className="font-medium text-slate-900">{org.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-md text-xs font-semibold ${licenseInfo.color}`}>
                        {licenseInfo.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{licenseInfo.limit}</td>
                    <td className="px-6 py-4 text-slate-600">
                      {new Date(org.created_at).toLocaleDateString()}
                    </td>
                    {(profile?.role === 'super_admin' || profile?.role === 'admin') && (
                      <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(org)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openDeleteModal(org)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-900">Nueva Organización</h3>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setError('');
                  setFormData({ name: '', license_type: 'free' });
                }}
                className="p-2 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-2">
                  Nombre de la Organización
                </label>
                <input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  placeholder="Mi Empresa S.A."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">Tipo de Licencia</label>
                <div className="space-y-3">
                  <label className="flex items-start p-4 border-2 border-slate-200 rounded-lg cursor-pointer hover:border-blue-500 transition">
                    <input
                      type="radio"
                      name="license"
                      value="free"
                      checked={formData.license_type === 'free'}
                      onChange={() => setFormData({ ...formData, license_type: 'free' })}
                      className="mt-1 mr-3"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-slate-900">Gratis</span>
                        <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
                          Básico
                        </span>
                      </div>
                      <p className="text-sm text-slate-600">Hasta 3 análisis de riesgo</p>
                    </div>
                    {formData.license_type === 'free' && (
                      <Check className="w-5 h-5 text-blue-600 flex-shrink-0" />
                    )}
                  </label>

                  <label className="flex items-start p-4 border-2 border-slate-200 rounded-lg cursor-pointer hover:border-blue-500 transition">
                    <input
                      type="radio"
                      name="license"
                      value="pro"
                      checked={formData.license_type === 'pro'}
                      onChange={() => setFormData({ ...formData, license_type: 'pro' })}
                      className="mt-1 mr-3"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-slate-900">Pro</span>
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                          Avanzado
                        </span>
                      </div>
                      <p className="text-sm text-slate-600">Hasta 10 análisis de riesgo</p>
                    </div>
                    {formData.license_type === 'pro' && (
                      <Check className="w-5 h-5 text-blue-600 flex-shrink-0" />
                    )}
                  </label>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setError('');
                    setFormData({ name: '', license_type: 'free' });
                  }}
                  className="flex-1 px-4 py-3 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Creando...' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditModal && editingOrg && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-900">Editar Organización</h3>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingOrg(null);
                  setError('');
                  setFormData({ name: '', license_type: 'free' });
                }}
                className="p-2 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>

            <form onSubmit={handleEdit} className="space-y-4">
              <div>
                <label htmlFor="edit_name" className="block text-sm font-medium text-slate-700 mb-2">
                  Nombre de la Organización
                </label>
                <input
                  id="edit_name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  placeholder="Mi Empresa S.A."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">Tipo de Licencia</label>
                <div className="space-y-3">
                  <label className="flex items-start p-4 border-2 border-slate-200 rounded-lg cursor-pointer hover:border-blue-500 transition">
                    <input
                      type="radio"
                      name="edit_license"
                      value="free"
                      checked={formData.license_type === 'free'}
                      onChange={() => setFormData({ ...formData, license_type: 'free' })}
                      className="mt-1 mr-3"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-slate-900">Gratis</span>
                        <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
                          Básico
                        </span>
                      </div>
                      <p className="text-sm text-slate-600">Hasta 3 análisis de riesgo</p>
                    </div>
                    {formData.license_type === 'free' && (
                      <Check className="w-5 h-5 text-blue-600 flex-shrink-0" />
                    )}
                  </label>

                  <label className="flex items-start p-4 border-2 border-slate-200 rounded-lg cursor-pointer hover:border-blue-500 transition">
                    <input
                      type="radio"
                      name="edit_license"
                      value="pro"
                      checked={formData.license_type === 'pro'}
                      onChange={() => setFormData({ ...formData, license_type: 'pro' })}
                      className="mt-1 mr-3"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-slate-900">Pro</span>
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                          Avanzado
                        </span>
                      </div>
                      <p className="text-sm text-slate-600">Hasta 10 análisis de riesgo</p>
                    </div>
                    {formData.license_type === 'pro' && (
                      <Check className="w-5 h-5 text-blue-600 flex-shrink-0" />
                    )}
                  </label>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingOrg(null);
                    setError('');
                    setFormData({ name: '', license_type: 'free' });
                  }}
                  className="flex-1 px-4 py-3 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteModal && deletingOrg && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-900">Eliminar Organización</h3>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletingOrg(null);
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
                ¿Estás seguro de que deseas eliminar la organización <span className="font-semibold">"{deletingOrg.name}"</span>?
              </p>
              <p className="text-center text-sm text-slate-500">
                Esta acción no se puede deshacer. Se eliminarán todos los sitios, usuarios y datos asociados.
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
                  setDeletingOrg(null);
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

      {showBulkDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-900">Eliminar Organizaciones</h3>
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
                ¿Estás seguro de que deseas eliminar <span className="font-semibold">{selectedOrgs.size} organización(es)</span>?
              </p>
              <p className="text-center text-sm text-slate-500">
                Esta acción no se puede deshacer. Se eliminarán todos los sitios, usuarios y datos asociados.
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
