"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { DefaultPageLayout } from "@/components/subframe-ui/ui/layouts/DefaultPageLayout"
import { Button } from "@/components/subframe-ui/ui/components/Button"
import { Badge } from "@/components/subframe-ui/ui/components/Badge"
import { RichTextEditor } from "@/components/editor/rich-text-editor"
import { TextField } from "@/components/subframe-ui/ui/components/TextField"
import { FeatherSave, FeatherEye, FeatherArrowLeft, FeatherZap, FeatherCheck } from "@subframe/core"
import Link from "next/link"

// Convert HTML to Markdown for Source tab consistency
function convertHTMLToMarkdown(html: string): string {
    if (!html) return ''
    // Very simple HTML -> markdown fallback
    const temp = document.createElement('div')
    temp.innerHTML = html
    const text = temp.textContent || temp.innerText || ''
    return text
}

// Enhanced markdown to HTML converter for TipTap
function convertMarkdownToHTML(markdown: string): string {
    if (!markdown) return ''
    
    console.log('🔄 Converting markdown to HTML...')
    console.log('Input markdown:', markdown)
    
    // Clean up the markdown first
    let html = markdown.trim()
    
    // Split into lines for better processing
    const lines = html.split('\n')
    const processedLines: string[] = []
    let inList = false
    
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim()
        const originalLine = line
        
        // Skip empty lines but track them for paragraph breaks
        if (line === '') {
            if (inList) {
                processedLines.push('</ul>')
                inList = false
            }
            continue
        }
        
        // Headers (with emoji support) - more flexible matching
        if (line.match(/^### /)) {
            if (inList) {
                processedLines.push('</ul>')
                inList = false
            }
            line = `<h3>${line.substring(4)}</h3>`
            console.log(`H3: "${originalLine}" → "${line}"`)
        } else if (line.match(/^## /)) {
            if (inList) {
                processedLines.push('</ul>')
                inList = false
            }
            line = `<h2>${line.substring(3)}</h2>`
            console.log(`H2: "${originalLine}" → "${line}"`)
        } else if (line.match(/^# /)) {
            if (inList) {
                processedLines.push('</ul>')
                inList = false
            }
            line = `<h1>${line.substring(2)}</h1>`
            console.log(`H1: "${originalLine}" → "${line}"`)
        }
        // Try to detect section headers even without markdown syntax
        else if (line.match(/^(What's New|New Features|Bug Fixes|Improvements|Breaking Changes|Technical Improvements|UI\/UX Enhancements)/i)) {
            if (inList) {
                processedLines.push('</ul>')
                inList = false
            }
            line = `<h2>${line}</h2>`
            console.log(`Auto H2: "${originalLine}" → "${line}"`)
        }
        // List items (support both * and -)
        else if (line.match(/^[\*\-] /)) {
            if (!inList) {
                processedLines.push('<ul>')
                inList = true
            }
            line = `<li>${line.substring(2)}</li>`
        }
        // Regular paragraphs
        else {
            if (inList) {
                processedLines.push('</ul>')
                inList = false
            }
            // Don't wrap headers in paragraphs
            if (!line.startsWith('<h')) {
                line = `<p>${line}</p>`
            }
        }
        
        processedLines.push(line)
    }
    
    // Close any open list
    if (inList) {
        processedLines.push('</ul>')
    }
    
    html = processedLines.join('')
    
    // Process inline formatting (non-greedy matching)
    html = html
        // Bold
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        // Italic (but not if it's part of bold)
        .replace(/(?<!\*)\*([^*]+?)\*(?!\*)/g, '<em>$1</em>')
        // Code
        .replace(/`([^`]+?)`/g, '<code>$1</code>')
        // Links [text](url)
        .replace(/\[([^\]]+?)\]\(([^)]+?)\)/g, '<a href="$2">$1</a>')
    
    console.log('✅ Final HTML output:', html)
    return html
}

function ReleaseNotesEditorContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const isGenerated = searchParams.get('generated') === 'true'
    
    const [content, setContent] = useState("")
    const [title, setTitle] = useState("")
    const [version, setVersion] = useState("")
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [generationError, setGenerationError] = useState<string | null>(null)
    const [viewMode, setViewMode] = useState<'editor' | 'preview' | 'source'>('editor')
    const [rawContent, setRawContent] = useState("")

    useEffect(() => {
        const loadReleaseNote = async () => {
            const draftId = searchParams.get('draftId')
            
            if (draftId) {
                try {
                    const response = await fetch(`/api/release-notes/${draftId}`)
                    if (response.ok) {
                        const releaseNote = await response.json()
                        setTitle(releaseNote.title || '')
                        
                        // Convert markdown to HTML for TipTap editor
                        let editorContent = ''
                        
                        // Priority: valid HTML > converted markdown > raw content
                        const hasHtml = (s: string) => /<[^>]+>/.test(s)
                        if (releaseNote.content_html && releaseNote.content_html.trim() !== '') {
                            if (hasHtml(releaseNote.content_html)) {
                                editorContent = releaseNote.content_html
                            } else {
                                // content_html actually contains markdown; convert to HTML
                                editorContent = convertMarkdownToHTML(releaseNote.content_html)
                            }
                        } else if (releaseNote.content_markdown) {
                            editorContent = convertMarkdownToHTML(releaseNote.content_markdown)
                        } else if (releaseNote.content) {
                            // Assume it's markdown if no HTML version exists
                            editorContent = convertMarkdownToHTML(releaseNote.content)
                        }
                        
                        console.log('=== CONTENT CONVERSION DEBUG ===')
                        console.log('Original content:', releaseNote.content_markdown || releaseNote.content)
                        console.log('Converted HTML:', editorContent)
                        console.log('Content type:', typeof editorContent)
                        console.log('Content length:', editorContent.length)
                        
                        // Set content immediately - TipTap should handle HTML properly
                        setContent(editorContent)
                        // Store raw markdown for Source tab
                        if (releaseNote.content_html && releaseNote.content_html.trim() !== '') {
                            if (hasHtml(releaseNote.content_html)) {
                                setRawContent(convertHTMLToMarkdown(releaseNote.content_html))
                            } else {
                                // content_html had markdown
                                setRawContent(releaseNote.content_html)
                            }
                        } else {
                            setRawContent(releaseNote.content_markdown || releaseNote.content || '')
                        }
                        setVersion(releaseNote.version || '')
                    } else {
                        const errorData = await response.json()
                        console.error('Failed to load release note:', errorData)
                        setGenerationError(`Failed to load release note: ${errorData.error || 'Unknown error'}`)
                    }
                } catch (error) {
                    console.error('Error loading release note:', error)
                }
            }
            setLoading(false)
        }

        loadReleaseNote()
    }, [searchParams])

    const handleSave = async () => {
        setSaving(true)
        try {
            const draftId = searchParams.get('draftId')
            
            if (draftId) {
                const response = await fetch(`/api/release-notes/${draftId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        title,
                        version,
                        content_markdown: rawContent, // Save the raw markdown
                        content_html: content, // Save the HTML version
                        status: 'draft'
                    })
                })
                
                if (response.ok) {
                    console.log('Release notes saved successfully')
                    // Show success message or toast
                } else {
                    throw new Error('Failed to save release notes')
                }
            }
        } catch (error) {
            console.error('Failed to save:', error)
            // Show error message or toast
        } finally {
            setSaving(false)
        }
    }

    const handlePublish = async () => {
        await handleSave()
        // TODO: Implement publish functionality
        router.push('/dashboard/releases')
    }

    if (loading) {
        return (
            <DefaultPageLayout>
                <div className="flex h-full w-full items-center justify-center">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mx-auto mb-4"></div>
                        <p className="text-neutral-600">Loading editor...</p>
                    </div>
                </div>
            </DefaultPageLayout>
        )
    }

    return (
        <DefaultPageLayout>
            <div className="flex h-full w-full flex-col items-start">
                {/* Header */}
                <div className="flex w-full items-center justify-between border-b border-solid border-neutral-border px-8 py-6">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard/releases">
                            <Button
                                variant="neutral-tertiary"
                                icon={<FeatherArrowLeft />}
                                size="small"
                            >
                                Back to Releases
                            </Button>
                        </Link>
                        <div className="flex flex-col items-start gap-1">
                            <div className="flex items-center gap-2">
                                <span className="text-2xl font-bold text-default-font">
                                    Release Notes Editor
                                </span>
                                {isGenerated && (
                                    <Badge variant="brand" icon={<FeatherZap />}>
                                        AI Generated
                                    </Badge>
                                )}
                            </div>
                            <span className="text-base text-neutral-500">
                                Edit and customize your release notes
                            </span>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        {/* View Mode Toggle */}
                        <div className="flex items-center border border-neutral-200 rounded-lg overflow-hidden">
                            <Button
                                variant={viewMode === 'editor' ? 'brand-secondary' : 'neutral-tertiary'}
                                size="small"
                                onClick={() => setViewMode('editor')}
                                className="rounded-none border-0"
                            >
                                Editor
                            </Button>
                            <Button
                                variant={viewMode === 'preview' ? 'brand-secondary' : 'neutral-tertiary'}
                                size="small"
                                onClick={() => setViewMode('preview')}
                                className="rounded-none border-0"
                            >
                                Preview
                            </Button>
                            <Button
                                variant={viewMode === 'source' ? 'brand-secondary' : 'neutral-tertiary'}
                                size="small"
                                onClick={() => setViewMode('source')}
                                className="rounded-none border-0"
                            >
                                Source
                            </Button>
                        </div>
                        <Button
                            variant="neutral-primary"
                            icon={<FeatherSave />}
                            onClick={handleSave}
                            disabled={saving}
                            size="medium"
                        >
                            {saving ? 'Saving...' : 'Save Draft'}
                        </Button>
                        <Button
                            variant="brand-primary"
                            icon={<FeatherCheck />}
                            onClick={handlePublish}
                            size="medium"
                        >
                            Publish
                        </Button>
                    </div>
                </div>

                <div className="flex w-full grow shrink-0 basis-0 flex-col items-start bg-default-background">
                    {/* Error Message */}
                    {generationError && (
                        <div className="w-full px-8 py-4 bg-red-50 border-b border-red-200">
                            <div className="flex items-center gap-2 text-red-700">
                                <FeatherArrowLeft className="w-5 h-5" />
                                <span className="font-medium">Error loading release note:</span>
                                <span className="text-red-600">{generationError}</span>
                            </div>
                        </div>
                    )}

                    {/* Success Message */}
                    {isGenerated && !generationError && (
                        <div className="w-full px-8 py-4 bg-green-50 border-b border-green-200">
                            <div className="flex items-center gap-2 text-green-700">
                                <FeatherCheck className="w-5 h-5" />
                                <span className="font-medium">Release notes generated successfully!</span>
                                <span className="text-green-600">Review and customize the content below.</span>
                            </div>
                        </div>
                    )}

                    {/* Editor Content */}
                    <div className="container max-w-none flex w-full grow shrink-0 basis-0 flex-col items-start gap-8 py-12 overflow-auto">
                        <div className="w-full max-w-4xl mx-auto space-y-6">
                            {/* Title and Version */}
                            <div className="grid grid-cols-2 gap-4">
                                <TextField
                                    label="Title"
                                    helpText="The title of your release notes"
                                >
                                    <TextField.Input
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder="Release Notes v1.0.0"
                                    />
                                </TextField>
                                <TextField
                                    label="Version"
                                    helpText="Version number for this release"
                                >
                                    <TextField.Input
                                        value={version}
                                        onChange={(e) => setVersion(e.target.value)}
                                        placeholder="v1.0.0"
                                    />
                                </TextField>
                            </div>

                            {/* Content Editor/Preview/Source */}
                            <div>
                                <label className="block text-sm font-medium mb-2 text-default-font">
                                    Release Notes Content
                                </label>
                                <p className="text-sm text-neutral-600 mb-4">
                                    {viewMode === 'editor' && 'Use the rich text editor to format your release notes with headings, lists, links, and more'}
                                    {viewMode === 'preview' && 'Preview how your release notes will look when published'}
                                    {viewMode === 'source' && 'View and edit the raw markdown source of your release notes'}
                                </p>
                                
                                {/* Rich Text Editor */}
                                {viewMode === 'editor' && (
                                    <RichTextEditor
                                        content={content}
                                        onChange={(newContent) => setContent(newContent)}
                                        placeholder="Start writing your release notes..."
                                        enableAI={true}
                                    />
                                )}
                                
                                {/* Preview Mode */}
                                {viewMode === 'preview' && (
                                    <div className="border border-neutral-200 rounded-lg p-6 bg-white min-h-[400px]">
                                        <div 
                                            className="prose prose-sm sm:prose lg:prose-lg xl:prose-xl max-w-none"
                                            dangerouslySetInnerHTML={{ __html: content }}
                                        />
                                    </div>
                                )}
                                
                                {/* Source Mode */}
                                {viewMode === 'source' && (
                                    <div className="space-y-4">
                                        <div className="border border-neutral-200 rounded-lg overflow-hidden">
                                            <div className="bg-neutral-50 px-4 py-2 border-b border-neutral-200">
                                                <span className="text-sm font-medium text-neutral-700">Markdown Source</span>
                                            </div>
                                            <textarea
                                                value={rawContent}
                                                onChange={(e) => {
                                                    setRawContent(e.target.value)
                                                    // Convert markdown to HTML for the editor
                                                    const htmlContent = convertMarkdownToHTML(e.target.value)
                                                    setContent(htmlContent)
                                                }}
                                                className="w-full h-64 p-4 font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-500"
                                                placeholder="# Release Notes v1.0.0

## New Features
- Feature 1
- Feature 2

## Bug Fixes
- Fix 1
- Fix 2"
                                            />
                                        </div>
                                        
                                        <div className="border border-neutral-200 rounded-lg overflow-hidden">
                                            <div className="bg-neutral-50 px-4 py-2 border-b border-neutral-200">
                                                <span className="text-sm font-medium text-neutral-700">Generated HTML</span>
                                            </div>
                                            <div className="p-4 bg-neutral-50 max-h-64 overflow-y-auto">
                                                <pre className="text-xs text-neutral-600 whitespace-pre-wrap font-mono">
                                                    {content}
                                                </pre>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Editor Tips */}
                            <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-lg">
                                <h4 className="font-medium text-default-font mb-2">Editor Tips:</h4>
                                <ul className="text-sm text-neutral-600 space-y-1">
                                    <li>• Use Markdown formatting for rich text (headers, lists, links, etc.)</li>
                                    <li>• Organize content with clear sections like "New Features", "Bug Fixes", "Breaking Changes"</li>
                                    <li>• Use emojis to make your release notes more engaging (🚀, 🐛, ⚡, etc.)</li>
                                    <li>• Include links to relevant documentation or issues when helpful</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </DefaultPageLayout>
    )
}

export default function ReleaseNotesEditor() {
    return (
        <Suspense fallback={
            <DefaultPageLayout>
                <div className="flex h-full w-full items-center justify-center">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mx-auto mb-4"></div>
                        <p className="text-neutral-600">Loading editor...</p>
                    </div>
                </div>
            </DefaultPageLayout>
        }>
            <ReleaseNotesEditorContent />
        </Suspense>
    )
}