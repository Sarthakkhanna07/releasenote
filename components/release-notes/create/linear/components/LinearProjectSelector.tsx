"use client"

/**
 * LinearProjectSelector
 *
 * Professional, minimal selector for Linear projects scoped by selected teams.
 * Fetches projects via our Linear projects API and allows multi-select.
 */
import { useEffect, useState } from "react"
import { FolderIcon } from "lucide-react"
import { Badge } from "@/components/subframe-ui/ui/components/Badge"

interface LinearProjectSelectorProps {
  selectedProjects: string[]
  onProjectSelect: (projectIds: string[]) => void
  selectedTeams: string[]
}

export default function LinearProjectSelector({ selectedProjects, onProjectSelect, selectedTeams }: LinearProjectSelectorProps) {
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (selectedTeams.length > 0) {
      void loadProjects()
    } else {
      setProjects([])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTeams.join(',')])

  const loadProjects = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/integrations/linear/projects')
      if (!res.ok) throw new Error('Failed to fetch projects')
      const json = await res.json()
      // API returns all projects; show them without team filtering for now
      setProjects(json.projects || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
      setProjects([])
    } finally {
      setLoading(false)
    }
  }

  const toggle = (id: string) => {
    if (selectedProjects.includes(id)) {
      onProjectSelect(selectedProjects.filter(p => p !== id))
    } else {
      onProjectSelect([...selectedProjects, id])
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <FolderIcon className="w-4 h-4 text-neutral-700" />
        <h3 className="text-lg font-semibold text-default-font">Select Projects (Optional)</h3>
        <Badge variant="neutral">{projects.length}</Badge>
      </div>
      {loading && (
        <div className="text-neutral-600 text-sm">Loading projects…</div>
      )}
      {error && (
        <div className="text-red-600 text-sm">{error}</div>
      )}
      {!loading && !error && (
        <div className="space-y-2">
          {projects.map((p) => (
            <label key={p.id} className="flex items-center gap-3 p-3 hover:bg-neutral-50 cursor-pointer border border-neutral-200 rounded-lg">
              <input
                type="checkbox"
                checked={selectedProjects.includes(p.id)}
                onChange={() => toggle(p.id)}
                className="w-4 h-4 text-brand-600 rounded"
              />
              <div className="flex-1">
                <div className="font-medium text-default-font">{p.name}</div>
                {p.description && (
                  <div className="text-sm text-neutral-600">{p.description}</div>
                )}
              </div>
              {p.state && (
                <Badge variant="neutral">{p.state}</Badge>
              )}
            </label>
          ))}
          {projects.length === 0 && (
            <div className="text-neutral-600 text-sm">No projects found for selected teams.</div>
          )}
        </div>
      )}
    </div>
  )
}


