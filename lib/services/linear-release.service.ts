import { linearAPI } from '@/lib/integrations/linear-client'

/**
 * LinearReleaseService
 *
 * Encapsulates Linear issue aggregation, filtering, and categorization
 * to keep API routes thin and business logic testable.
 */
export interface LinearIssueLite {
  id: string
  identifier: string
  title: string
  description?: string
  priority?: number
  labels: string[]
  url?: string
  completedAt?: string
  state?: string
  stateType?: string
  team?: { id?: string; name?: string }
  project?: { id: string; name?: string } | null
}

export interface LinearAggregationInput {
  teams: string[]
  projects?: string[]
  dateRange?: { from?: string; to?: string }
  issueFilters?: { stateTypes?: string[]; labels?: string[]; minPriority?: number }
  pageSize?: number
}

export interface LinearAggregationResult {
  issues: LinearIssueLite[]
  totalIssues: number
}

export class LinearReleaseService {
  constructor(private accessToken: string) {}

  /**
   * Validate input parameters and provide helpful error messages
   * @param input User input for aggregation
   * @returns Validation result with any errors
   */
  validateInput(input: LinearAggregationInput): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!input.teams || input.teams.length === 0) {
      errors.push('At least one team must be selected')
    }

    if (input.dateRange?.from && input.dateRange?.to) {
      const fromDate = new Date(input.dateRange.from)
      const toDate = new Date(input.dateRange.to)
      if (fromDate > toDate) {
        errors.push('Start date must be before end date')
      }
    }

    if (input.issueFilters?.minPriority !== undefined && input.issueFilters.minPriority < 0) {
      errors.push('Minimum priority must be non-negative')
    }

    if (input.issueFilters?.minPriority !== undefined && input.issueFilters.minPriority > 5) {
      errors.push('Minimum priority must be 5 or less (Linear uses 0-5 scale)')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Build filter options for Linear API based on user input.
   * Note: Linear API client has limited filter support, so we filter client-side for complex criteria.
   */
  private buildFilterOptions(input: LinearAggregationInput): {
    teamId?: string
    stateType?: 'backlog' | 'unstarted' | 'started' | 'completed' | 'canceled'
    updatedSince?: string
  } {
    const options: {
      teamId?: string
      stateType?: 'backlog' | 'unstarted' | 'started' | 'completed' | 'canceled'
      updatedSince?: string
    } = {}

    // Use first team for API call (Linear API limitation)
    // Additional teams will be filtered client-side in applyClientSideFilters
    if (input.teams && input.teams.length > 0) {
      options.teamId = input.teams[0]
      console.log('[LinearReleaseService] Using team ID for API call:', options.teamId)
    } else {
      console.warn('[LinearReleaseService] No teams provided, will fetch all issues')
    }

    // Use date range if provided
    if (input.dateRange?.from) {
      options.updatedSince = input.dateRange.from
      console.log('[LinearReleaseService] Using date filter:', options.updatedSince)
    }

    // Default to completed issues for release notes
    options.stateType = 'completed'

    console.log('[LinearReleaseService] Final filter options:', options)
    return options
  }

  /**
   * Fetch issues for teams and apply basic filters. Pagination can be added later.
   */
  async aggregate(input: LinearAggregationInput): Promise<LinearAggregationResult> {
    const { pageSize = 100 } = input
    
    // Build filter options for the first team (Linear API limitation)
    const filterOptions = this.buildFilterOptions(input)
    
    // Debug: Log what we're sending to Linear API
    console.log('[LinearReleaseService] Sending request to Linear API:', {
      teams: input.teams,
      filterOptions,
      accessToken: this.accessToken ? 'present' : 'missing'
    })

    const fetched: LinearIssueLite[] = []
    let after: string | undefined = undefined
    let pages = 0
    const MAX_PAGES = 5 // safety cap to avoid excessive requests

    do {
      const resp: any = await linearAPI.getIssues(this.accessToken, {
        first: pageSize,
        after,
        ...filterOptions
      })

      const transformed: LinearIssueLite[] = (resp?.nodes || []).map((issue: any) => ({
        id: issue.id,
        identifier: issue.identifier,
        title: issue.title,
        description: issue.description,
        priority: issue.priority,
        labels: issue.labels?.nodes?.map((l: any) => l.name) || [],
        url: issue.url,
        completedAt: issue.completedAt,
        state: issue.state?.name,
        stateType: issue.state?.type,
        team: { id: issue.team?.id, name: issue.team?.name },
        project: issue.project ? { id: issue.project.id, name: issue.project.name } : null
      }))

      fetched.push(...transformed)

      after = resp?.pageInfo?.hasNextPage ? resp?.pageInfo?.endCursor : undefined
      pages += 1
    } while (after && pages < MAX_PAGES)

    // Apply client-side filtering for criteria not supported by Linear API
    const filtered = this.applyClientSideFilters(fetched, input)

    return { issues: filtered, totalIssues: filtered.length }
  }

  /**
   * Apply client-side filtering for criteria not supported by Linear API
   * @param issues Raw issues from Linear API
   * @param input Filter criteria from user
   * @returns Filtered issues matching all criteria
   */
  private applyClientSideFilters(issues: LinearIssueLite[], input: LinearAggregationInput): LinearIssueLite[] {
    let filtered = issues
    const originalCount = issues.length

    // Filter by teams if multiple teams were selected (since we fetch from all selected teams)
    if (input.teams && input.teams.length > 1) {
      const selectedTeams = input.teams
      const beforeTeamFilter = filtered.length
      filtered = filtered.filter(issue => 
        issue.team?.id && selectedTeams.includes(issue.team.id)
      )
      if (filtered.length === 0 && beforeTeamFilter > 0) {
        console.warn(`[LinearReleaseService] Team filter removed all issues. Teams: ${selectedTeams.join(', ')}`)
      }
    }

    // Filter by projects if specified
    if (input.projects?.length) {
      const beforeProjectFilter = filtered.length
      filtered = filtered.filter(issue => 
        issue.project && input.projects!.includes(issue.project.id)
      )
      if (filtered.length === 0 && beforeProjectFilter > 0) {
        console.warn(`[LinearReleaseService] Project filter removed all issues. Projects: ${input.projects.join(', ')}`)
      }
    }

    // Filter by state types if specified
    if (input.issueFilters?.stateTypes?.length) {
      const beforeStateFilter = filtered.length
      filtered = filtered.filter(issue => 
        issue.stateType && input.issueFilters!.stateTypes!.includes(issue.stateType)
      )
      if (filtered.length === 0 && beforeStateFilter > 0) {
        console.warn(`[LinearReleaseService] State type filter removed all issues. State types: ${input.issueFilters.stateTypes.join(', ')}`)
      }
    }

    // Filter by labels if specified
    if (input.issueFilters?.labels?.length) {
      const beforeLabelFilter = filtered.length
      filtered = filtered.filter(issue => 
        issue.labels.some(label => input.issueFilters!.labels!.includes(label))
      )
      if (filtered.length === 0 && beforeLabelFilter > 0) {
        console.warn(`[LinearReleaseService] Label filter removed all issues. Labels: ${input.issueFilters.labels.join(', ')}`)
      }
    }

    // Filter by minimum priority if specified
    if (typeof input.issueFilters?.minPriority === 'number') {
      const beforePriorityFilter = filtered.length
      filtered = filtered.filter(issue => {
        // If issue has no priority set, treat it as priority 0 (lowest)
        const issuePriority = issue.priority ?? 0
        return issuePriority >= input.issueFilters!.minPriority!
      })
      if (filtered.length === 0 && beforePriorityFilter > 0) {
        console.warn(`[LinearReleaseService] Priority filter removed all issues. Min priority: ${input.issueFilters.minPriority}`)
      }
    }

    // Filter by date range end if specified
    if (input.dateRange?.to) {
      const beforeDateFilter = filtered.length
      filtered = filtered.filter(issue => 
        issue.completedAt && issue.completedAt <= input.dateRange!.to!
      )
      if (filtered.length === 0 && beforeDateFilter > 0) {
        console.warn(`[LinearReleaseService] Date filter removed all issues. End date: ${input.dateRange.to}`)
      }
    }

    // Log filtering results for debugging
    if (filtered.length !== originalCount) {
      console.log(`[LinearReleaseService] Filtered ${originalCount} issues down to ${filtered.length} based on criteria`)
    }

    return filtered
  }

  /**
   * Categorize issues into standard release note sections.
   */
  categorize(issues: LinearIssueLite[]): Record<'features' | 'improvements' | 'bugfixes' | 'breaking', LinearIssueLite[]> {
    const sections = {
      features: [] as LinearIssueLite[],
      improvements: [] as LinearIssueLite[],
      bugfixes: [] as LinearIssueLite[],
      breaking: [] as LinearIssueLite[]
    }

    for (const issue of issues) {
      const labels = issue.labels || []
      const title = issue.title?.toLowerCase() || ''
      const isBreaking = labels.some((l) => /breaking|deprecation/i.test(l)) || /breaking/i.test(title)
      const isBug = labels.some((l) => /bug|fix/i.test(l)) || /fix|bug/i.test(title)
      const isFeature = labels.some((l) => /feature|enhancement|feat/i.test(l)) || /feat|feature/i.test(title)

      if (isBreaking) sections.breaking.push(issue)
      else if (isBug) sections.bugfixes.push(issue)
      else if (isFeature) sections.features.push(issue)
      else sections.improvements.push(issue)
    }

    return sections
  }

  /**
   * Build a professional prompt tailored to Linear issues and org AI context.
   * 
   * This method:
   * 1. Creates a system prompt using ProfessionalPromptEngine for consistent tone/voice
   * 2. Structures user prompt with categorized issues and metadata
   * 3. Includes version, release date, and team/project context
   * 4. Respects includeIdentifiers flag for technical vs non-technical audiences
   * 5. Incorporates additional instructions and template hints
   * 6. Properly utilizes all AI context fields (emojis, metrics, brevity, language)
   * 7. Incorporates organization settings and industry context
   * 8. Filters out personal/internal details based on audience
   * 
   * @param args Configuration for prompt building including sections, context, and metadata
   * @returns Object with systemPrompt and userPrompt for AI generation
   */
  buildPrompt(args: {
    sections: Record<'features' | 'improvements' | 'bugfixes' | 'breaking', LinearIssueLite[]>
    organization?: { 
      meta_description?: string; 
      settings?: { 
        industry?: string
        company_size?: string
        product_type?: string
        target_market?: string
        company_description?: string
      }
    }
    aiContext?: { 
      system_prompt?: string; 
      audience?: string; 
      tone?: string; 
      output_format?: string; 
      example_output?: string
      include_emojis?: boolean
      include_metrics?: boolean
      brevity_level?: 'concise' | 'detailed' | 'comprehensive'
      language?: string
    }
    version?: string
    releaseDate?: string
    instructions?: string
    template?: string
    dateRange?: { from?: string; to?: string }
    teams?: string[]
    projects?: string[]
    includeIdentifiers?: boolean // Control whether to include issue identifiers and team names
  }): { systemPrompt: string, userPrompt: string } {
    const { sections, organization, aiContext, version, releaseDate, instructions, template, dateRange, teams, projects, includeIdentifiers = true } = args

    // Determine content style based on AI context
    const shouldIncludeEmojis = aiContext?.include_emojis ?? false
    const shouldIncludeMetrics = aiContext?.include_metrics ?? true
    const brevityLevel = aiContext?.brevity_level ?? 'detailed'
    const language = aiContext?.language ?? 'English'
    const tone = aiContext?.tone ?? 'professional'
    const audience = aiContext?.audience ?? 'mixed'
    const outputFormat = aiContext?.output_format ?? 'markdown'

    // Build organization context
    const orgContext = []
    if (organization?.meta_description) {
      orgContext.push(`Organization: ${organization.meta_description}`)
    }
    if (organization?.settings?.industry) {
      orgContext.push(`Industry: ${organization.settings.industry}`)
    }
    if (organization?.settings?.product_type) {
      orgContext.push(`Product Type: ${organization.settings.product_type}`)
    }
    if (organization?.settings?.target_market) {
      orgContext.push(`Target Market: ${organization.settings.target_market}`)
    }
    if (organization?.settings?.company_description) {
      orgContext.push(`Company Description: ${organization.settings.company_description}`)
    }

    // Build content filtering rules based on audience
    const contentRules = []
    if (audience === 'developers' || audience === 'technical') {
      contentRules.push('- Include technical details, API changes, and implementation specifics')
      contentRules.push('- Include library names, framework versions, and technical specifications')
      contentRules.push('- Include contributor names and technical credits when relevant')
    } else {
      contentRules.push('- Remove internal technical details and implementation specifics')
      contentRules.push('- Remove individual contributor names unless they are public figures')
      contentRules.push('- Remove library/vendor names unless they are essential for user understanding')
      contentRules.push('- Focus on user-facing benefits and business value')
    }

    // Build formatting rules based on AI context
    const formattingRules = []
    if (shouldIncludeEmojis) {
      formattingRules.push('- Use appropriate emojis to enhance readability and engagement')
    }
    if (shouldIncludeMetrics) {
      formattingRules.push('- Include specific numbers and measurable improvements when available')
    }
    
    // Add brevity-specific rules
    switch (brevityLevel) {
      case 'concise':
        formattingRules.push('- Keep descriptions brief and focused on key points')
        formattingRules.push('- Use bullet points for quick scanning')
        break
      case 'detailed':
        formattingRules.push('- Provide sufficient detail for understanding impact')
        formattingRules.push('- Balance brevity with completeness')
        break
      case 'comprehensive':
        formattingRules.push('- Include comprehensive details and context')
        formattingRules.push('- Provide thorough explanations for complex changes')
        break
    }

    const houseStyle = aiContext?.system_prompt ? `House style guidelines (must follow):\n${aiContext.system_prompt}\n` : ''

    // Build professional header with proper structure
    const header = [
      `Role: You are an experienced product technical writer specializing in ${organization?.settings?.industry || 'software'} release notes.`,
      `Language: ${language}`,
      `Audience: ${audience}`,
      `Tone: ${tone}`,
      `Output Format: ${outputFormat}`,
      `Content Style: ${brevityLevel} with ${shouldIncludeEmojis ? 'emojis' : 'no emojis'} and ${shouldIncludeMetrics ? 'metrics' : 'no metrics'}`,
      orgContext.length > 0 ? `Organization Context:\n${orgContext.join('\n')}` : undefined,
      version ? `Release Version: ${version}` : undefined,
      releaseDate ? `Release Date: ${releaseDate}` : undefined,
      (dateRange?.from || dateRange?.to) ? `Time Window: ${dateRange?.from || 'N/A'} to ${dateRange?.to || 'N/A'}` : undefined,
      teams?.length ? `Teams in Scope: ${teams.join(', ')}` : undefined,
      projects?.length ? `Projects in Scope: ${projects.join(', ')}` : undefined,
      houseStyle
    ].filter(Boolean).join('\n')

    /**
     * Build a formatted section of issues for the user prompt
     * @param name Section name (e.g., "New Features", "Bug Fixes")
     * @param issues Array of issues to format
     * @returns Formatted markdown section or empty string if no issues
     */
    const buildSection = (name: string, issues: LinearIssueLite[]) => {
      if (!issues.length) return ''
      const lines = issues.map((i) => {
        let line = `- ${i.title}`
        if (i.description) {
          line += `: ${i.description.replace(/\n/g, ' ')}`
        }
        // Only include identifiers and team names if explicitly requested
        // This allows for technical vs non-technical audience customization
        if (includeIdentifiers) {
          if (i.identifier) {
            line += ` (${i.identifier})`
          }
          if (i.team?.name) {
            line += ` — ${i.team.name}`
          }
        }
        return line
      })
      return `\n## ${name}\n${lines.join('\n')}\n`
    }

    // Build content based on brevity level
    let body = ''
    if (brevityLevel === 'concise') {
      body = [
        'Provide a brief executive summary (2-3 sentences) highlighting the key improvements.',
        buildSection('🚀 New Features', sections.features),
        buildSection('✨ Improvements', sections.improvements),
        buildSection('🐛 Bug Fixes', sections.bugfixes),
        buildSection('⚠️ Breaking Changes', sections.breaking),
        instructions ? `\nAdditional Context: ${instructions}\n` : ''
      ].join('\n')
    } else if (brevityLevel === 'detailed') {
      body = [
        'Provide a comprehensive executive summary capturing the release theme, key improvements, and user impact.',
        buildSection('🚀 New Features', sections.features),
        buildSection('✨ Improvements', sections.improvements),
        buildSection('🐛 Bug Fixes', sections.bugfixes),
        buildSection('⚠️ Breaking Changes', sections.breaking),
      '## Notable Changes\nInclude any cross-cutting changes, migrations, or platform-level updates if applicable.\n',
      '## Upgrade Notes\nIf any breaking changes or migrations exist, provide concise upgrade guidance.\n',
        audience === 'developers' ? '## Technical Details\nInclude relevant technical specifications, API changes, or implementation notes.\n' : '',
        instructions ? `\nAdditional Context: ${instructions}\n` : ''
      ].join('\n')
    } else { // comprehensive
      body = [
        'Provide a detailed executive summary with business context, technical overview, and user impact analysis.',
        buildSection('🚀 New Features', sections.features),
        buildSection('✨ Improvements', sections.improvements),
        buildSection('🐛 Bug Fixes', sections.bugfixes),
        buildSection('⚠️ Breaking Changes', sections.breaking),
        '## Notable Changes\nInclude comprehensive details about cross-cutting changes, migrations, and platform-level updates.\n',
        '## Technical Implementation\nProvide detailed technical specifications, API changes, and implementation notes.\n',
        '## Upgrade Guide\nProvide detailed upgrade instructions, migration steps, and compatibility notes.\n',
        '## Performance Impact\nInclude any performance improvements, optimizations, or resource usage changes.\n',
        '## Security Updates\nHighlight any security improvements, vulnerability fixes, or compliance updates.\n',
        instructions ? `\nAdditional Context: ${instructions}\n` : ''
    ].join('\n')
    }

    const templateHint = template ? `\nTemplate structure (must be reflected in the final output):\n${template}\n` : ''

    const rules = [
      'Formatting and Style Rules:',
      '- Use clear, scannable Markdown with proper headings and bullet points.',
      '- Create a professional, engaging heading that reflects the release theme.',
      '- Avoid internal jargon and ticket noise; emphasize user-facing impact.',
      '- Keep sentences concise; use parallel structure across bullets.',
      '- Where helpful, include identifiers (e.g., ENG-123) without overloading the text.',
      '- If a section has no items, omit that section entirely.',
      ...contentRules,
      ...formattingRules
    ].join('\n')

    const example = aiContext?.example_output ? `\n\nExample Output (for style reference; do not copy content):\n${aiContext.example_output}\n` : ''

    const systemPrompt = [
      header,
      rules,
      templateHint,
      example
    ].join('\n\n')
    
    const userPrompt = [
      'TASK: Generate professional release notes based on the categorized Linear issues below.',
      'IMPORTANT: Create an engaging, professional heading that captures the release theme and version.',
      body,
    ].join('\n\n')

    return { systemPrompt, userPrompt }
  }
}
