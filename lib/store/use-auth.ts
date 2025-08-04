'use client'

import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { User } from '@supabase/supabase-js'
import type { Organization, OrganizationMember } from '@/types/database'

interface UserProfile {
  id: string
  plan: 'free' | 'paid'
  first_name?: string
  last_name?: string
  avatar_url?: string
  created_at: string
  updated_at: string
}

interface AuthState {
  // User data
  user: User | null
  profile: UserProfile | null
  organization: Organization | null
  membership: OrganizationMember | null
  
  // UI state
  isLoading: boolean
  isInitialized: boolean
  error: string | null
  
  // Actions
  setUser: (user: User | null) => void
  setProfile: (profile: UserProfile | null) => void
  setOrganization: (organization: Organization | null, membership?: OrganizationMember | null) => void
  setLoading: (loading: boolean) => void
  setInitialized: (initialized: boolean) => void
  setError: (error: string | null) => void
  signOut: () => Promise<void>
  
  // Auth methods
  signInWithMagicLink: (email: string) => Promise<{ error: Error | null }>
  signUp: (email: string, userData?: { firstName?: string; lastName?: string }) => Promise<{ error: Error | null }>
  fetchProfile: (userId: string) => Promise<void>
  fetchOrganization: (userId: string) => Promise<void>
  
  // Utility methods
  clearError: () => void
  reset: () => void
  
  // Computed
  isAuthenticated: boolean
  userRole: string | null
  canManageOrganization: boolean
  canEditReleaseNotes: boolean
  canViewReleaseNotes: boolean
  organizationName: string | null
  userEmail: string | null
  userName: string | null
  plan: 'free' | 'paid' | null
}

