'use client'

import { useEffect, useState } from 'react'
import { EnhancedReleaseNotesList } from './enhanced-release-notes-list'
import { PreviewCssHandler } from './preview-css-handler'

interface PreviewModeWrapperProps {
  organization: any
  releaseNotes: any[]
  orgSlug: string
  previewCss: string
  previewCssEnabled: boolean
  previewCssLarge: boolean
}

export function PreviewModeWrapper({
  organization,
  releaseNotes,
  orgSlug,
  previewCss,
  previewCssEnabled,
  previewCssLarge
}: PreviewModeWrapperProps) {
  const [isClient, setIsClient] = useState(false)

  // Ensure this only renders on client-side
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Show loading state during hydration
  if (!isClient) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-8 h-8 border border-neutral-300 border-t-neutral-600 rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-neutral-600">Loading preview...</div>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Preview CSS styles - client-side only */}
      {previewCss && !previewCssLarge && (
        <style suppressHydrationWarning>
          {`/* Custom CSS Preview */\n${previewCss}`}
        </style>
      )}

      {/* Handle large CSS via postMessage */}
      <PreviewCssHandler
        initialCss={previewCssLarge ? '' : previewCss}
        enabled={previewCssEnabled}
        expectsPostMessage={previewCssLarge}
      />

      {/* Render the main component client-side */}
      <EnhancedReleaseNotesList
        organization={organization}
        releaseNotes={releaseNotes}
        orgSlug={orgSlug}
      />
    </>
  )
}