import { useEffect, useRef } from 'react'

interface PerformanceMetrics {
  loadTime: number
  renderTime: number
  componentName: string
}

export function usePerformanceMonitor(componentName: string) {
  const startTime = useRef<number>(Date.now())
  const renderStartTime = useRef<number>(Date.now())

  useEffect(() => {
    const loadTime = Date.now() - startTime.current
    const renderTime = Date.now() - renderStartTime.current

    const metrics: PerformanceMetrics = {
      loadTime,
      renderTime,
      componentName
    }

    // Log performance metrics in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Performance] ${componentName}:`, {
        loadTime: `${loadTime}ms`,
        renderTime: `${renderTime}ms`
      })
    }

    // Send to analytics in production (optional)
    if (process.env.NODE_ENV === 'production' && loadTime > 2000) {
      // Track slow loading components
      console.warn(`[Performance Warning] ${componentName} took ${loadTime}ms to load`)
    }
  }, [componentName])

  const markRenderStart = () => {
    renderStartTime.current = Date.now()
  }

  return { markRenderStart }
}