/**
 * Utility for handling base path configuration
 * This allows the app to work both with and without a base path
 */

/**
 * Get the configured base path from environment
 */
export function getBasePath(): string {
  return process.env.NEXT_PUBLIC_BASE_PATH || ''
}

/**
 * Prepend base path to a URL
 * @param path - The path to prepend base path to
 * @returns The full path with base path prepended
 */
export function withBasePath(path: string): string {
  const basePath = getBasePath()
  
  // If no base path, return the original path
  if (!basePath) return path
  
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  
  // Avoid double slashes
  return `${basePath}${normalizedPath}`
}

/**
 * Get the auth base path for NextAuth
 */
export function getAuthBasePath(): string | undefined {
  const basePath = getBasePath()
  return basePath ? `${basePath}/api/auth` : undefined
}

/**
 * Get the full URL for an asset in the public folder
 * @param assetPath - The path to the asset within the public folder
 * @returns The full URL including base path
 */
export function getPublicAssetUrl(assetPath: string): string {
  return withBasePath(assetPath)
}
