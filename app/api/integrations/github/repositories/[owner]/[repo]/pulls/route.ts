import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { GitHubService } from '@/lib/integrations/github'

/**
 * Get pull requests from a specific GitHub repository
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { owner: string; repo: string } }
) {
  try {
    const { owner, repo } = params
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()

    if (sessionError || !session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get GitHub integration for the user
    const { data: integration, error: integrationError } = await supabase
      .from('integrations')
      .select('encrypted_credentials')
      .eq('type', 'github')
      .eq('organization_id', session.user.id)
      .single()

    if (integrationError || !integration) {
      return NextResponse.json(
        { error: 'GitHub integration not found' },
        { status: 404 }
      )
    }

    const accessToken = integration.encrypted_credentials?.access_token
    if (!accessToken) {
      return NextResponse.json(
        { error: 'GitHub access token not found' },
        { status: 400 }
      )
    }

    // Parse query parameters
    const url = new URL(request.url)
    const state = url.searchParams.get('state') as 'open' | 'closed' | 'all' || 'closed'
    const sort = url.searchParams.get('sort') as 'created' | 'updated' | 'popularity' | 'long-running' || 'updated'
    const direction = url.searchParams.get('direction') as 'asc' | 'desc' || 'desc'
    const per_page = parseInt(url.searchParams.get('per_page') || '30')
    const page = parseInt(url.searchParams.get('page') || '1')

    // Initialize GitHub service and fetch pull requests
    const github = new GitHubService(accessToken)
    const pullRequests = await github.getPullRequests(owner, repo, {
      state,
      sort,
      direction,
      per_page: Math.min(per_page, 100),
      page
    })

    return NextResponse.json({
      pull_requests: pullRequests,
      repository: { owner, repo },
      pagination: {
        page,
        per_page,
        total: pullRequests.length
      }
    })

  } catch (error) {
    console.error('GitHub pull requests fetch error:', error)
    
    if (error instanceof Error && error.message.includes('GitHub API error')) {
      return NextResponse.json(
        { error: 'Failed to fetch pull requests from GitHub', details: error.message },
        { status: 502 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}