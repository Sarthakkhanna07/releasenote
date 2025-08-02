"use client"

import { useState, useEffect } from "react"
import { TextField } from "@/components/subframe-ui/ui/components/TextField"
import { Badge } from "@/components/subframe-ui/ui/components/Badge"
import { Button } from "@/components/subframe-ui/ui/components/Button"
import { FeatherSearch, FeatherGitBranch, FeatherGithub, FeatherGitlab, FeatherExternalLink, FeatherLoader, FeatherAlertCircle, FeatherAlertTriangle, FeatherSettings, FeatherCheck } from "@subframe/core"
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import Link from "next/link"

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
    const [githubConnection, setGithubConnection] = useState<{
        connected: boolean
        username?: string
        avatar_url?: string
        public_repos?: number
        total_private_repos?: number
    } | null>(null)
    const [checkingConnection, setCheckingConnection] = useState(true)
    
    const supabase = createClientComponentClient()

    useEffect(() => {
        checkGitHubConnection()
    }, [])

    const checkGitHubConnection = async () => {
        try {
            setCheckingConnection(true)
            const { data: { session } } = await supabase.auth.getSession()
            
            if (!session?.user) {
                setGithubConnection({ connected: false })
                return
            }

            // Check if GitHub integration exists
            const { data: integration } = await supabase
                .from('integrations')
                .select('*')
                .eq('type', 'github')
                .eq('organization_id', session.user.id)
                .single()

            if (!integration) {
                setGithubConnection({ connected: false })
                return
            }

            // Test the connection by fetching user info
            const response = await fetch('/api/integrations/github/repositories')
            if (response.ok) {
                const data = await response.json()
                setGithubConnection({
                    connected: true,
                    username: data.user?.login,
                    avatar_url: data.user?.avatar_url,
                    public_repos: data.user?.public_repos,
                    total_private_repos: data.user?.total_private_repos
                })
                // If connected, fetch repositories immediately
                await fetchRepositories()
            } else {
                setGithubConnection({ connected: false })
            }
        } catch (error) {
            console.error('Error checking GitHub connection:', error)
            setGithubConnection({ connected: false })
        } finally {
            setCheckingConnection(false)
        }
    }



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
            
            // Use the updated GitHub repositories API
            const response = await fetch('/api/integrations/github/repositories')
            
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

    // Show loading while checking connection
    if (checkingConnection) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-center">
                    <FeatherLoader className="w-8 h-8 animate-spin text-brand-600 mx-auto mb-4" />
                    <p className="text-neutral-600">Checking GitHub connection...</p>
                </div>
            </div>
        )
    }

    // Show GitHub connection required message
    if (!githubConnection?.connected) {
        return (
            <div className="text-center py-12">
                <FeatherAlertTriangle className="w-12 h-12 text-orange-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-default-font mb-2">GitHub Connection Required</h3>
                <p className="text-neutral-600 mb-6 max-w-md mx-auto">
                    To generate AI-powered release notes, you need to connect your GitHub account first. 
                    This allows us to access your repositories and analyze your code changes.
                </p>
                <div className="flex items-center justify-center gap-3">
                    <Link href="/dashboard/integrations">
                        <Button variant="brand-primary">
                            Connect GitHub Account
                        </Button>
                    </Link>
                </div>
            </div>
        )
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
            {/* GitHub Connection Status */}
            <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-3">
                    {githubConnection.avatar_url && (
                        <img 
                            src={githubConnection.avatar_url} 
                            alt={githubConnection.username}
                            className="w-8 h-8 rounded-full"
                        />
                    )}
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-neutral-900">
                            Connected as @{githubConnection.username}
                        </span>
                        <Badge variant="success">
                            <FeatherCheck className="w-3 h-3 mr-1" />
                            GitHub Ready
                        </Badge>
                    </div>
                    <span className="text-xs text-neutral-500">
                        {githubConnection.public_repos} public • {githubConnection.total_private_repos} private repositories
                    </span>
                </div>
                <Link href="/dashboard/integrations">
                    <Button variant="neutral-tertiary" size="small" icon={<FeatherSettings />}>
                        Manage
                    </Button>
                </Link>
            </div>

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
                <Link href="/dashboard/integrations/manage">
                    <Button variant="neutral-tertiary" size="small">
                        integration settings
                    </Button>
                </Link>
            </div>
        </div>
    )
}