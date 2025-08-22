"use client"

/**
 * DataSourceSelector (Linear)
 *
 * Purpose: Configure which Linear data to analyze for release notes.
 * Includes: date range, basic filters, and an inline issue preview for validation.
 */
import { useEffect, useState } from "react"
import { TextField } from "@/components/subframe-ui/ui/components/TextField"
import { Badge } from "@/components/subframe-ui/ui/components/Badge"
import LinearIssuePreview from "./components/LinearIssuePreview"

interface DataSourceSelectorProps {
  data: any
  onUpdate: (data: any) => void
}

export default function LinearDataSourceSelector({ data, onUpdate }: DataSourceSelectorProps) {
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  })
  const [filters, setFilters] = useState({
    stateTypes: ['completed'] as string[],
    labels: [] as string[],
    minPriority: 0
  })
  const [selectedIssueIds, setSelectedIssueIds] = useState<string[]>([])

  useEffect(() => {
    onUpdate({
      dataSources: {
        platform: 'linear',
        teams: data.workspace?.teams || [],
        dateRange,
        issueFilters: filters,
        selectedIssues: selectedIssueIds
      }
    })
  }, [data.workspace, dateRange, filters, selectedIssueIds, onUpdate])

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-semibold text-default-font">Select Linear Data</h3>
        <Badge variant="neutral">Teams: {(data.workspace?.teams || []).length}</Badge>
      </div>

      <div className="p-4 rounded-lg border border-neutral-200">
        <div className="grid grid-cols-2 gap-4">
          <TextField label="From" helpText="">
            <TextField.Input
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
            />
          </TextField>
          <TextField label="To" helpText="">
            <TextField.Input
              type="date"
              value={dateRange.to}
              onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
            />
          </TextField>
        </div>
      </div>

      <div className="p-4 rounded-lg border border-neutral-200">
        <div className="grid grid-cols-3 gap-4">
          <TextField label="State Types (comma-separated)" helpText="e.g., completed, started">
            <TextField.Input
              value={filters.stateTypes.join(',')}
              onChange={(e) => setFilters(prev => ({ ...prev, stateTypes: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))}
            />
          </TextField>
          <TextField label="Labels (comma-separated)" helpText="optional">
            <TextField.Input
              value={filters.labels.join(',')}
              onChange={(e) => setFilters(prev => ({ ...prev, labels: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))}
            />
          </TextField>
          <TextField label="Minimum Priority" helpText="0-5">
            <TextField.Input
              type="number"
              min={0}
              max={5}
              value={String(filters.minPriority)}
              onChange={(e) => setFilters(prev => ({ ...prev, minPriority: Number(e.target.value || 0) }))}
            />
          </TextField>
        </div>
      </div>

      {/* Inline preview of issues to validate selection before generation */}
      <LinearIssuePreview
        teams={data.workspace?.teams || []}
        projects={data.workspace?.projects || []}
        dateRange={dateRange}
        filters={filters}
        onSelectChange={setSelectedIssueIds}
      />
    </div>
  )
}


