'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuthStore } from '@/lib/store'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { handleApiError } from '@/lib/error-handler-standard'
import Link from 'next/link'

// Subframe UI Components
import { Badge } from '@/subframe-ui/components/Badge'
import { TextField } from '@/subframe-ui/components/TextField'
import { Button } from '@/subframe-ui/components/Button'
import { Checkbox } from '@/subframe-ui/components/Checkbox'
import { TextArea } from '@/subframe-ui/components/TextArea'
import { FeatherTrello, FeatherRefreshCw } from '@subframe/core'

// Type definition for a Jira ticket
 type JiraTicket = {
  id: string
  key: string
  title: string
  description: string
  status: string
  type: string
  priority: string
  url: string
  assignee?: string
  created: string
  updated: string
}

// Type definition for a Jira integration
 type JiraIntegration = {
  id: string
  type: 'jira'
  config: {
    domain: string
  }
}

// Zod schema for form validation
const releaseNotesSchema = z.object({
  integrationId: z.string().min(1, 'Please select a Jira integration'),
  projectKey: z.string().min(1, 'Please select a Jira project'),
  status: z.enum(['open', 'closed', 'all']),
  lookbackDays: z
    .number()
    .min(1, 'Must be at least 1 day')
    .max(365, 'Cannot exceed 365 days'),
  title: z.string().min(1, 'Please enter a title'),
  description: z.string().optional(),
})

type ReleaseNotesFormData = z.infer<typeof releaseNotesSchema>

