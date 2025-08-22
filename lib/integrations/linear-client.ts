import type { ProjectFilterInput } from '../types/linear'

/**
 * Linear API Client with GraphQL support
 */
export class LinearAPIError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: unknown
  ) {
    super(message)
    this.name = 'LinearAPIError'
  }
}

export class LinearAPIClient {
  private static instance: LinearAPIClient
  private baseURL = 'https://api.linear.app/graphql'
  
  public static getInstance(): LinearAPIClient {
    if (!LinearAPIClient.instance) {
      LinearAPIClient.instance = new LinearAPIClient()
    }
    return LinearAPIClient.instance
  }

  private constructor() {}

  /**
   * Make a GraphQL request to Linear API
   */
  private async request(
    query: string,
    variables: Record<string, unknown> = {},
    token: string
  ): Promise<unknown> {
    // Basic retry on 429 with server-provided Retry-After header (seconds)
    let attempt = 0
    const maxAttempts = 2

    // Small helper to sleep
    const sleep = (ms: number) => new Promise(res => setTimeout(res, ms))

    while (attempt < maxAttempts) {
      try {
        // Dev diagnostic (no secrets): log minimal request info
        try {
          const preview = query.replace(/\s+/g, ' ').slice(0, 200)
          console.debug('[Linear Client] Request', { attempt, preview, variables })
        } catch {}
        const response = await fetch(this.baseURL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            query,
            variables
          })
        })

        if (!response.ok) {
          // Attempt to read error body for more context
          let body: any = null
          try {
            body = await response.json()
          } catch (_) {
            // ignore parse errors
          }

          // Check for rate limiting
          if (response.status === 429) {
            const retryAfter = response.headers.get('retry-after')
            if (attempt < maxAttempts - 1) {
              const waitMs = Math.min( (Number(retryAfter) || 2) * 1000, 10_000)
              await sleep(waitMs)
              attempt++
              continue
            }
            throw new LinearAPIError(
              `Linear API rate limit exceeded. Retry after: ${retryAfter || 'unknown'}`,
              response.status,
              { retryAfter, body }
            )
          }
          
          console.error('[Linear Client] HTTP error', { status: response.status, statusText: response.statusText, body })
          throw new LinearAPIError(
            `Linear API request failed: ${response.status} ${response.statusText}`,
            response.status,
            body
          )
        }

        const data = await response.json()
        
        if (data.errors && data.errors.length > 0) {
          console.error('[Linear Client] GraphQL errors', data.errors)
          throw new LinearAPIError(
            `GraphQL errors: ${Array.isArray(data.errors) ? data.errors.map((e: { message?: string }) => e.message).join(', ') : ''}`,
            400,
            data.errors
          )
        }

