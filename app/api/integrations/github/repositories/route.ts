import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { GitHubService } from '@/lib/integrations/github'

/**
 * Get GitHub repositories for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()

    if (sessionError || !session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get GitHub integration for the user
    const { data: integration, error: integrationError } = await supabase
      .from('integrations')
      .select('config')
      .eq('type', 'github')
      .eq('organization_id', session.user.id)
      .single()

    if (integrationError || !integration) {
      return NextResponse.json(
        { error: 'GitHub integration not found. Please connect your GitHub account first.' },
        { status: 404 }
      )
    }

    const accessToken = integration.config?.access_token
    if (!accessToken) {
      return NextResponse.json(
        { error: 'GitHub access token not found. Please reconnect your GitHub account.' },
        { status: 400 }
      )
    }

    // Parse query parameters
    const url = new URL(request.url)
    const sort = url.searchParams.get('sort') as 'created' | 'updated' | 'pushed' | 'full_name' || 'updated'
    const direction = url.searchParams.get('direction') as 'asc' | 'desc' || 'desc'
    const per_page = parseInt(url.searchParams.get('per_page') || '50')
    const page = parseInt(url.searchParams.get('page') || '1')

    // Initialize GitHub service and fetch repositories
    const github = new GitHubService(accessToken)
    const repositories = await github.getRepositories({
      sort,
      direction,
      per_page: Math.min(per_page, 100), // Limit to 100 per page
      page
    })

    return NextResponse.json({
      repositories,
      pagination: {
        page,
        per_page,
        total: repositories.length
      }
    })

  } catch (error) {
    console.error('GitHub repositories fetch error:', error)
    
    if (error instanceof Error && error.message.includes('GitHub API error')) {
      return NextResponse.json(
        { error: 'Failed to fetch repositories from GitHub', details: error.message },
        { status: 502 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}