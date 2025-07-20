import { useState, useRef } from 'react'
import { Button } from '../ui/button'
import { toast } from '../../lib/toast'
import { handleApiError, handleAsyncOperation } from '../../lib/error-handler-standard'

interface LogoFaviconUploaderProps {
  orgId: string
  logoUrl?: string | null
  faviconUrl?: string | null
  onChange?: (type: 'logo' | 'favicon', url: string) => void
}

export function LogoFaviconUploader({ orgId, logoUrl, faviconUrl, onChange }: LogoFaviconUploaderProps) {
  const [uploading, setUploading] = useState<'logo' | 'favicon' | null>(null)
  const logoInput = useRef<HTMLInputElement>(null)
  const faviconInput = useRef<HTMLInputElement>(null)

  const handleUpload = async (type: 'logo' | 'favicon') => {
    const input = type === 'logo' ? logoInput.current : faviconInput.current
    if (!input?.files?.[0]) return
    const file = input.files[0]
    if (file.size > 1024 * 1024) {
      toast.error('File too large (max 1MB)')
      return
    }
    setUploading(type)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', type)
    try {
      const res = await fetch(`/api/organizations/${orgId}/upload-logo`, {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')
      toast.success(`${type === 'logo' ? 'Logo' : 'Favicon'} uploaded!`)
      onChange?.(type, data.url)
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setUploading(null)
      if (input) input.value = ''
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <label className="block font-semibold text-default-font mb-1">Organization Logo</label>
        <span className="block text-sm text-neutral-500 mb-2">Your logo appears on your public release notes and emails. PNG, JPG, or SVG. Max 1MB.</span>
        {logoUrl && <img src={logoUrl} alt="Logo" className="h-16 mb-2 rounded bg-white shadow" />}
        <input type="file" accept="image/png,image/jpeg,image/svg+xml" ref={logoInput} className="mb-2" />
        <Button disabled={uploading === 'logo'} onClick={() => handleUpload('logo')}>
          {uploading === 'logo' ? 'Uploading...' : 'Upload Logo'}
        </Button>
      </div>
      <div>
        <label className="block font-semibold text-default-font mb-1">Favicon</label>
        <span className="block text-sm text-neutral-500 mb-2">A small icon for browser tabs and bookmarks. PNG, ICO, or SVG. Max 1MB.</span>
        {faviconUrl && <img src={faviconUrl} alt="Favicon" className="h-8 mb-2 rounded bg-white shadow" />}
        <input type="file" accept="image/png,image/x-icon,image/svg+xml" ref={faviconInput} className="mb-2" />
        <Button disabled={uploading === 'favicon'} onClick={() => handleUpload('favicon')}>
          {uploading === 'favicon' ? 'Uploading...' : 'Upload Favicon'}
        </Button>
      </div>
      <div className="text-xs text-neutral-400 mt-2">Branding helps your release notes feel professional and on-brand for your users.</div>
    </div>
  )
}
