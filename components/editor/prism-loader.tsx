'use client'

import { useEffect } from 'react'

export function PrismLoader() {
  useEffect(() => {
    // Dynamically import Prism.js and load necessary components
    const loadPrism = async () => {
      if (typeof window !== 'undefined' && !window.Prism) {
        try {
          // Import core Prism
          const Prism = await import('prismjs')
          
          // Import languages
          await import('prismjs/components/prism-javascript')
          await import('prismjs/components/prism-typescript')
          await import('prismjs/components/prism-python')
          await import('prismjs/components/prism-java')
          await import('prismjs/components/prism-sql')
          await import('prismjs/components/prism-bash')
          await import('prismjs/components/prism-json')
          await import('prismjs/components/prism-yaml')
          await import('prismjs/components/prism-xml-doc')
          await import('prismjs/components/prism-css')
          await import('prismjs/components/prism-markup')
          await import('prismjs/components/prism-markdown')
          await import('prismjs/components/prism-php')
          await import('prismjs/components/prism-ruby')
          await import('prismjs/components/prism-go')
          await import('prismjs/components/prism-rust')
          await import('prismjs/components/prism-swift')
          await import('prismjs/components/prism-kotlin')
          await import('prismjs/components/prism-dart')
          await import('prismjs/components/prism-c')
          await import('prismjs/components/prism-cpp')
          await import('prismjs/components/prism-csharp')

          // Make Prism available globally
          window.Prism = Prism.default
          
          // Configure Prism
          window.Prism.manual = true
          
          console.log('Prism.js loaded successfully')
        } catch (error) {
          console.error('Failed to load Prism.js:', error)
        }
      }
    }

    loadPrism()
  }, [])

  return null
}

// Extend window type for Prism
declare global {
  interface Window {
    Prism?: {
      highlightElement: (element: HTMLElement) => void
      highlightAll: () => void
      manual?: boolean
    }
  }
}