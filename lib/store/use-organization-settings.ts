import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface OrganizationSettingsData {
  profile: {
    id: string
    name: string
    slug: string
    brand_color: string
    settings: any
  }
  assets: {
    logo_url: string | null
    favicon_url: string | null
  }
  customCSS: {
    css: string
    enabled: boolean
  }
  themes: any[]
  meta: {
    loadTime: number
    version: string
  }
}

interface OrganizationSettingsStore {
  // Data
  data: Record<string, OrganizationSettingsData>
  
  // Loading states
  loading: Record<string, boolean>
  error: Record<string, string | null>
  
  // Cache metadata
  lastFetch: Record<string, number>
  lastActivity: Record<string, number>
  hasUnsavedChanges: Record<string, boolean>
  
  // Actions
  fetchSettings: (orgId: string, force?: boolean) => Promise<void>
  updateSettings: (orgId: string, updates: Partial<OrganizationSettingsData>) => void
  clearCache: (orgId?: string) => void
  isStale: (orgId: string) => boolean
  markActivity: (orgId: string) => void
  markSaved: (orgId: string) => void
  markUnsaved: (orgId: string) => void
}

const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours - very long cache
// No stale time - data never auto-refreshes

export const useOrganizationSettings = create<OrganizationSettingsStore>()(
  persist(
    (set, get) => ({
      data: {},
      loading: {},
      error: {},
      lastFetch: {},
      lastActivity: {},
      hasUnsavedChanges: {},

      fetchSettings: async (orgId: string, force = false) => {
        const state = get()
        
        // Only fetch if forced OR no data exists - NO AUTO-REFRESH
        if (!force && state.data[orgId]) {
          console.log(`[Cache] Skipping fetch for ${orgId} - data exists and not forced`)
          return
        }

        // Set loading state
        set(state => ({
          loading: { ...state.loading, [orgId]: true },
          error: { ...state.error, [orgId]: null }
        }))

        try {
          const response = await fetch(`/api/organizations/${orgId}/settings-bundle`)
          
          if (!response.ok) {
            throw new Error(`Failed to load settings: ${response.status}`)
          }
          
          const { data } = await response.json()
          
          set(state => ({
            data: { ...state.data, [orgId]: data },
            lastFetch: { ...state.lastFetch, [orgId]: Date.now() },
            loading: { ...state.loading, [orgId]: false },
            error: { ...state.error, [orgId]: null }
          }))
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          
          set(state => ({
            loading: { ...state.loading, [orgId]: false },
            error: { ...state.error, [orgId]: errorMessage }
          }))
          
          throw error
        }
      },

      updateSettings: (orgId: string, updates: Partial<OrganizationSettingsData>) => {
        set(state => ({
          data: {
            ...state.data,
            [orgId]: { ...state.data[orgId], ...updates }
          },
          lastActivity: { ...state.lastActivity, [orgId]: Date.now() },
          hasUnsavedChanges: { ...state.hasUnsavedChanges, [orgId]: true }
        }))
      },

      clearCache: (orgId?: string) => {
        if (orgId) {
          set(state => {
            const newData = { ...state.data }
            const newLastFetch = { ...state.lastFetch }
            const newLoading = { ...state.loading }
            const newError = { ...state.error }
            
            delete newData[orgId]
            delete newLastFetch[orgId]
            delete newLoading[orgId]
            delete newError[orgId]
            
            return {
              data: newData,
              lastFetch: newLastFetch,
              loading: newLoading,
              error: newError
            }
          })
        } else {
          set({ data: {}, lastFetch: {}, loading: {}, error: {} })
        }
      },

      isStale: (orgId: string) => {
        // Data is NEVER considered stale - only refresh when explicitly requested
        return false
      },

      markActivity: (orgId: string) => {
        set(state => ({
          lastActivity: { ...state.lastActivity, [orgId]: Date.now() }
        }))
      },

      markSaved: (orgId: string) => {
        set(state => ({
          hasUnsavedChanges: { ...state.hasUnsavedChanges, [orgId]: false },
          lastActivity: { ...state.lastActivity, [orgId]: Date.now() }
        }))
      },

      markUnsaved: (orgId: string) => {
        set(state => ({
          hasUnsavedChanges: { ...state.hasUnsavedChanges, [orgId]: true },
          lastActivity: { ...state.lastActivity, [orgId]: Date.now() }
        }))
      }
    }),
    {
      name: 'organization-settings-cache',
      // Only persist data and metadata, not loading/error states
      partialize: (state) => ({
        data: state.data,
        lastFetch: state.lastFetch,
        lastActivity: state.lastActivity,
        hasUnsavedChanges: state.hasUnsavedChanges
      }),
      // Clear stale cache on hydration but preserve unsaved changes
      onRehydrateStorage: () => (state) => {
        if (state) {
          const now = Date.now()
          const freshData: Record<string, OrganizationSettingsData> = {}
          const freshLastFetch: Record<string, number> = {}
          const freshLastActivity: Record<string, number> = {}
          const freshUnsavedChanges: Record<string, boolean> = {}
          
          Object.entries(state.lastFetch).forEach(([orgId, timestamp]) => {
            const hasUnsaved = state.hasUnsavedChanges?.[orgId]
            
            // Keep data if it's fresh OR if user has unsaved changes
            if (now - timestamp < CACHE_DURATION || hasUnsaved) {
              freshData[orgId] = state.data[orgId]
              freshLastFetch[orgId] = timestamp
              freshLastActivity[orgId] = state.lastActivity?.[orgId] || timestamp
              freshUnsavedChanges[orgId] = hasUnsaved || false
            }
          })
          
          state.data = freshData
          state.lastFetch = freshLastFetch
          state.lastActivity = freshLastActivity
          state.hasUnsavedChanges = freshUnsavedChanges
        }
      }
    }
  )
)