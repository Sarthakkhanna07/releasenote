'use client'

import { useEffect } from 'react'

interface FaviconUpdaterProps {
  faviconUrl?: string | null
  organizationId: string
}

export function FaviconUpdater({ faviconUrl, organizationId }: FaviconUpdaterProps) {
  useEffect(() => {
    // Remove existing favicon links
    const existingLinks = document.querySelectorAll('link[rel*="icon"]')
    existingLinks.forEach(link => link.remove())

    // If no favicon URL, use default
    if (!faviconUrl) {
      const defaultFavicon = '/branding/favicon-placeholder.ico'
      const link = document.createElement('link')
      link.rel = 'icon'
      link.type = 'image/x-icon'
      link.href = defaultFavicon
      document.head.appendChild(link)
      return
    }

    // Create new favicon links with cache busting
    const faviconHash = faviconUrl.split('/').pop()?.split('?')[0] || 'default'
    const cacheBustedUrl = faviconUrl.includes('?') 
      ? `${faviconUrl}&v=${faviconHash}` 
      : `${faviconUrl}?v=${faviconHash}`

    // Add multiple favicon formats for better browser support
    const faviconLinks = [
      { rel: 'icon', type: 'image/x-icon', href: cacheBustedUrl },
      { rel: 'shortcut icon', type: 'image/x-icon', href: cacheBustedUrl },
      { rel: 'apple-touch-icon', href: cacheBustedUrl },
      { rel: 'icon', sizes: '16x16', type: 'image/x-icon', href: cacheBustedUrl },
      { rel: 'icon', sizes: '32x32', type: 'image/x-icon', href: cacheBustedUrl },
      { rel: 'icon', sizes: '48x48', type: 'image/x-icon', href: cacheBustedUrl },
      { rel: 'icon', sizes: '192x192', type: 'image/png', href: cacheBustedUrl },
      { rel: 'icon', sizes: '512x512', type: 'image/png', href: cacheBustedUrl },
    ]

    faviconLinks.forEach(({ rel, type, sizes, href }) => {
      const link = document.createElement('link')
      link.rel = rel
      if (type) link.type = type
      if (sizes) link.sizes = sizes
      link.href = href
      
      // Add error handling for favicon loading
      link.onerror = () => {
        console.warn(`[FaviconUpdater] Failed to load favicon: ${href}`)
        // Remove the failed link
        link.remove()
      }
      
      document.head.appendChild(link)
    })

    // Force favicon refresh by triggering a small change
    const favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement
    if (favicon) {
      favicon.href = favicon.href
    }

    console.log('[FaviconUpdater] Updated favicon to:', cacheBustedUrl)
  }, [faviconUrl, organizationId])

  return null // This component doesn't render anything
}
