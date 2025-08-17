import React from 'react'
import { useAuthStore, useAuthSelectors } from '../../../lib/store'
import Link from 'next/link'
import { LogoFaviconUploader } from '../../../components/settings/logo-favicon-uploader'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { toast } from '../../../lib/toast'
import { handleApiError } from '../../../lib/error-handler-standard'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import { EmptyState } from '../../../components/ui/empty-state'
import { Button } from '../../../components/ui/button'
import { PlusIcon } from 'lucide-react'
import { Input } from '../../../components/ui/input'
import { Textarea } from '../../../components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '../../../components/ui/avatar'
import { generateOrganizationPublicUrl } from '../../../lib/utils/public-url'
import { usePerformanceMonitor } from '../../../lib/hooks/use-performance-monitor'
import { useOrganizationSettingsData } from '../../../lib/hooks/use-organization-settings-data'
import { useOrganizationSettings } from '../../../lib/store/use-organization-settings'

export default function SettingsPageComponent() {
  const user = useAuthStore(state => state.user)
  const { isLoading: authLoading } = useAuthSelectors()

  if (authLoading) {
    return <div className="p-6">Loading settings...</div>
  }
  if (!user) {
    return null
  }


  return (
    <div className="w-full min-h-screen bg-default-background">
      <div className="w-full h-full p-6">
        {/* Header Section */}
        <div className="flex flex-col gap-2 mb-8">
          <span className="text-3xl font-bold text-default-font">Settings</span>
          <span className="text-base text-neutral-800">Manage your account, organization, domain & SSO, and billing.</span>
        </div>

        {/* Main Content Area */}
        <Tabs defaultValue="account" className="w-full">
          <TabsList className="bg-neutral-100 p-1 rounded-lg text-neutral-700 mb-6">
            <TabsTrigger
              value="account"
              className="rounded-md bg-transparent text-neutral-700 hover:bg-neutral-200 data-[state=active]:!bg-neutral-900 data-[state=active]:!text-white"
            >
              Account
            </TabsTrigger>
            <TabsTrigger
              value="organization"
              className="rounded-md bg-transparent text-neutral-700 hover:bg-neutral-200 data-[state=active]:!bg-neutral-900 data-[state=active]:!text-white"
            >
              Organisation
            </TabsTrigger>
            <TabsTrigger
              value="domain-sso"
              className="rounded-md bg-transparent text-neutral-700 hover:bg-neutral-200 data-[state=active]:!bg-neutral-900 data-[state=active]:!text-white"
            >
              Domain & SSO
            </TabsTrigger>
            <TabsTrigger
              value="billing"
              className="rounded-md bg-transparent text-neutral-700 hover:bg-neutral-200 data-[state=active]:!bg-neutral-900 data-[state=active]:!text-white"
            >
              Billing
            </TabsTrigger>
          </TabsList>

          <div className="w-full">
            <TabsContent value="account" className="mt-0">
              <AccountSettingsTab />
            </TabsContent>

            <TabsContent value="organization" className="mt-0">
              <OrganizationSettingsTab />
            </TabsContent>

            <TabsContent value="domain-sso" className="mt-0">
              <DomainSSOSettingsTab />
            </TabsContent>

            <TabsContent value="billing" className="mt-0">
              <BillingTab />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  )
}

