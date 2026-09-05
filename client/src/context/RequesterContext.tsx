import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface Requester {
  id: number;
  name: string;
  email: string;
  isActive: boolean;
}

export interface RequesterContextType {
  currentRequester: Requester | null;
  requesters: Requester[];
  loading: boolean;
  error: string | null;
  selectRequester: (requesterId: number) => void;
  clearRequester: () => void;
  fetchRequesters: () => Promise<void>;
  getAuthHeaders: () => Record<string, string>;
}

export const RequesterContext = createContext<RequesterContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'toktickit_selected_requester_id';

export const RequesterProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentRequester, setCurrentRequester] = useState<Requester | null>(null);
  const [requesters, setRequesters] = useState<Requester[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRequesters = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/requesters');
      if (!response.ok) {
        throw new Error(`Failed to fetch requesters (HTTP ${response.status})`);
      }
      const data = await response.json();
      const activeList: Requester[] = data.success ? data.data : data;
      setRequesters(activeList);

      // Restore stored requester if valid
      const storedId = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (storedId) {
        const found = activeList.find((r) => r.id === parseInt(storedId, 10));
        if (found) {
          setCurrentRequester(found);
        } else {
          localStorage.removeItem(LOCAL_STORAGE_KEY);
        }
      }
    } catch (err) {
      console.error('Error in fetchRequesters:', err);
      setError(err instanceof Error ? err.message : 'Unable to connect to TokTickIT API');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequesters();
  }, []);

  const selectRequester = (requesterId: number) => {
    const found = requesters.find((r) => r.id === requesterId);
    if (found) {
      setCurrentRequester(found);
      localStorage.setItem(LOCAL_STORAGE_KEY, requesterId.toString());
    }
  };

  const clearRequester = () => {
    setCurrentRequester(null);
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  };

  const getAuthHeaders = (): Record<string, string> => {
    if (!currentRequester) return {};
    return {
      'X-Dev-Requester-Id': currentRequester.id.toString(),
    };
  };

  return (
    <RequesterContext.Provider
      value={{
        currentRequester,
        requesters,
        loading,
        error,
        selectRequester,
        clearRequester,
        fetchRequesters,
        getAuthHeaders,
      }}
    >
      {children}
    </RequesterContext.Provider>
  );
};

export const useRequester = (): RequesterContextType => {
  const context = useContext(RequesterContext);
  if (!context) {
    throw new Error('useRequester must be used within a RequesterProvider');
  }
  return context;
};
