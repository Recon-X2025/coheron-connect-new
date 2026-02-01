import { useState, useEffect, useCallback, useRef } from 'react';
import { apiService } from '../services/apiService';

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface UseServerPaginationResult<T> {
  data: T[];
  pagination: PaginationMeta;
  loading: boolean;
  error: string | null;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  setFilters: (filters: Record<string, any>) => void;
  refresh: () => void;
}

const defaultPagination: PaginationMeta = {
  page: 1,
  limit: 25,
  total: 0,
  totalPages: 1,
  hasNext: false,
  hasPrev: false,
};

export function useServerPagination<T = any>(
  endpoint: string,
  initialFilters?: Record<string, any>,
): UseServerPaginationResult<T> {
  const [data, setData] = useState<T[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>(defaultPagination);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(25);
  const [filters, setFilters] = useState<Record<string, any>>(initialFilters || {});
  const fetchIdRef = useRef(0);

  const fetchData = useCallback(async () => {
    const fetchId = ++fetchIdRef.current;
    setLoading(true);
    setError(null);

    try {
      const params: Record<string, any> = {
        page,
        limit: pageSize,
        ...filters,
      };

      // Remove undefined/null/empty string params
      Object.keys(params).forEach((key) => {
        if (params[key] === undefined || params[key] === null || params[key] === '') {
          delete params[key];
        }
      });

      const response = await apiService.getRaw<any>(endpoint, params);

      // Stale request guard
      if (fetchId !== fetchIdRef.current) return;

      // Handle paginated response: { data: [...], pagination: {...} }
      if (response && !Array.isArray(response) && Array.isArray(response.data)) {
        setData(response.data);
        setPagination(response.pagination || {
          ...defaultPagination,
          page,
          limit: pageSize,
          total: response.data.length,
          totalPages: 1,
        });
      } else if (Array.isArray(response)) {
        // Plain array fallback (backwards compat)
        setData(response);
        setPagination({
          page: 1,
          limit: response.length,
          total: response.length,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        });
      } else {
        setData([]);
        setPagination(defaultPagination);
      }
    } catch (err: any) {
      if (fetchId !== fetchIdRef.current) return;
      setError(err?.userMessage || err?.message || 'Failed to fetch data');
      setData([]);
      setPagination(defaultPagination);
    } finally {
      if (fetchId === fetchIdRef.current) {
        setLoading(false);
      }
    }
  }, [endpoint, page, pageSize, filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const setPageSize = useCallback((size: number) => {
    setPageSizeState(size);
    setPage(1);
  }, []);

  const handleSetFilters = useCallback((newFilters: Record<string, any>) => {
    setFilters(newFilters);
    setPage(1);
  }, []);

  return {
    data,
    pagination,
    loading,
    error,
    setPage,
    setPageSize,
    setFilters: handleSetFilters,
    refresh: fetchData,
  };
}