const initialState = {
  user: null,
  profile: null,
  organization: null,
  membership: null,
  isLoading: true,
  isInitialized: false,
  error: null
}

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,
        
        // Actions
        setUser: (user) => 
          set({ user }, false, 'setUser'),
        
        setProfile: (profile) => 
          set({ profile }, false, 'setProfile'),
        
        setOrganization: (organization, membership = null) =>
          set({ organization, membership }, false, 'setOrganization'),
        
        setLoading: (loading) => 
          set({ isLoading: loading }, false, 'setLoading'),
        
        setInitialized: (initialized) => 
          set({ isInitialized: initialized }, false, 'setInitialized'),
        
        setError: (error) => 
          set({ error }, false, 'setError'),
        
        signOut: async () => {
          try {
            const supabase = createClientComponentClient()
            await supabase.auth.signOut()
            set({
              user: null,
              profile: null,
              organization: null,
              membership: null,
              isLoading: false,
              error: null
            }, false, 'signOut')
          } catch (error) {
            console.error('Error signing out:', error)
            set({ error: 'Failed to sign out' }, false, 'signOutError')
          }
        },
        
        // Auth methods
        signInWithMagicLink: async (email: string) => {
          try {
            set({ isLoading: true, error: null }, false, 'signInStart')
            const supabase = createClientComponentClient()
            
            const { error } = await supabase.auth.signInWithOtp({
              email,
              options: {
                emailRedirectTo: `${window.location.origin}/auth/callback`
              }
            })
            
            set({ isLoading: false }, false, 'signInComplete')
            return { error }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to send magic link'
            set({ isLoading: false, error: errorMessage }, false, 'signInError')
            return { error: error instanceof Error ? error : new Error(errorMessage) }
          }
        },
        
        signUp: async (email: string, userData?: { firstName?: string; lastName?: string }) => {
          try {
            set({ isLoading: true, error: null }, false, 'signUpStart')
            const supabase = createClientComponentClient()
            
            const { error } = await supabase.auth.signUp({
              email,
              password: Math.random().toString(36).slice(-8), // Temporary password
              options: {
                emailRedirectTo: `${window.location.origin}/auth/callback`,
                data: {
                  first_name: userData?.firstName,
                  last_name: userData?.lastName
                }
              }
            })
            
            set({ isLoading: false }, false, 'signUpComplete')
            return { error }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to sign up'
            set({ isLoading: false, error: errorMessage }, false, 'signUpError')
            return { error: error instanceof Error ? error : new Error(errorMessage) }
          }
        },
        
        fetchProfile: async (_userId: string) => {
          try {
            const supabase = createClientComponentClient()
            const { data: { user }, error } = await supabase.auth.getUser()
            
            if (error) {
              throw error
            }
            
            if (user) {
              // Create profile from user metadata
              const profile = {
                id: user.id,
                plan: 'free' as const,
                first_name: user.user_metadata?.first_name || '',
                last_name: user.user_metadata?.last_name || '',
                avatar_url: user.user_metadata?.avatar_url || '',
                created_at: user.created_at,
                updated_at: user.updated_at || user.created_at
              }
              
              set({ profile }, false, 'fetchProfile')
            }
          } catch (error) {
            console.error('Error fetching profile:', error)
            set({ profile: null }, false, 'fetchProfileError')
          }
        },
        
        fetchOrganization: async (userId: string) => {
          try {
            const supabase = createClientComponentClient()
            
            // Check cache first (browser-safe)
            const cacheKey = `auth:organization:${userId}`
            const cached = await import('@/lib/browser-cache').then(m => m.getBrowserCache(cacheKey))
            
            if (cached) {
              set({
                organization: cached.organization,
                membership: cached.membership
              }, false, 'fetchOrganizationFromCache')
              return
            }
            
            // First get the membership
            const { data: membershipData, error: membershipError } = await supabase
              .from('organization_members')
              .select(`
                *,
                organization:organizations(*)
              `)
              .eq('user_id', userId)
              .single()
            
            if (membershipError && membershipError.code !== 'PGRST116') {
              throw membershipError
            }
            
            if (membershipData) {
              // Cache the result for 5 minutes (browser-safe)
              await import('@/lib/browser-cache').then(m => m.setBrowserCache(cacheKey, {
                organization: membershipData.organization,
                membership: membershipData
              }, 300))
              
              set({
                organization: membershipData.organization,
                membership: membershipData
              }, false, 'fetchOrganization')
            }
          } catch (error) {
            console.error('Error fetching organization:', error)
            set({ organization: null, membership: null }, false, 'fetchOrganizationError')
          }
        },
        
        // Utility methods
        clearError: () => set({ error: null }, false, 'clearError'),
        
        reset: () => set(initialState, false, 'reset'),
        
        // Computed properties
        get isAuthenticated() {
          return !!get().user
        },
        
        get userRole() {
          return get().membership?.role || null
        },
        
        get canManageOrganization() {
          const role = get().membership?.role
          return role === 'owner' || role === 'admin'
        },
        
        get canEditReleaseNotes() {
          const role = get().membership?.role
          return role === 'owner' || role === 'admin' || role === 'editor'
        },
        
        get canViewReleaseNotes() {
          return !!get().membership
        },
        
        get organizationName() {
          return get().organization?.name || null
        },
        
        get userEmail() {
          return get().user?.email || null
        },
        
        get userName() {
          const user = get().user
          const profile = get().profile
          return profile?.first_name && profile?.last_name 
            ? `${profile.first_name} ${profile.last_name}`
            : user?.user_metadata?.name || user?.email || null
        },
        
        get plan() {
          return get().profile?.plan || null
        }
      }),
      {
        name: 'auth-store',
        // Only persist non-sensitive data
        partialize: (state) => ({
          user: state.user,
          profile: state.profile,
          organization: state.organization,
          membership: state.membership,
          isInitialized: state.isInitialized
        })
      }
    ),
    {
      name: 'auth-store'
    }
  )
)

// Selectors for easy access to computed values
export const useAuthSelectors = () => {
  const store = useAuthStore()
  
  return {
    isAuthenticated: !!store.user,
    userRole: store.membership?.role || null,
    canManageOrganization: ['owner', 'admin'].includes(store.membership?.role || ''),
    canEditReleaseNotes: ['owner', 'admin', 'editor'].includes(store.membership?.role || ''),
    canViewReleaseNotes: !!store.membership,
    organizationName: store.organization?.name || null,
    userEmail: store.user?.email || null,
    userName: store.userName,
    plan: store.profile?.plan || null,
    isLoading: store.isLoading,
    error: store.error
  }
}

// Hook for auth actions
export const useAuthActions = () => {
  const store = useAuthStore()
  
  return {
    signInWithMagicLink: store.signInWithMagicLink,
    signUp: store.signUp,
    signOut: store.signOut,
    fetchProfile: store.fetchProfile,
    fetchOrganization: store.fetchOrganization,
    clearError: store.clearError,
    reset: store.reset
  }
}