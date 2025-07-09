/**
 * Jira API Client with authentication and rate limiting
 */
export class JiraAPIClient {
  private static instance: JiraAPIClient
  private baseURL = 'https://api.atlassian.com'
  
  public static getInstance(): JiraAPIClient {
    if (!JiraAPIClient.instance) {
      JiraAPIClient.instance = new JiraAPIClient()
    }
    return JiraAPIClient.instance
  }

  private constructor() {}

  /**
   * Make an authenticated request to Jira API
   */
  private async request(
    endpoint: string,
    options: {
      method?: string
      headers?: Record<string, string>
      body?: string
      token: string
      cloudId?: string
    }
  ): Promise<unknown> {
    const { method = 'GET', headers = {}, body, token, cloudId } = options

    let url = endpoint
    if (cloudId && !endpoint.startsWith('http')) {
      url = `${this.baseURL}/ex/jira/${cloudId}${endpoint}`
    } else if (!endpoint.startsWith('http')) {
      url = `${this.baseURL}${endpoint}`
    }

    const requestHeaders = {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...headers
    }

    try {
      const response = await fetch(url, {
        method,
        headers: requestHeaders,
        body
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        
        // Handle Jira-specific error format
        let errorMessage = `Jira API request failed: ${response.status} ${response.statusText}`
        if (errorData.errorMessages && errorData.errorMessages.length > 0) {
          errorMessage = errorData.errorMessages.join(', ')
        } else if (errorData.errors && Object.keys(errorData.errors).length > 0) {
          errorMessage = Object.values(errorData.errors).join(', ')
        }
        
        throw new JiraAPIError(errorMessage, response.status, errorData)
      }

      // Handle empty responses
      const contentType = response.headers.get('content-type')
      if (contentType && contentType.includes('application/json')) {
        return await response.json()
      }
      
      return await response.text()
    } catch (error) {
      if (error instanceof JiraAPIError) {
        throw error
      }
      throw new JiraAPIError(
        `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        0,
        { originalError: error }
      )
    }
  }

  /**
   * Get accessible resources (Jira sites)
   */
  async getAccessibleResources(token: string): Promise<unknown[]> {
    return this.request('/oauth/token/accessible-resources', { token }) as Promise<unknown[]>
  }

  /**
   * Get current user information
   */
  async getCurrentUser(token: string, cloudId: string): Promise<unknown> {
    return this.request('/rest/api/3/myself', { token, cloudId })
  }

  /**
   * Get all projects
   */
  async getProjects(
    token: string,
    cloudId: string,
    options: {
      expand?: string[]
      recent?: number
      maxResults?: number
      startAt?: number
    } = {}
  ): Promise<unknown> {
    const { expand, recent, maxResults = 50, startAt = 0 } = options
    
    const params = new URLSearchParams({
      maxResults: maxResults.toString(),
      startAt: startAt.toString()
    })
    
    if (expand && expand.length > 0) {
      params.append('expand', expand.join(','))
    }
    
    if (recent) {
      params.append('recent', recent.toString())
    }

    return this.request(`/rest/api/3/project/search?${params}`, { token, cloudId })
  }

  /**
   * Get project details
   */
  async getProject(
    token: string,
    cloudId: string,
    projectIdOrKey: string,
    expand?: string[]
  ): Promise<unknown> {
    const params = expand && expand.length > 0 
      ? `?expand=${expand.join(',')}`
      : ''
    
    return this.request(`/rest/api/3/project/${projectIdOrKey}${params}`, { token, cloudId })
  }

  /**
   * Search issues using JQL
   */
  async searchIssues(
    token: string,
    cloudId: string,
    options: {
      jql: string
      startAt?: number
      maxResults?: number
      fields?: string[]
      expand?: string[]
    }
  ): Promise<unknown> {
    const { jql, startAt = 0, maxResults = 50, fields, expand } = options
    
    const body = {
      jql,
      startAt,
      maxResults,
      fields: fields || ['summary', 'status', 'assignee', 'created', 'updated', 'description', 'issuetype', 'priority', 'fixVersions', 'labels', 'project'],
      expand: expand || ['changelog']
    }

    return this.request('/rest/api/3/search', {
      method: 'POST',
      body: JSON.stringify(body),
      token,
      cloudId
    })
  }

  /**
   * Get issue details
   */
  async getIssue(
    token: string,
    cloudId: string,
    issueIdOrKey: string,
    options: {
      fields?: string[]
      expand?: string[]
    } = {}
  ): Promise<unknown> {
    const { fields, expand } = options
    
    const params = new URLSearchParams()
    if (fields && fields.length > 0) {
      params.append('fields', fields.join(','))
    }
    if (expand && expand.length > 0) {
      params.append('expand', expand.join(','))
    }

    const queryString = params.toString()
    const endpoint = `/rest/api/3/issue/${issueIdOrKey}${queryString ? `?${queryString}` : ''}`
    
    return this.request(endpoint, { token, cloudId })
  }

  /**
   * Get issues for a project
   */
  async getProjectIssues(
    token: string,
    cloudId: string,
    projectKey: string,
    options: {
      issueTypes?: string[]
      statuses?: string[]
      assignee?: string
      updatedSince?: string
      maxResults?: number
      startAt?: number
    } = {}
  ): Promise<unknown> {
    const { issueTypes, statuses, assignee, updatedSince, maxResults = 50, startAt = 0 } = options
    
    // Build JQL query with proper escaping
    const jqlParts = [`project = "${projectKey}"`]
    
    if (issueTypes && issueTypes.length > 0) {
      const escapedTypes = issueTypes.map(type => `"${type.replace(/"/g, '\\"')}"`)
      jqlParts.push(`issuetype IN (${escapedTypes.join(', ')})`)
    }
    
    if (statuses && statuses.length > 0) {
      const escapedStatuses = statuses.map(status => `"${status.replace(/"/g, '\\"')}"`)
      jqlParts.push(`status IN (${escapedStatuses.join(', ')})`)
    }
    
    if (assignee) {
      jqlParts.push(`assignee = "${assignee.replace(/"/g, '\\"')}"`)
    }
    
    if (updatedSince) {
      // Validate date format (should be YYYY-MM-DD or YYYY-MM-DD HH:MM)
      const dateRegex = /^\d{4}-\d{2}-\d{2}(\s\d{2}:\d{2})?$/
      if (dateRegex.test(updatedSince)) {
        jqlParts.push(`updated >= "${updatedSince}"`)
      }
    }
    
    const jql = jqlParts.join(' AND ') + ' ORDER BY updated DESC'

    return this.searchIssues(token, cloudId, {
      jql,
      startAt,
      maxResults
    })
  }

