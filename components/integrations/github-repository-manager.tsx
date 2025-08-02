'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import Link from 'next/link'
import { 
  SearchIcon, 
  StarIcon, 
  GitBranchIcon,
  CalendarIcon,
  ExternalLinkIcon,
  RefreshCwIcon,
  CheckCircleIcon,
  WandIcon,
  SettingsIcon,
  BookOpenIcon
} from 'lucide-react'
import { cn } from '@/lib/utils'

export interface Repository {
  id: number
  name: string
  full_name: string
  description?: string
  private: boolean
  html_url: string
  default_branch: string
  language?: string
  stargazers_count: number
  updated_at: string
  topics: string[]
  open_issues_count: number
  has_issues: boolean
  archived: boolean
  disabled: boolean
  size: number
  fork: boolean
  owner: {
    login: string
    avatar_url: string
    type: string
  }
}

interface RepositoryManagerProps {
  className?: string
  onRepositorySelect?: ((repository: Repository | Repository[]) => void) | React.Dispatch<React.SetStateAction<Repository[]>>
  selectedRepositories?: Repository[]
  selectionMode?: 'single' | 'multiple'
}

interface GitHubConnection {
  connected: boolean
  username?: string
  avatar_url?: string
  public_repos?: number
  total_private_repos?: number
  owned_private_repos?: number
  scopes?: string[]
  rate_limit?: {
    limit: number
    remaining: number
    reset: number
  }
}

