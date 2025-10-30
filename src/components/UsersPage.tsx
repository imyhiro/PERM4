import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import { supabase } from '../lib/supabase';
import { Users, Plus, X, Mail, Shield, Building2, Edit2, Trash2, Search, MapPin, LayoutGrid, List } from 'lucide-react';
import type { Database } from '../lib/database.types';

type User = Database['public']['Tables']['users']['Row'];
type Organization = Database['public']['Tables']['organizations']['Row'];
type Site = Database['public']['Tables']['sites']['Row'];

type UserRole = 'super_admin' | 'admin' | 'consultant' | 'reader';

export function UsersPage({ onBack }: { onBack: () => void }) {
  const { profile } = useAuth();
  const { selectedOrganizationId, selectedSiteId } = useApp();
  const [users, setUsers] = useState<User[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSites, setSelectedSites] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    role: 'reader' as UserRole,
    organization_id: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, [selectedOrganizationId, selectedSiteId]);

  const loadData = async () => {
    try {
      // Build queries with filters
      let usersQuery = supabase.from('users').select('*');
      let orgsQuery = supabase.from('organizations').select('*');
      let sitesQuery = supabase.from('sites').select('*');

      // Apply organization filter
      if (selectedOrganizationId) {
        usersQuery = usersQuery.eq('organization_id', selectedOrganizationId);
        orgsQuery = orgsQuery.eq('id', selectedOrganizationId);
        sitesQuery = sitesQuery.eq('organization_id', selectedOrganizationId);
      }

      // Apply site filter (users who have access to this site)
      if (selectedSiteId) {
        // Get users who have access to this site
        const { data: userSiteAccess } = await supabase
          .from('user_site_access')
          .select('user_id')
          .eq('site_id', selectedSiteId);

        const userIds = userSiteAccess?.map(usa => usa.user_id) || [];

        // Also include users from the site's organization
        const { data: siteData } = await supabase
          .from('sites')
          .select('organization_id')
          .eq('id', selectedSiteId)
          .single();

        if (siteData?.organization_id) {
          // Get all users from that organization
          usersQuery = usersQuery.eq('organization_id', siteData.organization_id);
        } else if (userIds.length > 0) {
          usersQuery = usersQuery.in('id', userIds);
        }

        sitesQuery = sitesQuery.eq('id', selectedSiteId);
      }

      const [usersRes, orgsRes, sitesRes] = await Promise.all([
        usersQuery.order('created_at', { ascending: false }),
        orgsQuery.order('name'),
        sitesQuery.order('name'),
      ]);

      if (usersRes.error) {
        console.error('Error loading users:', usersRes.error);
        setUsers([]);
      } else {
        setUsers(usersRes.data || []);
      }

      if (orgsRes.error) {
        console.error('Error loading organizations:', orgsRes.error);
        setOrganizations([]);
      } else {
        setOrganizations(orgsRes.data || []);
      }

      if (sitesRes.error) {
        console.error('Error loading sites:', sitesRes.error);
        setSites([]);
      } else {
        setSites(sitesRes.data || []);
      }
    } catch (err: any) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      // Get the session token
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('No hay sesión activa');
      }

      // Call the Edge Function to create the user
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          full_name: formData.full_name,
          role: formData.role,
          organization_id: formData.organization_id || null,
          site_ids: selectedSites,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Error al crear el usuario');
      }

      setFormData({ email: '', full_name: '', role: 'reader', organization_id: '', password: '' });
      setSelectedSites([]);
      setShowCreateModal(false);
      loadData();
    } catch (err: any) {
      setError(err.message || 'Error al crear el usuario');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setError('');
    setSubmitting(true);

    try {
      const { error } = await supabase
        .from('users')
        .update({
          full_name: formData.full_name,
          role: formData.role,
          organization_id: formData.organization_id || null,
        })
        .eq('id', editingUser.id);

      if (error) throw error;

      setShowEditModal(false);
      setEditingUser(null);
      loadData();
    } catch (err: any) {
      setError(err.message || 'Error al actualizar el usuario');
    } finally {
      setSubmitting(false);
    }
  };

  const openDeleteModal = (user: User) => {
    setDeletingUser(user);
    setError('');
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    if (!deletingUser) return;

    setError('');
    setSubmitting(true);

    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', deletingUser.id);

      if (error) throw error;

      setShowDeleteModal(false);
      setDeletingUser(null);
      loadUsers();
    } catch (err: any) {
      setError(err.message || 'Error al eliminar el usuario');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      full_name: user.full_name,
      role: user.role as UserRole,
      organization_id: user.organization_id || '',
      password: '',
    });
    setError('');
    setShowEditModal(true);
  };

  const getRoleInfo = (role: string) => {
    switch (role) {
      case 'super_admin':
        return { label: 'Super Admin', color: 'bg-red-100 text-red-700' };
      case 'admin':
        return { label: 'Administrador', color: 'bg-blue-100 text-blue-700' };
      case 'consultant':
        return { label: 'Consultor', color: 'bg-green-100 text-green-700' };
      case 'reader':
        return { label: 'Lector', color: 'bg-slate-100 text-slate-700' };
      default:
        return { label: role, color: 'bg-gray-100 text-gray-700' };
    }
  };

  const getOrganizationName = (orgId: string | null) => {
    if (!orgId) return 'Sin asignar';
    const org = organizations.find((o) => o.id === orgId);
    return org?.name || 'Desconocida';
  };

  const filteredUsers = users.filter(
    (user) =>
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const canManageUsers = profile?.role === 'super_admin' || profile?.role === 'admin' || profile?.role === 'consultant';

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
          <h2 className="text-2xl font-bold text-slate-900">Usuarios</h2>
          <p className="text-slate-600 mt-1">Gestiona los usuarios y sus permisos</p>
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
          {canManageUsers && (
            <button
              onClick={() => {
                setFormData({ email: '', full_name: '', role: 'reader', organization_id: '', password: '' });
                setSelectedSites([]);
                setError('');
                setShowCreateModal(true);
              }}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition"
            >
              <Plus className="w-5 h-5" />
              Nuevo Usuario
            </button>
          )}
        </div>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar usuarios por nombre o email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
          />
        </div>
      </div>

      {filteredUsers.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No hay usuarios</h3>
          <p className="text-slate-600 mb-6">
            {searchTerm ? 'No se encontraron usuarios con ese criterio' : 'Comienza invitando usuarios'}
          </p>
          {canManageUsers && !searchTerm && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition"
            >
              <Plus className="w-5 h-5" />
              Invitar Usuario
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredUsers.map((user) => {
            const roleInfo = getRoleInfo(user.role);
            return (
              <div
                key={user.id}
                className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-md transition"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                  <span className={`px-2 py-1 rounded-md text-xs font-semibold ${roleInfo.color}`}>
                    {roleInfo.label}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-1">{user.full_name}</h3>
                <div className="flex items-center gap-2 text-sm text-slate-500 mb-3">
                  <Mail className="w-4 h-4" />
                  <span>{user.email}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600 mb-3">
                  <Building2 className="w-4 h-4 text-slate-400" />
                  <span>{getOrganizationName(user.organization_id)}</span>
                </div>
                <p className="text-xs text-slate-400">
                  Creado: {new Date(user.created_at).toLocaleDateString()}
                </p>

                {canManageUsers && (
                  <div className="flex gap-2 pt-4 border-t border-slate-100 mt-4">
                    <button
                      onClick={() => openEditModal(user)}
                      className="flex-1 inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg font-medium transition text-sm"
                    >
                      <Edit2 className="w-4 h-4" />
                      Editar
                    </button>
                      <button
                        onClick={() => openDeleteModal(user)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Eliminar usuario"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    {user.role !== 'super_admin' && (
                      <button
                        onClick={() => handleDelete(user.id)}
                        className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Eliminar usuario"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Usuario
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Rol
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Organización
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Creado
                  </th>
                  {canManageUsers && (
                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Acciones
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredUsers.map((user) => {
                  const roleInfo = getRoleInfo(user.role);
                  return (
                    <tr key={user.id} className="hover:bg-slate-50 transition">
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-slate-900">{user.full_name}</div>
                          <div className="text-sm text-slate-500">{user.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-md text-xs font-semibold ${roleInfo.color}`}>
                          {roleInfo.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center text-sm text-slate-700">
                          <Building2 className="w-4 h-4 mr-2 text-slate-400" />
                          {getOrganizationName(user.organization_id)}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      {canManageUsers && (
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openEditModal(user)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                              title="Editar usuario"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            {user.role !== 'super_admin' && (
                              <button
                              <button
                                onClick={() => openDeleteModal(user)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-lg transition text-sm font-medium"
                              >
                                <Trash2 className="w-4 h-4" />
                                Eliminar
                              </button>
                                onClick={() => handleDelete(user.id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                                title="Eliminar usuario"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-900">Nuevo Usuario</h3>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setError('');
                }}
                className="p-2 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    placeholder="usuario@ejemplo.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="full_name" className="block text-sm font-medium text-slate-700 mb-2">
                  Nombre Completo
                </label>
                <input
                  id="full_name"
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  placeholder="Juan Pérez"
                  required
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
                  Contraseña
                </label>
                <input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  placeholder="Mínimo 6 caracteres"
                  required
                  minLength={6}
                />
              </div>

              <div>
                <label htmlFor="role" className="block text-sm font-medium text-slate-700 mb-2">
                  <Shield className="w-4 h-4 inline mr-1" />
                  Rol
                </label>
                <select
                  id="role"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  disabled={profile?.role === 'consultant'}
                >
                  <option value="reader">Lector</option>
                  {(profile?.role === 'admin' || profile?.role === 'super_admin') && <option value="consultant">Consultor</option>}
                  {profile?.role === 'super_admin' && <option value="admin">Administrador</option>}
                  {profile?.role === 'super_admin' && <option value="super_admin">Super Admin</option>}
                </select>
              </div>

              <div>
                <label htmlFor="organization" className="block text-sm font-medium text-slate-700 mb-2">
                  <Building2 className="w-4 h-4 inline mr-1" />
                  Organización
                </label>
                <select
                  id="organization"
                  value={formData.organization_id}
                  onChange={(e) => setFormData({ ...formData, organization_id: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                >
                  <option value="">Sin asignar</option>
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </select>
              </div>

              {(formData.role === 'consultant' || formData.role === 'reader') && sites.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    <MapPin className="w-4 h-4 inline mr-1" />
                    Asignar Sitios
                  </label>
                  <div className="border border-slate-300 rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                    {sites.length === 0 ? (
                      <p className="text-sm text-slate-500 p-2">No hay sitios disponibles</p>
                    ) : (
                      sites.map((site) => (
                        <label key={site.id} className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedSites.includes(site.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedSites([...selectedSites, site.id]);
                              } else {
                                setSelectedSites(selectedSites.filter((id) => id !== site.id));
                              }
                            }}
                            className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
                          />
                          <span className="text-sm text-slate-700">{site.name}</span>
                        </label>
                      ))
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {selectedSites.length} sitio(s) seleccionado(s)
                  </p>
                </div>
              )}

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
                    setSelectedSites([]);
                    setError('');
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

      {/* Edit Modal */}
      {showEditModal && editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-900">Editar Usuario</h3>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingUser(null);
                  setError('');
                }}
                className="p-2 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>

            <form onSubmit={handleEdit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  disabled
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg bg-slate-50 text-slate-500 cursor-not-allowed"
                />
              </div>

              <div>
                <label htmlFor="edit_full_name" className="block text-sm font-medium text-slate-700 mb-2">
                  Nombre Completo
                </label>
                <input
                  id="edit_full_name"
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  required
                />
              </div>

              <div>
                <label htmlFor="edit_role" className="block text-sm font-medium text-slate-700 mb-2">
                  <Shield className="w-4 h-4 inline mr-1" />
                  Rol
                </label>
                <select
                  id="edit_role"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  disabled={editingUser.role === 'super_admin' && profile?.role !== 'super_admin'}
                >
                  <option value="reader">Lector</option>
                  <option value="consultant">Consultor</option>
                  {profile?.role === 'super_admin' && <option value="admin">Administrador</option>}
                  {profile?.role === 'super_admin' && <option value="super_admin">Super Admin</option>}
                </select>
              </div>

              <div>
                <label htmlFor="edit_organization" className="block text-sm font-medium text-slate-700 mb-2">
                  <Building2 className="w-4 h-4 inline mr-1" />
                  Organización
                </label>
                <select
                  id="edit_organization"
                  value={formData.organization_id}
                  onChange={(e) => setFormData({ ...formData, organization_id: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                >
                  <option value="">Sin asignar</option>
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </select>
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
                    setEditingUser(null);
                    setError('');
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
    </div>

      {showDeleteModal && deletingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-900">Eliminar Usuario</h3>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletingUser(null);
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
                ¿Estás seguro de que deseas eliminar al usuario <span className="font-semibold">"{deletingUser.email}"</span>?
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
                  setShowDeleteModal(false);
                  setDeletingUser(null);
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
  );
}
