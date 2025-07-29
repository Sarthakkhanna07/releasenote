"use client"

import { useState, useEffect, useCallback } from "react"
import { TextField } from "@/components/subframe-ui/ui/components/TextField"
import { Button } from "@/components/subframe-ui/ui/components/Button"
import { Badge } from "@/components/subframe-ui/ui/components/Badge"
import { FeatherGitCommit, FeatherCalendar, FeatherCheck, FeatherLoader, FeatherUser, FeatherClock } from "@subframe/core"

interface Commit {
    sha: string
    message: string
    author: {
        name: string
        email: string
        date: string
    }
    url: string
}

interface DataSourceOptions {
    dateRange: {
        from: string
        to: string
    }
    branch?: string
    selectedCommits: string[]
    additionalChanges?: string
}

interface DataSourceSelectorProps {
    data: any
    onUpdate: (data: any) => void
}

export default function DataSourceSelector({ data, onUpdate }: DataSourceSelectorProps) {
    const [options, setOptions] = useState<DataSourceOptions>({
        dateRange: {
            from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
            to: new Date().toISOString().split('T')[0] // today
        },
        branch: 'main',
        selectedCommits: [],
        additionalChanges: '',
        ...data.dataSources
    })

    const [commits, setCommits] = useState<Commit[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        onUpdate({ dataSources: options })
    }, [options, onUpdate])

    const fetchCommits = useCallback(async () => {
        if (!data?.repository) return

        setLoading(true)
        setError(null)

        try {
            const [owner, repo] = data.repository.full_name.split('/')
            const commitsParams = new URLSearchParams({
                owner,
                repo,
                since: options.dateRange.from,
                until: options.dateRange.to
            })
            if (options.branch) commitsParams.set('sha', options.branch)

            const response = await fetch(`/api/github/commits?${commitsParams}`)

            if (!response.ok) {
                throw new Error('Failed to fetch commits')
            }

            const responseData = await response.json()
            setCommits(responseData.commits || [])
            console.log(`✅ Loaded ${responseData.commits?.length || 0} commits from GitHub`)

        } catch (error) {
            console.error('Commits fetch error:', error)
            setError(error instanceof Error ? error.message : 'Failed to load commits')
            setCommits([])
        } finally {
            setLoading(false)
        }
    }, [data?.repository, options.dateRange.from, options.dateRange.to, options.branch])

    useEffect(() => {
        if (data?.repository) {
            fetchCommits()
        }
    }, [data?.repository, fetchCommits])

    const updateOptions = (updates: Partial<DataSourceOptions>) => {
        setOptions(prev => ({ ...prev, ...updates }))
    }

    const toggleCommit = (sha: string) => {
        const newSelected = options.selectedCommits.includes(sha)
            ? options.selectedCommits.filter(s => s !== sha)
            : [...options.selectedCommits, sha]
        updateOptions({ selectedCommits: newSelected })
    }

    const selectAllCommits = () => {
        updateOptions({ selectedCommits: commits.map(c => c.sha) })
    }

    const selectNoneCommits = () => {
        updateOptions({ selectedCommits: [] })
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    const hasValidSelection = options.selectedCommits.length > 0 || options.additionalChanges?.trim()
    const hasValidDateRange = options.dateRange.from && options.dateRange.to

    return (
        <div className="space-y-6">
            {/* Repository Info */}
            {data.repository && (
                <div className="flex items-center gap-3 p-4 bg-neutral-50 rounded-lg">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <div>
                        <p className="font-medium text-default-font">{data.repository.full_name}</p>
                        <p className="text-sm text-neutral-600">Analyzing data from this repository</p>
                    </div>
                </div>
            )}

            {/* Commits Selection */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <FeatherGitCommit className="w-5 h-5 text-brand-600" />
                        <h3 className="text-lg font-semibold text-default-font">Select Commits</h3>
                        <Badge variant="neutral">{commits.length} found</Badge>
                    </div>
                    {commits.length > 0 && (
                        <div className="flex items-center gap-2">
                            <Button
                                variant="neutral-tertiary"
                                size="small"
                                onClick={selectAllCommits}
                            >
                                Select All
                            </Button>
                            <Button
                                variant="neutral-tertiary"
                                size="small"
                                onClick={selectNoneCommits}
                            >
                                Select None
                            </Button>
                        </div>
                    )}
                </div>

                {loading && (
                    <div className="flex items-center justify-center py-8">
                        <div className="flex items-center gap-2">
                            <FeatherLoader className="w-5 h-5 animate-spin text-brand-600" />
                            <span className="text-neutral-600">Loading commits from GitHub...</span>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-red-600 text-sm">{error}</p>
                        <Button
                            variant="neutral-secondary"
                            size="small"
                            onClick={fetchCommits}
                            className="mt-2"
                        >
                            Retry
                        </Button>
                    </div>
                )}

                {!loading && !error && commits.length === 0 && (
                    <div className="text-center py-8">
                        <FeatherGitCommit className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
                        <p className="text-neutral-600">No commits found in the selected date range</p>
                        <p className="text-sm text-neutral-500 mt-1">Try adjusting the date range or branch</p>
                    </div>
                )}

                {!loading && !error && commits.length > 0 && (
                    <div className="space-y-2 max-h-96 overflow-y-auto border border-neutral-200 rounded-lg">
                        {commits.map((commit) => (
                            <label
                                key={commit.sha}
                                className="flex items-start gap-3 p-3 hover:bg-neutral-50 cursor-pointer border-b border-neutral-100 last:border-b-0"
                            >
                                <input
                                    type="checkbox"
                                    checked={options.selectedCommits.includes(commit.sha)}
                                    onChange={() => toggleCommit(commit.sha)}
                                    className="w-4 h-4 text-brand-600 rounded mt-1"
                                />
                                <div className="flex-1 min-w-0">
                                    <div className="font-medium text-default-font text-sm mb-1">
                                        {commit.message.split('\n')[0]}
                                    </div>
                                    <div className="flex items-center gap-4 text-xs text-neutral-500">
                                        <div className="flex items-center gap-1">
                                            <FeatherUser className="w-3 h-3" />
                                            {commit.author.name}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <FeatherClock className="w-3 h-3" />
                                            {formatDate(commit.author.date)}
                                        </div>
                                        <div className="font-mono text-neutral-400">
                                            {commit.sha.substring(0, 7)}
                                        </div>
                                    </div>
                                </div>
                            </label>
                        ))}
                    </div>
                )}

                {options.selectedCommits.length > 0 && (
                    <div className="p-3 bg-brand-50 border border-brand-200 rounded-lg">
                        <div className="flex items-center gap-2 text-brand-700 text-sm font-medium">
                            <FeatherCheck className="w-4 h-4" />
                            {options.selectedCommits.length} commit{options.selectedCommits.length !== 1 ? 's' : ''} selected
                        </div>
                    </div>
                )}
            </div>

            {/* Date Range */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <FeatherCalendar className="w-5 h-5 text-neutral-600" />
                    <h3 className="text-lg font-semibold text-default-font">Date Range</h3>
                </div>

                <div className="p-4 rounded-lg border border-neutral-200">
                    <div className="grid grid-cols-2 gap-4">
                        <TextField
                            label="From"
                            helpText=""
                        >
                            <TextField.Input
                                type="date"
                                value={options.dateRange.from}
                                onChange={(e) => updateOptions({
                                    dateRange: { ...options.dateRange, from: e.target.value }
                                })}
                            />
                        </TextField>
                        <TextField
                            label="To"
                            helpText=""
                        >
                            <TextField.Input
                                type="date"
                                value={options.dateRange.to}
                                onChange={(e) => updateOptions({
                                    dateRange: { ...options.dateRange, to: e.target.value }
                                })}
                            />
                        </TextField>
                    </div>
                </div>
            </div>

            {/* Additional Changes */}
            <div className="space-y-4">
                <h3 className="text-lg font-semibold text-default-font">Additional Changes</h3>
                <div className="p-4 rounded-lg border border-neutral-200">
                    <TextField
                        label=""
                        helpText="Add any manual changes or notes that aren't captured in commits"
                    >
                        <TextField.Input
                            placeholder="e.g., Performance improvements, UI updates, dependency upgrades..."
                            value={options.additionalChanges || ''}
                            onChange={(e) => updateOptions({ additionalChanges: e.target.value })}
                        />
                    </TextField>
                </div>
            </div>

            {/* Branch Selection */}
            <div className="space-y-4">
                <h3 className="text-lg font-semibold text-default-font">Branch</h3>
                <div className="p-4 rounded-lg border border-neutral-200">
                    <TextField
                        label=""
                        helpText="Specify which branch to analyze"
                    >
                        <TextField.Input
                            value={options.branch || ''}
                            onChange={(e) => updateOptions({ branch: e.target.value })}
                            placeholder="main"
                        />
                    </TextField>
                </div>
            </div>

            {/* Validation Messages */}
            {!hasValidSelection && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-amber-800 text-sm">
                        Please select at least one commit or add additional changes to continue.
                    </p>
                </div>
            )}
        </div>
    )
}