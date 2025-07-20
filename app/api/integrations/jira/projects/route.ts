import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { jiraAPI } from '@/lib/integrations/jira-client'

// In-memory cache: Map<cacheKey, { data, expiresAt, lastUpdated }>
const jiraProjectsCache = new Map();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const siteId = searchParams.get('siteId')
    const maxResults = parseInt(searchParams.get('maxResults') || '50')
    const startAt = parseInt(searchParams.get('startAt') || '0')
    const forceRefresh = searchParams.get('refresh') === '1'

    // Get Jira integration
    const { data: integration, error: integrationError } = await supabase
      .from('integrations')
      .select('*')
      .eq('organization_id', session.user.id)
      .eq('type', 'jira')
      .single()

    if (integrationError || !integration) {
      return NextResponse.json({ error: 'Jira integration not found' }, { status: 404 })
    }

    // Determine which site to use
    let targetSiteId = siteId
    if (!targetSiteId && integration.metadata?.resources?.length > 0) {
      targetSiteId = integration.metadata.resources[0].id
    }

    if (!targetSiteId) {
      return NextResponse.json({ error: 'No Jira site available' }, { status: 400 })
    }

    // Cache key: orgId:siteId:maxResults:startAt
    const cacheKey = `${session.user.id}:${targetSiteId}:${maxResults}:${startAt}`
    const cached = jiraProjectsCache.get(cacheKey)
    if (cached && cached.expiresAt > Date.now() && !forceRefresh) {
      console.log('[API] Returning cached Jira projects for', cacheKey)
      return NextResponse.json({ ...cached.data, lastUpdated: cached.lastUpdated })
    }

    try {
      const projects = await jiraAPI.getProjects(integration.access_token, targetSiteId, {
        maxResults,
        startAt,
        expand: ['description', 'lead', 'issueTypes', 'url', 'projectKeys']
      })

      // Transform projects for frontend consumption
      const transformedProjects = projects.values?.map((project: any) => ({
        id: project.id,
        key: project.key,
        name: project.name,
        description: project.description,
        projectTypeKey: project.projectTypeKey,
        simplified: project.simplified,
        style: project.style,
        isPrivate: project.isPrivate,
        url: project.self,
        avatarUrls: project.avatarUrls,
        lead: project.lead ? {
          accountId: project.lead.accountId,
          displayName: project.lead.displayName,
          emailAddress: project.lead.emailAddress,
          avatarUrls: project.lead.avatarUrls
        } : null,
        issueTypes: project.issueTypes?.map((issueType: any) => ({
          id: issueType.id,
          name: issueType.name,
          description: issueType.description,
          iconUrl: issueType.iconUrl,
          subtask: issueType.subtask
        })) || []
      })) || []

      const responseData = {
        projects: transformedProjects,
        pagination: {
          startAt: projects.startAt || 0,
          maxResults: projects.maxResults || maxResults,
          total: projects.total || 0,
          isLast: projects.isLast || false
        },
        site: {
          id: targetSiteId,
          name: integration.metadata?.resources?.find((r: any) => r.id === targetSiteId)?.name || 'Unknown Site'
        }
      }

      // Cache the result
      const lastUpdated = Date.now();
      jiraProjectsCache.set(cacheKey, {
        data: responseData,
        expiresAt: lastUpdated + CACHE_TTL,
        lastUpdated,
      })
      console.log('[API] Cached Jira projects for', cacheKey)

      return NextResponse.json({ ...responseData, lastUpdated })

    } catch (error) {
      console.error('Error fetching Jira projects:', error)
      return NextResponse.json({ 
        error: 'Failed to fetch projects',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Jira projects API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}