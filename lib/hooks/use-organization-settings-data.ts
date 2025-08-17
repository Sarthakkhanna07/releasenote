import { useEffect } from 'react'
import { useOrganizationSettings } from '../store/use-organization-settings'

export function useOrganizationSettingsData(orgId: string | undefined) {
  const {
    data,
    loading,
    error,
    fetchSettings,
    updateSettings,
    isStale,
    markActivity,
    markSaved,
    markUnsaved,
    hasUnsavedChanges
  } = useOrganizationSettings()

  const orgData = orgId ? data[orgId] : undefined
  const isLoading = orgId ? loading[orgId] || false : false
  const errorMessage = orgId ? error[orgId] : null
  const needsRefresh = orgId ? isStale(orgId) : false
  const hasUnsaved = orgId ? hasUnsavedChanges[orgId] || false : false

  // Only fetch on mount if no data exists - NO AUTO-REFRESH
  useEffect(() => {
    if (orgId && !orgData) {
      fetchSettings(orgId).catch(console.error)
    }
  }, [orgId, orgData, fetchSettings])

  // Provide convenient update functions that mark activity
  const updateBrandColor = (color: string) => {
    if (orgId && orgData) {
      updateSettings(orgId, {
        profile: { ...orgData.profile, brand_color: color }
      })
      markActivity(orgId)
    }
  }

  const updateCustomCSS = (css: string, enabled: boolean) => {
    if (orgId && orgData) {
      updateSettings(orgId, {
        customCSS: { css, enabled }
      })
      markActivity(orgId)
    }
  }

  const updateAssets = (logo_url: string | null, favicon_url: string | null) => {
    if (orgId && orgData) {
      updateSettings(orgId, {
        assets: { logo_url, favicon_url }
      })
      markActivity(orgId)
    }
  }

  const refetch = () => {
    if (orgId) {
      return fetchSettings(orgId, true)
    }
    return Promise.resolve()
  }

  return {
    // Data
    data: orgData,
    isLoading,
    error: errorMessage,
    needsRefresh,
    hasUnsavedChanges: hasUnsaved,
    
    // Convenience getters
    profile: orgData?.profile,
    assets: orgData?.assets,
    customCSS: orgData?.customCSS,
    themes: orgData?.themes || [],
    
    // Actions
    refetch,
    forceRefresh: () => orgId ? fetchSettings(orgId, true) : Promise.resolve(),
    updateBrandColor,
    updateCustomCSS,
    updateAssets,
    markSaved: () => orgId && markSaved(orgId),
    markUnsaved: () => orgId && markUnsaved(orgId),
    markActivity: () => orgId && markActivity(orgId),
    
    // Raw update function for complex updates
    updateSettings: (updates: any) => orgId && updateSettings(orgId, updates)
  }
}