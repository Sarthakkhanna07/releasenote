'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { useReleaseNotes } from '@/lib/store'

interface GitHubRepository {
  id: number
  name: string
  full_name: string
  description?: string
  private: boolean
}

export function GitHubReleaseGenerator() {
  const [repositories, setRepositories] = useState<GitHubRepository[]>([])
  const [selectedRepo, setSelectedRepo] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingRepos, setLoadingRepos] = useState(false)
  const [generatedContent, setGeneratedContent] = useState('')
  const [error, setError] = useState('')
  const { createReleaseNote } = useReleaseNotes()

  // Load user's GitHub repositories
  const loadRepositories = async () => {
    setLoadingRepos(true)
    setError('')
    
    try {
      const response = await fetch('/api/github/repositories')
      
      if (!response.ok) {
        throw new Error('Failed to load repositories')
      }
      
      const data = await response.json()
      setRepositories(data.repositories || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load repositories')
    } finally {
      setLoadingRepos(false)
    }
  }

  // Generate release notes from selected repository
  const generateReleaseNotes = async () => {
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
            title: `${repo} Release Notes - ${new Date().toLocaleDateString()}`
          }
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate release notes')
      }

      const data = await response.json()
      setGeneratedContent(data.content)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate release notes')
    } finally {
      setLoading(false)
    }
  }

  // Save generated content as a new release note
  const saveAsReleaseNote = async () => {
    if (!generatedContent) return

    try {
      await createReleaseNote({
        title: `GitHub Release Notes - ${new Date().toLocaleDateString()}`,
        content_html: generatedContent,
        status: 'draft'
      })
      
      // Reset the form
      setGeneratedContent('')
      setSelectedRepo('')
      alert('Release note saved as draft!')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save release note')
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Generate Release Notes from GitHub</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Load Repositories */}
          <div>
            <Button 
              onClick={loadRepositories} 
              disabled={loadingRepos}
              variant="outline"
            >
              {loadingRepos ? 'Loading...' : 'Load My Repositories'}
            </Button>
          </div>

          {/* Repository Selection */}
          {repositories.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Repository:</label>
              <select 
                className="w-full p-2 border rounded"
                value={selectedRepo}
                onChange={(e) => setSelectedRepo(e.target.value)}
              >
                <option value="">Choose a repository...</option>
                {repositories.map((repo) => (
                  <option key={repo.id} value={repo.full_name}>
                    {repo.full_name} {repo.private ? '(Private)' : '(Public)'}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Generate Button */}
          {selectedRepo && (
            <Button 
              onClick={generateReleaseNotes} 
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Generating...' : 'Generate Release Notes'}
            </Button>
          )}

          {/* Error Display */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Generated Content */}
      {generatedContent && (
        <Card>
          <CardHeader>
            <CardTitle>Generated Release Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div 
              className="p-4 bg-gray-50 border rounded min-h-[200px] prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: generatedContent }}
            />
            
            <div className="flex gap-2">
              <Button onClick={saveAsReleaseNote}>
                Save as Draft
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setGeneratedContent('')}
              >
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Help */}
      <Card>
        <CardContent className="text-sm text-gray-600 pt-6">
          <p><strong>How it works:</strong></p>
          <ol className="list-decimal list-inside space-y-1 mt-2">
            <li>Load your GitHub repositories</li>
            <li>Select a repository to analyze</li>
            <li>AI will generate release notes from recent commits and PRs</li>
            <li>Review and save as a draft release note</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  )
}