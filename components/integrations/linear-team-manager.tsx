'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  SearchIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  UsersIcon,
  ExternalLinkIcon,
  FolderIcon,
  RefreshCwIcon
} from 'lucide-react'
import { useAuthStore } from '@/lib/store'

interface LinearTeam {
  id: string
  name: string
  key: string
  description?: string
  color: string
  icon?: string
  private: boolean
  issueCount: number
  activeCycleCount: number
  createdAt: string
  updatedAt: string
  organization: {
    id: string
    name: string
  }
}

interface LinearTeamManagerProps {
  selectedTeams: string[]
  onTeamSelect: (teamIds: string[]) => void
  selectionMode?: 'single' | 'multiple'
}

export function LinearTeamManager({ 
  selectedTeams, 
  onTeamSelect, 
  selectionMode = 'multiple' 
}: LinearTeamManagerProps) {
  const [teams, setTeams] = useState<LinearTeam[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  
  const user = useAuthStore((state) => state.user)

  useEffect(() => {
    if (user) {
      loadTeams()
    }
  }, [user])

  const loadTeams = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/integrations/linear/teams')
      
      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        throw new Error(body?.error || body?.message || `Failed to fetch teams: ${response.statusText}`)
      }

      const data = await response.json()
      setTeams(data.teams || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load teams')
      setTeams([])
    } finally {
      setLoading(false)
    }
  }

  const handleTeamToggle = (teamId: string) => {
    if (selectionMode === 'single') {
      onTeamSelect([teamId])
    } else {
      const isSelected = selectedTeams.includes(teamId)
      if (isSelected) {
        onTeamSelect(selectedTeams.filter(id => id !== teamId))
      } else {
        onTeamSelect([...selectedTeams, teamId])
      }
    }
  }

  const filteredTeams = teams.filter(team =>
    team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    team.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
    team.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading && teams.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-neutral-600">
        <RefreshCwIcon className="h-6 w-6 animate-spin mr-3" />
        <span>Loading Linear teams...</span>
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold text-neutral-900">
          Team Selection
        </CardTitle>
        <CardDescription>
          {selectionMode === 'single' 
            ? 'Choose one team for release notes'
            : 'Select teams you want to include in release notes'}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Search */}
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search teams by name, key, or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Selection Summary */}
        {selectedTeams.length > 0 && (
          <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
            <CheckCircleIcon className="w-5 h-5 text-blue-600" />
            <span className="text-sm text-neutral-900">
              {selectedTeams.length} team{selectedTeams.length !== 1 ? 's' : ''} selected
            </span>
            <button
              onClick={() => onTeamSelect([])}
              className="ml-auto text-sm text-blue-600 hover:text-blue-800"
            >
              Clear all
            </button>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg">
            <AlertCircleIcon className="w-5 h-5 text-red-600" />
            <span className="text-sm text-red-800">{error}</span>
            <button
              onClick={loadTeams}
              className="ml-auto text-sm text-red-600 hover:text-red-800"
            >
              Retry
            </button>
          </div>
        )}

        {/* Teams List */}
        <div className="grid grid-cols-1 gap-3">
          {filteredTeams.map((team) => {
            const isSelected = selectedTeams.includes(team.id)

            return (
              <div
                key={team.id}
                className={`flex items-start justify-between p-4 rounded-lg border cursor-pointer transition-all ${
                  isSelected 
                    ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-200' 
                    : 'border-neutral-200 hover:bg-neutral-50'
                }`}
                onClick={() => handleTeamToggle(team.id)}
              >
                <div className="flex items-start gap-3 flex-1">
                  {selectionMode === 'multiple' && (
                    <Checkbox checked={isSelected} onChange={() => {}} className="mt-1" />
                  )}

                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold text-white"
                      style={{ backgroundColor: team.color }}
                    >
                      {team.icon || team.key.substring(0, 2).toUpperCase()}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-neutral-900">{team.name}</h3>
                        <Badge variant="outline" className="text-xs">{team.key}</Badge>
                        {team.private && (
                          <Badge variant="outline" className="text-xs text-orange-600">
                            Private
                          </Badge>
                        )}
                      </div>

                      {team.description && (
                        <p className="text-sm text-neutral-600 mb-2 line-clamp-2">
                          {team.description}
                        </p>
                      )}

                      <div className="flex items-center gap-4 text-xs text-neutral-500">
                        <div className="flex items-center gap-1">
                          <FolderIcon className="w-3 h-3" />
                          <span>{team.issueCount} issues</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <UsersIcon className="w-3 h-3" />
                          <span>{team.activeCycleCount} active cycles</span>
                        </div>
                        <span>Created {new Date(team.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    const orgUrlKey = team.organization?.id || 'linear'
                    window.open(`https://linear.app/${orgUrlKey}/team/${team.key}`, '_blank')
                  }}
                  className="text-neutral-500 hover:text-neutral-700"
                >
                  <ExternalLinkIcon className="w-4 h-4" />
                </button>
              </div>
            )
          })}

          {filteredTeams.length === 0 && !loading && !error && (
            <div className="text-center py-10 text-neutral-500">
              <UsersIcon className="w-10 h-10 mx-auto mb-3" />
              <h3 className="text-base font-medium text-neutral-900">
                {searchTerm ? 'No teams found' : 'No teams available'}
              </h3>
              <p className="text-sm">
                {searchTerm 
                  ? 'Try adjusting your search terms'
                  : 'No teams are available in this Linear workspace'}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
