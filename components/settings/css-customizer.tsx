'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  PaletteIcon, 
  CodeIcon, 
  EyeIcon, 
  SaveIcon, 
  RefreshCwIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  InfoIcon,
  HistoryIcon
} from 'lucide-react'

interface CSSCustomizerProps {
  organizationId: string
}

interface CSSData {
  customCSS: string
  themeVariables: string
  enabled: boolean
  brandColor: string
}

interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  sanitized?: boolean
}

export function CSSCustomizer({ organizationId }: CSSCustomizerProps) {
  const [cssData, setCSSData] = useState<CSSData>({
    customCSS: '',
    themeVariables: '',
    enabled: false,
    brandColor: '#7F56D9'
  })

  const [validation, setValidation] = useState<ValidationResult>({
    isValid: true,
    errors: [],
    warnings: []
  })

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [previewMode, setPreviewMode] = useState(false)
  const [error, setError] = useState('')

  // Load current CSS configuration
  useEffect(() => {
    loadCSSData()
  }, [organizationId])

  const loadCSSData = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch(`/api/organizations/${organizationId}/custom-css`)
      const data = await response.json()

      if (response.ok) {
        setCSSData(data)
      } else {
        setError(data.error || 'Failed to load CSS configuration')
      }
    } catch (error) {
      setError('Failed to load CSS configuration')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')

    try {
      const response = await fetch(`/api/organizations/${organizationId}/custom-css`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customCSS: cssData.customCSS,
          enabled: cssData.enabled
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setValidation({
          isValid: true,
          errors: [],
          warnings: data.validation?.warnings || [],
          sanitized: data.validation?.sanitized || false
        })
        
        // Update with sanitized CSS if it was modified
        if (data.customCSS !== cssData.customCSS) {
          setCSSData(prev => ({ ...prev, customCSS: data.customCSS }))
        }
      } else {
        setValidation({
          isValid: false,
          errors: data.validationErrors || [data.error],
          warnings: data.warnings || []
        })
      }
    } catch (error) {
      setError('Failed to save CSS configuration')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    setCSSData(prev => ({ ...prev, customCSS: '' }))
    setValidation({ isValid: true, errors: [], warnings: [] })
  }

  const insertTemplate = (template: string) => {
    const templates = {
      'basic-styling': `/* Basic styling template */
:root {
  --custom-border-radius: 8px;
  --custom-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  --custom-spacing: 1.5rem;
}

.release-note-card {
  border-radius: var(--custom-border-radius);
  box-shadow: var(--custom-shadow);
  padding: var(--custom-spacing);
}

.release-note-title {
  font-weight: 600;
  color: var(--brand-color);
}`,

      'dark-theme': `/* Dark theme template */
:root {
  --dark-bg: #1a202c;
  --dark-text: #f7fafc;
  --dark-border: #2d3748;
}

@media (prefers-color-scheme: dark) {
  .release-notes-container {
    background-color: var(--dark-bg);
    color: var(--dark-text);
  }
  
  .release-note-card {
    background-color: #2d3748;
    border: 1px solid var(--dark-border);
  }
}`,

      'typography': `/* Typography customization */
:root {
  --heading-font: 'Inter', system-ui, sans-serif;
  --body-font: 'Inter', system-ui, sans-serif;
}

.release-note-title {
  font-family: var(--heading-font);
  font-size: 1.5rem;
  line-height: 1.4;
  margin-bottom: 1rem;
}

.release-note-content {
  font-family: var(--body-font);
  font-size: 1rem;
  line-height: 1.6;
}`,

      'layout': `/* Layout and spacing */
.release-notes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.release-note-meta {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
  font-size: 0.875rem;
  color: #64748b;
}`
    }

    const templateCSS = templates[template as keyof typeof templates]
    if (templateCSS) {
      setCSSData(prev => ({
        ...prev,
        customCSS: prev.customCSS ? `${prev.customCSS}\n\n${templateCSS}` : templateCSS
      }))
    }
  }

  const previewCSS = () => {
    if (cssData.customCSS.trim()) {
      // Apply CSS to a preview iframe or modal
      setPreviewMode(true)
    }
  }

  useEffect(() => {
    const iframe = document.getElementById('css-preview-iframe') as HTMLIFrameElement;
    if (iframe) {
      const iframeDocument = iframe.contentDocument || iframe.contentWindow?.document;
      if (iframeDocument) {
        iframeDocument.body.innerHTML = `
          <style>${cssData.customCSS}</style>
          <div class="release-notes-container">
            <h1 class="text-2xl font-bold mb-4" style={{ color: 'var(--brand-color)' }}>
              Release Notes Preview
            </h1>
            <div class="release-note-card border rounded-lg p-4 mb-4">
              <h2 class="release-note-title text-lg font-semibold mb-2">
                Version 2.1.0 - New Features
              </h2>
              <div class="release-note-meta text-sm text-gray-600 mb-3">
                Published on March 15, 2024
              </div>
              <div class="release-note-content">
                <p class="mb-3">
                  This release includes several new features and improvements to enhance your experience.
                </p>
                <ul class="list-disc list-inside space-y-1">
                  <li>Enhanced user interface with better navigation</li>
                  <li>Improved performance and loading times</li>
                  <li>New customization options for themes</li>
                </ul>
              </div>
            </div>
          </div>
        `;
      }
    }
  }, [cssData.customCSS]);

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <XCircleIcon className="w-4 h-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PaletteIcon className="w-5 h-5" />
            Custom CSS & Theming
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="editor" className="space-y-4">
            <TabsList>
              <TabsTrigger value="editor">CSS Editor</TabsTrigger>
              <TabsTrigger value="variables">Theme Variables</TabsTrigger>
              <TabsTrigger value="templates">Templates</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>

            <TabsContent value="editor" className="space-y-4">
              {/* Enable/Disable Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Enable Custom CSS</h3>
                  <p className="text-sm text-gray-600">
                    Apply custom styling to your public release notes
                  </p>
                </div>
                <Switch
                  checked={cssData.enabled}
                  onCheckedChange={(enabled) => setCSSData(prev => ({ ...prev, enabled }))}
                />
              </div>

              {/* CSS Editor */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-medium">Custom CSS</label>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={previewCSS}>
                      <EyeIcon className="w-4 h-4 mr-1" />
                      Preview
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleReset}>
                      <RefreshCwIcon className="w-4 h-4 mr-1" />
                      Reset
                    </Button>
                  </div>
                </div>

                <Textarea
                  value={cssData.customCSS}
                  onChange={(e) => setCSSData(prev => ({ ...prev, customCSS: e.target.value }))}
                  placeholder="/* Enter your custom CSS here */
:root {
  --custom-border-radius: 8px;
  --custom-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.release-note-card {
  border-radius: var(--custom-border-radius);
  box-shadow: var(--custom-shadow);
}"
                  className="font-mono text-sm min-h-[300px]"
                  disabled={!cssData.enabled}
                />

                {/* Validation Status */}
                {validation.errors.length > 0 && (
                  <Alert variant="destructive">
                    <XCircleIcon className="w-4 h-4" />
                    <AlertDescription>
                      <strong>Validation Errors:</strong>
                      <ul className="mt-2 list-disc list-inside">
                        {validation.errors.map((error, index) => (
                          <li key={index} className="text-sm">{error}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                {validation.warnings.length > 0 && (
                  <Alert>
                    <AlertTriangleIcon className="w-4 h-4" />
                    <AlertDescription>
                      <strong>Warnings:</strong>
                      <ul className="mt-2 list-disc list-inside">
                        {validation.warnings.map((warning, index) => (
                          <li key={index} className="text-sm">{warning}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                {validation.sanitized && (
                  <Alert>
                    <InfoIcon className="w-4 h-4" />
                    <AlertDescription>
                      Your CSS has been automatically sanitized for security. Some potentially unsafe content was removed.
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Save Button */}
              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={saving || loading}>
                  <SaveIcon className="w-4 h-4 mr-2" />
                  {saving ? 'Saving...' : 'Save CSS' : 'Save CSS'}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="variables" className="space-y-4">
              <Alert>
                <InfoIcon className="w-4 h-4" />
                <AlertDescription>
                  <strong>Available CSS Variables:</strong>
                  <br />
                  Use these predefined variables in your custom CSS for consistent theming.
                </AlertDescription>
              </Alert>

              <div className="bg-gray-50 p-4 rounded-lg">
                <pre className="text-sm">
{cssData.themeVariables || `/* Available CSS Variables */
:root {
  --brand-color: ${cssData.brandColor};
  --brand-color-hover: ${cssData.brandColor}dd;
  --font-family: Inter, system-ui, sans-serif;
  --border-radius: 8px;
  --spacing: 1rem;
  --text-color: #374151;
  --background-color: #ffffff;
  --shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}`}
                </pre>
              </div>

              <Alert>
                <CheckCircleIcon className="w-4 h-4" />
                <AlertDescription>
                  These variables are automatically generated based on your organization's brand settings and can be used in your custom CSS.
                </AlertDescription>
              </Alert>
            </TabsContent>

            <TabsContent value="templates" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => insertTemplate('basic-styling')}>
                  <CardContent className="p-4">
                    <h3 className="font-medium mb-2">Basic Styling</h3>
                    <p className="text-sm text-gray-600">Border radius, shadows, and spacing customization</p>
                  </CardContent>
                </Card>

                <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => insertTemplate('dark-theme')}>
                  <CardContent className="p-4">
                    <h3 className="font-medium mb-2">Dark Theme</h3>
                    <p className="text-sm text-gray-600">Dark mode styles with appropriate colors</p>
                  </CardContent>
                </Card>

                <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => insertTemplate('typography')}>
                  <CardContent className="p-4">
                    <h3 className="font-medium mb-2">Typography</h3>
                    <p className="text-sm text-gray-600">Custom fonts, sizes, and text styling</p>
                  </CardContent>
                </Card>

                <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => insertTemplate('layout')}>
                  <CardContent className="p-4">
                    <h3 className="font-medium mb-2">Layout & Grid</h3>
                    <p className="text-sm text-gray-600">Layout customization and spacing</p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="preview" className="space-y-4">
              <Alert>
                <EyeIcon className="w-4 h-4" />
                <AlertDescription>
                  <strong>CSS Preview:</strong>
                  <br />
                  View how your custom CSS will appear on your public release notes pages.
                </AlertDescription>
              </Alert>

              <iframe
                id="css-preview-iframe"
                style={{ width: '100%', height: '500px', border: '1px solid #ccc' }}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
