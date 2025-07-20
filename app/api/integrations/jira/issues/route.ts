import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { jiraAPI } from '@/lib/integrations/jira-client'

// In-memory cache: Map<cacheKey, { data, expiresAt, lastUpdated }>
const jiraIssuesCache = new Map();
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
    const projectKey = searchParams.get('projectKey')
    const jql = searchParams.get('jql')
    const maxResults = parseInt(searchParams.get('maxResults') || '50')
    const startAt = parseInt(searchParams.get('startAt') || '0')
    const issueTypes = searchParams.get('issueTypes')?.split(',').filter(Boolean)
    const statuses = searchParams.get('statuses')?.split(',').filter(Boolean)
    const updatedSince = searchParams.get('updatedSince')
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

    // Cache key: orgId:siteId:projectKey:jql:maxResults:startAt:issueTypes:statuses:updatedSince
    const cacheKey = [
      session.user.id,
      targetSiteId,
      projectKey || '',
      jql || '',
      maxResults,
      startAt,
      (issueTypes || []).join(','),
      (statuses || []).join(','),
      updatedSince || ''
    ].join(':')
    const cached = jiraIssuesCache.get(cacheKey)
    if (cached && cached.expiresAt > Date.now() && !forceRefresh) {
      console.log('[API] Returning cached Jira issues for', cacheKey)
      return NextResponse.json({ ...cached.data, lastUpdated: cached.lastUpdated })
    }

    try {
      let issues

      if (jql) {
        // Use custom JQL query
        issues = await jiraAPI.searchIssues(integration.access_token, targetSiteId, {
          jql,
          startAt,
          maxResults,
          fields: ['summary', 'status', 'assignee', 'created', 'updated', 'description', 'issuetype', 'priority', 'fixVersions', 'labels'],
          expand: ['changelog']
        })
      } else if (projectKey) {
        // Search by project with optional filters
        issues = await jiraAPI.getProjectIssues(integration.access_token, targetSiteId, projectKey, {
          issueTypes,
          statuses,
          updatedSince,
          maxResults,
          startAt
        })
      } else {
        // Default search for recent issues
        const defaultJql = updatedSince 
          ? `updated >= "${updatedSince}" ORDER BY updated DESC`
          : 'updated >= -30d ORDER BY updated DESC'
          
        issues = await jiraAPI.searchIssues(integration.access_token, targetSiteId, {
          jql: defaultJql,
          startAt,
          maxResults,
          fields: ['summary', 'status', 'assignee', 'created', 'updated', 'description', 'issuetype', 'priority', 'fixVersions', 'labels'],
          expand: ['changelog']
        })
      }

      // Transform issues for frontend consumption
      const transformedIssues = issues.issues?.map((issue: any) => ({
        id: issue.id,
        key: issue.key,
        summary: issue.fields.summary,
        description: issue.fields.description,
        status: {
          name: issue.fields.status.name,
          id: issue.fields.status.id,
          statusCategory: issue.fields.status.statusCategory
        },
        issueType: {
          name: issue.fields.issuetype.name,
          id: issue.fields.issuetype.id,
          iconUrl: issue.fields.issuetype.iconUrl,
          subtask: issue.fields.issuetype.subtask
        },
        priority: issue.fields.priority ? {
          name: issue.fields.priority.name,
          id: issue.fields.priority.id,
          iconUrl: issue.fields.priority.iconUrl
        } : null,
        assignee: issue.fields.assignee ? {
          accountId: issue.fields.assignee.accountId,
          displayName: issue.fields.assignee.displayName,
          emailAddress: issue.fields.assignee.emailAddress,
          avatarUrls: issue.fields.assignee.avatarUrls
        } : null,
        created: issue.fields.created,
        updated: issue.fields.updated,
        fixVersions: issue.fields.fixVersions?.map((version: any) => ({
          id: version.id,
          name: version.name,
          description: version.description,
          released: version.released,
          releaseDate: version.releaseDate
        })) || [],
        labels: issue.fields.labels || [],
        url: `${integration.metadata?.resources?.find((r: any) => r.id === targetSiteId)?.url}/browse/${issue.key}`,
        changelog: issue.changelog?.histories?.map((history: any) => ({
          id: history.id,
          author: {
            accountId: history.author.accountId,
            displayName: history.author.displayName
          },
          created: history.created,
          items: history.items?.map((item: any) => ({
            field: item.field,
            fieldtype: item.fieldtype,
            from: item.fromString,
            to: item.toString
          })) || []
        })) || []
      })) || []

      // Cache the issues in our ticket_cache table
      if (transformedIssues.length > 0) {
        const cachePromises = transformedIssues.map(issue => 
          supabase
            .from('ticket_cache')
            .upsert({
              organization_id: session.user.id,
              integration_type: 'jira',
              ticket_id: issue.key,
              title: issue.summary,
              description: issue.description,
              status: issue.status.name,
              assignee: issue.assignee?.displayName || null,
              created_at: issue.created,
              updated_at: issue.updated,
              metadata: {
                issue_type: issue.issueType,
                priority: issue.priority,
                fix_versions: issue.fixVersions,
                labels: issue.labels,
                url: issue.url,
                changelog: issue.changelog
              },
              cached_at: new Date().toISOString()
            }, {
              onConflict: 'organization_id,integration_type,ticket_id'
            })
        )

        // Execute cache updates in parallel
        await Promise.allSettled(cachePromises)
      }

      const responseData = {
        issues: transformedIssues,
        pagination: {
          startAt: issues.startAt || 0,
          maxResults: issues.maxResults || maxResults,
          total: issues.total || 0
        },
        site: {
          id: targetSiteId,
          name: integration.metadata?.resources?.find((r: any) => r.id === targetSiteId)?.name || 'Unknown Site'
        }
      }

      // In-memory cache
      const lastUpdated = Date.now();
      jiraIssuesCache.set(cacheKey, {
        data: responseData,
        expiresAt: lastUpdated + CACHE_TTL,
        lastUpdated,
      })
      console.log('[API] Cached Jira issues for', cacheKey)

      return NextResponse.json({ ...responseData, lastUpdated })

    } catch (error) {
      console.error('Error fetching Jira issues:', error)
      return NextResponse.json({ 
        error: 'Failed to fetch issues',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Jira issues API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}