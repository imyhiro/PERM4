import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, Shield, Building2, MapPin, FileText, Users, Package, AlertTriangle } from 'lucide-react';
import { OrganizationsPage } from './OrganizationsPage';
import { SitesPage } from './SitesPage';
import { UsersPage } from './UsersPage';
import { AssetsPage } from './AssetsPage';
import { ThreatsPage } from './ThreatsPage';

type Page = 'dashboard' | 'organizations' | 'sites' | 'users' | 'assets' | 'threats' | 'scenarios';

export function Dashboard() {
  const { profile, signOut } = useAuth();
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'admin':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'consultant':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'reader':
        return 'bg-slate-100 text-slate-800 border-slate-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'Super Administrador';
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

  const renderPage = () => {
    switch (currentPage) {
      case 'organizations':
        return <OrganizationsPage onBack={() => setCurrentPage('dashboard')} />;
      case 'sites':
        return <SitesPage onBack={() => setCurrentPage('dashboard')} />;
      case 'users':
        return <UsersPage onBack={() => setCurrentPage('dashboard')} />;
      case 'assets':
        return <AssetsPage onBack={() => setCurrentPage('dashboard')} />;
      case 'threats':
        return <ThreatsPage onBack={() => setCurrentPage('dashboard')} />;
      case 'scenarios':
        return (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900">Módulo de Escenarios</h3>
            <p className="text-slate-600 mt-2">Próximamente</p>
          </div>
        );
      default:
        return <DashboardHome onNavigate={setCurrentPage} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <button
              onClick={() => setCurrentPage('dashboard')}
              className="flex items-center hover:opacity-80 transition"
            >
              <Shield className="w-8 h-8 text-blue-600" />
              <span className="ml-3 text-xl font-bold text-slate-900">RiskAnalysis Pro</span>
            </button>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium text-slate-900">{profile?.full_name}</p>
                <p className="text-xs text-slate-500">{profile?.email}</p>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold border ${getRoleColor(profile?.role || '')}`}
              >
                {getRoleLabel(profile?.role || '')}
              </span>
              <button
                onClick={signOut}
                className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                title="Cerrar Sesión"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{renderPage()}</main>
    </div>
  );
}

function DashboardHome({ onNavigate }: { onNavigate: (page: Page) => void }) {
  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Panel de Control</h1>
        <p className="text-slate-600 mt-2">Bienvenido a tu plataforma de análisis de riesgos</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <button
          onClick={() => onNavigate('organizations')}
          className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition cursor-pointer text-left"
        >
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
            <Building2 className="w-6 h-6 text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Organizaciones</h3>
          <p className="text-slate-600 text-sm">Gestiona organizaciones y licencias</p>
        </button>

        <button
          onClick={() => onNavigate('users')}
          className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition cursor-pointer text-left"
        >
          <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center mb-4">
            <Users className="w-6 h-6 text-slate-600" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Usuarios</h3>
          <p className="text-slate-600 text-sm">Gestiona usuarios y roles</p>
        </button>

        <button
          onClick={() => onNavigate('sites')}
          className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition cursor-pointer text-left"
        >
          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
            <MapPin className="w-6 h-6 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Sitios</h3>
          <p className="text-slate-600 text-sm">Visualiza y gestiona tus sitios</p>
        </button>

        <button
          onClick={() => onNavigate('assets')}
          className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition cursor-pointer text-left"
        >
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
            <Package className="w-6 h-6 text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Activos</h3>
          <p className="text-slate-600 text-sm">Gestiona los activos de tu organización</p>
        </button>

        <button
          onClick={() => onNavigate('threats')}
          className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition cursor-pointer text-left"
        >
          <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Amenazas</h3>
          <p className="text-slate-600 text-sm">Identifica y gestiona amenazas</p>
        </button>

        <button
          onClick={() => onNavigate('scenarios')}
          className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition cursor-pointer text-left"
        >
          <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
            <FileText className="w-6 h-6 text-orange-600" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Escenarios</h3>
          <p className="text-slate-600 text-sm">Genera y analiza escenarios de riesgo</p>
        </button>
      </div>

      <div className="mt-8 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Primeros Pasos</h2>
          <div className="space-y-4">
            <div className="flex items-start">
              <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold text-sm mr-4 flex-shrink-0">
                1
              </div>
              <div>
                <h3 className="font-medium text-slate-900">Crear una Organización</h3>
                <p className="text-sm text-slate-600 mt-1">
                  Configura tu organización con el nivel de licencia apropiado
                </p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold text-sm mr-4 flex-shrink-0">
                2
              </div>
              <div>
                <h3 className="font-medium text-slate-900">Agregar Sitios</h3>
                <p className="text-sm text-slate-600 mt-1">
                  Define las ubicaciones que deseas analizar para riesgos
                </p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold text-sm mr-4 flex-shrink-0">
                3
              </div>
              <div>
                <h3 className="font-medium text-slate-900">Seleccionar Activos y Amenazas</h3>
                <p className="text-sm text-slate-600 mt-1">
                  Elige de nuestro catálogo o crea activos y amenazas personalizados
                </p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold text-sm mr-4 flex-shrink-0">
                4
              </div>
              <div>
                <h3 className="font-medium text-slate-900">Generar Escenarios</h3>
                <p className="text-sm text-slate-600 mt-1">
                  Crea y analiza escenarios de riesgo para tus sitios
                </p>
              </div>
            </div>
          </div>
        </div>
    </>
  );
}
