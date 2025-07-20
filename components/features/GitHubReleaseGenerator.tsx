'use client'

import { useState, useEffect } from 'react'
import { useReleaseNotes } from '@/lib/store'
import Link from 'next/link'

// Subframe UI Components
import { Badge } from '@/subframe-ui/components/Badge'
import { TextField } from '@/subframe-ui/components/TextField'
import { Button } from '@/subframe-ui/components/Button'
import { TextArea } from '@/subframe-ui/components/TextArea'
import { FeatherGithub, FeatherRefreshCw } from '@subframe/core'

// Type definition for a GitHub repository
interface GitHubRepository {
  id: number
  name: string
  full_name: string
  description?: string
  private: boolean
}

export function GitHubReleaseGenerator() {
  // State for data and API status
  const [repositories, setRepositories] = useState<GitHubRepository[]>([])
  const [selectedRepo, setSelectedRepo] = useState('')
  const [generatedContent, setGeneratedContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingRepos, setLoadingRepos] = useState(true)
  const [error, setError] = useState('')
  const [lastSync, setLastSync] = useState<Date | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  // State to manage the multi-step UI flow
  const [step, setStep] = useState(1) // 1: Select, 2: Generate, 3: Preview

  const { createReleaseNote } = useReleaseNotes()

  // Helper to fetch repositories (optionally bypass cache)
  const fetchRepositories = async (forceRefresh = false) => {
    setLoadingRepos(true)
    setError('')
    try {
      const url = forceRefresh ? '/api/github/repositories?refresh=1' : '/api/github/repositories'
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error('Failed to load repositories. Please connect your GitHub account.')
      }
      const data = await response.json()
      setRepositories(data.repositories || [])
      if (data.lastUpdated) {
        setLastSync(new Date(data.lastUpdated))
      } else {
        setLastSync(new Date())
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setLoadingRepos(false)
      setRefreshing(false)
    }
  }

  // 1. Load user's GitHub repositories on component mount
  useEffect(() => {
    fetchRepositories()
    // eslint-disable-next-line
  }, [])

  // Handler for manual refresh
  const handleRefresh = () => {
    setRefreshing(true)
    fetchRepositories(true)
  }

  // 2. Generate release notes from the selected repository
  const handleGenerate = async () => {
    if (!selectedRepo) {
      setError('Please select a repository')
      return
    }

    setLoading(true)
    setError('')
    setGeneratedContent('')

    try {
      const [owner, repo] = selectedRepo.split('/')
      const response = await fetch('/api/github/generate-release-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repository: { owner, repo },
          options: {
            template: 'traditional',
            tone: 'professional',
            includeBreakingChanges: true,
            title: `${repo} Release Notes - ${new Date().toLocaleDateString()}`,
          },
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate release notes')
      }

      const data = await response.json()
      setGeneratedContent(data.content)
      setStep(3) // Move to the preview step on success
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate release notes')
    } finally {
      setLoading(false)
    }
  }

  // 3. Save the generated content as a new release note draft
  const handleSaveDraft = async () => {
    if (!generatedContent) return

    try {
      await createReleaseNote({
        title: `GitHub Release - ${selectedRepo} - ${new Date().toLocaleDateString()}`,
        content_html: generatedContent,
        status: 'draft',
      })
      alert('Release note saved as draft!')
      // Reset the entire flow
      setSelectedRepo('')
      setGeneratedContent('')
      setStep(1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save release note')
    }
  }
  
  // Placeholder for future publish functionality
  const handlePublish = () => {
     alert("Publish functionality coming soon!");
  }
  
  // Function to reset and select a new repository
  const handleReset = () => {
    setSelectedRepo('');
    setGeneratedContent('');
    setError('');
    setStep(1);
  }

  return (
    <div className="flex w-full max-w-[1024px] flex-col items-start gap-8">
      {/* Step 1: Select Repository */}
      <div className={`flex w-full flex-col items-start gap-6 rounded-md border border-solid border-neutral-border bg-default-background px-8 py-8 transition-opacity ${step > 1 ? 'opacity-50' : 'opacity-100'}`}>
        <div className="flex w-full items-center justify-between">
          <span className="text-heading-2 font-heading-2 text-default-font">
            1. Select Repository
          </span>
          {loadingRepos ? null : repositories.length > 0 ? (
            <Badge variant="success" icon={<FeatherGithub />}>Connected</Badge>
          ) : (
            <Badge variant="warning" icon={<FeatherGithub />}>Not Connected</Badge>
          )}
        </div>
        <div className="flex w-full items-center justify-between mb-2">
          {lastSync && (
            <span className="text-xs text-gray-500">
              <span>Last updated {lastSync.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </span>
          )}
          <Button
            variant="neutral-secondary"
            size="small"
            onClick={handleRefresh}
            disabled={loadingRepos || refreshing}
            className="ml-auto"
          >
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
        {loadingRepos ? (
          <div className="w-full p-3 text-center text-gray-500">Loading your GitHub repositories...</div>
        ) : repositories.length === 0 ? (
          <div className="w-full flex flex-col items-center gap-4 p-6 text-center">
            <span className="text-lg font-semibold text-default-font">No GitHub integration found</span>
            <span className="text-body text-subtext-color">To generate release notes from your code, you'll need to connect your GitHub account first. This allows us to analyze your repositories and help you tell your product story with every release.</span>
            <Link href="/dashboard/integrations">
              <Button variant="brand-primary">Connect GitHub Integration</Button>
            </Link>
          </div>
        ) : (
          <>
            <TextField
              className="h-auto w-full max-w-[1024px] flex-none"
              label="Repository"
              helpText={loadingRepos ? 'Loading repositories...' : 'Select a repository to begin'}
            >
              <select
                className="w-full max-w-[1024px] grow shrink-0 basis-0 rounded-md border border-solid border-neutral-border bg-default-background px-3 py-2 text-body font-body text-default-font shadow-sm outline-none focus:border-brand-500"
                value={selectedRepo}
                onChange={(e) => handleReset() || setSelectedRepo(e.target.value) }
                disabled={loadingRepos || repositories.length === 0 || step > 1}
              >
                <option value="">Choose a repository...</option>
                {repositories.map((repo) => (
                  <option key={repo.id} value={repo.full_name}>
                    {repo.full_name} {repo.private ? '(Private)' : ''}
                  </option>
                ))}
              </select>
            </TextField>
            {selectedRepo && step === 1 && (
              <Button onClick={() => setStep(2)}>
                Continue to Review Changes
              </Button>
            )}
          </>
        )}
      </div>

      {/* Step 2: Review Changes (Automatic Analysis) */}
      {step >= 2 && (
        <div className={`flex w-full flex-col items-start gap-6 rounded-md border border-solid border-neutral-border bg-default-background px-8 py-8 transition-opacity ${step > 2 ? 'opacity-50' : 'opacity-100'}`}>
            <div className="flex w-full items-center justify-between">
                <span className="text-heading-2 font-heading-2 text-default-font">
                2. Review Changes
                </span>
                {step > 1 && <Button variant="neutral-secondary" onClick={handleReset}>Change Repository</Button>}
            </div>
            <div className="flex w-full flex-col items-start gap-2 rounded-md border border-dashed border-neutral-border bg-neutral-50 p-6">
                <span className="text-heading-3 font-heading-3 text-default-font">Automatic Analysis</span>
                <p className="text-body font-body text-subtext-color">
                    Our AI will analyze recent commits and pull requests from the <strong className="text-default-font">{selectedRepo}</strong> repository to draft the release notes. All relevant changes within the default timeframe will be included automatically.
                </p>
            </div>
            {step === 2 && (
                <Button onClick={handleGenerate} disabled={loading}>
                  {loading ? 'Generating...' : 'Generate Release Notes'}
                </Button>
            )}
        </div>
      )}

      {/* Step 3: Preview & Customize */}
      {step === 3 && generatedContent && (
        <div className="flex w-full flex-col items-start gap-6 rounded-md border border-solid border-neutral-border bg-default-background px-8 py-8">
          <div className="flex w-full items-center justify-between">
            <span className="text-heading-2 font-heading-2 text-default-font">
              3. Preview &amp; Customize
            </span>
             <Button
                variant="neutral-secondary"
                icon={<FeatherRefreshCw />}
                onClick={handleGenerate}
                disabled={loading}
              >
                {loading ? 'Regenerating...' : 'Regenerate'}
              </Button>
          </div>
          <div className="flex w-full flex-col items-start gap-4">
            <div className="w-full">
                <label className="text-body-bold font-body-bold text-default-font">Release Notes Preview</label>
                <p className="text-body font-body text-subtext-color">AI-generated release notes based on your repository's recent activity.</p>
                <div
                    className="mt-2 h-auto min-h-[240px] w-full flex-none rounded-md border border-solid border-neutral-border bg-neutral-50 p-4 font-monospace-body prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: generatedContent }}
                />
            </div>
            <div className="flex w-full flex-wrap items-start gap-4">
              <TextField className="h-auto w-64 flex-none" label="Tone" helpText="Writing style">
                <TextField.Input placeholder="Professional" disabled />
              </TextField>
              <TextField className="h-auto w-64 flex-none" label="Audience" helpText="Target readers">
                <TextField.Input placeholder="Developers" disabled />
              </TextField>
              <TextField className="h-auto w-64 flex-none" label="Format" helpText="Output format">
                <TextField.Input placeholder="Markdown" disabled />
              </TextField>
            </div>
          </div>
          <div className="flex w-full items-center justify-between">
            <div className="flex items-center gap-2">
                <Button variant="neutral-secondary" onClick={handleSaveDraft}>
                Save Draft
                </Button>
                <Button onClick={handlePublish}>Publish Release Notes</Button>
            </div>
            <Button variant="neutral-secondary" onClick={handleReset}>Start Over</Button>
          </div>
        </div>
      )}
      
       {/* Error Display */}
       {error && (
            <div className="w-full max-w-[1024px] p-4 bg-error-50 border border-error-200 rounded text-error-700 text-sm">
                <strong>Error:</strong> {error}
            </div>
        )}
    </div>
  )
}