        return data.data
      } catch (error) {
        // Only break out of loop for non-HTTP errors or after retries handled above
        if (attempt >= maxAttempts - 1) {
          throw error
        }
        // If the thrown error was not due to a 429 handled above, rethrow
        if (!(error instanceof LinearAPIError) || error.status !== 429) {
          throw error
        }
        // Otherwise, loop will continue due to continue in 429 branch
      }
    }

    throw new LinearAPIError('Unexpected error in Linear client request', 500)
  }

  /**
   * Get current user (viewer) information
   */
  async getViewer(token: string): Promise<unknown> {
    const query = `
      query {
        viewer {
          id
          name
          email
          displayName
          avatarUrl
          isMe
          organization {
            id
            name
            urlKey
            logoUrl
            userCount
            allowedAuthServices
          }
        }
      }
    `
    
    const data = await this.request(query, {}, token)
    if (data && typeof data === 'object' && 'viewer' in data) {
      return (data as { viewer: unknown }).viewer
    }
    return undefined
  }

  /**
   * Get organization information
   */
  async getOrganization(token: string): Promise<unknown> {
    const query = `
      query {
        organization {
          id
          name
          urlKey
          logoUrl
          userCount
          allowedAuthServices
          createdAt
          updatedAt
        }
      }
    `
    
    const data = await this.request(query, {}, token)
    if (data && typeof data === 'object' && 'organization' in data) {
      return (data as { organization: unknown }).organization
    }
    return undefined
  }

  /**
   * Get teams
   */
  async getTeams(
    token: string,
    options: {
      first?: number
      after?: string
    } = {}
  ): Promise<unknown> {
    const { first = 50, after } = options
    
    // Use a conservative field set to maximize compatibility with Linear's schema
    const query = `
      query GetTeams($first: Int!, $after: String) {
        teams(first: $first, after: $after) {
          nodes {
            id
            name
            key
            description
            color
            createdAt
            updatedAt
            organization {
              id
              name
            }
          }
          pageInfo {
            hasNextPage
            hasPreviousPage
            startCursor
            endCursor
          }
        }
      }
    `
    
    const data = await this.request(query, { first, after }, token)
    if (data && typeof data === 'object' && 'teams' in data) {
      return (data as { teams: unknown }).teams
    }
    return undefined
  }

  /**
   * Get issues with filters
   */
  async getIssues(
    token: string,
    options: {
      first?: number
      after?: string
      teamId?: string
      assigneeId?: string
      stateType?: 'backlog' | 'unstarted' | 'started' | 'completed' | 'canceled'
      updatedSince?: string
      orderBy?: string // intentionally ignored due to schema differences; default server ordering is sufficient
    } = {}
  ): Promise<unknown> {
    const { 
      first = 50, 
      after, 
      teamId, 
      assigneeId, 
      stateType,
      updatedSince,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      orderBy
    } = options
    
    // Build filter conditions
    const filters: string[] = []
    if (teamId) filters.push(`team: { id: { eq: \"${teamId}\" } }`)
    if (assigneeId) filters.push(`assignee: { id: { eq: \"${assigneeId}\" } }`)
    if (stateType) filters.push(`state: { type: { eq: "${stateType}" } }`)
    if (updatedSince) filters.push(`updatedAt: { gte: \"${updatedSince}\" }`)
    
    const filterString = filters.length > 0 ? `filter: { ${filters.join(', ')} }` : ''

    // Build issues() argument list without leaving a dangling comma when no filters are present
    const issueArgs = ['first: $first', 'after: $after']
    if (filterString) issueArgs.push(filterString)
    const issueArgsJoined = issueArgs.join(', ')
    
    const query = `
      query GetIssues($first: Int!, $after: String) {
        issues(${issueArgsJoined}) {
          nodes {
            id
            identifier
            number
            title
            description
            priority
            estimate
            url
            createdAt
            updatedAt
            completedAt
            canceledAt
            state {
              id
              name
              type
              color
            }
            team {
              id
              name
              key
            }
            assignee {
              id
              name
              displayName
              email
              avatarUrl
            }
            creator {
              id
              name
              displayName
              email
              avatarUrl
            }
            labels {
              nodes {
                id
                name
                color
              }
            }
            project {
              id
              name
              description
              color
              state
              progress
              startedAt
              completedAt
              targetDate
            }
          }
          pageInfo {
            hasNextPage
            hasPreviousPage
            startCursor
            endCursor
          }
        }
      }
    `
    
    const data = await this.request(query, { first, after }, token)
    if (data && typeof data === 'object' && 'issues' in data) {
      return (data as { issues: unknown }).issues
    }
    return undefined
  }

  /**
   * Get issue by ID
   */
  async getIssue(token: string, issueId: string): Promise<unknown> {
    const query = `
      query GetIssue($issueId: String!) {
        issue(id: $issueId) {
          id
          identifier
          number
          title
          description
          priority
          estimate
          url
          createdAt
          updatedAt
          completedAt
          canceledAt
          state {
            id
            name
            type
            color
          }
          team {
            id
            name
            key
          }
          assignee {
            id
            name
            displayName
            email
            avatarUrl
          }
          creator {
            id
            name
            displayName
            email
            avatarUrl
          }
          labels {
            nodes {
              id
              name
              color
            }
          }
          project {
            id
            name
            description
            color
            state
            startedAt
            completedAt
            targetDate
          }
          comments {
            nodes {
              id
              body
              createdAt
              user {
                id
                name
                displayName
              }
            }
          }
          history {
            nodes {
              id
              createdAt
              actor {
                id
                name
                displayName
              }
              fromState {
                id
                name
                type
              }
              toState {
                id
                name
                type
              }
            }
          }
        }
      }
    `
    
    const data = await this.request(query, { issueId }, token)
    if (data && typeof data === 'object' && 'issue' in data) {
      return (data as { issue: unknown }).issue
    }
    return undefined
  }

  /**
   * Get projects
   */
  async getProjects(
    token: string,
    options: {
      first?: number
      after?: string
    } = {}
  ): Promise<unknown> {
    const { first = 50, after } = options
    
    // Extremely conservative query: only basic scalar fields
    const query = `
      query GetProjects($first: Int!, $after: String) {
        projects(
          first: $first,
          after: $after
        ) {
          nodes {
            id
            name
            description
            color
            state
            startedAt
            completedAt
            targetDate
            progress
            url
            createdAt
            updatedAt
          }
          pageInfo {
            hasNextPage
            hasPreviousPage
            startCursor
            endCursor
          }
        }
      }
    `

    const variables: Record<string, unknown> = {
      first,
      after: after ?? null
    }

    const data = await this.request(query, variables, token)
    if (data && typeof data === 'object' && 'projects' in data) {
      return (data as { projects: unknown }).projects
    }
    return undefined
  }

  /**
   * Search issues
   */
  async searchIssues(
    token: string,
    query: string,
    options: {
      first?: number
      teamId?: string
    } = {}
  ): Promise<unknown> {
    const { first = 50, teamId } = options
    
    const searchQuery = `
      query SearchIssues($query: String!, $first: Int!, $teamId: String) {
        issueSearch(
          query: $query,
          first: $first,
          teamId: $teamId
        ) {
          nodes {
            id
            identifier
            number
            title
            description
            priority
            url
            createdAt
            updatedAt
            state {
              id
              name
              type
              color
            }
            team {
              id
              name
              key
            }
            assignee {
              id
              name
              displayName
              avatarUrl
            }
            labels {
              nodes {
                id
                name
                color
              }
            }
          }
          pageInfo {
            hasNextPage
            hasPreviousPage
            startCursor
            endCursor
          }
        }
      }
    `
    
    const variables: Record<string, unknown> = {
      query,
      first,
      teamId: teamId ?? null
    }
    const data = await this.request(searchQuery, variables, token)
    if (data && typeof data === 'object' && 'issueSearch' in data) {
      return (data as { issueSearch: unknown }).issueSearch
    }
    return undefined
  }

  /**
   * Test connection to Linear
   */
  async testConnection(token: string): Promise<{
    success: boolean
    user?: Record<string, unknown>
    organization?: Record<string, unknown>
    error?: string
  }> {
    try {
      const viewer = await this.getViewer(token)
      
      if (!viewer) {
        return {
          success: false,
          error: 'Unable to fetch user information'
        }
      }

      return {
        success: true,
        user: viewer,
        organization: (viewer as any).organization
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}

// Export singleton instance
export const linearAPI = LinearAPIClient.getInstance()

// Export alias for backward compatibility
export { LinearAPIClient as LinearClient }