// --- Account Tab ---
function AccountSettingsTab() {
  const supabase = createClientComponentClient()
  const user = useAuthStore(state => state.user)
  const profile = useAuthStore(state => state.profile)
  const fetchProfile = useAuthStore(state => state.fetchProfile)
  const signOut = useAuthStore(state => state.signOut)

  const [firstName, setFirstName] = React.useState<string>(profile?.first_name || (user?.user_metadata as any)?.first_name || '')
  const [lastName, setLastName] = React.useState<string>(profile?.last_name || (user?.user_metadata as any)?.last_name || '')
  const email = user?.email || ''
  const [saving, setSaving] = React.useState(false)

  const initials = React.useMemo(() => {
    const a = firstName?.trim()?.[0] || ''
    const b = lastName?.trim()?.[0] || ''
    return (a + b || email?.[0] || '?').toUpperCase()
  }, [firstName, lastName, email])

  const handleSave = async () => {
    if (!user) return
    setSaving(true)
    try {
      const { error } = await supabase.auth.updateUser({ data: { first_name: firstName, last_name: lastName } })
      if (error) throw error
      await fetchProfile(user.id)
      toast.success('Account updated')
    } catch (err) {
      handleApiError(err, 'update account', 'AccountSettings')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="text-neutral-900 w-full">
      <CardHeader>
        <CardTitle>Account</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Form Fields */}
          <div className="lg:col-span-2 space-y-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-neutral-900">First Name</label>
                <Input 
                  value={firstName} 
                  onChange={(e) => setFirstName(e.target.value)} 
                  placeholder="Enter your first name"
                  className="w-full"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2 text-neutral-900">Last Name</label>
                <Input 
                  value={lastName} 
                  onChange={(e) => setLastName(e.target.value)} 
                  placeholder="Enter your last name"
                  className="w-full"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2 text-neutral-900">Email Address</label>
                <Input 
                  value={email} 
                  disabled 
                  readOnly 
                  className="w-full bg-neutral-50 text-neutral-600"
                />
                <div className="mt-1 text-xs text-neutral-500">Email cannot be changed</div>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-4">
              <Button 
                onClick={handleSave} 
                disabled={saving}
                className="px-6"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => signOut()}
                className="px-6 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 hover:border-red-300"
              >
                Logout
              </Button>
            </div>
          </div>

          {/* Right: Profile Image */}
          <div className="lg:col-span-1">
            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                <Avatar className="h-24 w-24 border-4 border-neutral-100 shadow-lg">
                  <AvatarImage src={(user as any)?.user_metadata?.avatar_url || ''} alt="Profile" />
                  <AvatarFallback className="text-2xl font-semibold bg-gradient-to-br from-blue-100 to-purple-100 text-neutral-700">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 border-2 border-white rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
              </div>
              
              <div className="text-center space-y-1">
                <div className="text-sm font-medium text-neutral-900">
                  {firstName && lastName ? `${firstName} ${lastName}` : 'Profile'}
                </div>
                <div className="text-xs text-neutral-500">Account Settings</div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// --- Organization Tab ---
function OrganizationSettingsTab() {
  const { markRenderStart } = usePerformanceMonitor('OrganizationSettingsTab')
  const user = useAuthStore(state => state.user)
  const organization = useAuthStore(state => state.organization)

  // Show loading if organization is not available yet
  if (!organization) {
    return (
      <Card className="text-neutral-900 w-full">
        <CardHeader>
          <CardTitle>Organisation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-neutral-600">Loading organization...</div>
          </div>
        </CardContent>
      </Card>
    )
  }
  
  // Use cached settings data
  const {
    data: settingsData,
    isLoading: loading,
    error: themesError,
    profile,
    assets,
    customCSS,
    themes,
    hasUnsavedChanges,
    updateBrandColor,
    updateCustomCSS,
    updateAssets,
    markSaved,
    markUnsaved,
    markActivity,
    forceRefresh
  } = useOrganizationSettingsData(organization?.id)
  
  const { fetchSettings, clearCache } = useOrganizationSettings()

  // Local state for form inputs (derived from cached data)
  const [slug, setSlug] = React.useState('')
  const [brandColor, setBrandColor] = React.useState('#7F56D9')
  const [customCss, setCustomCss] = React.useState('')
  const [useCustomCss, setUseCustomCss] = React.useState(false)
  const [logoUrl, setLogoUrl] = React.useState<string | null>(null)
  const [faviconUrl, setFaviconUrl] = React.useState<string | null>(null)
  const [saving, setSaving] = React.useState(false)
  const [refreshing, setRefreshing] = React.useState(false)
  const [selectedTheme, setSelectedTheme] = React.useState<any>(null)
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false)
  const dropdownRef = React.useRef<HTMLDivElement>(null)

  // Function to check if there are actual changes
  const hasActualChanges = React.useMemo(() => {
    if (!settingsData) return false
    
    const currentBrandColor = profile?.brand_color || '#7F56D9'
    const currentCustomCss = customCSS?.css || ''
    const currentUseCustomCss = customCSS?.enabled || false
    const currentLogoUrl = assets?.logo_url || null
    const currentFaviconUrl = assets?.favicon_url || null
    
    // Check if there are actual changes compared to database values
    const hasChanges = (
      brandColor !== currentBrandColor ||
      customCss !== currentCustomCss ||
      useCustomCss !== currentUseCustomCss ||
      logoUrl !== currentLogoUrl ||
      faviconUrl !== currentFaviconUrl
    )
    
    // Debug logging to help troubleshoot
    if (hasChanges) {
      console.log('Changes detected:', {
        brandColor: { current: currentBrandColor, new: brandColor, changed: brandColor !== currentBrandColor },
        customCss: { current: currentCustomCss, new: customCss, changed: customCss !== currentCustomCss },
        useCustomCss: { current: currentUseCustomCss, new: useCustomCss, changed: useCustomCss !== currentUseCustomCss },
        logoUrl: { current: currentLogoUrl, new: logoUrl, changed: logoUrl !== currentLogoUrl },
        faviconUrl: { current: currentFaviconUrl, new: faviconUrl, changed: faviconUrl !== currentFaviconUrl }
      })
    }
    
    return hasChanges
  }, [settingsData, profile, customCSS, assets, brandColor, customCss, useCustomCss, logoUrl, faviconUrl])

  // Simple cache clearing function
  const clearAllCaches = React.useCallback(async () => {
    if (!organization?.id) return
    
    try {
      // Clear organization settings cache
      clearCache(organization.id)
      
      // Clear browser cache for organization data
      const { deleteBrowserCache } = await import('../../../lib/browser-cache')
      await deleteBrowserCache(`auth:organization:${user?.id}`)
      
      // Server-side cache will be invalidated on next request
    } catch (error) {
      console.error('Failed to clear caches:', error)
    }
  }, [organization?.id, user?.id, clearCache])
  
  // Sync local state with cached data when it loads
  React.useEffect(() => {
    if (settingsData) {
      setSlug(profile?.slug || '')
      setBrandColor(profile?.brand_color || '#7F56D9')
      setLogoUrl(assets?.logo_url || null)
      setFaviconUrl(assets?.favicon_url || null)
      setCustomCss(customCSS?.css || '')
      setUseCustomCss(customCSS?.enabled || false)
      
      // Reset theme selection if no custom CSS is enabled or if CSS is empty
      if (!customCSS?.enabled || !customCSS?.css) {
        setSelectedTheme(null)
      }
    }
  }, [settingsData, profile, assets, customCSS])

  // Warn user about unsaved changes when leaving
  React.useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasActualChanges) {
        e.preventDefault()
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?'
        return e.returnValue
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasActualChanges])

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])
  const [activeSection, setActiveSection] = React.useState<'branding' | 'appearance'>('branding')
  const [previewLoading, setPreviewLoading] = React.useState(false)
  const [debouncedCustomCss, setDebouncedCustomCss] = React.useState(customCss)

  const publicOrgUrl = React.useMemo(() => {
    const slugVal = organization?.slug || ''
    const customDomainVal = (organization && (organization as any).custom_domain) as string | undefined
    return generateOrganizationPublicUrl(slugVal, customDomainVal)
  }, [organization?.slug])

  const iframeRef = React.useRef<HTMLIFrameElement | null>(null)
  const iframeSrc = React.useMemo(() => {
    const params = new URLSearchParams()
    params.set('preview_brand', brandColor || '#7F56D9')
    params.set('preview_css_enabled', useCustomCss ? '1' : '0')
    // For large CSS, we'll use postMessage instead of URL params
    const cssContent = debouncedCustomCss || ''
    const cssLength = cssContent.length

    // Only pass CSS via URL if it's small (under 1000 chars), otherwise use postMessage
    if (useCustomCss && cssLength > 0 && cssLength < 1000) {
      params.set('preview_css', encodeURIComponent(cssContent))
    } else if (useCustomCss && cssLength >= 1000) {
      params.set('preview_css_large', '1') // Signal that CSS will come via postMessage
    }

    // Add a timestamp to force iframe reload on changes
    params.set('_t', Date.now().toString())
    const base = `/notes/${organization?.slug || ''}`
    const qs = params.toString()

    return qs ? `${base}?${qs}` : base
  }, [organization?.slug, brandColor, useCustomCss, debouncedCustomCss])

  const handleIframeLoad = React.useCallback(() => {
    setPreviewLoading(false)

    // Send large CSS via postMessage after a short delay to ensure iframe is ready
    if (iframeRef.current && useCustomCss && debouncedCustomCss && debouncedCustomCss.length >= 1000) {
      setTimeout(() => {
        try {
          iframeRef.current?.contentWindow?.postMessage({
            type: 'PREVIEW_CSS_UPDATE',
            css: debouncedCustomCss,
            enabled: useCustomCss,
            brandColor: brandColor || '#7F56D9'
          }, '*')
        } catch (error) {
          console.error('Failed to send CSS via postMessage:', error)
        }
      }, 100) // 100ms delay
    }


  }, [brandColor, useCustomCss, customCss, debouncedCustomCss])

  // Debounce custom CSS changes for better performance
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedCustomCss(customCss)
    }, 300) // 300ms debounce
    return () => clearTimeout(timer)
  }, [customCss])

  // No need for this useEffect - change detection is handled by hasActualChanges

  // Set loading state when iframe src changes
  React.useEffect(() => {
    setPreviewLoading(true)
  }, [iframeSrc])

  // Removed deprecated ensureCssInjected effect; preview handled via iframe URL params

  // Remove the old useEffect - data loading is now handled by the custom hook

  const handleApplyTheme = (theme: any) => {
    if (!organization?.id) return
    const css = theme?.custom_css || ''
    setCustomCss(css)
    setUseCustomCss(true) // Automatically enable custom CSS when a theme is selected
    setSelectedTheme(theme) // Set the selected theme so the preview updates
    // Don't update cache here - let the change detection work properly
    // updateCustomCSS(css, true)
  }

  const handleSave = async () => {
    if (!organization?.id) return
    setSaving(true)
    try {
      // Execute all updates in parallel for better performance
      const [profileRes, cssRes, assetsRes] = await Promise.all([
        fetch('/api/organization/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ brand_color: brandColor, settings: {} })
        }),
        fetch(`/api/organizations/${organization.id}/custom-css`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ customCSS: customCss, enabled: useCustomCss })
        }),
        fetch(`/api/organizations/${organization.id}/meta`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            favicon_url: faviconUrl,
            logo_url: logoUrl,
            brand_color: brandColor 
          })
        })
      ])

      if (!profileRes.ok) {
        const e = await profileRes.json()
        throw new Error(e.error || 'Failed to update organization profile')
      }

      if (!cssRes.ok) {
        const e = await cssRes.json()
        throw new Error(e.error || 'Failed to update custom CSS')
      }

      if (!assetsRes.ok) {
        const e = await assetsRes.json()
        throw new Error(e.error || 'Failed to update assets')
      }

      // Update cache with saved values and mark as saved
      updateBrandColor(brandColor)
      updateCustomCSS(customCss, useCustomCss)
      updateAssets(logoUrl, faviconUrl)
      markSaved()
      
      // Reset local state to match saved values
      setBrandColor(brandColor)
      setCustomCss(customCss)
      setUseCustomCss(useCustomCss)
      setLogoUrl(logoUrl)
      setFaviconUrl(faviconUrl)
      
      toast.success('Organization settings saved')
    } catch (err) {
      handleApiError(err, 'save organization', 'OrganizationSettings')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="text-neutral-900 w-full">
      <CardHeader className="pb-4">
                 <div className="flex items-center justify-between">
           <div className="flex items-center gap-3">
             <CardTitle>Organisation</CardTitle>
           </div>
          <div className="flex items-center gap-3">
            <Button onClick={handleSave} disabled={saving || !hasActualChanges} size="sm" variant={hasActualChanges ? "default" : "outline"}>
              {saving ? 'Saving...' : hasActualChanges ? 'Save Changes' : 'No Changes'}
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              disabled={refreshing}
                             onClick={async () => {
                 setRefreshing(true)
                 try {
                   // Clear cache in background
                   clearAllCaches()
                   // Force refresh data
                   await forceRefresh()
                   // Reset unsaved changes after fresh data is loaded
                   markSaved()
                   
                   // Reset local state to match fresh data
                   if (settingsData) {
                     setSlug(profile?.slug || '')
                     setBrandColor(profile?.brand_color || '#7F56D9')
                     setLogoUrl(assets?.logo_url || null)
                     setFaviconUrl(assets?.favicon_url || null)
                     setCustomCss(customCSS?.css || '')
                     setUseCustomCss(customCSS?.enabled || false)
                     // Reset theme selection to match actual CSS state
                     setSelectedTheme(null)
                   }
                   
                   toast.success('Data refreshed')
                 } catch (error) {
                   toast.error('Failed to refresh data')
                   console.error('Refresh error:', error)
                 } finally {
                   setRefreshing(false)
                 }
               }}
              title="Refresh data from server"
            >
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href={publicOrgUrl} target="_blank" rel="noreferrer">
                Open Public Page
              </a>
            </Button>
          </div>
        </div>
        <div className="text-sm text-neutral-600 mt-2">
          Customize your organization's branding, themes, and public appearance
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <div className="space-y-6">
            {/* Loading skeleton */}
            <div className="border-b border-neutral-200">
              <nav className="flex space-x-8">
                <div className="py-2 px-1 border-b-2 border-neutral-900">
                  <div className="h-4 w-16 bg-neutral-200 rounded animate-pulse"></div>
                </div>
                <div className="py-2 px-1">
                  <div className="h-4 w-20 bg-neutral-200 rounded animate-pulse"></div>
                </div>
              </nav>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="h-4 w-32 bg-neutral-200 rounded animate-pulse"></div>
                  <div className="h-10 bg-neutral-200 rounded animate-pulse"></div>
                </div>
                <div className="space-y-2">
                  <div className="h-4 w-24 bg-neutral-200 rounded animate-pulse"></div>
                  <div className="h-10 bg-neutral-200 rounded animate-pulse"></div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="h-4 w-28 bg-neutral-200 rounded animate-pulse"></div>
                <div className="h-32 bg-neutral-200 rounded animate-pulse"></div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Horizontal Tabs */}
            <div className="border-b border-neutral-200">
              <nav className="flex space-x-8">
                <button
                  className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeSection === 'branding'
                      ? 'border-neutral-900 text-neutral-900'
                      : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
                  }`}
                  onClick={() => setActiveSection('branding')}
                >
                  Branding
                </button>
                <button
                  className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeSection === 'appearance'
                      ? 'border-neutral-900 text-neutral-900'
                      : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
                  }`}
                  onClick={() => setActiveSection('appearance')}
                >
                  Appearance
                </button>

              </nav>
            </div>

            {/* Tab Content */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {activeSection === 'branding' && (
                <>
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium mb-1 text-neutral-900">Public Portal URL (slug)</label>
                      <Input value={slug} onChange={(e) => setSlug(e.target.value)} disabled readOnly />
                      <div className="mt-2 text-xs text-neutral-600">Public URL: {publicOrgUrl || '—'}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-neutral-900">Brand color</label>
                      <div className="flex items-center gap-3">
                                                 <input type="color" value={brandColor} onChange={(e) => { setBrandColor(e.target.value) }} className="h-10 w-10 rounded border" />
                         <Input value={brandColor} onChange={(e) => { setBrandColor(e.target.value) }} />
                        <div
                          className="h-10 w-10 rounded border-2 border-gray-300"
                          style={{ backgroundColor: brandColor }}
                          title="Current brand color"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="text-sm font-medium text-neutral-900">Branding Assets</div>
                    {organization?.id && (
                      <LogoFaviconUploader
                        orgId={organization.id}
                        logoUrl={logoUrl || undefined}
                        faviconUrl={faviconUrl || undefined}
                      onChange={(type, url) => {
                        if (type === 'logo') {
                          setLogoUrl(url)
                          updateAssets(url, faviconUrl)
                        } else {
                          setFaviconUrl(url)
                          updateAssets(logoUrl, url)
                        }
                        }}
                      />
                    )}
                    <div className="text-xs text-neutral-600">Logo and favicon changes appear on the public page after saving.</div>
                  </div>
                </>
              )}

              {activeSection === 'appearance' && (
                <>
                  <div className="space-y-4">
                    <div className="text-sm font-medium text-neutral-900">Pre-built CSS Themes</div>
                    {loading && <span className="text-xs text-neutral-600">Loading…</span>}
                    {themesError && <span className="text-xs text-red-600">{themesError}</span>}
                    {(!themes || themes.length === 0) && !loading ? (
                      <div className="border rounded-lg p-8 bg-neutral-900 text-white">
                        <div className="text-center space-y-2">
                          <div className="text-2xl">🎨</div>
                          <div className="text-lg font-semibold">No themes available</div>
                          <div className="text-sm text-neutral-200">We will add public themes soon.</div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="relative" ref={dropdownRef}>
                          {/* Custom Dropdown Button */}
                          <button
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className="w-full px-4 py-3 border border-neutral-200 rounded-lg bg-white text-left hover:border-neutral-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 cursor-pointer"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                {selectedTheme ? (
                                  <>
                                    <div className="w-10 h-10 rounded-lg bg-white border border-neutral-200 overflow-hidden flex-shrink-0">
                                      {selectedTheme.preview_image_url ? (
                                        <img 
                                          src={selectedTheme.preview_image_url} 
                                          alt={selectedTheme.name} 
                                          className="w-full h-full object-cover"
                                        />
                                      ) : (
                                        <div className="w-full h-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                                          <span className="text-lg">🎨</span>
                                        </div>
                                      )}
                                    </div>
                                    <div className="text-left">
                                      <div className="text-sm font-medium text-neutral-900">{selectedTheme.name}</div>
                                      <div className="text-xs text-neutral-500">{selectedTheme.description}</div>
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-100 to-purple-100 border border-neutral-200 flex items-center justify-center flex-shrink-0">
                                      <span className="text-lg">🎨</span>
                                    </div>
                                    <div className="text-left">
                                      <div className="text-sm font-medium text-neutral-900">Select a theme</div>
                                      <div className="text-xs text-neutral-500">Choose from our pre-built themes</div>
                                    </div>
                                  </>
                                )}
                              </div>
                              <svg className={`w-4 h-4 text-neutral-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </div>
                          </button>
                          
                          {/* Custom Dropdown Menu */}
                          {isDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto" ref={dropdownRef}>
                              {themes.map((t: any) => (
                                <button
                                  key={t.id}
                                  onClick={() => {
                                    handleApplyTheme(t)
                                    setIsDropdownOpen(false)
                                  }}
                                  className="w-full p-4 hover:bg-neutral-50 transition-colors duration-150 border-b border-neutral-100 last:border-b-0 text-left"
                                >
                                  <div className="flex items-start gap-4">
                                    {/* Theme Image */}
                                    <div className="flex-shrink-0">
                                      {t.preview_image_url ? (
                                        <div className="w-16 h-16 rounded-lg bg-white border border-neutral-200 overflow-hidden">
                                          <img 
                                            src={t.preview_image_url} 
                                            alt={t.name} 
                                            className="w-full h-full object-cover"
                                          />
                                        </div>
                                      ) : (
                                        <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-neutral-100 to-neutral-200 border border-neutral-200 flex items-center justify-center">
                                          <span className="text-2xl">🎨</span>
                                        </div>
                                      )}
                                    </div>
                                    
                                    {/* Theme Info */}
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-1">
                                        <h4 className="text-sm font-semibold text-neutral-900 truncate">{t.name}</h4>
                                        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">Theme</span>
                                      </div>
                                      {t.description && (
                                        <p className="text-xs text-neutral-600 leading-relaxed line-clamp-2">
                                          {t.description}
                                        </p>
                                      )}
                                      <div className="mt-2 flex items-center gap-2">
                                        <span className="text-xs text-neutral-500">Click to apply</span>
                                        <div className="w-1 h-1 bg-neutral-300 rounded-full"></div>
                                        <span className="text-xs text-neutral-500">Live preview available</span>
                                      </div>
                                    </div>
                                    
                                    {/* Selection Indicator */}
                                    <div className="flex-shrink-0">
                                      <div className="w-6 h-6 rounded-full border-2 border-neutral-200 flex items-center justify-center">
                                        <div className={`w-3 h-3 rounded-full bg-blue-500 transition-opacity duration-200 ${selectedTheme?.id === t.id ? 'opacity-100' : 'opacity-0'}`}></div>
                                      </div>
                                    </div>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                          
                          {/* Clear Button */}
                          {selectedTheme && (
                            <div className="mt-3">
                              <button
                                onClick={() => {
                                  setSelectedTheme(null)
                                  setCustomCss('')
                                  setUseCustomCss(false)
                                  updateCustomCSS('', false)
                                }}
                                className="inline-flex items-center gap-2 px-3 py-2 text-xs text-neutral-600 hover:text-neutral-800 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                Clear theme selection
                              </button>
                            </div>
                          )}
                        </div>
                        
                        {/* Theme preview info */}
                        <div className="p-4 bg-gradient-to-r from-neutral-50 to-blue-50 rounded-lg border border-neutral-100">
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0">
                              {selectedTheme ? (
                                <div className="w-12 h-12 rounded-lg bg-white border border-neutral-200 overflow-hidden">
                                  {selectedTheme.preview_image_url ? (
                                    <img 
                                      src={selectedTheme.preview_image_url} 
                                      alt={selectedTheme.name} 
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                                      <span className="text-lg">🎨</span>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-100 to-purple-100 border border-neutral-200 flex items-center justify-center">
                                  <span className="text-lg">🎨</span>
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              {selectedTheme ? (
                                <>
                                  <div className="text-sm font-medium text-neutral-900 mb-1">Current Theme: {selectedTheme.name}</div>
                                  {selectedTheme.description && (
                                    <div className="text-xs text-neutral-600 leading-relaxed mb-2">
                                      {selectedTheme.description}
                                    </div>
                                  )}
                                  <div className="text-xs text-neutral-500">
                                    Theme CSS has been applied. You can now customize it further with custom CSS below.
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div className="text-sm font-medium text-neutral-900 mb-1">Theme Preview</div>
                                  <div className="text-xs text-neutral-600 leading-relaxed">
                                    Select a theme above to see its description and preview the styling. Each theme includes carefully crafted CSS for a professional look.
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-neutral-900">Custom CSS</div>
                        <div className="text-xs text-neutral-600">Overrides the selected theme. Use <code className="px-1 py-0.5 rounded bg-neutral-100 text-neutral-900">--brand-color</code> for brand-aware styling.</div>
                      </div>
                      <label className="flex items-center gap-2 text-sm">
                                                 <input
                           type="checkbox"
                           checked={useCustomCss}
                           onChange={(e) => {
                             setUseCustomCss(e.target.checked)
                           }}
                         />
                        Enable
                        <span className="text-xs text-gray-500">({useCustomCss ? 'ON' : 'OFF'})</span>
                      </label>
                    </div>
                    <Textarea
                      value={customCss}
                      onChange={(e) => { setCustomCss(e.target.value) }}
                      placeholder="/* Your custom CSS here - or select a theme above to get started! 
Example:
.custom-css-test {
  background: red !important;
  color: white !important;
} */"
                      className="min-h-[240px] font-mono text-sm"
                    />
                  </div>
                </>
              )}


            </div>

            {/* Right: Persistent Preview */}
            <div className="lg:col-span-1">
              <div className="sticky top-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-neutral-900">Live Preview</div>
                  {previewLoading && (
                    <div className="text-xs text-neutral-500 flex items-center gap-1">
                      <div className="w-3 h-3 border border-neutral-300 border-t-neutral-600 rounded-full animate-spin"></div>
                      Updating...
                    </div>
                  )}
                </div>
                <div className="rounded-lg border border-neutral-200 overflow-hidden relative">
                  {previewLoading && (
                    <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10">
                      <div className="text-sm text-neutral-600 flex items-center gap-2">
                        <div className="w-4 h-4 border border-neutral-300 border-t-neutral-600 rounded-full animate-spin"></div>
                        Loading preview...
                      </div>
                    </div>
                  )}
                  <iframe
                    key={iframeSrc}
                    ref={iframeRef}
                    onLoad={handleIframeLoad}
                    src={iframeSrc}
                    className="w-full h-[560px] bg-white"
                    title="Live Preview"
                  />
                </div>
                <div className="text-xs text-neutral-600">
                  Preview reflects current unsaved changes to Brand Color, Theme selection, and Custom CSS.
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// --- Domain & SSO Placeholder Tab ---
function DomainSSOSettingsTab() {
  return (
    <Card className="text-neutral-900 w-full">
      <CardHeader>
        <CardTitle>Domain & SSO</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-sm text-neutral-700">
          Custom Domains and SSO are available on our Enterprise plan. Contact us for a demo or to be notified upon release.
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-neutral-600">Public Portal URL</label>
            <Input 
              disabled 
              placeholder="https://yourorg.releasenote.ai" 
              className="bg-neutral-50 text-neutral-500 cursor-not-allowed"
            />
            <div className="mt-1 text-xs text-neutral-500">Currently using default domain</div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-neutral-600">Custom Domain</label>
            <Input 
              disabled 
              placeholder="releases.yourcompany.com" 
              className="bg-neutral-50 text-neutral-500 cursor-not-allowed"
            />
            <div className="mt-1 text-xs text-neutral-500">Enterprise feature</div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-neutral-600">SSO URL</label>
            <Input 
              disabled 
              placeholder="https://sso.provider.com/..." 
              className="bg-neutral-50 text-neutral-500 cursor-not-allowed"
            />
            <div className="mt-1 text-xs text-neutral-500">Enterprise feature</div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-neutral-600">SSO Code</label>
            <Input 
              disabled 
              placeholder="SSO Code" 
              className="bg-neutral-50 text-neutral-500 cursor-not-allowed"
            />
            <div className="mt-1 text-xs text-neutral-500">Enterprise feature</div>
          </div>
        </div>
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="text-sm text-blue-800">
              <div className="font-medium mb-1">Enterprise Features</div>
              <div className="text-blue-700">
                Custom domains and SSO integration are available on our Enterprise plan. These features help large organizations maintain brand consistency and security compliance.
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// --- Billing Placeholder Tab ---
function BillingTab() {
  return (
    <Card className="text-neutral-900 w-full">
      <CardHeader>
        <CardTitle>Billing</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-neutral-700">
          You are currently on our free Beta plan. We will notify all users well in advance before introducing paid plans.
        </div>
      </CardContent>
    </Card>
  )
}

// --- Domain Settings Section ---
function DomainSettingsSection({ userId }: { userId: string }) {
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [publicUrl, setPublicUrl] = React.useState('')
  const [customDomain, setCustomDomain] = React.useState('')
  const [saving, setSaving] = React.useState(false)
  React.useEffect(() => {
    setLoading(true)
    setError(null)
    fetch(`/api/domain-settings?userId=${userId}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) throw new Error(data.error)
        setPublicUrl(data.public_portal_url || '')
        setCustomDomain(data.custom_domain || '')
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [userId])

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/domain-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, custom_domain: customDomain })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update domain')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <span className="block text-base text-neutral-500 mb-2">Set up a custom domain for your public release notes portal. This helps your brand look professional and trustworthy.</span>
      {loading ? (
        <span className="text-neutral-500">Loading domain settings...</span>
      ) : error ? (
        <span className="text-red-500">{error}</span>
      ) : (
        <>
          <div>
            <label className="block text-sm font-semibold text-default-font">Public Portal URL</label>
            <input
              className="w-full mt-1 rounded border px-3 py-2 bg-gray-100 text-gray-700"
              value={publicUrl}
              disabled
              readOnly
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-default-font">Custom Domain</label>
            <input
              className="w-full mt-1 rounded border px-3 py-2 text-default-font"
              value={customDomain}
              onChange={e => setCustomDomain(e.target.value)}
              placeholder="yourcompany.com"
              disabled={saving}
            />
          </div>
          <button
            className="mt-2 px-4 py-2 rounded bg-brand-600 text-white font-semibold disabled:opacity-60"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Domain'}
          </button>
        </>
      )}
    </div>
  )
}

