import { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { DashboardHome } from './DashboardHome';
import { UsersPage } from './UsersPage';
import { OrganizationsPage } from './OrganizationsPage';
import { SitesPage } from './SitesPage';
import { AssetsPage } from './AssetsPage';
import { ThreatsPage } from './ThreatsPage';

export function Layout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string>('dashboard');

  const renderContent = () => {
    switch (activeMenu) {
      case 'dashboard':
        return <DashboardHome />;
      case 'users':
        return <UsersPage onBack={() => setActiveMenu('dashboard')} />;
      case 'organizations':
        return <OrganizationsPage onBack={() => setActiveMenu('dashboard')} />;
      case 'sites':
        return <SitesPage onBack={() => setActiveMenu('dashboard')} />;
      case 'assets':
        return <AssetsPage onBack={() => setActiveMenu('dashboard')} />;
      case 'threats':
        return <ThreatsPage onBack={() => setActiveMenu('dashboard')} />;
      default:
        return <DashboardHome />;
    }
  };

  return (
    <div className="flex h-screen bg-white">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        activeMenu={activeMenu}
        onMenuChange={setActiveMenu}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}
