"use client"

/**
 * LinearIssuePreview
 *
 * Lightweight preview of issues that match the selected teams, projects and filters.
 * Helps users validate the data set before AI generation.
 */
import { useEffect, useState } from "react"

interface LinearIssuePreviewProps {
  teams: string[]
  projects: string[]
  dateRange: { from: string, to: string }
  filters: { stateTypes: string[], labels: string[], minPriority: number }
  onSelectChange?: (identifiers: string[]) => void
}

export default function LinearIssuePreview({ teams, projects, dateRange, filters, onSelectChange }: LinearIssuePreviewProps) {
  const [issues, setIssues] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Record<string, boolean>>({} as Record<string, boolean>)

  useEffect(() => {
    if (teams.length > 0) {
      void loadIssues()
    } else {
      setIssues([])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teams.join(','), projects.join(','), dateRange.from, dateRange.to, filters.stateTypes.join(','), filters.labels.join(','), String(filters.minPriority)])

  const loadIssues = async () => {
    try {
      setLoading(true)
      setError(null)
      // For now we reuse existing issues API and filter client-side by date/priority as needed
      const params = new URLSearchParams()
      params.set('first', '50')
      // Note: backend supports teamId, so preview will loop through teams sequentially for now
      const all: any[] = []
      for (const teamId of teams) {
        params.set('teamId', teamId)
        const res = await fetch(`/api/integrations/linear/issues?${params.toString()}`)
        if (!res.ok) continue
        const json = await res.json()
        all.push(...(json.issues || []))
      }
      const filtered = all.filter((it: any) => {
        const completed = it.completedAt ? new Date(it.completedAt).toISOString().slice(0,10) : null
        const inRange = completed ? (completed >= dateRange.from && completed <= dateRange.to) : true
        const byState = filters.stateTypes.length === 0 || (it.state?.type && filters.stateTypes.includes(String(it.state.type)))
        const byPriority = (it.priority ?? 0) >= (filters.minPriority ?? 0)
        // Basic label match
        const byLabels = filters.labels.length === 0 || (it.labels || []).some((l: any) => filters.labels.includes(l.name))
        // Projects optional filter (if provided via future API)
        const byProject = projects.length === 0 || (it.project ? projects.includes(it.project.id) : false)
        return inRange && byState && byPriority && byLabels && byProject
      })
      setIssues(filtered)
      // Default-select all issues on load
      const nextSelected: Record<string, boolean> = {}
      for (const it of filtered) {
        nextSelected[it.identifier || it.id] = true
      }
      setSelected(nextSelected)
      if (onSelectChange) {
        onSelectChange(Object.keys(nextSelected))
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
      setIssues([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-default-font">Preview Issues ({issues.length})</h3>
      {issues.length > 0 && (
        <div className="flex items-center gap-3 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={Object.values(selected).length > 0 && Object.values(selected).every(Boolean)}
              onChange={(e) => {
                const checked = e.target.checked
                const next: Record<string, boolean> = {}
                if (checked) {
                  for (const it of issues) {
                    next[it.identifier || it.id] = true
                  }
                }
                setSelected(next)
                if (onSelectChange) {
                  onSelectChange(Object.keys(next))
                }
              }}
            />
            <span>Select all</span>
          </label>
          <span className="text-neutral-500">Selected: {Object.values(selected).filter(Boolean).length}</span>
        </div>
      )}
      {loading && <div className="text-neutral-600 text-sm">Loading issues…</div>}
      {error && <div className="text-red-600 text-sm">{error}</div>}
      {!loading && !error && (
        <div className="space-y-2 max-h-96 overflow-y-auto border border-neutral-200 rounded-lg p-4">
          {issues.map(issue => {
            const key: string = String(issue.identifier || issue.id)
            const isChecked = !!selected[key as keyof typeof selected]
            return (
              <label key={issue.id} className="p-3 border border-neutral-100 rounded-lg flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={(e) => {
                    const next: Record<string, boolean> = { ...selected, [key]: e.target.checked }
                    if (!e.target.checked) delete next[key as keyof typeof next]
                    setSelected(next)
                    if (onSelectChange) {
                      onSelectChange(Object.keys(next))
                    }
                  }}
                  className="mt-1"
                />
                <div>
                  <div className="font-medium text-default-font">{issue.title}</div>
                  <div className="flex items-center gap-4 text-xs text-neutral-500 mt-1">
                    <span>{issue.identifier}</span>
                    {issue.team?.name && <span>{issue.team.name}</span>}
                    {issue.state?.name && <span>{issue.state.name}</span>}
                    {issue.completedAt && <span>{new Date(issue.completedAt).toLocaleDateString()}</span>}
                  </div>
                </div>
              </label>
            )
          })}
          {issues.length === 0 && (
            <div className="text-neutral-600 text-sm">No matching issues found. Adjust filters or date range.</div>
          )}
        </div>
      )}
    </div>
  )
}


