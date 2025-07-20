import React from 'react'
import { useAuthStore, useAuthSelectors } from '../../../lib/store'
import Link from 'next/link'
import { LogoFaviconUploader } from '../../../components/settings/logo-favicon-uploader'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { toast } from '../../../lib/toast'
import { handleApiError, handleAsyncOperation } from '../../../lib/error-handler-standard'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import { EmptyState } from '../../../components/ui/empty-state'
import { Button } from '../../../components/ui/button'
import { PlusIcon } from 'lucide-react'

export default function SettingsPageComponent() {
  const user = useAuthStore(state => state.user)
  const { isLoading: authLoading } = useAuthSelectors()

  if (authLoading) {
    return <div className="p-6">Loading settings...</div>
  }
  if (!user) {
    return null
  }

  // Fetch org logo_url and favicon_url (example: via supabase client)
  const [logoUrl, setLogoUrl] = React.useState<string | null>(null)
  const [faviconUrl, setFaviconUrl] = React.useState<string | null>(null)
  const [templates, setTemplates] = React.useState<any[]>([])
  const [defaultTemplateId, setDefaultTemplateId] = React.useState<string | null>(null)
  const [isLoadingTemplates, setIsLoadingTemplates] = React.useState(false)
  const [isSavingTemplate, setIsSavingTemplate] = React.useState(false)
  const supabase = createClientComponentClient()

  React.useEffect(() => {
    if (!user?.id) return
    fetch(`/api/organizations/${user.id}`)
      .then(res => res.json())
      .then(data => {
        setLogoUrl(data.logo_url || null)
        setFaviconUrl(data.favicon_url || null)
        const settings = data.settings || {}
        setDefaultTemplateId(settings.default_template_id || null)
      })
  }, [user?.id])

  React.useEffect(() => {
    if (!user?.id) return
    setIsLoadingTemplates(true)
    handleAsyncOperation(
      fetch('/api/templates').then(res => res.json()),
      'Loading templates',
      'SettingsPage'
    )
      .then(data => {
        setTemplates(data.templates || [])
      })
      .catch(err => {
        handleApiError(err, 'fetch templates', 'SettingsPage')
      })
      .finally(() => setIsLoadingTemplates(false))
  }, [user?.id])

  const handleSaveDefaultTemplate = async (templateId: string) => {
    if (!user?.id) return
    setIsSavingTemplate(true)
    try {
      await handleAsyncOperation(
        (async () => {
          const { data: org, error: fetchError } = await supabase
            .from('organizations')
            .select('settings')
            .eq('id', user.id)
            .single()
          if (fetchError) throw fetchError
          const currentSettings = org.settings || {}
          const newSettings = {
            ...currentSettings,
            default_template_id: templateId
          }
          const { error: updateError } = await supabase
            .from('organizations')
            .update({ settings: newSettings })
            .eq('id', user.id)
          if (updateError) throw updateError
          return templateId
        })(),
        'Saving default template',
        'SettingsPage'
      )
      setDefaultTemplateId(templateId)
    } catch (error) {
      handleApiError(error, 'save default template', 'SettingsPage')
    } finally {
      setIsSavingTemplate(false)
    }
  }

  return (
    <div className="w-full min-h-screen bg-default-background flex flex-col items-center py-12 px-4">
      <div className="w-full max-w-3xl flex flex-col gap-10">
        <div className="flex flex-col gap-2 mb-2">
          <span className="text-3xl font-bold text-default-font">Settings</span>
          <span className="text-base text-neutral-500">Configure branding, templates, domains, and more.</span>
        </div>
        {/* Organization Branding */}
        <div className="bg-white border border-neutral-200 rounded-2xl px-8 py-8 flex flex-col gap-4 shadow-sm">
          <span className="text-xl font-semibold text-default-font mb-2">Organization Branding</span>
          <LogoFaviconUploader
            orgId={user.id}
            logoUrl={logoUrl}
            faviconUrl={faviconUrl}
            onChange={(type, url) => {
              if (type === 'logo') setLogoUrl(url)
              else setFaviconUrl(url)
            }}
          />
        </div>
        {/* Default Template */}
        <div className="bg-white border border-neutral-200 rounded-2xl px-8 py-8 flex flex-col gap-4 shadow-sm">
          <span className="text-xl font-semibold text-default-font mb-2">Default Release Note Template</span>
          <span className="text-base text-neutral-500 mb-2">Choose a default template for new release notes. This can be overridden during creation.</span>
          {isLoadingTemplates ? (
            <div className="text-neutral-400">Loading templates...</div>
          ) : (
            <div className="space-y-4">
              {templates.length === 0 ? (
                <EmptyState
                  icon={<span className="text-4xl">📝</span>}
                  headline="No Templates Available"
                  subtext="Create a template to use as the default for new release notes."
                  action={
                    <Link href="/dashboard/templates">
                      <Button variant="secondary">
                        <PlusIcon className="w-4 h-4 mr-2" />
                        Create Template
                      </Button>
                    </Link>
                  }
                />
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {templates.map((template) => (
                      <div
                        key={template.id}
                        className={`p-4 border rounded-lg cursor-pointer flex flex-col gap-1 transition ${
                          defaultTemplateId === template.id
                            ? 'border-brand-600 bg-brand-50'
                            : 'border-neutral-200 bg-white hover:border-neutral-300'
                        }`}
                        onClick={() => handleSaveDefaultTemplate(template.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <span className="text-2xl">{template.icon || '📝'}</span>
                            <div>
                              <span className="font-medium text-default-font text-lg">{template.name}</span>
                              <span className="text-sm text-neutral-500">{template.description}</span>
                            </div>
                          </div>
                          {defaultTemplateId === template.id && (
                            <span className="text-xs bg-brand-100 text-brand-800 px-2 py-1 rounded-full font-semibold">Default</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between items-center pt-4 border-t border-neutral-200 mt-2">
                    <Link
                      href="/dashboard/templates"
                      className="text-sm text-brand-600 hover:text-brand-500 font-medium"
                    >
                      Manage all templates &rarr;
                    </Link>
                    {isSavingTemplate && (
                      <span className="text-sm text-brand-600 font-medium">Saving...</span>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
        {/* Domain Settings */}
        <div className="bg-white border border-neutral-200 rounded-2xl px-8 py-8 flex flex-col gap-4 shadow-sm">
          <span className="text-xl font-semibold text-default-font mb-2">Domain Settings</span>
          <DomainSettingsSection userId={user.id} />
        </div>
        {/* SSO Settings */}
        <div className="bg-white border border-neutral-200 rounded-2xl px-8 py-8 flex flex-col gap-4 shadow-sm">
          <span className="text-xl font-semibold text-default-font mb-2">SSO Settings</span>
          <SSOSettingsSection userId={user.id} />
        </div>
      </div>
    </div>
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
