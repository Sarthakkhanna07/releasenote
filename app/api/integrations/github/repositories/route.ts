import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { GitHubService } from '@/lib/integrations/github'

/**
 * Get GitHub repositories for the authenticated user
 */
export async function GET(request: NextRequest) {
  console.log('[API] /api/integrations/github/repositories - called');
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    console.log('[API] Session:', session, 'SessionError:', sessionError);

    if (sessionError || !session?.user) {
      console.log('[API] Unauthorized');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get GitHub integration for the user
    const { data: integration, error: integrationError } = await supabase
      .from('integrations')
      .select('encrypted_credentials')
      .eq('type', 'github')
      .eq('organization_id', session.user.id)
      .single()
    console.log('[API] Integration:', integration, 'IntegrationError:', integrationError);

    if (integrationError || !integration) {
      console.log('[API] GitHub integration not found');
      return NextResponse.json(
        { error: 'GitHub integration not found. Please connect your GitHub account first.' },
        { status: 404 }
      )
    }

    const accessToken = integration.encrypted_credentials?.access_token
    console.log('[API] AccessToken:', accessToken ? 'Present' : 'Missing');
    if (!accessToken) {
      console.log('[API] GitHub access token not found');
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
    console.log('[API] Query params:', { sort, direction, per_page, page });

    // Initialize GitHub service and fetch repositories
    const github = new GitHubService(accessToken)
    const repositories = await github.getRepositories({
      sort,
      direction,
      per_page: Math.min(per_page, 100), // Limit to 100 per page
      page
    })
    console.log('[API] Number of repositories fetched:', repositories.length);

    return NextResponse.json({
      repositories,
      pagination: {
        page,
        per_page,
        total: repositories.length
      }
    })

  } catch (error) {
    console.error('[API] GitHub repositories fetch error:', error)
    
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