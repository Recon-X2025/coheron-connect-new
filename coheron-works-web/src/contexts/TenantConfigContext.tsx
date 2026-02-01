import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { getAllModuleNames } from '../shared/moduleRegistry';

interface TenantConfigContextValue {
  enabledModules: string[];
  isLoading: boolean;
  refreshConfig: () => Promise<void>;
}

const TenantConfigContext = createContext<TenantConfigContextValue | null>(null);

export const TenantConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [enabledModules, setEnabledModules] = useState<string[]>(getAllModuleNames());
  const [isLoading, setIsLoading] = useState(false);

  const fetchConfig = useCallback(async () => {
    if (!isAuthenticated || !user?.tenant_id) {
      // Not logged in — enable all modules (for public/demo)
      setEnabledModules(getAllModuleNames());
      return;
    }

    setIsLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`/api/tenant-config/${user.tenant_id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setEnabledModules(data.enabled_modules || getAllModuleNames());
      } else {
        // Fallback: all modules enabled
        setEnabledModules(getAllModuleNames());
      }
    } catch {
      setEnabledModules(getAllModuleNames());
    }
    setIsLoading(false);
  }, [isAuthenticated, user?.tenant_id]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  // Listen for socket events for hot-toggle (Phase C)
  useEffect(() => {
    if (!isAuthenticated) return;

    const handleModuleToggled = (event: CustomEvent) => {
      const { enabled_modules } = event.detail;
      if (Array.isArray(enabled_modules)) {
        setEnabledModules(enabled_modules);
      }
    };

    window.addEventListener('module:toggled', handleModuleToggled as EventListener);
    return () => {
      window.removeEventListener('module:toggled', handleModuleToggled as EventListener);
    };
  }, [isAuthenticated]);

  return (
    <TenantConfigContext.Provider value={{ enabledModules, isLoading, refreshConfig: fetchConfig }}>
      {children}
    </TenantConfigContext.Provider>
  );
};

export function useTenantConfig(): TenantConfigContextValue {
  const context = useContext(TenantConfigContext);
  if (!context) {
    throw new Error('useTenantConfig must be used within a TenantConfigProvider');
  }
  return context;
}
