import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { GitHubService } from '@/lib/integrations/github'

/**
 * Get commits from a specific GitHub repository
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
    const sha = url.searchParams.get('sha') || undefined
    const path = url.searchParams.get('path') || undefined
    const since = url.searchParams.get('since') || undefined
    const until = url.searchParams.get('until') || undefined
    const per_page = parseInt(url.searchParams.get('per_page') || '30')
    const page = parseInt(url.searchParams.get('page') || '1')

    // Initialize GitHub service and fetch commits
    const github = new GitHubService(accessToken)
    const commits = await github.getCommits(owner, repo, {
      sha,
      path,
      since,
      until,
      per_page: Math.min(per_page, 100),
      page
    })

    return NextResponse.json({
      commits,
      repository: { owner, repo },
      pagination: {
        page,
        per_page,
        total: commits.length
      }
    })

  } catch (error) {
    console.error('GitHub commits fetch error:', error)
    
    if (error instanceof Error && error.message.includes('GitHub API error')) {
      return NextResponse.json(
        { error: 'Failed to fetch commits from GitHub', details: error.message },
        { status: 502 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}