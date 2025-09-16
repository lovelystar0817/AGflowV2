// Internal API client for server-side requests
export async function apiRequest(
  method: string,
  url: string,
  data?: unknown,
  headers?: Record<string, string>
): Promise<Response> {
  const baseUrl = process.env.NODE_ENV === 'development' 
    ? 'http://localhost:5000' 
    : 'https://auto-style.replit.app';
  
  const response = await fetch(`${baseUrl}${url}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    },
    body: data ? JSON.stringify(data) : undefined,
  });

  return response;
}