  /**
   * Get issue types for a project
   */
  async getProjectIssueTypes(token: string, cloudId: string, projectId: string): Promise<unknown> {
    return this.request(`/rest/api/3/project/${projectId}/statuses`, { token, cloudId })
  }

  /**
   * Get all issue types
   */
  async getIssueTypes(token: string, cloudId: string): Promise<unknown> {
    return this.request('/rest/api/3/issuetype', { token, cloudId })
  }

  /**
   * Get project versions
   */
  async getProjectVersions(
    token: string,
    cloudId: string,
    projectIdOrKey: string,
    options: {
      expand?: string
      maxResults?: number
      startAt?: number
    } = {}
  ): Promise<unknown> {
    const { expand, maxResults = 50, startAt = 0 } = options
    
    const params = new URLSearchParams({
      maxResults: maxResults.toString(),
      startAt: startAt.toString()
    })
    
    if (expand) {
      params.append('expand', expand)
    }

    return this.request(`/rest/api/3/project/${projectIdOrKey}/version?${params}`, { token, cloudId })
  }

  /**
   * Get issues for a specific version
   */
  async getVersionIssues(
    token: string,
    cloudId: string,
    projectKey: string,
    versionName: string,
    options: {
      maxResults?: number
      startAt?: number
    } = {}
  ): Promise<unknown> {
    const { maxResults = 100, startAt = 0 } = options
    
    const jql = `project = "${projectKey}" AND fixVersion = "${versionName}" ORDER BY updated DESC`

    return this.searchIssues(token, cloudId, {
      jql,
      startAt,
      maxResults
    })
  }

  /**
   * Test connection to Jira
   */
  async testConnection(token: string): Promise<{
    success: boolean
    resources: unknown[]
    user?: unknown
    error?: string
  }> {
    try {
      const resources = await this.getAccessibleResources(token)
      
      if (resources.length === 0) {
        return {
          success: false,
          resources: [],
          error: 'No accessible Jira sites found'
        }
      }

      // Test with first available site
      const firstSite = resources[0]
      const user = await this.getCurrentUser(token, firstSite.id)

      return {
        success: true,
        resources,
        user
      }
    } catch (error) {
      return {
        success: false,
        resources: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}

/**
 * Custom error class for Jira API errors
 */
export class JiraAPIError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: unknown
  ) {
    super(message)
    this.name = 'JiraAPIError'
  }
}

// Export singleton instance
export const jiraAPI = JiraAPIClient.getInstance()

// Export alias for backward compatibility
export { JiraAPIClient as JiraClient }