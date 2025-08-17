'use client'

import { useEffect, useState } from 'react'

interface PreviewCssHandlerProps {
  initialCss?: string
  enabled: boolean
  expectsPostMessage: boolean
}

export function PreviewCssHandler({ initialCss = '', enabled, expectsPostMessage }: PreviewCssHandlerProps) {
  const [dynamicCss, setDynamicCss] = useState(initialCss)
  const [brandColor, setBrandColor] = useState<string>()

  useEffect(() => {
    if (!expectsPostMessage) return

    const handleMessage = (event: MessageEvent) => {
      // Accept messages from any origin for preview functionality
      if (event.data?.type === 'PREVIEW_CSS_UPDATE') {
        setDynamicCss(event.data.css || '')
        setBrandColor(event.data.brandColor)
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [expectsPostMessage])

  // Don't render anything if not enabled
  if (!enabled) return null

  const cssToApply = dynamicCss || initialCss

  return (
    <>
      {cssToApply && (
        <style suppressHydrationWarning>
          {`/* Dynamic Preview CSS */\n${cssToApply}`}
        </style>
      )}
      {brandColor && (
        <style suppressHydrationWarning>
          {`:root { --brand-color: ${brandColor}; --brand-color-hover: ${brandColor}dd; }`}
        </style>
      )}
    </>
  )
}