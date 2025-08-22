/**
 * GitHub API Service
 * Handles GitHub API interactions for the Next.js app
 * Based on the comprehensive implementation from /project/server
 */

export interface GitHubRepository {
  id: number
  name: string
  full_name: string
  description?: string
  private: boolean
  html_url: string
  clone_url: string
  default_branch: string
  created_at: string
  updated_at: string
  language?: string
}

export interface GitHubCommit {
  sha: string
  message: string
  author: {
    name: string
    email: string
    date: string
  }
  url: string
}

export interface GitHubIssue {
  id: number
  number: number
  title: string
  body?: string
  state: 'open' | 'closed'
  created_at: string
  updated_at: string
  closed_at?: string
  html_url: string
  user: {
    login: string
    avatar_url: string
  }
  labels: Array<{
    name: string
    color: string
  }>
}

export interface GitHubPullRequest {
  id: number
  number: number
  title: string
  body?: string
  state: 'open' | 'closed' | 'merged'
  created_at: string
  updated_at: string
  merged_at?: string
  html_url: string
  user: {
    login: string
    avatar_url: string
  }
  head: {
    ref: string
    sha: string
  }
  base: {
    ref: string
    sha: string
  }
}

export interface GitHubRelease {
  id: number
  tag_name: string
  name: string
  body?: string
  draft: boolean
  prerelease: boolean
  created_at: string
  published_at?: string
  html_url: string
}

export class GitHubService {
  private baseUrl = 'https://api.github.com'
  private accessToken: string

  constructor(accessToken: string) {
    if (!accessToken) {
      throw new Error('GitHub access token is required')
    }
    this.accessToken = accessToken
  }

  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'ReleaseNotesApp/1.0',
        ...options.headers,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`GitHub API error (${response.status}): ${errorText}`)
    }

    return response.json()
  }

  /**
   * Get authenticated user information
   */
  async getUser() {
    return this.makeRequest<{
      id: number
      login: string
      name: string
      email: string
      avatar_url: string
      public_repos: number
      total_private_repos: number
      owned_private_repos: number
    }>('/user')
  }

  /**
   * Get user's repositories
   */
  async getRepositories(options: {
    sort?: 'created' | 'updated' | 'pushed' | 'full_name'
    direction?: 'asc' | 'desc'
    per_page?: number
    page?: number
  } = {}): Promise<GitHubRepository[]> {
    const params = new URLSearchParams()
    if (options.sort) params.set('sort', options.sort)
    if (options.direction) params.set('direction', options.direction)
    if (options.per_page) params.set('per_page', options.per_page.toString())
    if (options.page) params.set('page', options.page.toString())

    const query = params.toString() ? `?${params.toString()}` : ''
    return this.makeRequest<GitHubRepository[]>(`/user/repos${query}`)
  }

  /**
   * Get repository details
   */
  async getRepository(owner: string, repo: string): Promise<GitHubRepository> {
    return this.makeRequest<GitHubRepository>(`/repos/${owner}/${repo}`)
  }

  /**
   * Get commits from a repository
   */
  async getCommits(
    owner: string,
    repo: string,
    options: {
      sha?: string
      path?: string
      since?: string
      until?: string
      per_page?: number
      page?: number
    } = {}
  ): Promise<GitHubCommit[]> {
    const params = new URLSearchParams()
    if (options.sha) params.set('sha', options.sha)
    if (options.path) params.set('path', options.path)
    if (options.since) params.set('since', options.since)
    if (options.until) params.set('until', options.until)
    if (options.per_page) params.set('per_page', options.per_page.toString())
    if (options.page) params.set('page', options.page.toString())

    const query = params.toString() ? `?${params.toString()}` : ''
    const commits = await this.makeRequest<any[]>(`/repos/${owner}/${repo}/commits${query}`)
    
    return commits.map(commit => ({
      sha: commit.sha,
      message: commit.commit.message,
      author: {
        name: commit.commit.author.name,
        email: commit.commit.author.email,
        date: commit.commit.author.date,
      },
      url: commit.html_url,
    }))
  }

  /**
   * Get a single commit by SHA
   */
  async getCommit(owner: string, repo: string, sha: string): Promise<GitHubCommit> {
    const commit = await this.makeRequest<any>(`/repos/${owner}/${repo}/commits/${sha}`)
    return {
      sha: commit.sha,
      message: commit.commit.message,
      author: {
        name: commit.commit.author.name,
        email: commit.commit.author.email,
        date: commit.commit.author.date,
      },
      url: commit.html_url,
    }
  }

  /**
   * Get issues from a repository
   */
  async getIssues(
    owner: string,
    repo: string,
    options: {
      state?: 'open' | 'closed' | 'all'
      labels?: string
      sort?: 'created' | 'updated' | 'comments'
      direction?: 'asc' | 'desc'
      since?: string
      per_page?: number
      page?: number
    } = {}
  ): Promise<GitHubIssue[]> {
    const params = new URLSearchParams()
    if (options.state) params.set('state', options.state)
    if (options.labels) params.set('labels', options.labels)
    if (options.sort) params.set('sort', options.sort)
    if (options.direction) params.set('direction', options.direction)
    if (options.since) params.set('since', options.since)
    if (options.per_page) params.set('per_page', options.per_page.toString())
    if (options.page) params.set('page', options.page.toString())

    const query = params.toString() ? `?${params.toString()}` : ''
    return this.makeRequest<GitHubIssue[]>(`/repos/${owner}/${repo}/issues${query}`)
  }

  /**
   * Get pull requests from a repository
   */
  async getPullRequests(
    owner: string,
    repo: string,
    options: {
      state?: 'open' | 'closed' | 'all'
      sort?: 'created' | 'updated' | 'popularity' | 'long-running'
      direction?: 'asc' | 'desc'
      per_page?: number
      page?: number
    } = {}
  ): Promise<GitHubPullRequest[]> {
    const params = new URLSearchParams()
    if (options.state) params.set('state', options.state)
    if (options.sort) params.set('sort', options.sort)
    if (options.direction) params.set('direction', options.direction)
    if (options.per_page) params.set('per_page', options.per_page.toString())
    if (options.page) params.set('page', options.page.toString())

    const query = params.toString() ? `?${params.toString()}` : ''
    return this.makeRequest<GitHubPullRequest[]>(`/repos/${owner}/${repo}/pulls${query}`)
  }

  /**
   * Get releases from a repository
   */
  async getReleases(
    owner: string,
    repo: string,
    options: {
      per_page?: number
      page?: number
    } = {}
  ): Promise<GitHubRelease[]> {
    const params = new URLSearchParams()
    if (options.per_page) params.set('per_page', options.per_page.toString())
    if (options.page) params.set('page', options.page.toString())

    const query = params.toString() ? `?${params.toString()}` : ''
    return this.makeRequest<GitHubRelease[]>(`/repos/${owner}/${repo}/releases${query}`)
  }

  /**
   * Generate release notes for a repository between two tags/commits
   */
  async generateReleaseNotes(
    owner: string,
    repo: string,
    options: {
      tag_name: string
      target_commitish?: string
      previous_tag_name?: string
      configuration_file_path?: string
    }
  ): Promise<{
    name: string
    body: string
  }> {
    return this.makeRequest(`/repos/${owner}/${repo}/releases/generate-notes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(options),
    })
  }
}

// Export alias for backward compatibility
export { GitHubService as GitHubClient }