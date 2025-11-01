import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import { supabase } from '../lib/supabase';
import { FileText, Plus, X, ArrowLeft, Sparkles, AlertTriangle, CheckCircle, Trash2, Search } from 'lucide-react';
import type { Database } from '../lib/database.types';

type Scenario = Database['public']['Tables']['scenarios']['Row'];
type Asset = Database['public']['Tables']['assets']['Row'];
type Threat = Database['public']['Tables']['threats']['Row'];
type Site = Database['public']['Tables']['sites']['Row'];

interface ScenarioWithDetails extends Scenario {
  asset?: Asset;
  threat?: Threat;
}

export function ScenariosPage({ onBack }: { onBack: () => void }) {
  const { profile } = useAuth();
  const { selectedOrganizationId, selectedSiteId } = useApp();
  const [scenarios, setScenarios] = useState<ScenarioWithDetails[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creationMode, setCreationMode] = useState<'manual' | 'ai' | null>(null);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Manual wizard states
  const [wizardStep, setWizardStep] = useState(1);
  const [selectedSite, setSelectedSite] = useState<string>('');
  const [selectedSiteInfo, setSelectedSiteInfo] = useState<Site | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [threats, setThreats] = useState<Threat[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [selectedThreats, setSelectedThreats] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdScenariosCount, setCreatedScenariosCount] = useState(0);
  const [processedAssets, setProcessedAssets] = useState<Set<string>>(new Set());
  const [assetScenariosCount, setAssetScenariosCount] = useState<Record<string, number>>({});

  // Quick Add states
  const [showQuickAddAsset, setShowQuickAddAsset] = useState(false);
  const [showQuickAddThreat, setShowQuickAddThreat] = useState(false);
  const [quickAssetForm, setQuickAssetForm] = useState({ name: '', type: '' });
  const [quickThreatForm, setQuickThreatForm] = useState({ name: '', category: '' });
  const [quickAdding, setQuickAdding] = useState(false);
  const [existingThreatIds, setExistingThreatIds] = useState<Set<string>>(new Set());

  // Delete states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingScenario, setDeletingScenario] = useState<ScenarioWithDetails | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Bulk delete states
  const [selectedScenarios, setSelectedScenarios] = useState<Set<string>>(new Set());
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

  useEffect(() => {
    loadData();
  }, [selectedOrganizationId, selectedSiteId]);

  const loadData = async () => {
    try {
      setLoading(true);

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

      // Load scenarios based on selected site
      let scenariosQuery = supabase.from('scenarios').select('*');

      if (selectedSiteId) {
        scenariosQuery = scenariosQuery.eq('site_id', selectedSiteId);
      } else if (sitesResult.data && sitesResult.data.length > 0) {
        const siteIds = sitesResult.data.map(s => s.id);
        scenariosQuery = scenariosQuery.in('site_id', siteIds);
      }

      // Load scenarios with assets and threats in a single query using JOIN
      // Limit to 100 most recent scenarios for better performance
      try {
        const scenariosResult = await scenariosQuery
          .select(`
            *,
            asset:assets(*),
            threat:threats(*)
          `)
          .order('created_at', { ascending: false })
          .limit(100);

        if (scenariosResult.error) {
          // If error is about missing columns, show helpful message
          if (scenariosResult.error.message?.includes('column') || scenariosResult.error.message?.includes('does not exist')) {
            setError('Por favor, aplica las migraciones de base de datos en Supabase Dashboard. Consulta supabase/migrations/');
            setScenarios([]);
          } else {
            throw scenariosResult.error;
          }
        } else {
          setScenarios(scenariosResult.data || []);
        }
      } catch (queryError: any) {
        console.error('Error loading scenarios:', queryError);
        setError(`Error cargando escenarios: ${queryError.message}. Verifica que las migraciones estén aplicadas.`);
        setScenarios([]);
      }
    } catch (err: any) {
      console.error('Error loading data:', err);
      setError(`Error cargando datos: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      in_evaluation: 'bg-blue-100 text-blue-800 border-blue-200',
      evaluated: 'bg-green-100 text-green-800 border-green-200',
    };
    const labels = {
      pending: 'Pendiente',
      in_evaluation: 'En Evaluación',
      evaluated: 'Evaluado',
    };
    return { style: styles[status as keyof typeof styles] || styles.pending, label: labels[status as keyof typeof labels] || status };
  };

  const canCreateScenarios = profile?.role === 'super_admin' || profile?.role === 'admin' || profile?.role === 'consultant';
  const canDeleteScenarios = profile?.role === 'super_admin' || profile?.role === 'admin';

  // Define asset type order (by keyword matching)
  const getAssetTypeOrder = (type: string | undefined): number => {
    if (!type) return 999;
    const lowerType = type.toLowerCase();
    if (lowerType.includes('persona') || lowerType.includes('personal') || lowerType.includes('people')) return 1;
    if (lowerType.includes('bien') || lowerType.includes('equipo') || lowerType.includes('goods') || lowerType.includes('asset')) return 2;
    if (lowerType.includes('proceso') || lowerType.includes('process')) return 3;
    if (lowerType.includes('información') || lowerType.includes('informacion') || lowerType.includes('dato') || lowerType.includes('information') || lowerType.includes('data')) return 4;
    return 999; // Other types go last
  };

  // Filter and sort scenarios based on search term and asset type
  const filteredScenarios = scenarios
    .filter((scenario) => {
      if (!searchTerm) return true;

      const searchLower = searchTerm.toLowerCase();
      const assetName = scenario.asset?.name?.toLowerCase() || '';
      const threatName = scenario.threat?.name?.toLowerCase() || '';

      return assetName.includes(searchLower) || threatName.includes(searchLower);
    })
    .sort((a, b) => {
      const orderA = getAssetTypeOrder(a.asset?.type);
      const orderB = getAssetTypeOrder(b.asset?.type);
      if (orderA !== orderB) return orderA - orderB;
      // Secondary sort by asset name
      const assetNameA = a.asset?.name || '';
      const assetNameB = b.asset?.name || '';
      return assetNameA.localeCompare(assetNameB);
    });

  // Delete functions
  const openDeleteModal = (scenario: ScenarioWithDetails) => {
    setDeletingScenario(scenario);
    setError('');
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    if (!deletingScenario) return;
    setError('');
    setDeleting(true);

    try {
      const { error } = await supabase
        .from('scenarios')
        .delete()
        .eq('id', deletingScenario.id);

      if (error) throw error;

      setShowDeleteModal(false);
      setDeletingScenario(null);
      await loadData();
    } catch (err: any) {
      console.error('Error deleting scenario:', err);
      setError(`Error eliminando escenario: ${err.message}`);
    } finally {
      setDeleting(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedScenarios.size === scenarios.length) {
      setSelectedScenarios(new Set());
    } else {
      setSelectedScenarios(new Set(scenarios.map(scenario => scenario.id)));
    }
  };

  const handleSelectScenario = (scenarioId: string) => {
    const newSelected = new Set(selectedScenarios);
    if (newSelected.has(scenarioId)) {
      newSelected.delete(scenarioId);
    } else {
      newSelected.add(scenarioId);
    }
    setSelectedScenarios(newSelected);
  };

  const handleBulkDelete = async () => {
    setError('');
    setDeleting(true);

    try {
      const deletePromises = Array.from(selectedScenarios).map(scenarioId =>
        supabase.from('scenarios').delete().eq('id', scenarioId)
      );

      const results = await Promise.all(deletePromises);
      const errors = results.filter(r => r.error);

      if (errors.length > 0) {
        throw new Error(`Error eliminando ${errors.length} escenario(s)`);
      }

      setShowBulkDeleteModal(false);
      setSelectedScenarios(new Set());
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Error al eliminar los escenarios');
    } finally {
      setDeleting(false);
    }
  };

  // Group assets by type for organized display
  const groupAssetsByType = (assets: Asset[]) => {
    const groups: Record<string, Asset[]> = {
      'Personas': [],
      'Bienes': [],
      'Procesos': [],
      'Información': [],
    };

    assets.forEach(asset => {
      const type = asset.type.toLowerCase();
      if (type.includes('persona') || type.includes('empleado') || type.includes('personal') || type.includes('gente')) {
        groups['Personas'].push(asset);
      } else if (type.includes('bien') || type.includes('equipo') || type.includes('maquinaria') || type.includes('vehículo')) {
        groups['Bienes'].push(asset);
      } else if (type.includes('proceso') || type.includes('procedimiento') || type.includes('operación')) {
        groups['Procesos'].push(asset);
      } else if (type.includes('información') || type.includes('dato') || type.includes('documento') || type.includes('archivo')) {
        groups['Información'].push(asset);
      } else {
        // Fallback: try to match with exact type names
        if (asset.type === 'Personas') groups['Personas'].push(asset);
        else if (asset.type === 'Bienes') groups['Bienes'].push(asset);
        else if (asset.type === 'Procesos') groups['Procesos'].push(asset);
        else if (asset.type === 'Información') groups['Información'].push(asset);
        else if (asset.type.includes('Tecnología') || asset.type.includes('Sistema')) groups['Bienes'].push(asset);
        else if (asset.type.includes('Instalaciones') || asset.type.includes('Inmueble')) groups['Bienes'].push(asset);
        else groups['Bienes'].push(asset); // Default fallback
      }
    });

    return groups;
  };

  // Group threats by category for organized display
  const groupThreatsByCategory = (threats: Threat[]) => {
    const groups: Record<string, Threat[]> = {
      'Naturales': [],
      'Sociales': [],
      'Tecnológicas': [],
    };

    threats.forEach(threat => {
      const category = threat.category.toLowerCase();
      if (category.includes('natural')) {
        groups['Naturales'].push(threat);
      } else if (category.includes('social') || category.includes('human')) {
        groups['Sociales'].push(threat);
      } else if (category.includes('tecnológica') || category.includes('tecnologica') || category.includes('tecnologic')) {
        groups['Tecnológicas'].push(threat);
      } else {
        // Fallback
        groups['Tecnológicas'].push(threat);
      }
    });

    return groups;
  };

  // Coherence mapping: asset types to threat categories
  // Note: All threats are shown regardless of asset type, as any threat can apply to any asset
  const getCoherentThreats = (asset: Asset, allThreats: Threat[]): Threat[] => {
    // Return all threats - coherence is suggestive, not restrictive
    return allThreats;
  };

  // Manual wizard functions
  const startManualWizard = async () => {
    setCreationMode('manual');
    setWizardStep(1);
    setSelectedAsset(null);
    setSelectedThreats([]);

    // Si ya hay un sitio seleccionado globalmente, usarlo
    if (selectedSiteId) {
      const site = sites.find(s => s.id === selectedSiteId);
      if (site) {
        setSelectedSite(selectedSiteId);
        setSelectedSiteInfo(site);
        await loadAssetsForSite(selectedSiteId);
        await loadThreatsForSite(selectedSiteId);
        setWizardStep(2); // Ir directo al paso 2
      }
    }
  };

  const loadAssetsForSite = async (siteId: string) => {
    try {
      const { data, error } = await supabase
        .from('assets')
        .select('*')
        .eq('site_id', siteId)
        .order('name');

      if (error) throw error;
      setAssets(data || []);

      // Load scenarios count for each asset
      await loadAssetScenariosCount(siteId);
    } catch (err: any) {
      console.error('Error loading assets:', err);
      setError(`Error cargando activos: ${err.message}`);
    }
  };

  const loadAssetScenariosCount = async (siteId: string) => {
    try {
      const { data, error } = await supabase
        .from('scenarios')
        .select('asset_id')
        .eq('site_id', siteId);

      if (error) throw error;

      // Count scenarios per asset
      const countMap: Record<string, number> = {};
      data?.forEach(scenario => {
        if (scenario.asset_id) {
          countMap[scenario.asset_id] = (countMap[scenario.asset_id] || 0) + 1;
        }
      });

      setAssetScenariosCount(countMap);
    } catch (err: any) {
      console.error('Error loading asset scenarios count:', err);
    }
  };

  const loadThreatsForSite = async (siteId: string) => {
    try {
      const { data, error } = await supabase
        .from('threats')
        .select('*')
        .eq('site_id', siteId)
        .order('name');

      if (error) throw error;
      setThreats(data || []);
    } catch (err: any) {
      console.error('Error loading threats:', err);
      setError(`Error cargando amenazas: ${err.message}`);
    }
  };

  const handleSiteSelection = async (site: Site) => {
    setSelectedSite(site.id);
    setSelectedSiteInfo(site);
    await loadAssetsForSite(site.id);
    await loadThreatsForSite(site.id);
    setWizardStep(2);
  };

  const handleAssetSelection = async (asset: Asset) => {
    setSelectedAsset(asset);
    setSelectedThreats([]); // Reset threats when changing asset

    // Load existing scenarios for this asset to prevent duplicates
    await loadExistingScenarios(asset.id);
  };

  const loadExistingScenarios = async (assetId: string) => {
    try {
      const { data, error } = await supabase
        .from('scenarios')
        .select('threat_id')
        .eq('site_id', selectedSite)
        .eq('asset_id', assetId);

      if (error) throw error;

      const threatIds = new Set(data?.map(s => s.threat_id) || []);
      setExistingThreatIds(threatIds);
    } catch (err: any) {
      console.error('Error loading existing scenarios:', err);
    }
  };

  const toggleThreatSelection = (threatId: string) => {
    // Don't allow selecting threats that already have scenarios
    if (existingThreatIds.has(threatId)) {
      return;
    }

    setSelectedThreats(prev =>
      prev.includes(threatId)
        ? prev.filter(id => id !== threatId)
        : [...prev, threatId]
    );
  };

  const createScenarios = async () => {
    if (!selectedAsset || selectedThreats.length === 0 || !profile?.id) return;

    setCreating(true);
    setError('');

    try {
      const scenariosToCreate = selectedThreats.map(threatId => ({
        site_id: selectedSite,
        asset_id: selectedAsset.id,
        threat_id: threatId,
        status: 'pending' as const,
        created_by: profile.id,
      }));

      const { error } = await supabase
        .from('scenarios')
        .insert(scenariosToCreate as any);

      if (error) throw error;

      // Reload scenarios
      await loadData();

      // Reload asset scenarios count
      await loadAssetScenariosCount(selectedSite);

      // Mark asset as processed
      setProcessedAssets(prev => new Set(prev).add(selectedAsset.id));

      // Show success modal
      setCreatedScenariosCount(selectedThreats.length);
      setShowSuccessModal(true);
    } catch (err: any) {
      console.error('Error creating scenarios:', err);
      setError(`Error creando escenarios: ${err.message}`);
    } finally {
      setCreating(false);
    }
  };

  const continueWithAnotherAsset = () => {
    setShowSuccessModal(false);
    setSelectedAsset(null);
    setSelectedThreats([]);
    setCreatedScenariosCount(0);
    setExistingThreatIds(new Set());
    // Stay on step 2 with the same site
  };

  const finishCreatingScenarios = () => {
    setShowSuccessModal(false);
    setCreationMode(null);
    setShowCreateModal(false);
    setWizardStep(1);
    setSelectedSite('');
    setSelectedSiteInfo(null);
    setSelectedAsset(null);
    setSelectedThreats([]);
    setAssets([]);
    setThreats([]);
    setCreatedScenariosCount(0);
    setProcessedAssets(new Set()); // Reset processed assets when finishing
    setExistingThreatIds(new Set()); // Reset existing threats
    setAssetScenariosCount({}); // Reset asset scenarios count
  };

  const resetWizard = () => {
    setCreationMode(null);
    setShowCreateModal(false);
    setWizardStep(1);
    setSelectedSite('');
    setSelectedSiteInfo(null);
    setSelectedAsset(null);
    setSelectedThreats([]);
    setAssets([]);
    setThreats([]);
    setError('');
    setProcessedAssets(new Set()); // Reset processed assets
    setAssetScenariosCount({}); // Reset asset scenarios count
  };

  // Quick Add functions
  const quickAddAsset = async () => {
    if (!quickAssetForm.name || !quickAssetForm.type || !profile?.id || !selectedSite) return;

    setQuickAdding(true);
    setError('');

    try {
      const { error } = await supabase.from('assets').insert({
        site_id: selectedSite,
        name: quickAssetForm.name,
        type: quickAssetForm.type,
        description: '',
        value: 'medium',
        location: '',
        owner: '',
        status: 'operational',
        created_by: profile.id,
      });

      if (error) throw error;

      // Reload assets (this also reloads scenarios count)
      await loadAssetsForSite(selectedSite);

      // Reset form and close modal
      setQuickAssetForm({ name: '', type: '' });
      setShowQuickAddAsset(false);
    } catch (err: any) {
      console.error('Error adding asset:', err);
      setError(`Error agregando activo: ${err.message}`);
    } finally {
      setQuickAdding(false);
    }
  };

  const quickAddThreat = async () => {
    if (!quickThreatForm.name || !quickThreatForm.category || !profile?.id || !selectedSite) return;

    setQuickAdding(true);
    setError('');

    try {
      const { error } = await supabase.from('threats').insert({
        site_id: selectedSite,
        name: quickThreatForm.name,
        category: quickThreatForm.category,
        description: '',
        probability: 'medium',
        impact: 'medium',
        risk_level: 'medium',
        mitigation_measures: '',
        status: 'active',
        created_by: profile.id,
      });

      if (error) throw error;

      // Reload threats
      await loadThreatsForSite(selectedSite);

      // Reset form and close modal
      setQuickThreatForm({ name: '', category: '' });
      setShowQuickAddThreat(false);
    } catch (err: any) {
      console.error('Error adding threat:', err);
      setError(`Error agregando amenaza: ${err.message}`);
    } finally {
      setQuickAdding(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
            title="Volver"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Escenarios</h1>
            <p className="text-gray-600 text-sm mt-1">Gestiona los escenarios de riesgo</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {canCreateScenarios && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              <Plus className="w-5 h-5" />
              Crear Escenario
            </button>
          )}
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Search Bar */}
      {!loading && scenarios.length > 0 && (
        <div className="mb-6 flex items-center gap-3">
          <div className="relative w-96">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar escenario por activo o amenaza..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          {selectedScenarios.size > 0 && canDeleteScenarios && (
            <button
              onClick={() => setShowBulkDeleteModal(true)}
              className="flex items-center gap-2 px-3 py-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition text-sm whitespace-nowrap"
              title={`Eliminar ${selectedScenarios.size} seleccionado(s)`}
            >
              <Trash2 className="w-4 h-4" />
              <span className="text-xs">({selectedScenarios.size})</span>
            </button>
          )}
        </div>
      )}

      {/* Info message about limit */}
      {!loading && scenarios.length > 0 && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-600" />
          <p className="text-sm text-blue-900">
            Mostrando los {scenarios.length} escenarios más recientes
            {scenarios.length >= 100 && ' (máximo 100)'}
            {searchTerm && ` (${filteredScenarios.length} resultado${filteredScenarios.length !== 1 ? 's' : ''} para "${searchTerm}")`}
          </p>
        </div>
      )}

      {/* Scenarios List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Cargando escenarios...</p>
        </div>
      ) : scenarios.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No hay escenarios</h3>
          <p className="text-gray-600 mb-4">Crea tu primer escenario de riesgo</p>
          {canCreateScenarios && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              <Plus className="w-5 h-5" />
              Crear Escenario
            </button>
          )}
        </div>
      ) : filteredScenarios.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No se encontraron escenarios</h3>
          <p className="text-gray-600 mb-4">No hay escenarios que coincidan con "{searchTerm}"</p>
          <button
            onClick={() => setSearchTerm('')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Limpiar búsqueda
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {canDeleteScenarios && (
                  <th className="px-6 py-3 w-12">
                    <input
                      type="checkbox"
                      checked={selectedScenarios.size === filteredScenarios.length && filteredScenarios.length > 0}
                      onChange={handleSelectAll}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Activo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amenaza
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha
                </th>
                {canDeleteScenarios && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredScenarios.map((scenario) => {
                const statusBadge = getStatusBadge(scenario.status || 'pending');
                return (
                  <tr key={scenario.id} className="hover:bg-gray-50">
                    {canDeleteScenarios && (
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedScenarios.has(scenario.id)}
                          onChange={() => handleSelectScenario(scenario.id)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                      </td>
                    )}
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {scenario.asset?.name || 'Activo no disponible'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {scenario.asset?.type}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {scenario.threat?.name || 'Amenaza no disponible'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {scenario.threat?.category}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${statusBadge.style}`}>
                        {statusBadge.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(scenario.created_at).toLocaleDateString()}
                    </td>
                    {canDeleteScenarios && (
                      <td className="px-6 py-4">
                        <button
                          onClick={() => openDeleteModal(scenario)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="Eliminar escenario"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal - Selection Mode */}
      {showCreateModal && !creationMode && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">Crear Escenarios</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              <button
                onClick={startManualWizard}
                className="w-full p-6 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition text-left"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FileText className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Selección Manual</h3>
                    <p className="text-sm text-gray-600">
                      Selecciona activos y amenazas manualmente para crear escenarios
                    </p>
                    <span className="inline-block mt-2 text-xs px-2 py-1 bg-green-100 text-green-800 rounded">
                      Disponible en plan FREE
                    </span>
                  </div>
                </div>
              </button>

              <button
                onClick={() => setCreationMode('ai')}
                className="w-full p-6 border-2 border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition text-left"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Sugerencias con IA</h3>
                    <p className="text-sm text-gray-600">
                      La IA analizará tus activos y amenazas para sugerir escenarios coherentes
                    </p>
                    <span className="inline-block mt-2 text-xs px-2 py-1 bg-purple-100 text-purple-800 rounded">
                      Solo plan PRO
                    </span>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Creation Modal - Wizard */}
      {creationMode === 'manual' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">Selección Manual de Escenarios</h2>
                <button
                  onClick={resetWizard}
                  className="p-2 hover:bg-gray-100 rounded-lg transition"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Progress Steps */}
              <div className="flex items-center justify-center gap-4">
                <div className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                    wizardStep >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
                  }`}>
                    1
                  </div>
                  <span className="ml-2 text-sm text-gray-600">Seleccionar Sitio</span>
                </div>
                <div className={`h-0.5 w-24 ${wizardStep >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`} />
                <div className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                    wizardStep >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
                  }`}>
                    2
                  </div>
                  <span className="ml-2 text-sm text-gray-600">Crear Escenarios</span>
                </div>
              </div>
            </div>

            <div className="p-6">
              {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}

              {/* Step 1: Select Site */}
              {wizardStep === 1 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Paso 1: Selecciona un Sitio</h3>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {sites.map((site) => (
                      <button
                        key={site.id}
                        onClick={() => handleSiteSelection(site)}
                        className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition text-left"
                      >
                        <div className="font-medium text-gray-900">{site.name}</div>
                        <div className="text-sm text-gray-600 mt-1">{site.industry_type}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 2: Select Asset and Threats */}
              {wizardStep === 2 && (
                <div>
                  {/* Site Info Banner */}
                  {selectedSiteInfo && (
                    <div className="mb-4 p-3 bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs font-semibold text-blue-900 uppercase tracking-wide">Trabajando en:</div>
                          <div className="font-bold text-blue-900 text-lg">{selectedSiteInfo.name}</div>
                          <div className="text-sm text-blue-700 mt-0.5">{selectedSiteInfo.industry_type}</div>
                        </div>
                        <button
                          onClick={() => {
                            setWizardStep(1);
                            setSelectedAsset(null);
                            setSelectedThreats([]);
                            setSelectedSiteInfo(null);
                          }}
                          className="text-blue-600 hover:text-blue-800 text-xs font-medium underline"
                        >
                          Cambiar sitio
                        </button>
                      </div>
                    </div>
                  )}

                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Paso 2: Selecciona un Activo y sus Amenazas</h3>

                  {/* Assets Section */}
                  {!selectedAsset ? (
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold text-gray-700">Selecciona un activo:</h4>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setShowQuickAddAsset(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 border-dashed rounded-lg hover:bg-blue-100 hover:border-blue-300 transition-all"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Agregar Activo
                          </button>
                          <button
                            onClick={() => setShowQuickAddThreat(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-orange-600 bg-orange-50 border border-orange-200 border-dashed rounded-lg hover:bg-orange-100 hover:border-orange-300 transition-all"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Agregar Amenaza
                          </button>
                        </div>
                      </div>
                      {assets.length === 0 ? (
                        <div className="text-center py-8 bg-gray-50 rounded-lg">
                          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                          <p className="text-gray-600 mb-3">No hay activos disponibles para este sitio</p>
                          <button
                            onClick={() => setShowQuickAddAsset(true)}
                            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border-2 border-blue-200 border-dashed rounded-lg hover:bg-blue-100 hover:border-blue-300 transition-all"
                          >
                            <Plus className="w-4 h-4" />
                            Agregar Activo
                          </button>
                        </div>
                      ) : (
                        <div className="max-h-96 overflow-y-auto">
                          {(() => {
                            const groupedAssets = groupAssetsByType(assets);

                            // Organize categories in 2 columns
                            const leftCategories = ['Personas', 'Bienes'];
                            const rightCategories = ['Procesos', 'Información'];

                            return (
                              <div className="grid grid-cols-2 gap-6">
                                {/* Left Column */}
                                <div className="space-y-3">
                                  {leftCategories.map(category => {
                                    const categoryAssets = groupedAssets[category];
                                    if (categoryAssets.length === 0) return null;

                                    return (
                                      <div key={category}>
                                        <div className="mb-2 px-3 py-1.5 bg-gradient-to-r from-blue-100 to-blue-50 border-l-4 border-blue-400 rounded">
                                          <h5 className="text-xs font-bold text-blue-900 uppercase tracking-wider">{category}</h5>
                                          <p className="text-xs text-blue-600 mt-0.5">{categoryAssets.length} activo{categoryAssets.length !== 1 ? 's' : ''}</p>
                                        </div>
                                        <div className="space-y-1.5">
                                          {categoryAssets.map(asset => {
                                            const scenariosCount = assetScenariosCount[asset.id] || 0;
                                            const hasScenarios = scenariosCount > 0;

                                            return (
                                              <button
                                                key={asset.id}
                                                onClick={() => handleAssetSelection(asset)}
                                                className={`w-full px-3 py-2.5 border rounded-lg transition text-left relative group ${
                                                  hasScenarios
                                                    ? 'border-green-200 bg-green-50 hover:bg-green-100'
                                                    : 'border-gray-200 bg-white hover:bg-blue-50 hover:border-blue-300'
                                                }`}
                                              >
                                                <div className="flex items-center justify-between gap-2">
                                                  <div className="flex-1 min-w-0">
                                                    <div className="font-medium text-gray-900 text-sm truncate">{asset.name}</div>
                                                    <div className="flex items-center gap-1.5 mt-0.5">
                                                      <span className="text-xs text-gray-500">{asset.type}</span>
                                                      <span className="text-gray-300">•</span>
                                                      <span className={`text-xs font-medium ${
                                                        asset.value === 'high' ? 'text-red-600' :
                                                        asset.value === 'medium' ? 'text-yellow-600' :
                                                        'text-green-600'
                                                      }`}>
                                                        {asset.value === 'high' ? 'Alto' : asset.value === 'medium' ? 'Medio' : 'Bajo'}
                                                      </span>
                                                    </div>
                                                  </div>
                                                  {hasScenarios && (
                                                    <span className="flex-shrink-0 bg-green-500 text-white px-2 py-1 rounded text-xs font-medium">
                                                      {scenariosCount} ✓
                                                    </span>
                                                  )}
                                                </div>
                                              </button>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>

                                {/* Right Column */}
                                <div className="space-y-3">
                                  {rightCategories.map(category => {
                                    const categoryAssets = groupedAssets[category];
                                    if (categoryAssets.length === 0) return null;

                                    return (
                                      <div key={category}>
                                        <div className="mb-2 px-3 py-1.5 bg-gradient-to-r from-blue-100 to-blue-50 border-l-4 border-blue-400 rounded">
                                          <h5 className="text-xs font-bold text-blue-900 uppercase tracking-wider">{category}</h5>
                                          <p className="text-xs text-blue-600 mt-0.5">{categoryAssets.length} activo{categoryAssets.length !== 1 ? 's' : ''}</p>
                                        </div>
                                        <div className="space-y-1.5">
                                          {categoryAssets.map(asset => {
                                            const scenariosCount = assetScenariosCount[asset.id] || 0;
                                            const hasScenarios = scenariosCount > 0;

                                            return (
                                              <button
                                                key={asset.id}
                                                onClick={() => handleAssetSelection(asset)}
                                                className={`w-full px-3 py-2.5 border rounded-lg transition text-left relative group ${
                                                  hasScenarios
                                                    ? 'border-green-200 bg-green-50 hover:bg-green-100'
                                                    : 'border-gray-200 bg-white hover:bg-blue-50 hover:border-blue-300'
                                                }`}
                                              >
                                                <div className="flex items-center justify-between gap-2">
                                                  <div className="flex-1 min-w-0">
                                                    <div className="font-medium text-gray-900 text-sm truncate">{asset.name}</div>
                                                    <div className="flex items-center gap-1.5 mt-0.5">
                                                      <span className="text-xs text-gray-500">{asset.type}</span>
                                                      <span className="text-gray-300">•</span>
                                                      <span className={`text-xs font-medium ${
                                                        asset.value === 'high' ? 'text-red-600' :
                                                        asset.value === 'medium' ? 'text-yellow-600' :
                                                        'text-green-600'
                                                      }`}>
                                                        {asset.value === 'high' ? 'Alto' : asset.value === 'medium' ? 'Medio' : 'Bajo'}
                                                      </span>
                                                    </div>
                                                  </div>
                                                  {hasScenarios && (
                                                    <span className="flex-shrink-0 bg-green-500 text-white px-2 py-1 rounded text-xs font-medium">
                                                      {scenariosCount} ✓
                                                    </span>
                                                  )}
                                                </div>
                                              </button>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Show selected asset and threats */
                    <div>
                      {/* Selected Asset Display */}
                      <div className="mb-6 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="text-sm font-semibold text-blue-900 mb-1">Activo seleccionado:</div>
                            <div className="font-medium text-gray-900">{selectedAsset.name}</div>
                            <div className="text-sm text-gray-600">{selectedAsset.type}</div>
                          </div>
                          <button
                            onClick={() => {
                              setSelectedAsset(null);
                              setSelectedThreats([]);
                            }}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            Cambiar activo
                          </button>
                        </div>
                      </div>

                      {/* Threats Section */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-semibold text-gray-700">
                            Selecciona las amenazas:
                          </h4>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setShowQuickAddThreat(true)}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-orange-600 bg-orange-50 border border-orange-200 border-dashed rounded-lg hover:bg-orange-100 hover:border-orange-300 transition-all"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              Agregar Amenaza
                            </button>
                            <button
                              onClick={createScenarios}
                              disabled={selectedThreats.length === 0 || creating}
                              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              {creating ? 'Creando...' : `Crear Escenarios ${selectedThreats.length > 0 ? `(${selectedThreats.length})` : ''}`}
                            </button>
                          </div>
                        </div>

                        {(() => {
                          const coherentThreats = getCoherentThreats(selectedAsset, threats);

                          if (coherentThreats.length === 0) {
                            return (
                              <div className="text-center py-8 bg-gray-50 rounded-lg">
                                <AlertTriangle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                <p className="text-gray-600">No hay amenazas disponibles para este sitio</p>
                                <button
                                  onClick={() => setShowQuickAddThreat(true)}
                                  className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition"
                                >
                                  <Plus className="w-5 h-5" />
                                  Agregar Amenaza
                                </button>
                              </div>
                            );
                          }

                          return (
                            <>
                              <div className="mb-3 text-xs text-gray-600 bg-gray-50 p-2 rounded">
                                Mostrando {coherentThreats.length} amenaza{coherentThreats.length !== 1 ? 's' : ''} disponible{coherentThreats.length !== 1 ? 's' : ''}
                              </div>

                              {(() => {
                                const groupedThreats = groupThreatsByCategory(coherentThreats);
                                const categories = ['Naturales', 'Sociales', 'Tecnológicas'];

                                return (
                                  <div className="grid grid-cols-3 gap-3 max-h-80 overflow-y-auto">
                                    {categories.map(category => {
                                      const categoryThreats = groupedThreats[category];

                                      return (
                                        <div key={category} className="space-y-2">
                                          <div className="sticky top-0 bg-white z-10 pb-2">
                                            <div className="px-2 py-1 bg-gradient-to-r from-gray-100 to-gray-50 border-l-4 border-orange-500 rounded">
                                              <h5 className="text-xs font-bold text-gray-700 uppercase tracking-wide">{category}</h5>
                                              <p className="text-xs text-gray-500">{categoryThreats.length} amenazas</p>
                                            </div>
                                          </div>

                                          {categoryThreats.length === 0 ? (
                                            <div className="p-4 text-center text-xs text-gray-400 bg-gray-50 rounded border border-dashed border-gray-300">
                                              Sin amenazas
                                            </div>
                                          ) : (
                                            <div className="space-y-2">
                                              {categoryThreats.map((threat) => {
                                                const isSelected = selectedThreats.includes(threat.id);
                                                const isAlreadyUsed = existingThreatIds.has(threat.id);

                                                return (
                                                  <div
                                                    key={threat.id}
                                                    onClick={() => toggleThreatSelection(threat.id)}
                                                    className={`p-2 border-2 rounded-lg transition relative ${
                                                      isAlreadyUsed
                                                        ? 'border-gray-300 bg-gray-100 opacity-60 cursor-not-allowed'
                                                        : isSelected
                                                        ? 'border-orange-500 bg-orange-50 cursor-pointer'
                                                        : 'border-gray-200 hover:border-orange-300 cursor-pointer'
                                                    }`}
                                                  >
                                                    {isAlreadyUsed && (
                                                      <div className="absolute top-1 right-1 flex items-center gap-0.5 bg-gray-600 text-white px-1.5 py-0.5 rounded text-xs">
                                                        <CheckCircle className="w-2.5 h-2.5" />
                                                        <span>Usado</span>
                                                      </div>
                                                    )}
                                                    <div className="flex items-start gap-2">
                                                      <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        disabled={isAlreadyUsed}
                                                        onChange={() => {}}
                                                        className="mt-0.5 w-3.5 h-3.5 text-orange-600 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                                                      />
                                                      <div className="flex-1 min-w-0">
                                                        <div className={`font-medium text-sm leading-tight ${isAlreadyUsed ? 'text-gray-500' : 'text-gray-900'}`}>
                                                          {threat.name}
                                                        </div>
                                                        <div className="flex gap-1 mt-1">
                                                          <span className={`text-xs px-1.5 py-0.5 rounded ${isAlreadyUsed ? 'bg-gray-200 text-gray-500' : 'bg-gray-100 text-gray-700'}`}>
                                                            P:{threat.probability}
                                                          </span>
                                                          <span className={`text-xs px-1.5 py-0.5 rounded ${isAlreadyUsed ? 'bg-gray-200 text-gray-500' : 'bg-gray-100 text-gray-700'}`}>
                                                            I:{threat.impact}
                                                          </span>
                                                        </div>
                                                      </div>
                                                    </div>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                );
                              })()}
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  )}

                  {/* Footer - Volver */}
                  {!selectedAsset && (
                    <div className="mt-6">
                      <button
                        onClick={() => {
                          setWizardStep(1);
                          setSelectedAsset(null);
                          setSelectedThreats([]);
                          setSelectedSiteInfo(null);
                        }}
                        className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                      >
                        Volver
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* AI Creation Modal */}
      {creationMode === 'ai' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">Sugerencias IA de Escenarios</h2>
              <button
                onClick={() => {
                  setCreationMode(null);
                  setShowCreateModal(false);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="text-center py-12">
              <Sparkles className="w-16 h-16 text-purple-300 mx-auto mb-4" />
              <p className="text-gray-600">Funcionalidad de IA en desarrollo...</p>
              <p className="text-sm text-gray-500 mt-2">Disponible solo en plan PRO</p>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">¡Escenarios Creados!</h3>
              <p className="text-gray-600 mb-6">
                Se crearon exitosamente <strong>{createdScenariosCount}</strong> escenario{createdScenariosCount !== 1 ? 's' : ''} de riesgo
              </p>

              <div className="space-y-3">
                <button
                  onClick={continueWithAnotherAsset}
                  className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
                >
                  Crear escenarios para otro activo
                </button>
                <button
                  onClick={finishCreatingScenarios}
                  className="w-full px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium"
                >
                  Finalizar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Add Asset Modal */}
      {showQuickAddAsset && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">Agregar Activo</h3>
              <button
                onClick={() => {
                  setShowQuickAddAsset(false);
                  setQuickAssetForm({ name: '', type: '' });
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); quickAddAsset(); }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre del Activo <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={quickAssetForm.name}
                  onChange={(e) => setQuickAssetForm({ ...quickAssetForm, name: e.target.value })}
                  placeholder="Ej: Director General, Servidor Principal..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Activo <span className="text-red-600">*</span>
                </label>
                <select
                  value={quickAssetForm.type}
                  onChange={(e) => setQuickAssetForm({ ...quickAssetForm, type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  required
                >
                  <option value="">Selecciona un tipo</option>
                  <option value="Personas">Personas</option>
                  <option value="Bienes">Bienes / Equipos</option>
                  <option value="Tecnología">Tecnología / Sistemas</option>
                  <option value="Información">Información / Datos</option>
                  <option value="Procesos">Procesos</option>
                  <option value="Instalaciones">Instalaciones / Inmuebles</option>
                </select>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-900">
                  Los demás campos (descripción, valor, ubicación, etc.) se llenarán con valores predeterminados.
                  Puedes editarlos después en el catálogo de Activos.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowQuickAddAsset(false);
                    setQuickAssetForm({ name: '', type: '' });
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={quickAdding || !quickAssetForm.name || !quickAssetForm.type}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {quickAdding ? 'Agregando...' : 'Agregar Activo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Add Threat Modal */}
      {showQuickAddThreat && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">Agregar Amenaza</h3>
              <button
                onClick={() => {
                  setShowQuickAddThreat(false);
                  setQuickThreatForm({ name: '', category: '' });
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); quickAddThreat(); }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre de la Amenaza <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={quickThreatForm.name}
                  onChange={(e) => setQuickThreatForm({ ...quickThreatForm, name: e.target.value })}
                  placeholder="Ej: Secuestro, Incendio, Falla Eléctrica..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Categoría de Amenaza <span className="text-red-600">*</span>
                </label>
                <select
                  value={quickThreatForm.category}
                  onChange={(e) => setQuickThreatForm({ ...quickThreatForm, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  required
                >
                  <option value="">Selecciona una categoría</option>
                  <option value="Sociales">Sociales / Humanas</option>
                  <option value="Naturales">Naturales</option>
                  <option value="Tecnológicas">Tecnológicas</option>
                </select>
              </div>

              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                <p className="text-xs text-orange-900">
                  Los demás campos (probabilidad, impacto, medidas, etc.) se llenarán con valores predeterminados.
                  Puedes editarlos después en el catálogo de Amenazas.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowQuickAddThreat(false);
                    setQuickThreatForm({ name: '', category: '' });
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={quickAdding || !quickThreatForm.name || !quickThreatForm.category}
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {quickAdding ? 'Agregando...' : 'Agregar Amenaza'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deletingScenario && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Eliminar Escenario
                </h3>
                <p className="text-sm text-gray-600">
                  ¿Estás seguro de que deseas eliminar este escenario?
                </p>
                <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium text-gray-900">
                    {deletingScenario.asset?.name || 'Activo no disponible'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Amenaza: {deletingScenario.threat?.name || 'Amenaza no disponible'}
                  </p>
                </div>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletingScenario(null);
                  setError('');
                }}
                disabled={deleting}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {deleting ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {showBulkDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-900">Eliminar Escenarios</h3>
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
                ¿Estás seguro de que deseas eliminar <span className="font-semibold">{selectedScenarios.size} escenario(s)</span>?
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
                disabled={deleting}
                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
