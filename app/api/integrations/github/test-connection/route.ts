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

    // Get GitHub integration
    const { data: integration, error: integrationError } = await supabase
      .from('integrations')
      .select('*')
      .eq('organization_id', session.user.id)
      .eq('type', 'github')
      .single()

    if (integrationError || !integration) {
      return NextResponse.json({
        success: false,
        error: 'GitHub integration not found',
        tests: []
      }, { status: 404 })
    }

    const tests = []
    let overallSuccess = true
    
    // Handle both old and new credential structures
    let accessToken: string | undefined
    if (integration.encrypted_credentials?.access_token) {
      accessToken = integration.encrypted_credentials.access_token
    } else if (integration.access_token) {
      accessToken = integration.access_token
    }

    if (!accessToken) {
      return NextResponse.json({
        success: false,
        error: 'No access token found in integration credentials',
        tests: []
      }, { status: 400 })
    }

    // Test 1: Basic Authentication
    try {
      const userResponse = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `token ${accessToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'ReleaseNoteAI'
        }
      })

      if (userResponse.ok) {
        const userData = await userResponse.json()
        tests.push({
          name: 'Authentication',
          status: 'passed',
          message: `Successfully authenticated as ${userData.login}`,
          responseTime: userResponse.headers.get('x-response-time') || 'N/A'
        })
      } else {
        overallSuccess = false
        tests.push({
          name: 'Authentication',
          status: 'failed',
          message: `Authentication failed: ${userResponse.status} ${userResponse.statusText}`,
          error: 'Invalid or expired access token'
        })
      }
    } catch (error) {
      overallSuccess = false
      tests.push({
        name: 'Authentication',
        status: 'failed',
        message: 'Network error during authentication test',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }

    // Test 2: Repository Access
    try {
      const reposResponse = await fetch('https://api.github.com/user/repos?per_page=5&sort=updated', {
        headers: {
          'Authorization': `token ${accessToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'ReleaseNoteAI'
        }
      })

      if (reposResponse.ok) {
        const repos = await reposResponse.json()
        tests.push({
          name: 'Repository Access',
          status: 'passed',
          message: `Successfully accessed repositories (${repos.length} found)`,
          details: repos.map((repo: any) => ({
            name: repo.name,
            private: repo.private,
            permissions: repo.permissions
          }))
        })
      } else {
        tests.push({
          name: 'Repository Access',
          status: 'warning',
          message: `Limited repository access: ${reposResponse.status}`,
          error: 'May need additional permissions'
        })
      }
    } catch (error) {
      tests.push({
        name: 'Repository Access',
        status: 'failed',
        message: 'Failed to test repository access',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }

    // Test 3: Rate Limits
    try {
      const rateLimitResponse = await fetch('https://api.github.com/rate_limit', {
        headers: {
          'Authorization': `token ${accessToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'ReleaseNoteAI'
        }
      })

      if (rateLimitResponse.ok) {
        const rateLimitData = await rateLimitResponse.json()
        const coreLimit = rateLimitData.resources.core
        const remaining = coreLimit.remaining
        const limit = coreLimit.limit
        
        let status = 'passed'
        let message = `Rate limit: ${remaining}/${limit} remaining`
        
        if (remaining < limit * 0.1) {
          status = 'warning'
          message += ' (Very low remaining requests)'
        } else if (remaining < limit * 0.25) {
          status = 'warning'
          message += ' (Low remaining requests)'
        }

        tests.push({
          name: 'Rate Limits',
          status,
          message,
          details: {
            core: coreLimit,
            search: rateLimitData.resources.search,
            graphql: rateLimitData.resources.graphql
          }
        })
      } else {
        tests.push({
          name: 'Rate Limits',
          status: 'warning',
          message: 'Unable to check rate limits',
          error: 'Rate limit endpoint not accessible'
        })
      }
    } catch (error) {
      tests.push({
        name: 'Rate Limits',
        status: 'failed',
        message: 'Failed to check rate limits',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }

    // Test 4: Webhook Capability (if configured)
    try {
      const hooksResponse = await fetch('https://api.github.com/user/repos?per_page=1', {
        headers: {
          'Authorization': `token ${accessToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'ReleaseNoteAI'
        }
      })

      if (hooksResponse.ok) {
        const repos = await hooksResponse.json()
        if (repos.length > 0) {
          const testRepo = repos[0]
          const webhooksResponse = await fetch(`https://api.github.com/repos/${testRepo.full_name}/hooks`, {
            headers: {
              'Authorization': `token ${accessToken}`,
              'Accept': 'application/vnd.github.v3+json',
              'User-Agent': 'ReleaseNoteAI'
            }
          })

          if (webhooksResponse.ok) {
            tests.push({
              name: 'Webhook Access',
              status: 'passed',
              message: 'Can access webhook configuration',
              details: { testedRepo: testRepo.full_name }
            })
          } else {
            tests.push({
              name: 'Webhook Access',
              status: 'warning',
              message: 'Limited webhook access - may need admin permissions',
              details: { testedRepo: testRepo.full_name }
            })
          }
        }
      }
    } catch (error) {
      tests.push({
        name: 'Webhook Access',
        status: 'info',
        message: 'Webhook test skipped',
        error: 'No repositories available for testing'
      })
    }

    // Test 5: API Endpoints Used by Release Notes
    const endpoints = [
      { url: 'https://api.github.com/user/repos', name: 'Repositories' },
      { url: 'https://api.github.com/search/repositories?q=user:test&per_page=1', name: 'Search' }
    ]

    for (const endpoint of endpoints) {
      try {
        const endpointResponse = await fetch(endpoint.url, {
          headers: {
            'Authorization': `token ${accessToken}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'ReleaseNoteAI'
          }
        })

        tests.push({
          name: `${endpoint.name} API`,
          status: endpointResponse.ok ? 'passed' : 'warning',
          message: endpointResponse.ok 
            ? `${endpoint.name} API accessible`
            : `${endpoint.name} API returned ${endpointResponse.status}`,
          responseTime: endpointResponse.headers.get('x-response-time') || 'N/A'
        })
      } catch (error) {
        tests.push({
          name: `${endpoint.name} API`,
          status: 'failed',
          message: `Failed to test ${endpoint.name} API`,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    // Update integration test timestamp
    await supabase
      .from('integrations')
      .update({ 
        updated_at: new Date().toISOString(),
        last_test_at: new Date().toISOString()
      })
      .eq('id', integration.id)

    return NextResponse.json({
      success: overallSuccess,
      timestamp: new Date().toISOString(),
      integration: {
        id: integration.id,
        type: 'github',
        connected_at: integration.created_at
      },
      tests,
      summary: {
        total: tests.length,
        passed: tests.filter(t => t.status === 'passed').length,
        warnings: tests.filter(t => t.status === 'warning').length,
        failed: tests.filter(t => t.status === 'failed').length
      }
    })

  } catch (error) {
    console.error('GitHub connection test error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Connection test failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
      tests: []
    }, { status: 500 })
  }
}