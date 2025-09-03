/**
 * Utility functions for API path construction with base path support
 */

/**
 * Constructs API URLs with proper base path support for reverse proxy deployments
 * @param path - The API path (e.g., '/api/docker/containers')
 * @returns The complete API URL with base path if configured
 */
export function getApiUrl(path: string): string {
  // Get the base path from Next.js public env var
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
  
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  
  // Combine base path with API path
  return `${basePath}${normalizedPath}`;
}

/**
 * Performs a fetch request with proper base path handling
 * @param path - The API path (e.g., '/api/docker/containers')
 * @param options - Fetch options
 * @returns Promise<Response>
 */
export function apiFetch(path: string, options?: RequestInit): Promise<Response> {
  return fetch(getApiUrl(path), options);
}

/**
 * Helper for common GET requests
 * @param path - The API path
 * @param options - Additional fetch options
 * @returns Promise<Response>
 */
export function apiGet(path: string, options?: RequestInit): Promise<Response> {
  return apiFetch(path, {
    method: 'GET',
    ...options,
  });
}

/**
 * Helper for common POST requests
 * @param path - The API path
 * @param data - Data to send in the request body
 * @param options - Additional fetch options
 * @returns Promise<Response>
 */
export function apiPost(path: string, data?: any, options?: RequestInit): Promise<Response> {
  return apiFetch(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    body: data ? JSON.stringify(data) : undefined,
    ...options,
  });
}