// --- SSO Settings Section ---
function SSOSettingsSection({ userId }: { userId: string }) {
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [url, setUrl] = React.useState('')
  const [code, setCode] = React.useState('')
  const [saving, setSaving] = React.useState(false)
  React.useEffect(() => {
    setLoading(true)
    setError(null)
    fetch(`/api/sso-settings?userId=${userId}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) throw new Error(data.error)
        setUrl(data.sso?.url || '')
        setCode(data.sso?.code || '')
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [userId])

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/sso-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, url, code })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update SSO settings')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <span className="block text-base text-neutral-500 mb-2">Configure Single Sign-On (SSO) for secure, seamless access to your release notes portal.</span>
      {loading ? (
        <span className="text-neutral-500">Loading SSO settings...</span>
      ) : error ? (
        <span className="text-red-500">{error}</span>
      ) : (
        <>
          <div>
            <label className="block text-sm font-semibold text-default-font">SSO URL</label>
            <input
              className="w-full mt-1 rounded border px-3 py-2 text-default-font"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://sso.provider.com/..."
              disabled={saving}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-default-font">SSO Code</label>
            <input
              className="w-full mt-1 rounded border px-3 py-2 text-default-font"
              value={code}
              onChange={e => setCode(e.target.value)}
              placeholder="SSO Code"
              disabled={saving}
            />
          </div>
          <button
            className="mt-2 px-4 py-2 rounded bg-brand-600 text-white font-semibold disabled:opacity-60"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save SSO Settings'}
          </button>
        </>
      )}
    </div>
  )
}
