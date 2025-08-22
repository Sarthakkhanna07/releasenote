import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { linearAPI } from '@/lib/integrations/linear-client'

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get('teamId')
    const assigneeId = searchParams.get('assigneeId')
    const stateType = searchParams.get('stateType') as 'backlog' | 'unstarted' | 'started' | 'completed' | 'canceled' | null
    const updatedSince = searchParams.get('updatedSince')
    const first = parseInt(searchParams.get('first') || '50')
    const after = searchParams.get('after')

    // Get Linear integration
    const { data: integration, error: integrationError } = await supabase
      .from('integrations')
      .select('encrypted_credentials')
      .eq('organization_id', session.user.id)
      .eq('type', 'linear')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (integrationError || !integration?.encrypted_credentials) {
      return NextResponse.json({ error: 'Linear integration not found' }, { status: 404 })
    }

    const accessToken = (integration.encrypted_credentials as any)?.access_token
    if (!accessToken) {
      return NextResponse.json({ error: 'Linear access token missing' }, { status: 400 })
    }

    try {
      const issues = await linearAPI.getIssues(accessToken, {
        first,
        after,
        teamId: teamId || undefined,
        assigneeId: assigneeId || undefined,
        stateType: stateType || undefined,
        updatedSince: updatedSince || undefined
      })

      // Transform issues for frontend consumption
      const transformedIssues = issues.nodes?.map((issue: any) => ({
        id: issue.id,
        identifier: issue.identifier,
        number: issue.number,
        title: issue.title,
        description: issue.description,
        priority: issue.priority,
        estimate: issue.estimate,
        url: issue.url,
        createdAt: issue.createdAt,
        updatedAt: issue.updatedAt,
        completedAt: issue.completedAt,
        canceledAt: issue.canceledAt,
        state: issue.state ? {
          id: issue.state.id,
          name: issue.state.name,
          type: issue.state.type,
          color: issue.state.color
        } : null,
        team: issue.team ? {
          id: issue.team.id,
          name: issue.team.name,
          key: issue.team.key
        } : null,
        assignee: issue.assignee ? {
          id: issue.assignee.id,
          name: issue.assignee.name,
          displayName: issue.assignee.displayName,
          email: issue.assignee.email,
          avatarUrl: issue.assignee.avatarUrl
        } : null,
        creator: issue.creator ? {
          id: issue.creator.id,
          name: issue.creator.name,
          displayName: issue.creator.displayName,
          email: issue.creator.email,
          avatarUrl: issue.creator.avatarUrl
        } : null,
        labels: issue.labels?.nodes?.map((label: any) => ({
          id: label.id,
          name: label.name,
          color: label.color
        })) || [],
        project: issue.project ? {
          id: issue.project.id,
          name: issue.project.name,
          description: issue.project.description,
          color: issue.project.color,
          state: issue.project.state,
          startedAt: issue.project.startedAt,
          completedAt: issue.project.completedAt,
          targetDate: issue.project.targetDate
        } : null
      })) || []

      // Cache the issues in our ticket_cache table
      if (transformedIssues.length > 0) {
        const cachePromises = transformedIssues.map(issue => 
          supabase
            .from('ticket_cache')
            .upsert({
              organization_id: session.user.id,
              integration_type: 'linear',
              ticket_id: issue.identifier,
              title: issue.title,
              description: issue.description,
              status: issue.state?.name || 'Unknown',
              assignee: issue.assignee?.displayName || null,
              created_at: issue.createdAt,
              updated_at: issue.updatedAt,
              metadata: {
                priority: issue.priority,
                estimate: issue.estimate,
                state: issue.state,
                team: issue.team,
                labels: issue.labels,
                project: issue.project,
                url: issue.url,
                completed_at: issue.completedAt,
                canceled_at: issue.canceledAt
              },
              cached_at: new Date().toISOString()
            }, {
              onConflict: 'organization_id,integration_type,ticket_id'
            })
        )

        // Execute cache updates in parallel
        await Promise.allSettled(cachePromises)
      }

      return NextResponse.json({
        issues: transformedIssues,
        pagination: {
          hasNextPage: issues.pageInfo?.hasNextPage || false,
          hasPreviousPage: issues.pageInfo?.hasPreviousPage || false,
          startCursor: issues.pageInfo?.startCursor,
          endCursor: issues.pageInfo?.endCursor
        }
      })

    } catch (error) {
      console.error('Error fetching Linear issues:', error)
      return NextResponse.json({ 
        error: 'Failed to fetch issues',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Linear issues API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}