/**
 * Utility functions for generating public URLs for release notes
 */

export interface PublicUrlConfig {
  orgSlug: string
  releaseSlug: string
  customDomain?: string
}

/**
 * Generate the public URL for a release note
 */
export function generatePublicUrl(config: PublicUrlConfig): string {
  const { orgSlug, releaseSlug, customDomain } = config
  
  if (customDomain) {
    return `https://${customDomain}/${releaseSlug}`
  }
  
  // Default to the /notes/[org]/[slug] pattern
  return `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/notes/${orgSlug}/${releaseSlug}`
}

/**
 * Generate the public URL for an organization's release notes list
 */
export function generateOrganizationPublicUrl(orgSlug: string, customDomain?: string): string {
  if (customDomain) {
    return `https://${customDomain}`
  }
  
  return `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/notes/${orgSlug}`
}

/**
 * Extract organization slug and release slug from a public URL
 */
export function parsePublicUrl(url: string): { orgSlug?: string; releaseSlug?: string } | null {
  try {
    const urlObj = new URL(url)
    const pathParts = urlObj.pathname.split('/').filter(Boolean)
    
    if (pathParts[0] === 'notes' && pathParts.length >= 2) {
      return {
        orgSlug: pathParts[1],
        releaseSlug: pathParts[2]
      }
    }
    
    return null
  } catch {
    return null
  }
}

/**
 * Check if a URL is a public release notes URL
 */
export function isPublicReleaseNotesUrl(url: string): boolean {
  return parsePublicUrl(url) !== null
} 