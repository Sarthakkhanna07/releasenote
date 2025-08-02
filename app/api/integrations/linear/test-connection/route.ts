import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { linearAPI } from '@/lib/integrations/linear-client'

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get Linear integration
    const { data: integration, error: integrationError } = await supabase
      .from('integrations')
      .select('*')
      .eq('organization_id', session.user.id)
      .eq('type', 'linear')
      .single()

    if (integrationError || !integration) {
      return NextResponse.json({
        success: false,
        error: 'Linear integration not found',
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

    // Test 1: Basic Authentication & User Info
    try {
      const connectionTest = await linearAPI.testConnection(accessToken)
      
      if (connectionTest.success) {
        tests.push({
          name: 'Authentication & User Info',
          status: 'passed',
          message: `Successfully authenticated as ${connectionTest.user.displayName || connectionTest.user.name}`,
          details: {
            user: {
              id: connectionTest.user.id,
              name: connectionTest.user.name,
              displayName: connectionTest.user.displayName,
              email: connectionTest.user.email
            },
            organization: connectionTest.organization ? {
              id: connectionTest.organization.id,
              name: connectionTest.organization.name,
              urlKey: connectionTest.organization.urlKey,
              userCount: connectionTest.organization.userCount
            } : null
          }
        })
      } else {
        overallSuccess = false
        tests.push({
          name: 'Authentication & User Info',
          status: 'failed',
          message: connectionTest.error || 'Authentication failed',
          error: 'Invalid or expired access token'
        })
      }
    } catch (error) {
      overallSuccess = false
      tests.push({
        name: 'Authentication & User Info',
        status: 'failed',
        message: 'Network error during authentication test',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }

    // Test 2: Teams Access
    if (overallSuccess) {
      try {
        const teams = await linearAPI.getTeams(accessToken, {
          first: 10
        })

        tests.push({
          name: 'Teams Access',
          status: 'passed',
          message: `Successfully accessed teams. Found ${teams.nodes?.length || 0} teams`,
          details: {
            totalTeams: teams.nodes?.length || 0,
            sampleTeams: teams.nodes?.slice(0, 3).map((team: any) => ({
              id: team.id,
              name: team.name,
              key: team.key,
              issueCount: team.issueCount,
              private: team.private
            })) || []
          }
        })
      } catch (error) {
        tests.push({
          name: 'Teams Access',
          status: 'warning',
          message: 'Limited teams access or no teams found',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    // Test 3: Issues Access
    if (overallSuccess) {
      try {
        const issues = await linearAPI.getIssues(accessToken, {
          first: 10,
          orderBy: 'updatedAt'
        })

        tests.push({
          name: 'Issues Access',
          status: 'passed',
          message: `Successfully accessed issues. Found ${issues.nodes?.length || 0} recent issues`,
          details: {
            sampleIssues: issues.nodes?.slice(0, 3).map((issue: any) => ({
              id: issue.id,
              identifier: issue.identifier,
              title: issue.title,
              state: issue.state.name,
              team: issue.team?.name,
              assignee: issue.assignee?.displayName,
              priority: issue.priority
            })) || []
          }
        })
      } catch (error) {
        tests.push({
          name: 'Issues Access',
          status: 'warning',
          message: 'Issues access capabilities limited',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    // Test 4: Projects Access
    if (overallSuccess) {
      try {
        const projects = await linearAPI.getProjects(accessToken, {
          first: 10
        })

        tests.push({
          name: 'Projects Access',
          status: 'passed',
          message: `Successfully retrieved ${projects.nodes?.length || 0} projects`,
          details: {
            sampleProjects: projects.nodes?.slice(0, 3).map((project: any) => ({
              id: project.id,
              name: project.name,
              state: project.state,
              progress: project.progress,
              issueCount: project.issues?.nodes?.length || 0
            })) || []
          }
        })
      } catch (error) {
        tests.push({
          name: 'Projects Access',
          status: 'info',
          message: 'Project metadata not accessible',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    // Test 5: GraphQL API Performance
    const apiTests = [
      { name: 'User Query', method: 'getViewer' },
      { name: 'Teams Query', method: 'getTeams' },
      { name: 'Issues Query', method: 'getIssues' }
    ]

    for (const apiTest of apiTests) {
      if (overallSuccess) {
        try {
          const startTime = Date.now()
          
          switch (apiTest.method) {
            case 'getViewer':
              await linearAPI.getViewer(accessToken)
              break
            case 'getTeams':
              await linearAPI.getTeams(accessToken, { first: 1 })
              break
            case 'getIssues':
              await linearAPI.getIssues(accessToken, { first: 1 })
              break
          }
          
          const responseTime = Date.now() - startTime

          tests.push({
            name: `${apiTest.name} Performance`,
            status: responseTime < 2000 ? 'passed' : 'warning',
            message: `${apiTest.name} completed in ${responseTime}ms`,
            responseTime: `${responseTime}ms`
          })
        } catch (error) {
          tests.push({
            name: `${apiTest.name} Performance`,
            status: 'warning',
            message: `${apiTest.name} performance issues`,
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
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
        type: 'linear',
        connected_at: integration.created_at,
        organization: integration.metadata?.organization?.name || 'Unknown Organization'
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
    console.error('Linear connection test error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Connection test failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
      tests: []
    }, { status: 500 })
  }
}