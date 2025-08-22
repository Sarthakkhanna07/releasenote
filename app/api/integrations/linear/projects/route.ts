/**
 * Linear Projects API Route
 *
 * Exposes a read-only endpoint to fetch Linear projects for the authenticated user/org.
 * Mirrors the structure and security model of existing Linear routes (teams/issues).
 *
 * Query params:
 * - first?: number (default 50)
 * - includeArchived?: boolean (default false)
 *
 * Response:
 * {
 *   projects: Array<...>,
 *   pagination: { hasNextPage, hasPreviousPage, startCursor?, endCursor? }
 * }
 */
import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { linearAPI, LinearAPIError } from '@/lib/integrations/linear-client'

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const first = parseInt(searchParams.get('first') || '50')

    // Locate Linear integration for this user/org with fallback to user_id
    let { data: integration, error: integrationError } = await supabase
      .from('integrations')
      .select('id, encrypted_credentials, updated_at')
      .eq('organization_id', session.user.id)
      .eq('type', 'linear')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!integration || integrationError) {
      const { data: byUser } = await supabase
        .from('integrations')
        .select('id, encrypted_credentials, updated_at')
        .eq('user_id', session.user.id)
        .eq('type', 'linear')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      integration = byUser || integration
    }

    if (!integration?.encrypted_credentials) {
      return NextResponse.json({ error: 'Linear integration not found' }, { status: 404 })
    }

    const accessToken = (integration.encrypted_credentials as any)?.access_token
    if (!accessToken) {
      return NextResponse.json({ error: 'Linear access token missing' }, { status: 400 })
    }

    try {
      // Linear client returns unknown; cast to any for controlled normalization below
      const projects: any = await linearAPI.getProjects(accessToken, {
        first
      })

      // Normalize project shape for the UI
      const transformed = projects?.nodes?.map((p: any) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        color: p.color,
        state: p.state,
        startedAt: p.startedAt,
        completedAt: p.completedAt,
        targetDate: p.targetDate,
        progress: p.progress,
        url: p.url
      })) || []

      return NextResponse.json({
        projects: transformed,
        pagination: {
          hasNextPage: projects?.pageInfo?.hasNextPage || false,
          hasPreviousPage: projects?.pageInfo?.hasPreviousPage || false,
          startCursor: projects?.pageInfo?.startCursor,
          endCursor: projects?.pageInfo?.endCursor
        }
      })
    } catch (error) {
      console.error('Error fetching Linear projects:', error)
      if (error instanceof LinearAPIError && error.status === 429) {
        const retryAfter = (error.data as any)?.retryAfter
        return NextResponse.json({
          error: 'Rate limited by Linear',
          message: `Too many requests. Try again in ${retryAfter || 'a few'} seconds.`
        }, { status: 429 })
      }
      return NextResponse.json({
        error: 'Failed to fetch projects',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 })
    }
  } catch (error) {
    console.error('Linear projects API error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}


