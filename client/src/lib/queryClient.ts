import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// Cache for CSRF token to avoid multiple requests
let csrfTokenCache: string | null = null;

// Helper function to get CSRF token from API
export async function getCsrfToken(): Promise<string | null> {
  // Return cached token if available
  if (csrfTokenCache) {
    return csrfTokenCache;
  }

  try {
    const response = await fetch('/api/csrf', {
      method: 'GET',
      credentials: 'include',
    });
    
    if (!response.ok) {
      console.warn('Failed to fetch CSRF token');
      return null;
    }
    
    const data = await response.json();
    csrfTokenCache = data.csrfToken;
    return csrfTokenCache;
  } catch (error) {
    console.warn('Error fetching CSRF token:', error);
    return null;
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const headers: Record<string, string> = {};
  const isFormData = typeof FormData !== "undefined" && data instanceof FormData;

  // Only set JSON content-type when the payload is JSON, not FormData
  if (data && !isFormData) {
    headers["Content-Type"] = "application/json";
  }
  
  // Add CSRF token for non-GET requests
  if (method !== 'GET') {
    const csrfToken = await getCsrfToken();
    if (csrfToken) {
      headers['x-csrf-token'] = csrfToken;
    }
  }

  const res = await fetch(url, {
    method,
    headers,
    body: data ? (isFormData ? (data as FormData) : JSON.stringify(data)) : undefined,
    credentials: "include",
  });

  // If we get a 403 error, clear the cached token and retry once
  if (!res.ok && res.status === 403 && method !== 'GET') {
    const errorText = await res.text();
    if (errorText.includes('CSRF token')) {
      // Clear cached token and retry once
      csrfTokenCache = null;
      const newCsrfToken = await getCsrfToken();
      if (newCsrfToken) {
        headers['x-csrf-token'] = newCsrfToken;
        
        const retryRes = await fetch(url, {
          method,
          headers,
          body: data ? (isFormData ? (data as FormData) : JSON.stringify(data)) : undefined,
          credentials: "include",
        });
        
        await throwIfResNotOk(retryRes);
        return retryRes;
      }
    }
  }

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: (query) => {
        // Public queries should have shorter cache time so theme changes are visible
        if (query.queryKey[0] === "/api/public/stylist") {
          return 5 * 60 * 1000; // 5 minutes
        }
        return Infinity; // Keep infinite cache for authenticated queries
      },
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});