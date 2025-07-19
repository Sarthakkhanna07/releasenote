import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { GitHubService } from '@/lib/integrations/github'
import { getAiProvider } from '@/lib/ai'

/**
 * Generate release notes from GitHub repository data
 * Simplified endpoint that combines GitHub API + AI generation
 */
export async function POST(request: NextRequest) {
  try {
    const { repository, options } = await request.json()
    
    if (!repository || !repository.owner || !repository.repo) {
      return NextResponse.json(
        { error: 'Repository owner and name are required' },
        { status: 400 }
      )
    }

    const supabase = createRouteHandlerClient({ cookies })
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()

    if (sessionError || !session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get GitHub integration
    const { data: integration, error: integrationError } = await supabase
      .from('integrations')
      .select('encrypted_credentials')
      .eq('type', 'github')
      .eq('organization_id', session.user.id)
      .single()

    if (integrationError || !integration) {
      return NextResponse.json(
        { error: 'GitHub integration not found. Please connect your GitHub account first.' },
        { status: 404 }
      )
    }

    const accessToken = integration.encrypted_credentials?.access_token
    if (!accessToken) {
      return NextResponse.json(
        { error: 'GitHub access token not found. Please reconnect your GitHub account.' },
        { status: 400 }
      )
    }

    // Initialize GitHub service
    const github = new GitHubService(accessToken)
    
    // Get recent commits (last 30 days by default)
    const since = options?.since || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const commits = await github.getCommits(repository.owner, repository.repo, {
      since,
      per_page: 50
    })

    if (commits.length === 0) {
      return NextResponse.json(
        { error: 'No recent commits found in the repository' },
        { status: 404 }
      )
    }

    // Get recent merged pull requests for additional context
    const pullRequests = await github.getPullRequests(repository.owner, repository.repo, {
      state: 'closed',
      sort: 'updated',
      per_page: 20
    }).catch(() => []) // Don't fail if PR fetch fails

    // Combine commit and PR data for AI generation
    const commitsForAI = commits.map(commit => ({
      message: commit.message,
      sha: commit.sha.substring(0, 7),
      author: commit.author.name,
      type: 'commit'
    }))

    const prsForAI = pullRequests
      .filter(pr => pr.state === 'closed' && pr.merged_at)
      .slice(0, 10) // Limit to 10 most recent merged PRs
      .map(pr => ({
        message: `${pr.title}: ${pr.body?.substring(0, 200) || ''}`,
        sha: pr.number.toString(),
        author: pr.user.login,
        type: 'pull_request'
      }))

    const allChanges = [...commitsForAI, ...prsForAI]

    // Generate release notes using AI
    const aiProvider = getAiProvider()
    const generatedContent = await aiProvider.generateReleaseNotes(allChanges, {
      template: options?.template || 'traditional',
      tone: options?.tone || 'professional',
      includeBreakingChanges: options?.includeBreakingChanges || true
    })

    // Save as draft release note
    const { data: draftNote, error: saveError } = await supabase
      .from('release_notes')
      .insert([{
        title: options?.title || `Release Notes - ${new Date().toLocaleDateString()}`,
        content_html: generatedContent,
        status: 'draft',
        organization_id: session.user.id,
        author_id: session.user.id,
        source_ticket_ids: commits.slice(0, 10).map(c => c.sha),
        views: 0
      }])
      .select()
      .single()

    if (saveError) {
      console.error('Error saving draft release note:', saveError)
      // Still return the generated content even if save fails
    }

    return NextResponse.json({
      success: true,
      content: generatedContent,
      repository: {
        owner: repository.owner,
        repo: repository.repo
      },
      stats: {
        commits: commits.length,
        pullRequests: prsForAI.length,
        timeRange: since
      },
      draftId: draftNote?.id,
      message: 'Release notes generated successfully and saved as draft'
    })

  } catch (error) {
    console.error('GitHub release notes generation error:', error)
    
    if (error instanceof Error && error.message.includes('GitHub API error')) {
      return NextResponse.json(
        { error: 'Failed to fetch data from GitHub', details: error.message },
        { status: 502 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to generate release notes', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}