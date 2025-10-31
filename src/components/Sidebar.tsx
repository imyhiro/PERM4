import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  Settings,
  Users,
  Building2,
  MapPin,
  Shield,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  FileText,
} from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  activeMenu: string;
  onMenuChange: (menuId: string) => void;
}

type MenuItem = {
  id: string;
  label: string;
  icon: React.ElementType;
  section?: 'configuration' | 'catalogs';
};

export function Sidebar({ collapsed, onToggle, activeMenu, onMenuChange }: SidebarProps) {
  const { profile } = useAuth();

  const getMenuItems = (): MenuItem[] => {
    const role = profile?.role;
    const items: MenuItem[] = [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ];

    if (role === 'super_admin' || role === 'admin') {
      items.push(
        { id: 'users', label: 'Usuarios', icon: Users, section: 'configuration' },
        { id: 'organizations', label: 'Organizaciones', icon: Building2, section: 'configuration' },
        { id: 'sites', label: 'Sitios', icon: MapPin, section: 'configuration' }
      );
    } else if (role === 'consultant') {
      items.push(
        { id: 'users', label: 'Usuarios', icon: Users, section: 'configuration' },
        { id: 'sites', label: 'Sitios', icon: MapPin, section: 'configuration' }
      );
    } else if (role === 'reader') {
      items.push(
        { id: 'sites', label: 'Sitios', icon: MapPin, section: 'configuration' }
      );
    }

    items.push(
      { id: 'assets', label: 'Activos', icon: Shield, section: 'catalogs' },
      { id: 'threats', label: 'Amenazas', icon: AlertTriangle, section: 'catalogs' },
      { id: 'scenarios', label: 'Escenarios', icon: FileText, section: 'catalogs' }
    );

    return items;
  };

  const menuItems = getMenuItems();
  const configurationItems = menuItems.filter(item => item.section === 'configuration');
  const catalogItems = menuItems.filter(item => item.section === 'catalogs');
  const dashboardItem = menuItems.find(item => item.id === 'dashboard');

  return (
    <div
      className={`bg-gray-50 border-r border-gray-200 flex flex-col transition-all duration-300 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      <div className="px-4 py-3.5 border-b border-gray-200 flex items-center justify-between">
        {!collapsed && (
          <h1 className="text-lg font-bold text-gray-900">PERM 4.0</h1>
        )}
        <button
          onClick={onToggle}
          className="p-1 hover:bg-gray-200 rounded transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4 text-gray-600" />
          ) : (
            <ChevronLeft className="w-4 h-4 text-gray-600" />
          )}
        </button>
      </div>

      <nav className="flex-1 p-3 space-y-5">
        {dashboardItem && (
          <div>
            <button
              onClick={() => onMenuChange(dashboardItem.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md transition-colors ${
                activeMenu === dashboardItem.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-700 hover:bg-gray-200'
              }`}
            >
              <dashboardItem.icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span className="text-sm font-medium">{dashboardItem.label}</span>}
            </button>
          </div>
        )}

        {configurationItems.length > 0 && (
          <div>
            {!collapsed && (
              <div className="flex items-center gap-2 px-3 mb-2">
                <Settings className="w-4 h-4 text-gray-500" />
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Configuración
                </h2>
              </div>
            )}
            <div className="space-y-0.5">
              {configurationItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onMenuChange(item.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md transition-colors ${
                    activeMenu === item.id
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-700 hover:bg-gray-200'
                  }`}
                  title={collapsed ? item.label : undefined}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
                </button>
              ))}
            </div>
          </div>
        )}

        {catalogItems.length > 0 && (
          <div>
            {!collapsed && (
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 mb-2">
                Catálogos
              </h2>
            )}
            <div className="space-y-0.5">
              {catalogItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onMenuChange(item.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md transition-colors ${
                    activeMenu === item.id
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-700 hover:bg-gray-200'
                  }`}
                  title={collapsed ? item.label : undefined}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
                </button>
              ))}
            </div>
          </div>
        )}
      </nav>
    </div>
  );
}
