"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/subframe-ui/ui/components/Badge"
import { Button } from "@/components/subframe-ui/ui/components/Button"
import { TextField } from "@/components/subframe-ui/ui/components/TextField"
import { FeatherSearch, FeatherZap, FeatherLoader, FeatherCheck, FeatherSettings } from "@subframe/core"

interface AITemplate {
    id: string
    name: string
    description: string
    category: string
    icon: string
    tone: string
    target_audience: string
    uses_org_ai_context: boolean
    system_prompt: string
    user_prompt_template: string
    example_output: string
}

interface TemplateSelectorProps {
    data: any
    onUpdate: (data: any) => void
}

export default function TemplateSelector({ data, onUpdate }: TemplateSelectorProps) {
    const [templates, setTemplates] = useState<AITemplate[]>([])
    const [filteredTemplates, setFilteredTemplates] = useState<AITemplate[]>([])
    const [searchQuery, setSearchQuery] = useState("")
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [selectedTemplate, setSelectedTemplate] = useState<AITemplate | string | null>(data.template)

    useEffect(() => {
        fetchTemplates()
    }, [])

    useEffect(() => {
        if (searchQuery.trim() === "") {
            setFilteredTemplates(templates)
        } else {
            const filtered = templates.filter(template =>
                template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                template.category.toLowerCase().includes(searchQuery.toLowerCase())
            )
            setFilteredTemplates(filtered)
        }
    }, [searchQuery, templates])

    const fetchTemplates = async () => {
        try {
            setLoading(true)
            
            // Use existing templates API
            const response = await fetch('/api/templates')
            
            if (!response.ok) {
                throw new Error('Failed to fetch templates')
            }
            
            const responseData = await response.json()
            const templateData = responseData.templates || []
            
            // Ensure templateData is an array
            if (!Array.isArray(templateData)) {
                console.warn('Templates API returned non-array data:', templateData)
                setTemplates([])
                setFilteredTemplates([])
                setError('Invalid templates data format')
                return
            }
            
            setTemplates(templateData)
            setFilteredTemplates(templateData)
            console.log(`✅ Loaded ${templateData.length} templates`)
        } catch (err) {
            console.error('Template fetch error:', err)
            setError(err instanceof Error ? err.message : 'Failed to load templates')
            
            // Show helpful error message
            if (err instanceof Error && err.message.includes('404')) {
                setError('No templates found. You can create templates in the Templates section.')
            }
        } finally {
            setLoading(false)
        }
    }

    const handleTemplateSelect = (template: AITemplate | string) => {
        setSelectedTemplate(template)
        onUpdate({ template })
    }

    const getCategoryColor = (category: string) => {
        const colors = {
            technical: 'bg-blue-100 text-blue-800',
            marketing: 'bg-purple-100 text-purple-800',
            modern: 'bg-green-100 text-green-800',
            traditional: 'bg-amber-100 text-amber-800',
            minimal: 'bg-gray-100 text-gray-800',
            changelog: 'bg-indigo-100 text-indigo-800'
        }
        return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-800'
    }

    const getAudienceColor = (audience: string) => {
        const colors = {
            developers: 'bg-blue-50 text-blue-700',
            users: 'bg-green-50 text-green-700',
            business: 'bg-purple-50 text-purple-700',
            mixed: 'bg-gray-50 text-gray-700'
        }
        return colors[audience as keyof typeof colors] || 'bg-gray-50 text-gray-700'
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-center">
                    <FeatherLoader className="w-8 h-8 animate-spin text-brand-600 mx-auto mb-4" />
                    <p className="text-neutral-600">Loading templates...</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="text-center py-12">
                <FeatherSettings className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-default-font mb-2">Unable to load templates</h3>
                <p className="text-neutral-600 mb-4">{error}</p>
                <Button onClick={fetchTemplates} variant="neutral-secondary">
                    Try Again
                </Button>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* AI Decide Option */}
            <div 
                className={`p-4 cursor-pointer transition-all duration-200 hover:shadow-md rounded-lg border ${
                    selectedTemplate === 'ai-decide' 
                        ? 'ring-2 ring-brand-500 bg-brand-50/50 border-brand-200' 
                        : 'hover:bg-neutral-50/50 border-neutral-200'
                }`}
                onClick={() => handleTemplateSelect('ai-decide')}
            >
                <div className="flex items-start gap-4">
                    <div className="p-3 rounded-lg bg-brand-100 text-brand-600">
                        <FeatherZap className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-default-font">Let AI Decide</h3>
                            <Badge variant="brand">Recommended</Badge>
                        </div>
                        <p className="text-sm text-neutral-600 mb-3">
                            Let AI analyze your repository content and automatically choose the best template structure and sections
                        </p>
                        <div className="flex flex-wrap gap-2">
                            <Badge variant="neutral">Smart Analysis</Badge>
                            <Badge variant="neutral">Auto-Structure</Badge>
                            <Badge variant="neutral">Context-Aware</Badge>
                        </div>
                    </div>
                    {selectedTemplate === 'ai-decide' && (
                        <FeatherCheck className="w-5 h-5 text-brand-600" />
                    )}
                </div>
            </div>

            {/* Search */}
            <div>
                <h3 className="text-lg font-semibold text-default-font mb-4">Or Choose a Specific Template</h3>
                <TextField
                    label=""
                    helpText=""
                    icon={<FeatherSearch />}
                >
                    <TextField.Input
                        placeholder="Search templates..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </TextField>
            </div>

            {/* Template List */}
            <div className="space-y-3 max-h-96 overflow-y-auto">
                {filteredTemplates.length === 0 ? (
                    <div className="text-center py-8">
                        <FeatherSettings className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
                        <p className="text-neutral-600">
                            {searchQuery ? 'No templates match your search' : 'No templates found'}
                        </p>
                    </div>
                ) : (
                    filteredTemplates.map((template) => (
                        <div
                            key={template.id}
                            className={`p-4 cursor-pointer transition-all duration-200 hover:shadow-md rounded-lg border ${
                                selectedTemplate === template || (typeof selectedTemplate === 'object' && selectedTemplate?.id === template.id)
                                    ? 'ring-2 ring-brand-500 bg-brand-50/50 border-brand-200' 
                                    : 'hover:bg-neutral-50/50 border-neutral-200'
                            }`}
                            onClick={() => handleTemplateSelect(template)}
                        >
                            <div className="flex items-start gap-4">
                                <div className="text-2xl">{template.icon}</div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <h3 className="font-semibold text-default-font">{template.name}</h3>
                                        {template.uses_org_ai_context && (
                                            <Badge variant="brand" className="text-xs">AI Context</Badge>
                                        )}
                                    </div>
                                    
                                    <p className="text-sm text-neutral-600 mb-3">{template.description}</p>
                                    
                                    <div className="flex flex-wrap gap-2 mb-3">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(template.category)}`}>
                                            {template.category}
                                        </span>
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getAudienceColor(template.target_audience)}`}>
                                            {template.target_audience}
                                        </span>
                                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-neutral-100 text-neutral-700">
                                            {template.tone}
                                        </span>
                                    </div>
                                </div>
                                {(selectedTemplate === template || (typeof selectedTemplate === 'object' && selectedTemplate?.id === template.id)) && (
                                    <FeatherCheck className="w-5 h-5 text-brand-600" />
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Selected Template Info */}
            {selectedTemplate && selectedTemplate !== 'ai-decide' && typeof selectedTemplate === 'object' && (
                <div className="p-4 bg-brand-50 border border-brand-200 rounded-lg">
                    <div className="flex items-center gap-2 text-brand-700 text-sm font-medium mb-2">
                        <FeatherSettings className="w-4 h-4" />
                        Selected Template
                    </div>
                    <div className="flex items-center justify-between">
                        <div>
                            <h4 className="font-semibold text-default-font">{selectedTemplate.name}</h4>
                            <p className="text-sm text-neutral-600">
                                {selectedTemplate.uses_org_ai_context 
                                    ? 'Will use organization AI context + template structure' 
                                    : 'Will use template structure only'
                                }
                            </p>
                        </div>
                        <Button
                            variant="neutral-tertiary"
                            size="small"
                            onClick={() => setSelectedTemplate(null)}
                        >
                            Change
                        </Button>
                    </div>
                </div>
            )}

            {selectedTemplate === 'ai-decide' && (
                <div className="p-4 bg-brand-50 border border-brand-200 rounded-lg">
                    <div className="flex items-center gap-2 text-brand-700 text-sm font-medium mb-2">
                        <FeatherZap className="w-4 h-4" />
                        AI Will Decide
                    </div>
                    <p className="text-sm text-neutral-600">
                        AI will analyze your repository content and automatically select the most appropriate template structure, 
                        sections, and formatting based on your project type and organization context.
                    </p>
                </div>
            )}
        </div>
    )
}