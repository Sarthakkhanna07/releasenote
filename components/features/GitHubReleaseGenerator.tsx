'use client'

import { useState, useEffect } from 'react'
import { useReleaseNotes, useReleaseNotesActions } from '@/lib/store'
import Link from 'next/link'

// Subframe UI Components
import { Badge } from '@/subframe-ui/components/Badge'
import { TextField } from '@/subframe-ui/components/TextField'
import { Button } from '@/subframe-ui/components/Button'
import { TextArea } from '@/subframe-ui/components/TextArea'
import { FeatherGithub, FeatherRefreshCw, FeatherEdit2 } from '@subframe/core'
import { Checkbox } from '@/subframe-ui/components/Checkbox'
import ReleaseNoteEditor from './ReleaseNoteEditor';

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
  const [selectedRepo, setSelectedRepo] = useState<string>('')
  const [generatedContent, setGeneratedContent] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [loadingRepos, setLoadingRepos] = useState(true)
  const [error, setError] = useState<string>('')
  const [lastSync, setLastSync] = useState<Date | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  // Add state for commits, pull requests, and selection
  const [commits, setCommits] = useState<any[]>([])
  const [pullRequests, setPullRequests] = useState<any[]>([])
  const [selectedChanges, setSelectedChanges] = useState<string[]>([])
  const [loadingChanges, setLoadingChanges] = useState(false)
  const [draftId, setDraftId] = useState<string | null>(null) // Add state for draft ID

  // State to manage the multi-step UI flow
  const [step, setStep] = useState(1) // 1: Select, 2: Generate, 3: Preview
  const [editMode, setEditMode] = useState(false);
  const [editedContent, setEditedContent] = useState<string>('');

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

  // Fetch recent commits and pull requests for the selected repo
  const fetchChanges = async () => {
    if (!selectedRepo) return
    setLoadingChanges(true)
    setError('')
    try {
      const [owner, repo] = selectedRepo.split('/')
      // Fetch commits
      const commitsRes = await fetch(`/api/github/commits?owner=${owner}&repo=${repo}`)
      const commitsData = commitsRes.ok ? await commitsRes.json() : { commits: [] }
      setCommits(commitsData.commits || [])
      // Fetch pull requests
      const prsRes = await fetch(`/api/github/pull-requests?owner=${owner}&repo=${repo}`)
      const prsData = prsRes.ok ? await prsRes.json() : { pullRequests: [] }
      setPullRequests(prsData.pullRequests || [])
      // By default, select all
      const allIds = [
        ...(commitsData.commits || []).map((c: any) => `commit:${c.sha}`),
        ...(prsData.pullRequests || []).map((pr: any) => `pr:${pr.number}`),
      ]
      setSelectedChanges(allIds)
    } catch (err) {
      setError('Failed to fetch changes')
    } finally {
      setLoadingChanges(false)
    }
  }

  // Fetch changes when moving to step 2
  useEffect(() => {
    if (step === 2 && selectedRepo) {
      fetchChanges()
    }
    // eslint-disable-next-line
  }, [step, selectedRepo])

  // Selection handlers
  const toggleChangeSelection = (id: string) => {
    setSelectedChanges((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }
  const selectAllChanges = () => {
    const allIds = [
      ...commits.map((c: any) => `commit:${c.sha}`),
      ...pullRequests.map((pr: any) => `pr:${pr.number}`),
    ]
    setSelectedChanges(allIds)
  }
  const deselectAllChanges = () => setSelectedChanges([])

  // Handler for manual refresh
  const handleRefresh = () => {
    setRefreshing(true)
    fetchRepositories(true)
  }

  // Update handleGenerate to send only selected changes
  const handleGenerate = async () => {
    if (!selectedRepo) {
      setError('Please select a repository')
      return
    }
    setLoading(true)
    setError('')
    setGeneratedContent('')
    setDraftId(null) // Reset draft ID
    try {
      const [owner, repo] = selectedRepo.split('/')
      // Prepare selected commits and PRs
      const selectedCommits = commits.filter((c: any) => selectedChanges.includes(`commit:${c.sha}`))
      const selectedPRs = pullRequests.filter((pr: any) => selectedChanges.includes(`pr:${pr.number}`))
      const allChanges = [
        ...selectedCommits.map((c: any) => ({
          message: c.message,
          sha: c.sha,
          author: c.author?.name,
          type: 'commit',
        })),
        ...selectedPRs.map((pr: any) => ({
          message: `${pr.title}: ${pr.body?.substring(0, 200) || ''}`,
          sha: pr.number.toString(),
          author: pr.user?.login,
          type: 'pull_request',
        })),
      ]
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
          changes: allChanges, // Pass only selected changes
        }),
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate release notes')
      }
      const data = await response.json()
      setGeneratedContent(data.content)
      setDraftId(data.draftId) // Capture the draft ID from the response
      setStep(3)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate release notes')
    } finally {
      setLoading(false)
    }
  }

  // Update handleSaveDraft to use existing draft if available
  const handleSaveDraft = async () => {
    if (!generatedContent && !editedContent) return;
    setLoading(true);
    setError('');
    try {
      if (draftId) {
        // If we have a draft ID, update the existing draft
        const { updateReleaseNote } = useReleaseNotesActions();
        await updateReleaseNote(draftId, {
          title: `GitHub Release - ${selectedRepo} - ${new Date().toLocaleDateString()}`,
          content_markdown: editMode ? editedContent : generatedContent,
          status: 'draft',
        });
        alert('Release note draft updated successfully!');
      } else {
        // Fallback to creating a new draft if no draft ID exists
        await createReleaseNote({
          title: `GitHub Release - ${selectedRepo} - ${new Date().toLocaleDateString()}`,
          content_markdown: editMode ? editedContent : generatedContent,
          status: 'draft',
        });
        alert('Release note saved as draft!');
      }
      setSelectedRepo('');
      setGeneratedContent('');
      setEditedContent('');
      setEditMode(false);
      setDraftId(null);
      setStep(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save release note');
    } finally {
      setLoading(false);
    }
  };
  
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

  // When entering edit mode, always set editedContent to generatedContent if editedContent is empty
  useEffect(() => {
    if (!editMode && generatedContent) {
      setEditedContent(generatedContent);
    }
  }, [generatedContent]);

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
                onChange={(e) => { handleReset(); setSelectedRepo(e.target.value); }}
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

      {/* Step 2: Review Changes (Selectable List) */}
      {step === 2 && (
        <div className="flex w-full flex-col items-start gap-6 rounded-md border border-solid border-neutral-border bg-default-background px-8 py-8">
          <div className="flex w-full items-center justify-between">
            <span className="text-heading-2 font-heading-2 text-default-font">2. Review Changes</span>
            <div className="flex items-center gap-2">
              <Button variant="neutral-secondary" onClick={selectAllChanges}>Select All</Button>
              <Button variant="neutral-secondary" onClick={deselectAllChanges}>None</Button>
              <Button variant="neutral-secondary" onClick={handleReset}>Change Repository</Button>
            </div>
          </div>
          {loadingChanges ? (
            <div className="w-full p-3 text-center text-gray-500">Loading recent commits and pull requests...</div>
          ) : (
            <>
              <div className="w-full flex flex-col gap-4">
                {commits.map((commit: any) => (
                  <div key={commit.sha} className="flex w-full items-start gap-4 rounded-md border border-solid px-6 py-4 border-neutral-border">
                    <Checkbox label="" onCheckedChange={() => toggleChangeSelection(`commit:${commit.sha}`)} checked={selectedChanges.includes(`commit:${commit.sha}`)} />
                    <div className="flex grow shrink-0 basis-0 flex-col items-start gap-1">
                      <span className="text-body-bold font-body-bold text-default-font">{commit.message.split('\n')[0]}</span>
                      <p className="text-body font-body text-subtext-color">{commit.message.split('\n').slice(1).join(' ')}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <Badge>{commit.sha.substring(0, 7)}</Badge>
                        <Badge variant="neutral">Commit</Badge>
                      </div>
                    </div>
                  </div>
                ))}
                {pullRequests.map((pr: any) => (
                  <div key={pr.number} className="flex w-full items-start gap-4 rounded-md border border-solid px-6 py-4 border-neutral-border">
                    <Checkbox label="" onCheckedChange={() => toggleChangeSelection(`pr:${pr.number}`)} checked={selectedChanges.includes(`pr:${pr.number}`)} />
                    <div className="flex grow shrink-0 basis-0 flex-col items-start gap-1">
                      <span className="text-body-bold font-body-bold text-default-font">{pr.title}</span>
                      <p className="text-body font-body text-subtext-color">{pr.body?.substring(0, 100)}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <Badge>{pr.number}</Badge>
                        <Badge variant="success">Pull Request</Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <Button onClick={handleGenerate} disabled={loading || selectedChanges.length === 0}>
                {loading ? 'Generating...' : 'Generate Release Notes'}
              </Button>
            </>
          )}
        </div>
      )}

      {/* Step 3: Preview & Customize */}
      {step === 3 && generatedContent && !editMode && (
        <div className="flex w-full flex-col items-start gap-6 rounded-md border border-solid border-neutral-border bg-default-background px-8 py-8">
          <div className="flex w-full items-center justify-between">
            <span className="text-heading-2 font-heading-2 text-default-font">
              3. Preview &amp; Customize
            </span>
            <div className="flex gap-2">
              <Button
                variant="neutral-secondary"
                icon={<FeatherRefreshCw />}
                onClick={handleGenerate}
                disabled={loading}
              >
                {loading ? 'Regenerating...' : 'Regenerate'}
              </Button>
              <Button
                variant="neutral-secondary"
                icon={<FeatherEdit2 />}
                onClick={() => {
                  setEditedContent(generatedContent || '');
                  setEditMode(true);
                }}
              >
                Edit
              </Button>
            </div>
          </div>
          <div className="flex w-full flex-col items-start gap-4">
            <div className="w-full">
                <label className="text-body-bold font-body-bold text-default-font">Release Notes Preview</label>
                <p className="text-body font-body text-subtext-color">AI-generated release notes based on your repository's recent activity.</p>
                <div
                    className="mt-2 h-auto min-h-[240px] w-full flex-none rounded-md border border-solid border-neutral-border bg-neutral-50 p-4 font-monospace-body prose prose-sm max-w-none text-black"
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
                {draftId && (
                  <Button 
                    variant="neutral-secondary" 
                    onClick={() => window.location.href = `/dashboard/releases/editor/${draftId}`}
                  >
                    Open in Editor
                  </Button>
                )}
                <Button onClick={handlePublish}>Publish Release Notes</Button>
            </div>
            <Button variant="neutral-secondary" onClick={handleReset}>Start Over</Button>
          </div>
        </div>
      )}
      {/* Edit Mode */}
      {step === 3 && editMode && (
        <div className="flex w-full flex-col items-start gap-6 rounded-md border border-solid border-neutral-border bg-default-background px-8 py-8">
          <div className="flex w-full items-center justify-between">
            <span className="text-heading-2 font-heading-2 text-default-font">
              Edit Release Notes
            </span>
            <div className="flex gap-2">
              <Button
                variant="neutral-secondary"
                onClick={() => setEditMode(false)}
              >
                Back to Preview
              </Button>
            </div>
          </div>
          <div className="w-full">
            <ReleaseNoteEditor
              value={editedContent}
              onChange={setEditedContent}
              placeholder="Edit your release notes here..."
            />
          </div>
          <div className="flex w-full items-center justify-between mt-4">
            <div className="flex items-center gap-2">
              <Button onClick={handleSaveDraft} disabled={loading}>
                {loading ? 'Saving...' : 'Save Draft'}
              </Button>
              {draftId && (
                <Button 
                  variant="neutral-secondary" 
                  onClick={() => window.location.href = `/dashboard/releases/editor/${draftId}`}
                >
                  Open in Editor
                </Button>
              )}
            </div>
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