export function GitHubRepositoryManager({ 
  className, 
  onRepositorySelect, 
  selectedRepositories = [],
  selectionMode = 'multiple'
}: RepositoryManagerProps) {
  const [repositories, setRepositories] = useState<Repository[]>([])
  const [filteredRepos, setFilteredRepos] = useState<Repository[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterBy, setFilterBy] = useState<'all' | 'owned' | 'starred' | 'recent'>('all')
  const [connection, setConnection] = useState<GitHubConnection>({ connected: false })
  const [refreshing, setRefreshing] = useState(false)

  const loadRepositories = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/integrations/github/repositories')
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('GitHub connection expired. Please reconnect.')
        }
        throw new Error(`Failed to load repositories: ${response.statusText}`)
      }
      
      const data = await response.json()
      setRepositories(data.repositories || [])
      setConnection({
        connected: true,
        username: data.user?.login,
        avatar_url: data.user?.avatar_url,
        public_repos: data.user?.public_repos,
        total_private_repos: data.user?.total_private_repos,
        owned_private_repos: data.user?.owned_private_repos,
        rate_limit: data.rate_limit
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load repositories')
      setConnection({ connected: false })
    } finally {
      setLoading(false)
    }
  }, [])

  const refreshRepositories = useCallback(async () => {
    setRefreshing(true)
    await loadRepositories()
    setRefreshing(false)
  }, [loadRepositories])

  useEffect(() => {
    loadRepositories()
  }, [loadRepositories])

  useEffect(() => {
    let filtered = repositories

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(repo => 
        repo.name.toLowerCase().includes(query) ||
        repo.full_name.toLowerCase().includes(query) ||
        repo.description?.toLowerCase().includes(query) ||
        repo.language?.toLowerCase().includes(query) ||
        repo.topics.some(topic => topic.toLowerCase().includes(query))
      )
    }

    // Apply category filter
    switch (filterBy) {
      case 'owned':
        filtered = filtered.filter(repo => !repo.fork)
        break
      case 'starred':
        filtered = filtered.filter(repo => repo.stargazers_count > 0)
        break
      case 'recent':
        filtered = filtered.sort((a, b) => 
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        ).slice(0, 20)
        break
    }

    setFilteredRepos(filtered)
  }, [repositories, searchQuery, filterBy])

  const handleRepositoryToggle = useCallback((repository: Repository) => {
    if (!onRepositorySelect) return

    if (selectionMode === 'single') {
      onRepositorySelect(repository)
      return
    }

    // Multiple selection mode
    const isSelected = selectedRepositories.some(repo => repo.id === repository.id)
    if (isSelected) {
      // Remove from selection
      const updatedSelection = selectedRepositories.filter(repo => repo.id !== repository.id)
      onRepositorySelect(updatedSelection)
    } else {
      // Add to selection
      const updatedSelection = [...selectedRepositories, repository]
      onRepositorySelect(updatedSelection)
    }
  }, [onRepositorySelect, selectedRepositories, selectionMode])

  const isRepositorySelected = useCallback((repository: Repository) => {
    return selectedRepositories.some(repo => repo.id === repository.id)
  }, [selectedRepositories])

  const getLanguageColor = (language?: string) => {
    const colors: Record<string, string> = {
      JavaScript: 'bg-yellow-100 text-yellow-800',
      TypeScript: 'bg-blue-100 text-blue-800',
      Python: 'bg-green-100 text-green-800',
      Java: 'bg-red-100 text-red-800',
      'C#': 'bg-purple-100 text-purple-800',
      Go: 'bg-cyan-100 text-cyan-800',
      Rust: 'bg-orange-100 text-orange-800',
      Ruby: 'bg-red-100 text-red-800',
      PHP: 'bg-indigo-100 text-indigo-800'
    }
    return colors[language || ''] || 'bg-gray-100 text-gray-800'
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`
    return `${Math.floor(diffDays / 365)} years ago`
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <RefreshCwIcon className="w-8 h-8 animate-spin mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600">Loading repositories...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <div className="text-red-600 mb-4">
              <p className="font-medium">Connection Error</p>
              <p className="text-sm text-gray-600 mt-2">{error}</p>
            </div>
            <Button onClick={refreshRepositories} variant="outline">
              <RefreshCwIcon className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Connection Status */}
      {connection.connected && (
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {connection.avatar_url && (
                  <img 
                    src={connection.avatar_url} 
                    alt={connection.username}
                    className="w-10 h-10 rounded-full"
                  />
                )}
                                 <div>
                   <CardTitle className="text-lg text-neutral-900">
                     Connected as @{connection.username}
                   </CardTitle>
                   <CardDescription className="text-neutral-700">
                     {connection.public_repos} public • {connection.total_private_repos} private repositories
                   </CardDescription>
                 </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-green-100 text-green-800">
                  <CheckCircleIcon className="w-3 h-3 mr-1" />
                  Connected
                </Badge>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={refreshRepositories}
                  disabled={refreshing}
                >
                  <RefreshCwIcon className={cn("w-4 h-4", refreshing && "animate-spin")} />
                </Button>
              </div>
            </div>
          </CardHeader>

                     {connection.rate_limit && (
             <CardContent className="pt-0">
               <div className="text-xs text-neutral-700">
                 API Rate Limit: {connection.rate_limit.remaining}/{connection.rate_limit.limit} remaining
                 {connection.rate_limit.remaining < 100 && (
                   <span className="text-orange-600 ml-2">⚠️ Low remaining requests</span>
                 )}
               </div>
             </CardContent>
           )}
        </Card>
      )}

      {/* Repository Management */}
      <Card>
                 <CardHeader>
           <div className="flex items-center justify-between">
             <div>
               <CardTitle className="text-neutral-900">Repository Selection</CardTitle>
               <CardDescription className="text-neutral-700">
                 Choose repositories to generate release notes from
                 {selectedRepositories.length > 0 && (
                   <span className="ml-2 text-blue-600">
                     ({selectedRepositories.length} selected)
                   </span>
                 )}
               </CardDescription>
             </div>
           </div>
         </CardHeader>

        <CardContent className="space-y-4">
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
                         <div className="relative flex-1">
               <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-500" />
               <Input
                 placeholder="Search repositories..."
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 className="pl-10"
               />
             </div>
                         <Tabs value={filterBy} onValueChange={(value) => setFilterBy(value as any)}>
               <TabsList className="grid w-full grid-cols-4">
                 <TabsTrigger value="all" className="text-xs text-neutral-700 hover:text-neutral-900">All</TabsTrigger>
                 <TabsTrigger value="owned" className="text-xs text-neutral-700 hover:text-neutral-900">Owned</TabsTrigger>
                 <TabsTrigger value="starred" className="text-xs text-neutral-700 hover:text-neutral-900">Popular</TabsTrigger>
                 <TabsTrigger value="recent" className="text-xs text-neutral-700 hover:text-neutral-900">Recent</TabsTrigger>
               </TabsList>
             </Tabs>
          </div>

          {/* Repository List */}
          <div className="space-y-3 max-h-96 overflow-y-auto">
                         {filteredRepos.length === 0 ? (
               <div className="text-center py-8">
                 <BookOpenIcon className="w-12 h-12 text-neutral-500 mx-auto mb-4" />
                 <p className="text-neutral-700">
                   {searchQuery ? 'No repositories match your search' : 'No repositories found'}
                 </p>
               </div>
            ) : (
              filteredRepos.map((repo) => (
                <div
                  key={repo.id}
                  className={cn(
                    "border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md",
                    isRepositorySelected(repo) 
                      ? "border-blue-500 bg-blue-50" 
                      : "border-gray-200 hover:border-gray-300"
                  )}
                  onClick={() => handleRepositoryToggle(repo)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                                             <div className="flex items-center gap-2 mb-2">
                         <h4 className="font-medium text-neutral-900 truncate">
                           {repo.name}
                         </h4>
                         {repo.private && (
                           <Badge variant="outline" className="text-xs text-neutral-700">Private</Badge>
                         )}
                         {repo.fork && (
                           <Badge variant="outline" className="text-xs text-neutral-700">Fork</Badge>
                         )}
                         {repo.archived && (
                           <Badge variant="outline" className="text-xs text-orange-600">Archived</Badge>
                         )}
                       </div>
                      
                                             {repo.description && (
                         <p className="text-sm text-neutral-700 mb-2 line-clamp-2">
                           {repo.description}
                         </p>
                       )}
                      
                                             <div className="flex items-center gap-4 text-xs text-neutral-600">
                        {repo.language && (
                          <Badge className={cn("text-xs", getLanguageColor(repo.language))}>
                            {repo.language}
                          </Badge>
                        )}
                        <div className="flex items-center gap-1">
                          <StarIcon className="w-3 h-3" />
                          {repo.stargazers_count}
                        </div>
                        <div className="flex items-center gap-1">
                          <GitBranchIcon className="w-3 h-3" />
                          {repo.default_branch}
                        </div>
                        <div className="flex items-center gap-1">
                          <CalendarIcon className="w-3 h-3" />
                          {formatDate(repo.updated_at)}
                        </div>
                      </div>

                                             {repo.topics.length > 0 && (
                         <div className="flex flex-wrap gap-1 mt-2">
                           {repo.topics.slice(0, 3).map((topic) => (
                             <Badge key={topic} variant="outline" className="text-xs text-neutral-700">
                               {topic}
                             </Badge>
                           ))}
                           {repo.topics.length > 3 && (
                             <Badge variant="outline" className="text-xs text-neutral-700">
                               +{repo.topics.length - 3} more
                             </Badge>
                           )}
                         </div>
                       )}
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                      >
                        <a 
                          href={repo.html_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLinkIcon className="w-4 h-4" />
                        </a>
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

                     {/* Summary */}
           {selectedRepositories.length > 0 && (
             <div className="border-t pt-4">
               <div className="flex items-center justify-between">
                 <div className="text-sm text-neutral-700">
                   {selectedRepositories.length} repository(ies) selected
                 </div>
                 <Link href="/dashboard/releases/new/ai">
                   <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                     <WandIcon className="w-4 h-4 mr-2" />
                     Generate Release Notes
                   </Button>
                 </Link>
               </div>
             </div>
           )}
        </CardContent>
      </Card>
    </div>
  )
}