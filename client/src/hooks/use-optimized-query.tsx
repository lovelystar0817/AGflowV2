import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

/**
 * Optimized query hook that implements intelligent caching and batching
 */
export function useOptimizedQuery<T>(
  queryKey: string[],
  queryFn?: () => Promise<T>,
  options?: {
    staleTime?: number;
    cacheTime?: number;
    refetchOnWindowFocus?: boolean;
    enabled?: boolean;
  }
) {
  const defaultOptions = {
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    ...options
  };

  return useQuery({
    queryKey,
    queryFn,
    ...defaultOptions
  });
}

/**
 * Debounced query hook for user input fields
 */
export function useDebouncedQuery<T>(
  queryKey: string[],
  queryFn: () => Promise<T>,
  delay: number = 300,
  enabled: boolean = true
) {
  const debouncedQueryFn = useCallback(
    debounce(queryFn, delay),
    [queryFn, delay]
  );

  return useQuery({
    queryKey,
    queryFn: debouncedQueryFn,
    enabled,
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Batch invalidation utility for related queries
 */
export function useBatchInvalidation() {
  const queryClient = useQueryClient();

  return useCallback((queryPatterns: string[]) => {
    queryPatterns.forEach(pattern => {
      queryClient.invalidateQueries({ queryKey: [pattern] });
    });
  }, [queryClient]);
}

/**
 * Optimized monthly availability query with intelligent caching
 */
export function useMonthlyAvailability(currentDate: Date) {
  const queryKey = useMemo(() => {
    const monthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    return ['/api/availability/month', monthKey];
  }, [currentDate]);

  return useOptimizedQuery(
    queryKey,
    async () => {
      const monthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
      const response = await fetch(`/api/availability/month/${monthKey}`);
      if (!response.ok) throw new Error('Failed to fetch monthly availability');
      return response.json();
    },
    {
      staleTime: 2 * 60 * 1000, // 2 minutes for availability data
      enabled: !!currentDate
    }
  );
}

// Simple debounce utility
function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>): Promise<ReturnType<T>> => {
    return new Promise((resolve, reject) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(async () => {
        try {
          const result = await func(...args);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      }, delay);
    });
  };
}