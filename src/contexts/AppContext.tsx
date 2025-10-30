import { createContext, useContext, useState, ReactNode } from 'react';

interface AppContextType {
  selectedOrganizationId: string | null;
  selectedSiteId: string | null;
  setSelectedOrganizationId: (id: string | null) => void;
  setSelectedSiteId: (id: string | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | null>(null);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);

  return (
    <AppContext.Provider
      value={{
        selectedOrganizationId,
        selectedSiteId,
        setSelectedOrganizationId,
        setSelectedSiteId,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
