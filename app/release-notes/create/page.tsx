'use client'

import { CalendarIcon, SaveIcon, SendIcon, WandIcon } from "lucide-react"
import { useState } from "react"
import { useReleaseNotesStore, useReleaseNotesActions } from "@/lib/store"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { RichTextEditor } from "@/components/editor/rich-text-editor"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { ErrorState } from "@/components/ui/error-state"
import { TemplateSelector } from "@/components/ui/template-selector"
import { ContentImprover } from "@/components/ui/content-improver"
import { AI_TEMPLATES } from "@/lib/ai/templates"
import { DefaultPageLayout, Tabs } from "@/components/subframe-ui/ui"
import { FeatherGitBranch, FeatherGithub, FeatherTrello } from '@subframe/core'
import { GitHubReleaseGenerator } from "@/components/features/GitHubReleaseGenerator"

export default function CreateReleaseNotePage() {
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [scheduledDate, setScheduledDate] = useState("")
  const [status, setStatus] = useState("draft")
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("traditional")
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showTemplateSelector, setShowTemplateSelector] = useState(false)
  const [showContentImprover, setShowContentImprover] = useState(false)
  const [activeTab, setActiveTab] = useState<'github' | 'jira'>('github')

  const { createReleaseNote, generateWithAI, generateWithTemplate, improveContent } = useReleaseNotesActions()
  const templates = useReleaseNotesStore((state) => state.templates)
  const router = useRouter()

  const handleCategoryChange = (category: string, checked: boolean) => {
    if (checked) {
      setSelectedCategories(prev => [...prev, category])
    } else {
      setSelectedCategories(prev => prev.filter(c => c !== category))
    }
  }

  const handleAIGenerate = async () => {
    if (!title) {
      alert('Please enter a title first')
      return
    }
    
    setIsLoading(true)
    try {
      const aiContent = await generateWithTemplate(selectedTemplateId, {
        version: 'v1.0.0', // Default version
        changes: `Release notes for: ${title}`,
        date: new Date().toISOString().split('T')[0]
      })
      setContent(aiContent)
    } catch (error) {
      console.error('AI generation failed:', error)
      alert('Failed to generate content. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveDraft = async () => {
    if (!title.trim()) {
      setError('Please enter a title')
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      const releaseNote = await createReleaseNote({
        title: title.trim(),
        content_html: content,
        status: 'draft',
        slug: title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
      })
      router.push(`/releases/edit/${releaseNote.id}`)
    } catch (error) {
      console.error('Save failed:', error)
      setError(error instanceof Error ? error.message : 'Failed to save draft. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePublish = async () => {
    if (!title.trim()) {
      setError('Please enter a title')
      return
    }
    
    if (!content.trim()) {
      setError('Please enter some content')
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      const releaseNote = await createReleaseNote({
        title: title.trim(),
        content_html: content,
        status: status === 'scheduled' ? 'scheduled' : 'published',
        slug: title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
        published_at: status === 'scheduled' ? scheduledDate : new Date().toISOString()
      })
      
      // Send email notifications if publishing
      if (status === 'published') {
        try {
          await fetch(`/api/release-notes/${releaseNote.id}/notify`, {
            method: 'POST'
          })
        } catch (err) {
          console.warn('Failed to send notifications:', err)
        }
      }
      
      router.push('/releases')
    } catch (error) {
      console.error('Publish failed:', error)
      setError(error instanceof Error ? error.message : 'Failed to publish. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <DefaultPageLayout>
      {/* Header Section */}
      <div className="flex w-full flex-col items-start gap-6 border-b border-solid border-neutral-border px-8 py-6">
        <div className="flex grow shrink-0 basis-0 flex-col items-start gap-2">
          <div className="flex items-center gap-3">
            <FeatherGitBranch className="text-heading-1 font-heading-1 text-brand-600" />
            <span className="text-heading-1 font-heading-1 text-brand-600">
              Generate Release Notes
            </span>
          </div>
          <span className="text-heading-3 font-heading-3 text-neutral-500">
            Transform your code changes into professional release notes
          </span>
        </div>
        <Tabs>
          <Tabs.Item 
            active={activeTab === 'github'} 
            icon={<FeatherGithub />}
            onClick={() => setActiveTab('github')}
          >
            GitHub
          </Tabs.Item>
          <Tabs.Item 
            active={activeTab === 'jira'} 
            icon={<FeatherTrello />}
            onClick={() => setActiveTab('jira')}
          >
            Jira
          </Tabs.Item>
        </Tabs>
      </div>

      {/* Tab Content */}
      {activeTab === 'github' ? (
        <section className="container max-w-none flex w-full grow shrink-0 basis-0 flex-col items-start gap-8 bg-default-background py-12 overflow-auto">
          <div className="flex w-full max-w-[1024px] flex-col items-start gap-8">
            <GitHubReleaseGenerator />
          </div>
        </section>
      ) : (
        <div className="container max-w-none flex w-full grow shrink-0 basis-0 flex-col items-start gap-8 bg-default-background py-12 overflow-auto">
          <div className="flex w-full max-w-[1024px] flex-col items-start gap-8">
            <div className="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
              <div className="flex flex-col gap-6 w-full">
            {/* Action Buttons */}
            <div className="flex items-center justify-end w-full">
              <div className="flex gap-3">
                <Button variant="outline" className="border-[#d0d5dd]" onClick={handleSaveDraft}>
                  <SaveIcon className="w-4 h-4 mr-2" />
                  Save Draft
                </Button>
                <Button className="bg-[#7F56D9] text-white" onClick={handlePublish}>
                  <SendIcon className="w-4 h-4 mr-2" />
                  Publish Now
                </Button>
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <ErrorState
                type="validation"
                message={error}
                onRetry={() => setError(null)}
                showRetry={false}
              />
            )}

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 w-full">
              {/* Editor Section */}
              <div className="lg:col-span-2">
                <Card className="border-[#e4e7ec] shadow-sm">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-semibold text-[#101828]">Release Note Details</h2>
                      <Button variant="outline" size="sm" onClick={handleAIGenerate}>
                        <WandIcon className="w-4 h-4 mr-2" />
                        AI Generate
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-[#344054] mb-2">
                        Title
                      </label>
                      <Input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Enter release note title..."
                        className="w-full"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <label className="block text-sm font-medium text-[#344054]">
                          Template Style
                        </label>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setShowTemplateSelector(!showTemplateSelector)}
                        >
                          {showTemplateSelector ? 'Hide Templates' : 'Choose Template'}
                        </Button>
                      </div>
                      
                      {showTemplateSelector && (
                        <div className="mb-4">
                          <TemplateSelector
                            templates={AI_TEMPLATES}
                            selectedTemplateId={selectedTemplateId}
                            onTemplateSelect={(templateId) => {
                              setSelectedTemplateId(templateId)
                              setShowTemplateSelector(false)
                            }}
                          />
                        </div>
                      )}
                      
                      <div className="text-sm text-gray-600 p-3 bg-gray-50 rounded-md">
                        <strong>Selected:</strong> {AI_TEMPLATES.find(t => t.id === selectedTemplateId)?.name || 'Traditional'}
                        <br />
                        <span className="text-xs text-gray-500">
                          {AI_TEMPLATES.find(t => t.id === selectedTemplateId)?.description}
                        </span>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-[#344054] mb-2">
                        Content
                      </label>
                      <RichTextEditor
                        content={content}
                        onChange={setContent}
                        placeholder="Write your release note content here..."
                        onAIGenerate={handleAIGenerate}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Settings Sidebar */}
              <div className="space-y-6">
                <Card className="border-[#e4e7ec] shadow-sm">
                  <CardHeader className="pb-4">
                    <h3 className="text-lg font-semibold text-[#101828]">Publishing Options</h3>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-[#344054] mb-2">
                        Status
                      </label>
                      <Select value={status} onValueChange={setStatus}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="scheduled">Scheduled</SelectItem>
                          <SelectItem value="published">Published</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-[#344054] mb-2">
                        Schedule Date
                      </label>
                      <div className="relative">
                        <Input
                          type="datetime-local"
                          value={scheduledDate}
                          onChange={(e) => setScheduledDate(e.target.value)}
                          className="w-full"
                        />
                        <CalendarIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#667085] pointer-events-none" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-[#e4e7ec] shadow-sm">
                  <CardHeader className="pb-4">
                    <h3 className="text-lg font-semibold text-[#101828]">Categories</h3>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {['Feature', 'Bug Fix', 'Improvement', 'Security', 'Performance', 'Documentation'].map((category) => (
                        <div key={category} className="flex items-center space-x-2">
                          <Checkbox 
                            id={category}
                            checked={selectedCategories.includes(category)}
                            onCheckedChange={(checked) => handleCategoryChange(category, checked as boolean)}
                          />
                          <label 
                            htmlFor={category}
                            className="text-sm text-[#344054] cursor-pointer"
                          >
                            {category}
                          </label>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-[#e4e7ec] shadow-sm">
                  <CardHeader className="pb-4">
                    <h3 className="text-lg font-semibold text-[#101828]">AI Assistant</h3>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button variant="outline" className="w-full justify-start" onClick={handleAIGenerate} disabled={isLoading}>
                      <WandIcon className="w-4 h-4 mr-2" />
                      Generate with Template
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start" 
                      onClick={() => setShowContentImprover(!showContentImprover)}
                      disabled={isLoading}
                    >
                      <WandIcon className="w-4 h-4 mr-2" />
                      {showContentImprover ? 'Hide' : 'Show'} Content Analysis
                    </Button>
                    <Button variant="outline" className="w-full justify-start" disabled={isLoading}>
                      <WandIcon className="w-4 h-4 mr-2" />
                      Generate from Git Commits
                    </Button>
                    <Button variant="outline" className="w-full justify-start" disabled={isLoading}>
                      <WandIcon className="w-4 h-4 mr-2" />
                      Suggest Categories
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
            
            {/* Content Improvement Panel */}
            {showContentImprover && content.trim().length > 0 && (
              <div className="mt-8">
                <ContentImprover 
                  content={content}
                  onContentChange={setContent}
                />
              </div>
            )}
              </div>
            </div>
          </div>
        </div>
      )}
    </DefaultPageLayout>
  )
}