export function JiraReleaseGenerator() {
  // Data and API states
  const [content, setContent] = useState('')
  const [selectedTickets, setSelectedTickets] = useState<string[]>([])
  const [tickets, setTickets] = useState<JiraTicket[]>([])
  const [integrations, setIntegrations] = useState<JiraIntegration[]>([])
  const [projects, setProjects] = useState<Array<{ key: string; name: string }>>([])
  const [isLoadingIntegrations, setIsLoadingIntegrations] = useState(true)
  const [isLoadingProjects, setIsLoadingProjects] = useState(false)
  const [isFetchingTickets, setIsFetchingTickets] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastProjectSync, setLastProjectSync] = useState<Date | null>(null)
  const [refreshingProjects, setRefreshingProjects] = useState(false)
  const [lastIssuesSync, setLastIssuesSync] = useState<Date | null>(null)
  const [refreshingIssues, setRefreshingIssues] = useState(false)

  // UI flow state
  const [step, setStep] = useState(1) // 1: Configure, 2: Review, 3: Preview

  const { user } = useAuthStore()
  const supabase = createClientComponentClient()

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    trigger,
    resetField,
  } = useForm<ReleaseNotesFormData>({
    resolver: zodResolver(releaseNotesSchema),
    defaultValues: {
      status: 'closed' as const,
      lookbackDays: 30,
    },
  })

  const selectedIntegrationId = watch('integrationId')

  // Effect to load Jira integrations
  useEffect(() => {
    if (!user) return
    const loadIntegrations = async () => {
      setIsLoadingIntegrations(true)
      try {
        const { data, error: dbError } = await supabase
          .from('integrations')
          .select('id, type, config')
          .eq('organization_id', user.id)
          .eq('type', 'jira')

        if (dbError) throw dbError
        setIntegrations(data as JiraIntegration[] || [])
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load Jira integrations')
      } finally {
        setIsLoadingIntegrations(false)
      }
    }
    loadIntegrations()
  }, [user, supabase])

  // Helper to fetch projects (optionally bypass cache)
  const fetchProjects = async (forceRefresh = false) => {
    setIsLoadingProjects(true)
    setError(null)
    try {
      const url = forceRefresh ? '/api/integrations/jira/projects?refresh=1' : '/api/integrations/jira/projects'
      const response = await fetch(url)
      if (!response.ok) throw new Error(`Failed to fetch projects: ${response.status}`)
      const data = await response.json()
      setProjects(data.projects?.map((p: any) => ({ key: p.key, name: p.name })) || [])
      if (data.lastUpdated) {
        setLastProjectSync(new Date(data.lastUpdated))
      } else {
        setLastProjectSync(new Date())
      }
    } catch (e) {
      handleApiError(e, 'load Jira projects', 'JiraReleaseGenerator')
      setError(e instanceof Error ? e.message : 'Failed to load Jira projects')
    } finally {
      setIsLoadingProjects(false)
      setRefreshingProjects(false)
    }
  }

  // Helper to fetch issues (optionally bypass cache)
  const fetchIssues = async (forceRefresh = false) => {
    setIsFetchingTickets(true)
    setTickets([])
    setSelectedTickets([])
    setError(null)
    try {
      const formData = watch()
      const params = new URLSearchParams({
        projectKey: formData.projectKey,
        maxResults: '50',
        startAt: '0',
        statuses: formData.status === 'all' ? '' : (formData.status === 'closed' ? 'Done,Closed,Resolved' : 'Open,In Progress,To Do'),
        updatedSince: new Date(Date.now() - formData.lookbackDays * 86400000).toISOString().split('T')[0]
      })
      if (forceRefresh) params.set('refresh', '1')
      const response = await fetch(`/api/integrations/jira/issues?${params}`)
      if (!response.ok) throw new Error(`Failed to fetch tickets: ${response.status}`)
      const data = await response.json()
      const domain = integrations.find(i => i.id === formData.integrationId)?.config.domain;
      const transformedTickets: JiraTicket[] = data.issues?.map((issue: any) => ({
        id: issue.id,
        key: issue.key,
        title: issue.fields.summary,
        description: issue.fields.description?.content[0]?.content[0]?.text || 'No description.',
        status: issue.fields.status.name,
        type: issue.fields.issuetype.name,
        priority: issue.fields.priority?.name || 'Medium',
        url: `https://${domain}/browse/${issue.key}`,
        assignee: issue.fields.assignee?.displayName || 'Unassigned',
        created: issue.fields.created,
        updated: issue.fields.updated,
      })) || []
      if (transformedTickets.length > 0) {
        setTickets(transformedTickets)
        setStep(2)
      } else {
        setError("No issues found matching your criteria. Try adjusting the filters.")
      }
      if (data.lastUpdated) {
        setLastIssuesSync(new Date(data.lastUpdated))
      } else {
        setLastIssuesSync(new Date())
      }
    } catch (e) {
      handleApiError(e, 'fetch Jira tickets', 'JiraReleaseGenerator')
      setError(e instanceof Error ? e.message : 'Failed to fetch Jira tickets')
    } finally {
      setIsFetchingTickets(false)
      setRefreshingIssues(false)
    }
  }

  // Replace useEffect for projects
  useEffect(() => {
    if (!selectedIntegrationId) {
      setProjects([])
      return
    }
    fetchProjects()
    // eslint-disable-next-line
  }, [selectedIntegrationId])

  // Replace handleFetchTickets to use fetchIssues
  const handleFetchTickets = async () => {
    fetchIssues()
  }

  // Add refresh handlers
  const handleRefreshProjects = () => {
    setRefreshingProjects(true)
    fetchProjects(true)
  }
  const handleRefreshIssues = () => {
    setRefreshingIssues(true)
    fetchIssues(true)
  }

  // 2. Generate release notes from selected tickets
  const handleGenerateNote = async () => {
    setError(null)
    const isValid = await trigger('title')
    if (!isValid) return
    if (selectedTickets.length === 0) {
      setError("Please select at least one issue to include.")
      return
    }
    
    setIsGenerating(true)
    try {
        const formData = watch()
        const selectedTicketData = tickets.filter(t => selectedTickets.includes(t.id))
        const response = await fetch('/api/ai/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                tickets: selectedTicketData,
                title: formData.title,
                description: formData.description,
            }),
        })
        if (!response.ok) throw new Error('Failed to generate release note content.')
        const result = await response.json()
        setContent(result.content || '')
        setStep(3)
    } catch (e) {
        setError(e instanceof Error ? e.message : 'An unexpected error occurred')
    } finally {
        setIsGenerating(false)
    }
  }

  // Selection handlers
  const toggleTicketSelection = (ticketId: string) => setSelectedTickets(p => p.includes(ticketId) ? p.filter(id => id !== ticketId) : [...p, ticketId])
  const selectAllTickets = () => setSelectedTickets(tickets.map(t => t.id))
  const deselectAllTickets = () => setSelectedTickets([])
  
  // Placeholder actions for final step
  const handleSaveDraft = () => alert('Save draft functionality coming soon!')
  const handlePublish = () => alert('Publish functionality coming soon!')

  return (
    <div className="flex w-full max-w-[1024px] flex-col items-start gap-8">
      {/* Step 1: Select Project & Filters */}
      <div className={`flex w-full flex-col items-start gap-6 rounded-md border border-solid border-neutral-border bg-default-background px-8 py-8 transition-opacity ${step > 1 ? 'opacity-50' : 'opacity-100'}`}>
        <div className="flex w-full items-center justify-between">
          <span className="text-heading-2 font-heading-2 text-default-font">
            1. Select Project & Filters
          </span>
          {isLoadingIntegrations ? null : integrations.length > 0 ? (
            <Badge variant="success" icon={<FeatherTrello />}>Connected</Badge>
          ) : (
            <Badge variant="warning" icon={<FeatherTrello />}>Not Connected</Badge>
          )}
        </div>
        <div className="flex w-full items-center justify-between mb-2">
          {lastProjectSync && (
            <span className="text-xs text-gray-500">
              <span>Projects last updated {lastProjectSync.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </span>
          )}
          <Button
            variant="neutral-secondary"
            size="small"
            onClick={handleRefreshProjects}
            disabled={isLoadingProjects || refreshingProjects}
            className="ml-auto"
          >
            {refreshingProjects ? 'Refreshing...' : 'Refresh Projects'}
          </Button>
        </div>
        {isLoadingIntegrations ? (
          <div className="w-full p-3 text-center text-gray-500">Loading your Jira integrations...</div>
        ) : integrations.length === 0 ? (
          <div className="w-full flex flex-col items-center gap-4 p-6 text-center">
            <span className="text-lg font-semibold text-default-font">No Jira integration found</span>
            <span className="text-body text-subtext-color">To generate release notes from your tickets, you'll need to connect your Jira account first. This allows us to fetch your team's issues and help you craft a compelling release narrative.</span>
            <Link href="/dashboard/integrations">
              <Button variant="brand-primary">Connect Jira Integration</Button>
            </Link>
          </div>
        ) : (
          <>
            <TextField className="h-auto w-full" label="Jira Integration" helpText={isLoadingIntegrations ? 'Loading integrations...' : 'Select a configured Jira integration'}>
              <select
                {...register('integrationId')}
                disabled={step > 1 || isLoadingIntegrations}
                onChange={(e) => {
                  setValue('integrationId', e.target.value)
                  resetField('projectKey')
                }}
                className="w-full max-w-[1024px] grow shrink-0 basis-0 rounded-md border border-solid border-neutral-border bg-default-background px-3 py-2 text-body font-body text-default-font shadow-sm outline-none focus:border-brand-500"
              >
                <option value="">Select an integration...</option>
                {integrations.map((i) => <option key={i.id} value={i.id}>{i.config.domain}</option>)}
              </select>
              {errors.integrationId && <p className="mt-2 text-sm text-error-500">{errors.integrationId.message}</p>}
            </TextField>
            {selectedIntegrationId && (
              <>
                <TextField className="h-auto w-full" label="Jira Project" helpText={isLoadingProjects ? 'Loading projects...' : 'Select a project to fetch issues from'}>
                  <select
                    {...register('projectKey')}
                    disabled={step > 1 || isLoadingProjects || projects.length === 0}
                    className="w-full max-w-[1024px] grow shrink-0 basis-0 rounded-md border border-solid border-neutral-border bg-default-background px-3 py-2 text-body font-body text-default-font shadow-sm outline-none focus:border-brand-500"
                  >
                    <option value="">Select a project...</option>
                    {projects.map((p) => <option key={p.key} value={p.key}>{p.name} ({p.key})</option>)}
                  </select>
                  {errors.projectKey && <p className="mt-2 text-sm text-error-500">{errors.projectKey.message}</p>}
                </TextField>
                <div className="grid w-full grid-cols-1 gap-6 sm:grid-cols-2">
                  <TextField label="Ticket Status">
                    <select disabled={step > 1} {...register('status')} className="w-full grow shrink-0 basis-0 rounded-md border border-solid border-neutral-border bg-default-background px-3 py-2 text-body font-body text-default-font shadow-sm outline-none focus:border-brand-500">
                      <option value="closed">Closed</option>
                      <option value="open">Open</option>
                      <option value="all">All</option>
                    </select>
                  </TextField>
                  <TextField label="Lookback Period (days)">
                    <TextField.Input disabled={step > 1} type="number" {...register('lookbackDays', { valueAsNumber: true })} />
                    {errors.lookbackDays && <p className="mt-2 text-sm text-error-500">{errors.lookbackDays.message}</p>}
                  </TextField>
                </div>
              </>
            )}
            {step === 1 && watch('projectKey') && (
              <Button onClick={handleFetchTickets} disabled={isFetchingTickets}>
                {isFetchingTickets ? 'Fetching Issues...' : 'Continue to Review Issues'}
              </Button>
            )}
          </>
        )}
      </div>

      {/* Step 2: Review Issues */}
      {step >= 2 && (
        <div className={`flex w-full flex-col items-start gap-6 rounded-md border border-solid border-neutral-border bg-default-background px-8 py-8 transition-opacity ${step > 2 ? 'opacity-50' : 'opacity-100'}`}>
            <div className="flex w-full items-center justify-between">
                <span className="text-heading-2 font-heading-2 text-default-font">2. Review Issues</span>
                <div className="flex items-center gap-2">
                    <Button variant="neutral-secondary" onClick={selectAllTickets} disabled={step > 2}>Select All</Button>
                    <Button variant="neutral-secondary" onClick={deselectAllTickets} disabled={step > 2}>None</Button>
                    <Button variant="neutral-secondary" onClick={handleStartOver}>Change Filters</Button>
                </div>
            </div>
            <div className="flex w-full items-center justify-between mb-2">
              {lastIssuesSync && (
                <span className="text-xs text-gray-500">
                  <span>Issues last updated {lastIssuesSync.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </span>
              )}
              <Button
                variant="neutral-secondary"
                size="small"
                onClick={handleRefreshIssues}
                disabled={isFetchingTickets || refreshingIssues}
                className="ml-auto"
              >
                {refreshingIssues ? 'Refreshing...' : 'Refresh Issues'}
              </Button>
            </div>
            
            <div className="flex w-full flex-col items-start gap-2">
                {tickets.map((ticket) => (
                    <div key={ticket.id} className={`flex w-full items-start gap-4 rounded-md border border-solid px-6 py-4 ${step > 2 ? 'border-neutral-100' : 'border-neutral-border'}`}>
                        <Checkbox label="" onCheckedChange={() => toggleTicketSelection(ticket.id)} checked={selectedTickets.includes(ticket.id)} disabled={step > 2}/>
                        <div className="flex grow shrink-0 basis-0 flex-col items-start gap-1">
                            <span className="text-body-bold font-body-bold text-default-font">{ticket.key}: {ticket.title}</span>
                            <p className="text-body font-body text-subtext-color">{ticket.description.substring(0,100)}{ticket.description.length > 100 ? '...' : ''}</p>
                            <div className="mt-1 flex items-center gap-2">
                                <Badge>{ticket.type}</Badge>
                                <Badge variant="success">{ticket.status}</Badge>
                                <Badge variant="neutral">{ticket.priority}</Badge>
                            </div>
                            <div className="mt-2 text-xs text-subtext-color">Assigned to: {ticket.assignee} | Updated: {new Date(ticket.updated).toLocaleDateString()}</div>
                            <a href={ticket.url} target="_blank" rel="noopener noreferrer" className="mt-1 text-xs text-brand-600 hover:underline">View in Jira →</a>
                        </div>
                    </div>
                ))}
            </div>

            <TextField className="w-full" label="Release Notes Title">
                <TextField.Input disabled={step > 2} {...register('title')} placeholder="e.g., Q3 Product Updates & Bug Fixes" />
                {errors.title && <p className="mt-2 text-sm text-error-500">{errors.title.message}</p>}
            </TextField>
            <TextArea className="w-full" label="Description (Optional)" helpText="Add a brief summary or theme for this release.">
                <TextArea.Input disabled={step > 2} rows={3} {...register('description')} />
            </TextArea>
            
            {step === 2 && (
                <Button onClick={handleGenerateNote} disabled={isGenerating || selectedTickets.length === 0}>
                    {isGenerating ? 'Generating...' : 'Generate Release Notes'}
                </Button>
            )}
        </div>
      )}

      {/* Step 3: Preview & Customize */}
      {step === 3 && content && (
         <div className="flex w-full flex-col items-start gap-6 rounded-md border border-solid border-neutral-border bg-default-background px-8 py-8">
            <div className="flex w-full items-center justify-between">
                <span className="text-heading-2 font-heading-2 text-default-font">3. Preview &amp; Customize</span>
                <Button variant="neutral-secondary" icon={<FeatherRefreshCw />} onClick={handleGenerateNote} disabled={isGenerating}>
                    {isGenerating ? 'Regenerating...' : 'Regenerate'}
                </Button>
            </div>
            
            <TextArea className="w-full" label="Release Notes Preview" helpText="AI-generated release notes based on selected issues.">
                <TextArea.Input className="h-auto min-h-[240px] w-full flex-none font-monospace-body" value={content} onChange={(e) => setContent(e.target.value)} />
            </TextArea>
            <div className="flex w-full flex-wrap items-start gap-4">
              <TextField className="h-auto w-64 flex-none" label="Tone" helpText="Writing style">
                <TextField.Input placeholder="Professional" disabled />
              </TextField>
              <TextField className="h-auto w-64 flex-none" label="Audience" helpText="Target readers">
                <TextField.Input placeholder="Stakeholders" disabled />
              </TextField>
              <TextField className="h-auto w-64 flex-none" label="Format" helpText="Output format">
                <TextField.Input placeholder="Markdown" disabled />
              </TextField>
            </div>

            <div className="flex w-full items-center justify-between">
                <div className="flex items-center gap-2">
                    <Button variant="neutral-secondary" onClick={handleSaveDraft}>Save Draft</Button>
                    <Button onClick={handlePublish}>Publish Release Notes</Button>
                </div>
                <Button variant="neutral-secondary" onClick={handleStartOver}>Start Over</Button>
            </div>
         </div>
      )}

      {/* Global Error Display */}
      {error && (
        <div className="w-full max-w-[1024px] p-4 bg-error-50 border border-error-200 rounded text-error-700 text-sm">
            <strong>Error:</strong> {error}
        </div>
      )}
    </div>
  )
} 