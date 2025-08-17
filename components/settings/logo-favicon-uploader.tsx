import { useState, useRef } from 'react'
import { Button } from '../ui/button'
import { toast } from '../../lib/toast'
import { Upload, Image, Globe } from 'lucide-react'

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

  const validateFile = (file: File, type: 'logo' | 'favicon'): string | null => {
    // Check file size (5MB limit)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return 'File too large (max 5MB)'
    }

    // Check file type
    const validTypes = type === 'logo'
      ? ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml']
      : ['image/png', 'image/x-icon', 'image/vnd.microsoft.icon', 'image/svg+xml']

    if (!validTypes.includes(file.type)) {
      const typeText = type === 'logo' ? 'PNG, JPG, or SVG' : 'PNG, ICO, or SVG'
      return `Invalid file type. Please use ${typeText} files only.`
    }

    return null
  }

  const handleFileChange = async (type: 'logo' | 'favicon', event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file
    const validationError = validateFile(file, type)
    if (validationError) {
      toast.error(validationError)
      // Clear the input
      if (event.target) event.target.value = ''
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

      // Handle different response types more safely
      let data
      let responseText = ''

      try {
        // First try to get the response as text
        responseText = await res.text()

        // Then try to parse it as JSON
        if (responseText) {
          data = JSON.parse(responseText)
        } else {
          throw new Error('Empty response from server')
        }
      } catch (parseError) {
        // If JSON parsing fails, treat the text as an error message
        console.error('Failed to parse response as JSON:', parseError)
        throw new Error(`Server response error (${res.status}): ${responseText || 'Unknown error'}`)
      }

      if (!res.ok) {
        const errorMsg = data?.error || data?.message || `Upload failed with status ${res.status}`
        throw new Error(errorMsg)
      }

      // Validate response data
      if (!data || !data.url) {
        throw new Error('Upload succeeded but no URL returned from server')
      }

      toast.success(`${type === 'logo' ? 'Logo' : 'Favicon'} uploaded successfully!`)
      onChange?.(type, data.url)

    } catch (e: any) {
      console.error(`${type} upload error:`, e)

      // Provide more specific error messages
      let errorMessage = 'Upload failed'

      if (e.name === 'TypeError' && e.message.includes('Failed to fetch')) {
        errorMessage = 'Network error - please check your connection and try again'
      } else if (e.message.includes('413') || e.message.includes('too large')) {
        errorMessage = 'File too large - please use a smaller file (max 5MB)'
      } else if (e.message.includes('415') || e.message.includes('Unsupported')) {
        errorMessage = 'Unsupported file type - please use PNG, JPG, or SVG files'
      } else if (e.message.includes('400')) {
        errorMessage = 'Invalid file or request - please try again'
      } else if (e.message.includes('500')) {
        errorMessage = 'Server error - please try again later'
      } else if (e.message && e.message.length > 0) {
        errorMessage = e.message
      }

      toast.error(errorMessage)
    } finally {
      setUploading(null)
      // Clear the input to allow re-uploading the same file
      if (event.target) event.target.value = ''
    }
  }

  return (
    <div className="space-y-6">
      {/* Logo Upload */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Image className="h-4 w-4 text-neutral-600" />
          <h3 className="text-base font-medium text-neutral-900">Organization Logo</h3>
        </div>
        <p className="text-sm text-neutral-600">
          Your logo appears on your public release notes and emails. PNG, JPG, or SVG. Max 5MB.
        </p>

        {logoUrl && (
          <div className="flex items-center gap-3 p-3 bg-neutral-50 rounded-lg border">
            <img src={logoUrl} alt="Current Logo" className="h-12 w-12 rounded bg-white shadow-sm object-contain" />
            <div className="text-sm text-neutral-600">Current logo</div>
          </div>
        )}

        <div className="relative">
          <input
            type="file"
            accept="image/png,image/jpeg,image/svg+xml"
            ref={logoInput}
            onChange={(e) => handleFileChange('logo', e)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={uploading === 'logo'}
          />
          <Button
            variant="outline"
            disabled={uploading === 'logo'}
            className="w-full flex items-center gap-2"
          >
            {uploading === 'logo' ? (
              <>
                <div className="w-4 h-4 border border-neutral-300 border-t-neutral-600 rounded-full animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Choose Logo File
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Favicon Upload */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-neutral-600" />
          <h3 className="text-base font-medium text-neutral-900">Favicon</h3>
        </div>
        <p className="text-sm text-neutral-600">
          A small icon for browser tabs and bookmarks. PNG, ICO, or SVG. Max 5MB.
        </p>

        {faviconUrl && (
          <div className="flex items-center gap-3 p-3 bg-neutral-50 rounded-lg border">
            <img src={faviconUrl} alt="Current Favicon" className="h-8 w-8 rounded bg-white shadow-sm object-contain" />
            <div className="text-sm text-neutral-600">Current favicon</div>
          </div>
        )}

        <div className="relative">
          <input
            type="file"
            accept="image/png,image/x-icon,image/svg+xml"
            ref={faviconInput}
            onChange={(e) => handleFileChange('favicon', e)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={uploading === 'favicon'}
          />
          <Button
            variant="outline"
            disabled={uploading === 'favicon'}
            className="w-full flex items-center gap-2"
          >
            {uploading === 'favicon' ? (
              <>
                <div className="w-4 h-4 border border-neutral-300 border-t-neutral-600 rounded-full animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Choose Favicon File
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="text-xs text-neutral-500 bg-blue-50 p-3 rounded-lg">
        💡 Branding helps your release notes feel professional and on-brand for your users. Changes appear on the public page after saving.
      </div>
    </div>
  )
}
