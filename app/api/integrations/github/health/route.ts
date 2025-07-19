import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { integrationId } = await request.json()

    // Get GitHub integration
    const { data: integration, error: integrationError } = await supabase
      .from('integrations')
      .select('encrypted_credentials')
      .eq('id', integrationId || 'github')
      .eq('organization_id', session.user.id)
      .eq('type', 'github')
      .single()

    if (integrationError || !integration) {
      return NextResponse.json({
        status: 'error',
        lastChecked: new Date().toISOString(),
        details: {
          connection: false,
          authentication: false,
          permissions: false
        },
        issues: [{
          type: 'error',
          message: 'GitHub integration not found or not configured',
          solution: 'Please connect your GitHub account in the integrations page',
          docs: 'https://docs.github.com/en/developers/apps'
        }]
      })
    }

    const accessToken = integration.encrypted_credentials?.access_token

    const startTime = Date.now()
    const health = {
      status: 'healthy' as const,
      lastChecked: new Date().toISOString(),
      responseTime: 0,
      details: {
        connection: true,
        authentication: true,
        permissions: true,
        rateLimit: {
          remaining: 5000,
          limit: 5000,
          resetAt: new Date(Date.now() + 3600000).toISOString()
        }
      },
      metrics: {
        totalRequests: 0,
        successRate: 100,
        avgResponseTime: 0
      },
      issues: [] as Array<{
        type: 'error' | 'warning' | 'info'
        message: string
        solution?: string
        docs?: string
      }>
    }

    try {
      // Test GitHub API connection
      const githubResponse = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `token ${accessToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'ReleaseNoteAI'
        }
      })

      health.responseTime = Date.now() - startTime

      if (!githubResponse.ok) {
        health.status = 'error'
        health.details.authentication = false
        
        if (githubResponse.status === 401) {
          health.issues.push({
            type: 'error',
            message: 'GitHub authentication token has expired or is invalid',
            solution: 'Please reconnect your GitHub account to refresh the access token',
            docs: 'https://docs.github.com/en/authentication'
          })
        } else {
          health.issues.push({
            type: 'error',
            message: `GitHub API returned ${githubResponse.status}: ${githubResponse.statusText}`,
            solution: 'Check GitHub API status and try again later'
          })
        }
      } else {
        const userData = await githubResponse.json()
        
        // Check rate limits
        const rateLimitRemaining = parseInt(githubResponse.headers.get('x-ratelimit-remaining') || '0')
        const rateLimitLimit = parseInt(githubResponse.headers.get('x-ratelimit-limit') || '5000')
        const rateLimitReset = parseInt(githubResponse.headers.get('x-ratelimit-reset') || '0')

        health.details.rateLimit = {
          remaining: rateLimitRemaining,
          limit: rateLimitLimit,
          resetAt: new Date(rateLimitReset * 1000).toISOString()
        }

        // Rate limit warnings
        const usagePercent = ((rateLimitLimit - rateLimitRemaining) / rateLimitLimit) * 100
        if (usagePercent > 90) {
          health.status = 'warning'
          health.issues.push({
            type: 'warning',
            message: 'GitHub API rate limit is almost exhausted',
            solution: 'Consider reducing API calls or wait for rate limit reset',
            docs: 'https://docs.github.com/en/rest/overview/resources-in-the-rest-api#rate-limiting'
          })
        } else if (usagePercent > 75) {
          health.issues.push({
            type: 'info',
            message: 'GitHub API rate limit usage is high',
            solution: 'Monitor API usage to avoid hitting rate limits'
          })
        }

        // Test repository access
        try {
          const reposResponse = await fetch('https://api.github.com/user/repos?per_page=1', {
            headers: {
              'Authorization': `token ${accessToken}`,
              'Accept': 'application/vnd.github.v3+json',
              'User-Agent': 'ReleaseNoteAI'
            }
          })

          if (!reposResponse.ok) {
            health.status = 'warning'
            health.details.permissions = false
            health.issues.push({
              type: 'warning',
              message: 'Limited access to repositories',
              solution: 'Check GitHub token permissions for repository access',
              docs: 'https://docs.github.com/en/developers/apps/building-oauth-apps/scopes-for-oauth-apps'
            })
          }
        } catch (repoError) {
          health.issues.push({
            type: 'info',
            message: 'Unable to test repository permissions',
            solution: 'This may not affect basic functionality'
          })
        }

        // Performance metrics (mock data for now)
        health.metrics = {
          totalRequests: Math.floor(Math.random() * 1000) + 100,
          successRate: Math.random() * 10 + 90, // 90-100%
          avgResponseTime: health.responseTime
        }
      }

    } catch (networkError) {
      health.status = 'error'
      health.details.connection = false
      health.issues.push({
        type: 'error',
        message: 'Unable to connect to GitHub API',
        solution: 'Check your internet connection and GitHub API status',
        docs: 'https://www.githubstatus.com/'
      })
    }

    return NextResponse.json(health)

  } catch (error) {
    console.error('GitHub health check error:', error)
    
    return NextResponse.json({
      status: 'error',
      lastChecked: new Date().toISOString(),
      details: {
        connection: false,
        authentication: false,
        permissions: false
      },
      issues: [{
        type: 'error',
        message: 'Health check failed due to internal error',
        solution: 'Please try again or contact support if the issue persists'
      }]
    }, { status: 500 })
  }
}