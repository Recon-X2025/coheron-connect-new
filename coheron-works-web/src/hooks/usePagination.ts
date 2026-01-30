import { useState, useMemo, useCallback } from 'react';

export interface UsePaginationResult<T> {
  paginatedItems: T[];
  page: number;
  setPage: (page: number) => void;
  pageSize: number;
  setPageSize: (size: number) => void;
  totalPages: number;
  totalItems: number;
  resetPage: () => void;
}

export function usePagination<T>(items: T[], defaultPageSize = 25): UsePaginationResult<T> {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // Clamp page to valid range
  const safePage = Math.min(page, totalPages);

  const paginatedItems = useMemo(
    () => items.slice((safePage - 1) * pageSize, safePage * pageSize),
    [items, safePage, pageSize]
  );

  const resetPage = useCallback(() => setPage(1), []);

  const handleSetPageSize = useCallback((newSize: number) => {
    setPageSize(newSize);
    setPage(1);
  }, []);

  return {
    paginatedItems,
    page: safePage,
    setPage,
    pageSize,
    setPageSize: handleSetPageSize,
    totalPages,
    totalItems,
    resetPage,
  };
}
