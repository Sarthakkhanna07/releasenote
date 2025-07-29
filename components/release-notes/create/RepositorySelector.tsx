"use client"

import { useState, useEffect } from "react"
import { TextField } from "@/components/subframe-ui/ui/components/TextField"
import { Badge } from "@/components/subframe-ui/ui/components/Badge"
import { Button } from "@/components/subframe-ui/ui/components/Button"
import { FeatherSearch, FeatherGitBranch, FeatherGithub, FeatherGitlab, FeatherExternalLink, FeatherLoader, FeatherAlertCircle } from "@subframe/core"

interface Repository {
    id: string
    name: string
    full_name: string
    description?: string
    provider: 'github' | 'gitlab' | 'bitbucket'
    url: string
    language?: string
    stars?: number
    updated_at: string
    private: boolean
}

interface RepositorySelectorProps {
    data: any
    onUpdate: (data: any) => void
}

export default function RepositorySelector({ data, onUpdate }: RepositorySelectorProps) {
    const [repositories, setRepositories] = useState<Repository[]>([])
    const [filteredRepos, setFilteredRepos] = useState<Repository[]>([])
    const [searchQuery, setSearchQuery] = useState("")
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [selectedRepo, setSelectedRepo] = useState<Repository | null>(data.repository)

    useEffect(() => {
        fetchRepositories()
    }, [])

    useEffect(() => {
        if (searchQuery.trim() === "") {
            setFilteredRepos(repositories)
        } else {
            const filtered = repositories.filter(repo =>
                repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                repo.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                repo.description?.toLowerCase().includes(searchQuery.toLowerCase())
            )
            setFilteredRepos(filtered)
        }
    }, [searchQuery, repositories])

    const fetchRepositories = async () => {
        try {
            setLoading(true)
            setError(null)
            
            // Use existing GitHub repositories API
            const response = await fetch('/api/github/repositories')
            
            if (!response.ok) {
                throw new Error('Failed to fetch repositories')
            }
            
            const data = await response.json()
            
            // Transform GitHub API response to our Repository interface
            const transformedRepos: Repository[] = data.repositories.map((repo: any) => ({
                id: repo.id.toString(),
                name: repo.name,
                full_name: repo.full_name,
                description: repo.description,
                provider: 'github',
                url: repo.html_url,
                language: repo.language,
                stars: repo.stargazers_count,
                updated_at: repo.updated_at,
                private: repo.private
            }))
            
            setRepositories(transformedRepos)
            setFilteredRepos(transformedRepos)
            console.log(`✅ Loaded ${transformedRepos.length} repositories from GitHub`)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load repositories')
            console.error('Repository fetch error:', err)
            
            // Show helpful error message for common issues
            if (err instanceof Error && err.message.includes('404')) {
                setError('GitHub integration not found. Please connect your GitHub account in settings.')
            }
        } finally {
            setLoading(false)
        }
    }

    const handleRepositorySelect = (repo: Repository) => {
        setSelectedRepo(repo)
        onUpdate({ repository: repo })
    }

    const getProviderIcon = (provider: string) => {
        switch (provider) {
            case 'github':
                return <FeatherGithub className="w-4 h-4" />
            case 'gitlab':
                return <FeatherGitlab className="w-4 h-4" />
            default:
                return <FeatherGitBranch className="w-4 h-4" />
        }
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        })
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-center">
                    <FeatherLoader className="w-8 h-8 animate-spin text-brand-600 mx-auto mb-4" />
                    <p className="text-neutral-600">Loading your repositories...</p>
                </div>
            </div>
        )
    }

    if (error && repositories.length === 0) {
        return (
            <div className="text-center py-12">
                <FeatherAlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-default-font mb-2">Unable to load repositories</h3>
                <p className="text-neutral-600 mb-4">{error}</p>
                <Button onClick={fetchRepositories} variant="neutral-secondary">
                    Try Again
                </Button>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Search */}
            <TextField
                label=""
                helpText=""
                icon={<FeatherSearch />}
            >
                <TextField.Input
                    placeholder="Search repositories..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </TextField>

            {/* Selected Repository */}
            {selectedRepo && (
                <div className="p-4 bg-brand-50 border border-brand-200 rounded-lg">
                    <div className="flex items-center gap-2 text-brand-700 text-sm font-medium mb-2">
                        <FeatherGitBranch className="w-4 h-4" />
                        Selected Repository
                    </div>
                    <div className="flex items-center justify-between">
                        <div>
                            <h4 className="font-semibold text-default-font">{selectedRepo.full_name}</h4>
                            {selectedRepo.description && (
                                <p className="text-sm text-neutral-600">{selectedRepo.description}</p>
                            )}
                        </div>
                        <Button
                            variant="neutral-tertiary"
                            size="small"
                            onClick={() => handleRepositorySelect(null as any)}
                        >
                            Change
                        </Button>
                    </div>
                </div>
            )}

            {/* Repository List */}
            <div className="space-y-3 max-h-96 overflow-y-auto">
                {filteredRepos.length === 0 ? (
                    <div className="text-center py-8">
                        <FeatherGitBranch className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
                        <p className="text-neutral-600">
                            {searchQuery ? 'No repositories match your search' : 'No repositories found'}
                        </p>
                    </div>
                ) : (
                    filteredRepos.map((repo) => (
                        <div
                            key={repo.id}
                            className={`p-4 cursor-pointer transition-all duration-200 hover:shadow-md rounded-lg border ${
                                selectedRepo?.id === repo.id 
                                    ? 'ring-2 ring-brand-500 bg-brand-50/50 border-brand-200' 
                                    : 'hover:bg-neutral-50/50 border-neutral-200'
                            }`}
                            onClick={() => handleRepositorySelect(repo)}
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        {getProviderIcon(repo.provider)}
                                        <h3 className="font-semibold text-default-font">{repo.full_name}</h3>
                                        {repo.private && (
                                            <Badge variant="neutral">Private</Badge>
                                        )}
                                    </div>
                                    
                                    {repo.description && (
                                        <p className="text-sm text-neutral-600 mb-3">{repo.description}</p>
                                    )}
                                    
                                    <div className="flex items-center gap-4 text-xs text-neutral-500">
                                        {repo.language && (
                                            <span className="flex items-center gap-1">
                                                <div className="w-2 h-2 rounded-full bg-brand-500"></div>
                                                {repo.language}
                                            </span>
                                        )}
                                        {repo.stars && (
                                            <span>{repo.stars} stars</span>
                                        )}
                                        <span>Updated {formatDate(repo.updated_at)}</span>
                                    </div>
                                </div>
                                
                                <Button
                                    variant="neutral-tertiary"
                                    size="small"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        window.open(repo.url, '_blank')
                                    }}
                                >
                                    <FeatherExternalLink className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Help Text */}
            <div className="text-center text-sm text-neutral-500">
                Don't see your repository? Make sure it's connected in your{' '}
                <Button variant="neutral-tertiary" size="small">
                    integration settings
                </Button>
            </div>
        </div>
    )
}